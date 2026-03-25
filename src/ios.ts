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

function getAppName(appId: string): string {
  const parts = appId.split('.');
  return parts[parts.length - 1];
}

export function streamIos({ appId, filter, noiseFilter, saver, all, tail, follow, patterns, dedup: dedupEnabled = true, jsOnly, nativeOnly }: StreamOptions): void {
  const simulatorMode = isSimulatorBooted();
  const dedup = dedupEnabled ? createDedup((c) => process.stdout.write(c + '\n')) : null;

  function processLine(line: string) {
    if (!line) return;
    if (!simulatorMode && !all) {
      const appName = getAppName(appId);
      if (!line.includes(appId) && !line.includes(appName)) return;
    }
    if (jsOnly && !line.includes('ReactNativeJS')) return;
    if (nativeOnly && line.includes('ReactNativeJS')) return;
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
      // log show --last 1m gives recent logs, we take last N lines
      const args = ['simctl', 'spawn', 'booted', 'log', 'show', '--last', '5m', '--style=compact'];
      if (!all) {
        const appName = getAppName(appId);
        args.push('--predicate', `process CONTAINS "${appName}"`);
      }
      const output = execSync(['xcrun', ...args].join(' '), { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
      const lines = output.split('\n').filter(l => l.trim()).slice(-tail);
      for (const line of lines) processLine(line);
    }
    if (saver) saver.close();
    return;
  }

  // Streaming mode
  let child;

  if (simulatorMode) {
    const args = ['simctl', 'spawn', 'booted', 'log', 'stream', '--level=debug', '--style=compact'];
    if (!all) {
      const appName = getAppName(appId);
      args.push('--predicate', `process CONTAINS "${appName}"`);
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
