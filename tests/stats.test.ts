import { describe, it, expect, vi } from 'vitest';
import { createStats } from '../src/stats.js';

describe('createStats', () => {
  it('counts Android log levels', () => {
    const stats = createStats();

    stats.record('04-01 10:00:00.000  1234  5678 E MyTag: error');
    stats.record('04-01 10:00:01.000  1234  5678 E MyTag: another error');
    stats.record('04-01 10:00:02.000  1234  5678 W MyTag: warning');
    stats.record('04-01 10:00:03.000  1234  5678 I MyTag: info');

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stats.print();

    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('4 logs');
    expect(output).toContain('2 error');
    expect(output).toContain('1 warn');
    expect(output).toContain('1 info');

    stdoutSpy.mockRestore();
  });

  it('counts iOS log levels', () => {
    const stats = createStats();

    stats.record('2026-04-01 10:00:00.000 E MyApp[123:456] error');
    stats.record('2026-04-01 10:00:01.000 Db MyApp[123:456] debug');

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stats.print();

    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('2 logs');
    expect(output).toContain('1 error');
    expect(output).toContain('1 debug');

    stdoutSpy.mockRestore();
  });

  it('does not print when no logs recorded', () => {
    const stats = createStats();
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stats.print();
    expect(stdoutSpy).not.toHaveBeenCalled();
    stdoutSpy.mockRestore();
  });
});
