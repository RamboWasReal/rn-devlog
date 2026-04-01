import chalk from 'chalk';
import type { Platform, LogLevel } from './types.js';

const ANDROID_LEVEL_MAP: Record<string, LogLevel> = {
  V: 'verbose',
  D: 'debug',
  I: 'info',
  W: 'warn',
  E: 'error',
  F: 'fatal',
};

const IOS_LEVEL_MAP: Record<string, LogLevel> = {
  Default: 'info',
  Info: 'info',
  Debug: 'debug',
  Error: 'error',
  Fault: 'fatal',
};

/**
 * Parse the log level from a log line.
 */
export function parseLogLevel(line: string, platform: Platform): LogLevel {
  if (platform === 'android') {
    // threadtime format: MM-DD HH:MM:SS.mmm  PID  TID LEVEL Tag: message
    const match = line.match(/^\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+\s+\d+\s+\d+\s+([VDIWEF])\s/);
    if (match) {
      return ANDROID_LEVEL_MAP[match[1]] ?? 'info';
    }
  } else if (platform === 'ios') {
    // Compact format: level code after timestamp
    const compact = line.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+\s+(\w{1,2})\s/);
    if (compact) {
      const code = compact[1];
      if (code === 'Db' || code === 'D') return 'debug';
      if (code === 'E' || code === 'Er') return 'error';
      if (code === 'F' || code === 'Ft') return 'fatal';
      if (code === 'Df' || code === 'I' || code === 'N') return 'info';
      return 'info';
    }
    // Verbose format fallback
    const match = line.match(/\[(Default|Info|Debug|Error|Fault)\]/);
    if (match) {
      return IOS_LEVEL_MAP[match[1]] ?? 'info';
    }
  }
  return 'info';
}

const TAG_ALIASES: Record<string, string> = {
  ReactNativeJS: 'JS',
  ReactNativeJNI: 'Bridge',
};

function friendlyTag(tag: string): string {
  const trimmed = tag.trim();
  if (TAG_ALIASES[trimmed]) return TAG_ALIASES[trimmed];
  // Shorten process-style tags like "am.dialogue.dev" → "Native"
  if (/^[a-z]{2}\.\w+/.test(trimmed)) return 'Native';
  return trimmed;
}

// Parse Android threadtime into clean format: HH:MM:SS LEVEL TAG  message
function formatAndroid(
  line: string,
): { time: string; level: string; tag: string; message: string } | null {
  const match = line.match(
    /^\d{2}-\d{2} (\d{2}:\d{2}:\d{2})\.\d+\s+\d+\s+\d+\s+([VDIWEF])\s+([^:]+):\s*(.*)/,
  );
  if (match) {
    const [, time, level, tag, message] = match;
    return { time, level, tag: friendlyTag(tag), message };
  }
  return null;
}

const IOS_COMPACT_LEVEL: Record<string, string> = {
  Df: 'I',
  Db: 'D',
  I: 'I',
  E: 'E',
  F: 'F',
  Er: 'E',
  Ft: 'F',
  N: 'I',
  D: 'D',
};

// Parse iOS log stream compact format:
// 2026-03-25 17:33:49.924 Db PatientApp[30911:967cdd] [subsystem:category] message
function formatIos(
  line: string,
): { time: string; level: string; tag: string; message: string } | null {
  // Compact format
  const compact = line.match(
    /^(\d{4}-\d{2}-\d{2} (\d{2}:\d{2}:\d{2}))\.\d+\s+(\w{1,2})\s+(\w+)\[[\d:a-f]+\]\s+(?:\[([^\]]+)\]\s+)?(.*)/,
  );
  if (compact) {
    const [, , time, levelCode, process, subsystem, message] = compact;
    const level = IOS_COMPACT_LEVEL[levelCode] || 'I';
    const tag = subsystem?.includes('facebook.react') ? 'JS' : process;
    return { time, level, tag, message };
  }
  // Verbose format fallback
  const verbose = line.match(
    /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\.\d+[^[]*\[([^\]]+)\]\s*(?:\[(Default|Info|Debug|Error|Fault)\])?\s*(.*)/,
  );
  if (verbose) {
    const [, datetime, proc, verboseLevel, message] = verbose;
    const time = datetime.split(' ')[1];
    const lvl = verboseLevel || 'Info';
    return { time, level: lvl[0], tag: proc, message };
  }
  return null;
}

export function highlightPatterns(colorized: string, rawLine: string, patterns?: string[]): string {
  if (!patterns?.length) return colorized;
  let result = colorized;
  for (const p of patterns) {
    const re = new RegExp(`(${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(re, chalk.bgYellow.black('$1'));
  }
  return result;
}

export function colorizeLine(line: string, platform: Platform): string {
  const parsed = platform === 'android' ? formatAndroid(line) : formatIos(line);

  if (!parsed) return chalk.dim(line);

  const { time, tag, message } = parsed;
  const logLevel = parseLogLevel(line, platform);

  const LEVEL_STYLE: Record<string, { label: string; color: (s: string) => string }> = {
    fatal: { label: '[FATAL]', color: chalk.bold.red },
    error: { label: '[ERROR]', color: chalk.red },
    warn: { label: '[WARN] ', color: chalk.yellow },
    info: { label: '[LOG]  ', color: chalk.green },
    debug: { label: '[DEBUG]', color: chalk.blue },
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
