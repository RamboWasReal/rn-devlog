import { execSync, spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import chalk from 'chalk';
import { colorizeLine, highlightPatterns } from './colorize.js';
import { createDedup } from './dedup.js';
import type { StreamOptions } from './types.js';

function adbCheck(): void {
  try {
    execSync('command -v adb', { stdio: 'ignore' });
  } catch {
    throw new Error(
      'adb not found in PATH. Install Android SDK platform-tools and ensure adb is in your PATH.',
    );
  }
}

function deviceCheck(): void {
  try {
    const state = execSync('adb get-state', { encoding: 'utf8' }).trim();
    if (state !== 'device') {
      throw new Error(`adb device state is "${state}". Connect a device or start an emulator.`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('adb device state')) throw err;
    throw new Error('No Android device or emulator connected. Run "adb devices" to check.', {
      cause: err,
    });
  }
}

function getPid(appId: string): string | null {
  try {
    const out = execSync(`adb shell pidof ${appId}`, { encoding: 'utf8' }).trim();
    return out || null;
  } catch {
    return null;
  }
}

async function waitForPid(appId: string): Promise<string> {
  process.stdout.write(`Waiting for ${appId}...\n`);
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const pid = getPid(appId);
      if (pid) {
        clearInterval(interval);
        resolve(pid);
      }
    }, 500);
  });
}

export async function streamAndroid({
  appId,
  filter,
  noiseFilter,
  saver,
  all,
  tail,
  follow,
  patterns,
  dedup: dedupEnabled = true,
  jsOnly,
  nativeOnly,
}: StreamOptions): Promise<void> {
  adbCheck();
  deviceCheck();

  const dedup = dedupEnabled ? createDedup((c) => process.stdout.write(c + '\n')) : null;

  const isNewAndroidEntry = /^\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+/.test.bind(
    /^\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+/,
  );
  let lastWasJs = false;

  function outputLine(line: string) {
    const isContinuation = !isNewAndroidEntry(line);
    const isJsLog = isContinuation ? lastWasJs : / [VDIWEF] ReactNativeJS:/.test(line);
    if (!isContinuation) lastWasJs = isJsLog;
    if (jsOnly && !isJsLog) return;
    if (nativeOnly && isJsLog) return;
    if (noiseFilter && !noiseFilter(line)) return;
    let colorized = colorizeLine(line, 'android');
    colorized = highlightPatterns(colorized, line, patterns);
    if (saver) saver.write(line);
    if (dedup) {
      dedup.write(line, colorized);
    } else {
      process.stdout.write(colorized + '\n');
    }
  }

  // Tail-only mode: dump and exit
  if (tail && !follow) {
    const pid = all ? null : getPid(appId);
    const args = ['logcat', '-v', 'threadtime', '-d', '-T', String(tail)];
    if (pid) args.push(`--pid=${pid}`);

    const output = execSync(['adb', ...args].join(' '), { encoding: 'utf8' });
    for (const line of output.split('\n')) {
      if (!line) continue;
      if (filter && !filter(line)) continue;
      outputLine(line);
    }
    if (dedup) dedup.flush();
    if (saver) saver.close();
    return;
  }

  // Streaming mode
  let currentPid: string | null = null;
  let logcatProc: ChildProcess | null = null;
  let stopped = false;

  function startLogcat(pid: string | null): ChildProcess {
    const args = ['-v', 'threadtime'];
    if (!all && pid) {
      args.push(`--pid=${pid}`);
    }
    if (tail) {
      args.push('-T', String(tail));
    }

    const proc = spawn('adb', ['logcat', ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let buffer = '';

    proc.stdout!.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop()!;

      for (const line of lines) {
        if (!line) continue;
        if (filter && !filter(line)) continue;
        outputLine(line);
      }
    });

    proc.stderr!.on('data', () => {});

    return proc;
  }

  async function start() {
    if (all) {
      logcatProc = startLogcat(null);
      return;
    }

    let pid = getPid(appId);
    if (!pid) {
      pid = await waitForPid(appId);
    }
    currentPid = pid;
    logcatProc = startLogcat(pid);

    const pidPoller = setInterval(async () => {
      if (stopped) {
        clearInterval(pidPoller);
        return;
      }

      const newPid = getPid(appId);

      if (newPid !== currentPid) {
        clearInterval(pidPoller);

        if (logcatProc) {
          logcatProc.kill();
          logcatProc = null;
        }

        process.stdout.write(
          chalk.cyan(`App restarted (PID ${currentPid} → ${newPid ?? 'gone'}). Reconnecting...\n`),
        );
        currentPid = null;

        await start();
      }
    }, 1000);
  }

  process.on('SIGINT', () => {
    stopped = true;
    if (logcatProc) {
      logcatProc.kill();
    }
    if (saver) saver.close();
    process.exit(0);
  });

  await start();
}
