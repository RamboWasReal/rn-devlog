import chalk from 'chalk';

const ANDROID_LEVEL_MAP = {
  V: 'verbose',
  D: 'debug',
  I: 'info',
  W: 'warn',
  E: 'error',
  F: 'fatal',
};

const IOS_LEVEL_MAP = {
  Default: 'info',
  Info: 'info',
  Debug: 'debug',
  Error: 'error',
  Fault: 'fatal',
};

/**
 * Parse the log level from a log line.
 * @param {string} line
 * @param {'android'|'ios'} platform
 * @returns {'verbose'|'debug'|'info'|'warn'|'error'|'fatal'}
 */
export function parseLogLevel(line, platform) {
  if (platform === 'android') {
    // threadtime format: MM-DD HH:MM:SS.mmm  PID  TID LEVEL Tag: message
    const match = line.match(/^\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+\s+\d+\s+\d+\s+([VDIWEF])\s/);
    if (match) {
      return ANDROID_LEVEL_MAP[match[1]] ?? 'info';
    }
  } else if (platform === 'ios') {
    // log stream format: ... [Level] message
    const match = line.match(/\[(Default|Info|Debug|Error|Fault)\]/);
    if (match) {
      return IOS_LEVEL_MAP[match[1]] ?? 'info';
    }
  }
  return 'info';
}

/**
 * Colorize a log line based on its severity level.
 * @param {string} line
 * @param {'android'|'ios'} platform
 * @returns {string}
 */
export function colorizeLine(line, platform) {
  const level = parseLogLevel(line, platform);
  switch (level) {
    case 'fatal':
      return chalk.bold.red(line);
    case 'error':
      return chalk.red(line);
    case 'warn':
      return chalk.yellow(line);
    case 'info':
      return chalk.green(line);
    case 'debug':
      return chalk.blue(line);
    case 'verbose':
      return chalk.dim(line);
    default:
      return line;
  }
}
