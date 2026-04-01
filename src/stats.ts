import chalk from 'chalk';

const ANDROID_LEVEL_RE = /^\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\s+\d+\s+\d+\s+([VDIWEF])\s/;
const IOS_LEVEL_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+\s+(\w{1,2})\s/;

const IOS_CODE_TO_LEVEL: Record<string, string> = {
  Db: 'D',
  D: 'D',
  Df: 'I',
  I: 'I',
  N: 'I',
  E: 'E',
  Er: 'E',
  F: 'F',
  Ft: 'F',
  W: 'W',
};

export interface Stats {
  record(line: string): void;
  print(): void;
}

export function createStats(): Stats {
  const counts: Record<string, number> = {
    F: 0,
    E: 0,
    W: 0,
    I: 0,
    D: 0,
    V: 0,
  };
  let total = 0;

  return {
    record(line: string) {
      total++;
      const android = ANDROID_LEVEL_RE.exec(line);
      if (android) {
        counts[android[1]]++;
        return;
      }
      const ios = IOS_LEVEL_RE.exec(line);
      if (ios) {
        const mapped = IOS_CODE_TO_LEVEL[ios[1]] || 'I';
        counts[mapped]++;
        return;
      }
      counts['I']++;
    },

    print() {
      if (total === 0) return;
      const parts = [
        counts.F > 0 ? chalk.bold.red(`${counts.F} fatal`) : null,
        counts.E > 0 ? chalk.red(`${counts.E} error`) : null,
        counts.W > 0 ? chalk.yellow(`${counts.W} warn`) : null,
        counts.I > 0 ? chalk.green(`${counts.I} info`) : null,
        counts.D > 0 ? chalk.blue(`${counts.D} debug`) : null,
        counts.V > 0 ? chalk.dim(`${counts.V} verbose`) : null,
      ].filter(Boolean);

      process.stdout.write('\n');
      process.stdout.write(chalk.cyan(`Session: ${total} logs — ${parts.join(', ')}\n`));
    },
  };
}
