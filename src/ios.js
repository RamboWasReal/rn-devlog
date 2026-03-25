import { spawn, execSync } from 'child_process';
import { colorizeLine } from './colorize.js';

function isSimulatorBooted() {
  try {
    const output = execSync('xcrun simctl list devices booted', { encoding: 'utf8' });
    return output.includes('Booted');
  } catch {
    return false;
  }
}

function isCommandInPath(cmd) {
  try {
    execSync(`which ${cmd}`, { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function getAppName(appId) {
  const parts = appId.split('.');
  return parts[parts.length - 1];
}

export function streamIos({ appId, filter, saver, all }) {
  const simulatorMode = isSimulatorBooted();

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

  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete last line

    for (const line of lines) {
      if (!line) continue;

      if (!simulatorMode && !all) {
        const appName = getAppName(appId);
        if (!line.includes(appId) && !line.includes(appName)) continue;
      }

      if (filter && !filter(line)) continue;

      const colorized = colorizeLine(line, 'ios');
      process.stdout.write(colorized + '\n');

      if (saver) {
        saver.write(line);
      }
    }
  });

  child.stderr.on('data', (chunk) => {
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
