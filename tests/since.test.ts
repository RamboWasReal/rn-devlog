import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseDuration, createSinceFilter } from '../src/since.js';

describe('parseDuration', () => {
  it('parses seconds', () => {
    expect(parseDuration('30s')).toBe(30_000);
  });

  it('parses minutes', () => {
    expect(parseDuration('5m')).toBe(300_000);
  });

  it('parses hours', () => {
    expect(parseDuration('2h')).toBe(7_200_000);
  });

  it('parses days', () => {
    expect(parseDuration('1d')).toBe(86_400_000);
  });

  it('throws on invalid format', () => {
    expect(() => parseDuration('abc')).toThrow('Invalid duration');
    expect(() => parseDuration('5x')).toThrow('Invalid duration');
    expect(() => parseDuration('')).toThrow('Invalid duration');
  });
});

describe('createSinceFilter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('passes recent Android logs', () => {
    vi.useFakeTimers();
    // Set "now" to 2026-04-01 10:05:00
    vi.setSystemTime(new Date(2026, 3, 1, 10, 5, 0));

    const filter = createSinceFilter(5 * 60_000); // 5 minutes
    // Log at 10:02:00 — within 5m window
    expect(filter('04-01 10:02:00.000  1234  5678 I MyTag: recent')).toBe(true);
  });

  it('rejects old Android logs', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 1, 10, 5, 0));

    const filter = createSinceFilter(5 * 60_000);
    // Log at 09:55:00 — outside 5m window
    expect(filter('04-01 09:55:00.000  1234  5678 I MyTag: old')).toBe(false);
  });

  it('passes recent iOS logs', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 1, 10, 5, 0));

    const filter = createSinceFilter(5 * 60_000);
    expect(filter('2026-04-01 10:03:00.000 Db MyApp[123:456] recent')).toBe(true);
  });

  it('rejects old iOS logs', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 1, 10, 5, 0));

    const filter = createSinceFilter(5 * 60_000);
    expect(filter('2026-04-01 09:50:00.000 Db MyApp[123:456] old')).toBe(false);
  });

  it('passes lines without timestamps (continuations)', () => {
    const filter = createSinceFilter(5 * 60_000);
    expect(filter('    at com.app.MyClass.method(MyClass.java:42)')).toBe(true);
  });
});
