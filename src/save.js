import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

export function createSaver(savePath) {
  let filePath;

  if (savePath === true) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    filePath = path.join('./logs', `${timestamp}.log`);
  } else {
    filePath = savePath;
  }

  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const stream = fs.createWriteStream(filePath, { flags: 'a' });

  return {
    write(line) {
      stream.write(line + '\n');
    },
    close() {
      stream.end();
    },
  };
}

export async function clearLogs(dir = './logs') {
  try {
    const entries = await fsp.readdir(dir);
    await Promise.all(entries.map((entry) => fsp.unlink(path.join(dir, entry))));
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }
}
