import chalk from 'chalk';

// Extract the message part (without timestamp) for comparison
const MSG_RE = /^\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+\s+\d+\s+\d+\s+[VDIWEF]\s+(.+)/;

function extractMessage(line: string): string {
  const match = MSG_RE.exec(line);
  return match ? match[1] : line;
}

export function createDedup(writeFn: (colorized: string) => void): { write(line: string, colorized: string): void; flush(): void } {
  let lastMsg: string | null = null;
  let lastColorized: string | null = null;
  let count = 0;

  function flush() {
    if (count > 1) {
      // Overwrite last line with count
      process.stdout.write(`\x1b[1A\x1b[2K`); // move up, clear line
      process.stdout.write(lastColorized + chalk.dim(` (x${count})`) + '\n');
    }
  }

  return {
    write(line: string, colorized: string) {
      const msg = extractMessage(line);

      if (msg === lastMsg) {
        count++;
        return;
      }

      // New message — flush previous if needed
      flush();

      lastMsg = msg;
      lastColorized = colorized;
      count = 1;
      writeFn(colorized);
    },
    flush,
  };
}
