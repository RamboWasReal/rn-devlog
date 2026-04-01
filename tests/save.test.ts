import { describe, it, expect, afterEach } from 'vitest';
import { createSaver, clearLogs } from '../src/save.js';
import { mkdtemp, readFile, writeFile, readdir } from 'fs/promises';
import { rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('createSaver', () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true }).catch(() => {});
  });

  it('creates file at explicit path and writes lines', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rn-devlog-save-'));
    const filePath = join(tmpDir, 'test.log');

    const saver = createSaver(filePath);
    saver.write('line 1');
    saver.write('line 2');
    saver.close();

    // Wait for stream to flush
    await new Promise((r) => setTimeout(r, 50));

    const content = await readFile(filePath, 'utf-8');
    expect(content).toBe('line 1\nline 2\n');
  });

  it('creates directory if it does not exist', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rn-devlog-save-'));
    const filePath = join(tmpDir, 'nested', 'dir', 'test.log');

    const saver = createSaver(filePath);
    saver.write('hello');
    saver.close();

    await new Promise((r) => setTimeout(r, 50));

    const content = await readFile(filePath, 'utf-8');
    expect(content).toContain('hello');
  });

  it('auto-generates timestamped path when given true', () => {
    const saver = createSaver(true);
    expect(saver.path).toMatch(/^logs\//);
    expect(saver.path).toMatch(/\.log$/);
    saver.close();
    // Cleanup
    rm(saver.path).catch(() => {});
  });
});

describe('clearLogs', () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true }).catch(() => {});
  });

  it('removes all files in the directory', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'rn-devlog-clear-'));
    await writeFile(join(tmpDir, 'a.log'), 'data');
    await writeFile(join(tmpDir, 'b.log'), 'data');

    await clearLogs(tmpDir);

    const entries = await readdir(tmpDir);
    expect(entries).toEqual([]);
  });

  it('does not throw when directory does not exist', async () => {
    await expect(clearLogs('/tmp/nonexistent-rn-devlog-dir')).resolves.toBeUndefined();
  });
});
