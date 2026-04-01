const UNITS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDuration(input: string): number {
  const match = input.match(/^(\d+)\s*([smhd])$/i);
  if (!match) {
    throw new Error(
      `Invalid duration "${input}". Use a number followed by s, m, h, or d (e.g. 5m, 30s, 1h).`,
    );
  }
  return parseInt(match[1], 10) * UNITS[match[2].toLowerCase()];
}

// Android timestamp: MM-DD HH:MM:SS.mmm (no year — assume current year)
const ANDROID_TS_RE = /^(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.\d+/;

// iOS timestamp: YYYY-MM-DD HH:MM:SS.mmm
const IOS_TS_RE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.\d+/;

function parseLogTimestamp(line: string): Date | null {
  const android = ANDROID_TS_RE.exec(line);
  if (android) {
    const now = new Date();
    return new Date(
      now.getFullYear(),
      parseInt(android[1], 10) - 1,
      parseInt(android[2], 10),
      parseInt(android[3], 10),
      parseInt(android[4], 10),
      parseInt(android[5], 10),
    );
  }

  const ios = IOS_TS_RE.exec(line);
  if (ios) {
    return new Date(
      parseInt(ios[1], 10),
      parseInt(ios[2], 10) - 1,
      parseInt(ios[3], 10),
      parseInt(ios[4], 10),
      parseInt(ios[5], 10),
      parseInt(ios[6], 10),
    );
  }

  return null;
}

export function createSinceFilter(durationMs: number): (line: string) => boolean {
  const cutoff = new Date(Date.now() - durationMs);

  return (line: string) => {
    const ts = parseLogTimestamp(line);
    if (!ts) return true; // pass through lines without timestamps (continuations, etc.)
    return ts >= cutoff;
  };
}
