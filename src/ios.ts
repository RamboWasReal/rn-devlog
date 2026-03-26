import { spawn, execSync } from 'child_process';
import { colorizeLine, highlightPatterns } from './colorize.js';
import { createDedup } from './dedup.js';
import type { StreamOptions } from './types.js';

function isSimulatorBooted(): boolean {
  try {
    const output = execSync('xcrun simctl list devices booted', { encoding: 'utf8' });
    return output.includes('Booted');
  } catch {
    return false;
  }
}

function isCommandInPath(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function getProcessName(appId: string): string | null {
  try {
    // Get the app container path — the last path component is the .app bundle name
    const container = execSync(`xcrun simctl get_app_container booted "${appId}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    const appBundle = container.split('/').pop() || '';
    return appBundle.replace(/\.app$/, '') || null;
  } catch {
    return null;
  }
}

function getAppName(appId: string): string {
  const parts = appId.split('.');
  return parts[parts.length - 1];
}

export function streamIos({ appId, filter, noiseFilter, saver, all, tail, follow, patterns, dedup: dedupEnabled = true, jsOnly, nativeOnly }: StreamOptions): void {
  const simulatorMode = isSimulatorBooted();
  const dedup = dedupEnabled ? createDedup((c) => process.stdout.write(c + '\n')) : null;
  const detectedProcess = simulatorMode ? getProcessName(appId) : null;
  const processName = detectedProcess || getAppName(appId);
  if (detectedProcess) {
    process.stdout.write(`Process name: ${detectedProcess}\n`);
  } else if (simulatorMode) {
    process.stderr.write(`Warning: could not detect process name, falling back to "${processName}"\n`);
  }

  const isNewLogEntry = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+/.test.bind(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+/);
  let lastWasJs = false;

  function processLine(line: string) {
    if (!line) return;
    if (!simulatorMode && !all) {
      if (!line.includes(appId) && !line.includes(processName)) return;
    }
    const isContinuation = !isNewLogEntry(line);
    const isJsLog = isContinuation ? lastWasJs : (line.includes('ReactNativeJS') || line.includes('com.facebook.react.log:javascript'));
    if (!isContinuation) lastWasJs = isJsLog;
    if (jsOnly && !isJsLog) return;
    if (nativeOnly && isJsLog) return;
    if (filter && !filter(line)) return;
    if (noiseFilter && !noiseFilter(line)) return;
    let colorized = colorizeLine(line, 'ios');
    colorized = highlightPatterns(colorized, line, patterns);
    if (saver) saver.write(line);
    if (dedup) {
      dedup.write(line, colorized);
    } else {
      process.stdout.write(colorized + '\n');
    }
  }

  // Tail-only mode: dump recent logs and exit
  if (tail && !follow) {
    if (simulatorMode) {
      const args = ['simctl', 'spawn', 'booted', 'log', 'show', '--last', '5m', '--style=compact'];
      if (!all) {
        args.push('--predicate', `'process CONTAINS "${processName}"'`);
      }
      const output = execSync('xcrun ' + args.join(' ') + ' 2>/dev/null', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
      const allLines = output.split('\n').filter(l => l.trim());
      // Apply filters first, then take last N
      let tailLastWasJs = false;
      const filtered = allLines.filter(line => {
        const isCont = !isNewLogEntry(line);
        const isJs = isCont ? tailLastWasJs : line.includes('com.facebook.react.log:javascript');
        if (!isCont) tailLastWasJs = isJs;
        if (jsOnly && !isJs) return false;
        if (nativeOnly && isJs) return false;
        if (filter && !filter(line)) return false;
        if (noiseFilter && !noiseFilter(line)) return false;
        return true;
      });
      for (const line of filtered.slice(-tail)) {
        let colorized = colorizeLine(line, 'ios');
        colorized = highlightPatterns(colorized, line, patterns);
        if (saver) saver.write(line);
        if (dedup) {
          dedup.write(line, colorized);
        } else {
          process.stdout.write(colorized + '\n');
        }
      }
    }
    if (saver) saver.close();
    return;
  }

  // Streaming mode
  let child;

  if (simulatorMode) {
    const args = ['simctl', 'spawn', 'booted', 'log', 'stream', '--level=debug', '--style=compact'];
    if (!all) {
      args.push('--predicate', `process CONTAINS "${processName}"`);
    }
    child = spawn('xcrun', args);
  } else {
    if (!isCommandInPath('idevicesyslog')) {
      throw new Error('idevicesyslog not found. Install with: brew install libimobiledevice');
    }
    child = spawn('idevicesyslog');
  }

  let buffer = '';

  child.stdout!.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop()!;
    for (const line of lines) processLine(line);
  });

  child.stderr!.on('data', (chunk) => {
    const msg = chunk.toString();
    if (msg.includes('getpwuid_r')) return;
    process.stderr.write(chunk);
  });

  child.on('error', (err) => {
    process.stderr.write(`Error: ${err.message}\n`);
  });

  process.on('SIGINT', () => {
    child.kill();
    if (saver) saver.close();
    process.exit(0);
  });
}
