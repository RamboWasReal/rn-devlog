import { execSync, spawn } from 'child_process';
import chalk from 'chalk';
import { colorizeLine } from './colorize.js';

function adbCheck() {
  try {
    execSync('command -v adb', { stdio: 'ignore' });
  } catch {
    throw new Error('adb not found in PATH. Install Android SDK platform-tools and ensure adb is in your PATH.');
  }
}

function deviceCheck() {
  try {
    const state = execSync('adb get-state', { encoding: 'utf8' }).trim();
    if (state !== 'device') {
      throw new Error(`adb device state is "${state}". Connect a device or start an emulator.`);
    }
  } catch (err) {
    if (err.message.includes('adb device state')) throw err;
    throw new Error('No Android device or emulator connected. Run "adb devices" to check.');
  }
}

function getPid(appId) {
  try {
    const out = execSync(`adb shell pidof ${appId}`, { encoding: 'utf8' }).trim();
    return out || null;
  } catch {
    return null;
  }
}

async function waitForPid(appId) {
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

export async function streamAndroid({ appId, filter, saver, all }) {
  adbCheck();
  deviceCheck();

  let currentPid = null;
  let logcatProc = null;
  let stopped = false;

  function startLogcat(pid) {
    const args = ['-v', 'threadtime'];
    if (!all && pid) {
      args.push(`--pid=${pid}`);
    }

    const proc = spawn('adb', ['logcat', ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let buffer = '';

    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete last line

      for (const line of lines) {
        if (!line) continue;
        if (filter && !filter(line)) continue;
        const colorized = colorizeLine(line, 'android');
        process.stdout.write(colorized + '\n');
        if (saver) saver.write(line);
      }
    });

    proc.stderr.on('data', () => {});

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

    // Poll for PID change every 1 second
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

        process.stdout.write(chalk.cyan(`App restarted (PID ${currentPid} → ${newPid ?? 'gone'}). Reconnecting...\n`));
        currentPid = null;

        // Restart streaming
        await start();
      }
    }, 1000);
  }

  process.on('SIGINT', () => {
    stopped = true;
    if (logcatProc) {
      logcatProc.kill();
    }
    process.exit(0);
  });

  await start();
}
