import { describe, it, expect, vi } from 'vitest';
import { createDedup } from '../src/dedup.js';

describe('createDedup', () => {
  it('writes first occurrence immediately', () => {
    const written: string[] = [];
    const dedup = createDedup((line) => written.push(line));

    dedup.write('03-25 10:00:00.000  1234  5678 I MyTag: hello', 'colorized-hello');
    expect(written).toEqual(['colorized-hello']);
  });

  it('suppresses consecutive identical messages (ignoring timestamps/PIDs)', () => {
    const written: string[] = [];
    const dedup = createDedup((line) => written.push(line));

    dedup.write('03-25 10:00:00.000  1234  5678 I MyTag: hello', 'colorized-hello');
    dedup.write('03-25 10:00:01.000  1234  5678 I MyTag: hello', 'colorized-hello');
    dedup.write('03-25 10:00:02.000  1234  5678 I MyTag: hello', 'colorized-hello');

    // Only one write call — duplicates suppressed
    expect(written).toEqual(['colorized-hello']);
  });

  it('writes new message when content changes', () => {
    const written: string[] = [];
    const dedup = createDedup((line) => written.push(line));

    dedup.write('03-25 10:00:00.000  1234  5678 I MyTag: hello', 'colorized-hello');
    dedup.write('03-25 10:00:01.000  1234  5678 I MyTag: world', 'colorized-world');

    expect(written).toEqual(['colorized-hello', 'colorized-world']);
  });

  it('flush outputs count indicator to stdout for duplicates', () => {
    const written: string[] = [];
    const dedup = createDedup((line) => written.push(line));
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    dedup.write('03-25 10:00:00.000  1234  5678 I MyTag: hello', 'colorized-hello');
    dedup.write('03-25 10:00:01.000  1234  5678 I MyTag: hello', 'colorized-hello');
    dedup.write('03-25 10:00:02.000  1234  5678 I MyTag: hello', 'colorized-hello');
    dedup.flush();

    // Should have written the count indicator
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('x3');

    stdoutSpy.mockRestore();
  });

  it('flush does nothing when count is 1', () => {
    const written: string[] = [];
    const dedup = createDedup((line) => written.push(line));
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    dedup.write('03-25 10:00:00.000  1234  5678 I MyTag: hello', 'colorized-hello');
    dedup.flush();

    expect(stdoutSpy).not.toHaveBeenCalled();
    stdoutSpy.mockRestore();
  });
});
