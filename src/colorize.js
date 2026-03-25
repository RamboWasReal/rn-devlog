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

const TAG_ALIASES = {
  'ReactNativeJS': 'JS',
  'ReactNativeJNI': 'Bridge',
};

function friendlyTag(tag) {
  const trimmed = tag.trim();
  if (TAG_ALIASES[trimmed]) return TAG_ALIASES[trimmed];
  // Shorten process-style tags like "am.dialogue.dev" → "Native"
  if (/^[a-z]{2}\.\w+/.test(trimmed)) return 'Native';
  return trimmed;
}

// Parse Android threadtime into clean format: HH:MM:SS LEVEL TAG  message
function formatAndroid(line) {
  const match = line.match(/^\d{2}-\d{2} (\d{2}:\d{2}:\d{2})\.\d+\s+\d+\s+\d+\s+([VDIWEF])\s+([^:]+):\s*(.*)/);
  if (match) {
    const [, time, level, tag, message] = match;
    return { time, level, tag: friendlyTag(tag), message };
  }
  return null;
}

// Parse iOS log stream into clean format
function formatIos(line) {
  const match = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\.\d+[^\[]*\[([^\]]+)\]\s*(?:\[(Default|Info|Debug|Error|Fault)\])?\s*(.*)/);
  if (match) {
    const [, datetime, process, level, message] = match;
    const time = datetime.split(' ')[1];
    const lvl = level || 'Info';
    return { time, level: lvl[0], tag: process, message };
  }
  return null;
}

export function highlightPatterns(colorized, rawLine, patterns) {
  if (!patterns?.length) return colorized;
  let result = colorized;
  for (const p of patterns) {
    const re = new RegExp(`(${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(re, chalk.bgYellow.black('$1'));
  }
  return result;
}

export function colorizeLine(line, platform) {
  const parsed = platform === 'android' ? formatAndroid(line) : formatIos(line);

  if (!parsed) return chalk.dim(line);

  const { time, level, tag, message } = parsed;
  const logLevel = parseLogLevel(line, platform);

  const LEVEL_STYLE = {
    fatal:   { label: '[FATAL]', color: chalk.bold.red },
    error:   { label: '[ERROR]', color: chalk.red },
    warn:    { label: '[WARN] ', color: chalk.yellow },
    info:    { label: '[LOG]  ', color: chalk.green },
    debug:   { label: '[DEBUG]', color: chalk.blue },
    verbose: { label: '[TRACE]', color: chalk.dim },
  };

  const style = LEVEL_STYLE[logLevel] || LEVEL_STYLE.info;
  const coloredLabel = style.color(style.label);
  const isJs = tag === 'JS';
  const formatted = isJs
    ? `${chalk.dim(time)} ${coloredLabel} ${message}`
    : `${chalk.dim(time)} ${coloredLabel} ${chalk.cyan(tag)}  ${message}`;

  return formatted;
}
