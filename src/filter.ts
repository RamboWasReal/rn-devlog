import type { FilterOptions } from './types.js';

// Android threadtime log format: MM-DD HH:MM:SS.mmm  PID  TID LEVEL TAG: message
const ANDROID_LEVEL_RE = /^\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\s+\d+\s+\d+\s+([VDIWEF])\s/;

// iOS compact format: 2026-03-25 17:33:49.924 Db Process[pid:tid]
const IOS_LEVEL_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+\s+(\w{1,2})\s/;

const IOS_CODE_TO_LEVEL: Record<string, string> = {
  'Db': 'D', 'D': 'D',
  'Df': 'I', 'I': 'I', 'N': 'I',
  'E': 'E', 'Er': 'E',
  'F': 'F', 'Ft': 'F',
  'W': 'W',
};

// Extract message part (after "TAG: ") — Android
const MESSAGE_RE = /^\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\s+\d+\s+\d+\s+[VDIWEF]\s+[^:]+:\s*(.*)/;

// Extract message part — iOS compact (after [subsystem:category])
const IOS_MESSAGE_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+\s+\w{1,2}\s+\w+\[[\d:a-f]+\]\s+(?:\[[^\]]+\]\s+)?(.*)/;

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
      // Try Android format
      const androidMatch = ANDROID_LEVEL_RE.exec(line);
      if (androidMatch) {
        if (SEVERITY[androidMatch[1]] < minSeverity) return false;
      } else {
        // Try iOS compact format
        const iosMatch = IOS_LEVEL_RE.exec(line);
        if (iosMatch) {
          const mapped = IOS_CODE_TO_LEVEL[iosMatch[1]] || 'I';
          if (SEVERITY[mapped] < minSeverity) return false;
        } else {
          return false;
        }
      }
    }

    if (matchers) {
      const androidMsg = MESSAGE_RE.exec(line);
      const iosMsg = !androidMsg ? IOS_MESSAGE_RE.exec(line) : null;
      const message = androidMsg?.[1] ?? iosMsg?.[1] ?? line;
      if (!matchers.some((re) => re.test(message))) return false;
    }

    return true;
  };
}
