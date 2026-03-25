import { describe, it, expect } from 'vitest';
import { colorizeLine, parseLogLevel } from '../src/colorize.js';

describe('parseLogLevel', () => {
  it('extracts E from android logcat line', () => {
    expect(parseLogLevel('03-25 10:00:00.000  1234  5678 E MyTag: error', 'android')).toBe('error');
  });
  it('extracts W from android logcat line', () => {
    expect(parseLogLevel('03-25 10:00:00.000  1234  5678 W MyTag: warn', 'android')).toBe('warn');
  });
  it('extracts I from android logcat line', () => {
    expect(parseLogLevel('03-25 10:00:00.000  1234  5678 I MyTag: info', 'android')).toBe('info');
  });
  it('extracts D from android logcat line', () => {
    expect(parseLogLevel('03-25 10:00:00.000  1234  5678 D MyTag: debug', 'android')).toBe('debug');
  });
  it('extracts V from android logcat line', () => {
    expect(parseLogLevel('03-25 10:00:00.000  1234  5678 V MyTag: verbose', 'android')).toBe('verbose');
  });
  it('extracts F from android logcat line', () => {
    expect(parseLogLevel('03-25 10:00:00.000  1234  5678 F MyTag: fatal', 'android')).toBe('fatal');
  });
  it('extracts Error from iOS log line', () => {
    expect(parseLogLevel('2026-03-25 10:00:00.000000-0400  MyApp[1234:5678] [Error] something', 'ios')).toBe('error');
  });
  it('extracts Fault from iOS log line', () => {
    expect(parseLogLevel('2026-03-25 10:00:00.000000-0400  MyApp[1234:5678] [Fault] something', 'ios')).toBe('fatal');
  });
  it('returns info for unrecognized', () => {
    expect(parseLogLevel('random line', 'android')).toBe('info');
  });
});

describe('colorizeLine', () => {
  it('returns a string (no crash)', () => {
    const result = colorizeLine('03-25 10:00:00.000  1234  5678 E MyTag: error', 'android');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
