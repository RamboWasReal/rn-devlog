import chalk from 'chalk';

// Strip all timestamps and numeric noise for comparison
function extractMessage(line: string): string {
  return line
    .replace(/\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+/g, '')       // Android timestamp
    .replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+/g, '')  // iOS timestamp
    .replace(/\d{2}:\d{2}:\d{2}\.\d+/g, '')                     // Embedded timestamps in message
    .replace(/\s+\d+\s+\d+\s+/g, ' ')                           // Android PID/TID
    .replace(/\[\w+:[a-f0-9]+\]/g, '')                           // iOS [pid:tid]
    .trim();
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
