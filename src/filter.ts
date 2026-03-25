import type { FilterOptions } from './types.js';

// Android threadtime log format: MM-DD HH:MM:SS.mmm  PID  TID LEVEL TAG: message
const LEVEL_RE = /^\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\s+\d+\s+\d+\s+([VDIWEF])\s/;

// Extract message part (after "TAG: ")
const MESSAGE_RE = /^\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\s+\d+\s+\d+\s+[VDIWEF]\s+[^:]+:\s*(.*)/;

const SEVERITY: Record<string, number> = { V: 0, D: 1, I: 2, W: 3, E: 4, F: 5 };

const LEVEL_MAP: Record<string, string> = {
  verbose: 'V',
  debug: 'D',
  info: 'I',
  warn: 'W',
  error: 'E',
  fatal: 'F',
};

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createFilter(options: FilterOptions = {}): (line: string) => boolean {
  const { level, patterns, regex } = options;
  const minSeverity = level ? SEVERITY[LEVEL_MAP[level]] : -1;
  const matchers = patterns?.length
    ? patterns.map((p) => new RegExp(regex ? p : escapeRegex(p), 'i'))
    : null;

  return (line: string) => {
    if (minSeverity >= 0) {
      const match = LEVEL_RE.exec(line);
      if (!match) return false;
      if (SEVERITY[match[1]] < minSeverity) return false;
    }

    if (matchers) {
      const msgMatch = MESSAGE_RE.exec(line);
      const message = msgMatch ? msgMatch[1] : line;
      if (!matchers.some((re) => re.test(message))) return false;
    }

    return true;
  };
}
