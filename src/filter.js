// Android threadtime log format: MM-DD HH:MM:SS.mmm  PID  TID LEVEL TAG: message
// Level letter is the 7th whitespace-separated token (index 4 after splitting date+time+pid+tid).
const LEVEL_RE = /^\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\s+\d+\s+\d+\s+([VDIWEF])\s/;

const SEVERITY = { V: 0, D: 1, I: 2, W: 3, E: 4, F: 5 };

const LEVEL_MAP = {
  verbose: 'V',
  debug: 'D',
  info: 'I',
  warn: 'W',
  error: 'E',
  fatal: 'F',
};

/**
 * @param {{ level?: string, patterns?: string[] }} options
 * @returns {(line: string) => boolean}
 */
export function createFilter({ level, patterns } = {}) {
  const minSeverity = level ? SEVERITY[LEVEL_MAP[level]] : -1;
  const regexps = patterns?.length
    ? patterns.map((p) => new RegExp(p, 'i'))
    : null;

  return (line) => {
    if (minSeverity >= 0) {
      const match = LEVEL_RE.exec(line);
      if (!match) return false;
      if (SEVERITY[match[1]] < minSeverity) return false;
    }

    if (regexps) {
      if (!regexps.some((re) => re.test(line))) return false;
    }

    return true;
  };
}
