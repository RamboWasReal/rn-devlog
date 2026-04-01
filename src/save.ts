import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import type { Saver } from './types.js';

export function createSaver(savePath: string | boolean): Saver {
  let filePath: string;

  if (savePath === true) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    filePath = path.join('./logs', `${timestamp}.log`);
  } else {
    filePath = savePath as string;
  }

  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const stream = fs.createWriteStream(filePath, { flags: 'a' });

  return {
    path: filePath,
    write(line: string) {
      stream.write(line + '\n');
    },
    close() {
      stream.end();
    },
  };
}

export async function clearLogs(dir = './logs'): Promise<void> {
  try {
    const entries = await fsp.readdir(dir);
    await Promise.all(entries.map((entry) => fsp.unlink(path.join(dir, entry))));
  } catch (err: any) {
    if (err.code === 'ENOENT') return;
    throw err;
  }
}
