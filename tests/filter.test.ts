import { describe, it, expect } from 'vitest';
import { createFilter } from '../src/filter.js';

describe('createFilter', () => {
  it('passes everything with no filters', () => {
    const fn = createFilter({});
    expect(fn('anything')).toBe(true);
  });

  it('filters by level (error only)', () => {
    const fn = createFilter({ level: 'error' });
    expect(fn('03-25 10:00:00.000  1234  5678 E MyTag: err')).toBe(true);
    expect(fn('03-25 10:00:00.000  1234  5678 F MyTag: fatal')).toBe(true);
    expect(fn('03-25 10:00:00.000  1234  5678 D MyTag: debug')).toBe(false);
  });

  it('filters by level (warn and above)', () => {
    const fn = createFilter({ level: 'warn' });
    expect(fn('03-25 10:00:00.000  1234  5678 W MyTag: warn')).toBe(true);
    expect(fn('03-25 10:00:00.000  1234  5678 E MyTag: err')).toBe(true);
    expect(fn('03-25 10:00:00.000  1234  5678 I MyTag: info')).toBe(false);
  });

  it('filters by pattern', () => {
    const fn = createFilter({ patterns: ['Network'] });
    expect(fn('Network request failed')).toBe(true);
    expect(fn('UI rendered')).toBe(false);
  });

  it('filters by multiple patterns (OR logic)', () => {
    const fn = createFilter({ patterns: ['Network', 'API'] });
    expect(fn('Network request failed')).toBe(true);
    expect(fn('API call succeeded')).toBe(true);
    expect(fn('UI rendered')).toBe(false);
  });

  it('combines level + pattern (AND logic)', () => {
    const fn = createFilter({ level: 'error', patterns: ['crash'] });
    expect(fn('03-25 10:00:00.000  1234  5678 E MyTag: crash happened')).toBe(true);
    expect(fn('03-25 10:00:00.000  1234  5678 E MyTag: timeout')).toBe(false);
    expect(fn('03-25 10:00:00.000  1234  5678 D MyTag: crash debug')).toBe(false);
  });

  it('pattern matching is case insensitive', () => {
    const fn = createFilter({ patterns: ['network'] });
    expect(fn('NETWORK request failed')).toBe(true);
    expect(fn('Network request failed')).toBe(true);
  });

  it('pattern matches message only, not tag/metadata', () => {
    const fn = createFilter({ patterns: ['dialogue'] });
    // "dialogue" in tag only — should NOT match
    expect(fn('03-25 10:00:00.000  1234  5678 I ca.diagram.dialogue: app started')).toBe(false);
    // "dialogue" in message — should match
    expect(fn('03-25 10:00:00.000  1234  5678 I MyTag: dialogue session created')).toBe(true);
    // no match at all
    expect(fn('03-25 10:00:00.000  1234  5678 I MyTag: nothing here')).toBe(false);
  });

  it('pattern matches non-logcat lines as full text fallback', () => {
    const fn = createFilter({ patterns: ['hello'] });
    expect(fn('hello world')).toBe(true);
    expect(fn('goodbye')).toBe(false);
  });

  it('excludes lines matching --exclude pattern', () => {
    const fn = createFilter({ exclude: ['noisy'] });
    expect(fn('03-25 10:00:00.000  1234  5678 I MyTag: noisy log output')).toBe(false);
    expect(fn('03-25 10:00:00.000  1234  5678 I MyTag: useful log')).toBe(true);
  });

  it('excludes with multiple patterns (OR logic)', () => {
    const fn = createFilter({ exclude: ['noisy', 'spam'] });
    expect(fn('03-25 10:00:00.000  1234  5678 I MyTag: noisy stuff')).toBe(false);
    expect(fn('03-25 10:00:00.000  1234  5678 I MyTag: spam message')).toBe(false);
    expect(fn('03-25 10:00:00.000  1234  5678 I MyTag: important log')).toBe(true);
  });

  it('combines --filter and --exclude (include then exclude)', () => {
    const fn = createFilter({ patterns: ['Network'], exclude: ['polling'] });
    expect(fn('03-25 10:00:00.000  1234  5678 I MyTag: Network request sent')).toBe(true);
    expect(fn('03-25 10:00:00.000  1234  5678 I MyTag: Network polling tick')).toBe(false);
    expect(fn('03-25 10:00:00.000  1234  5678 I MyTag: UI rendered')).toBe(false);
  });

  it('exclude is case insensitive', () => {
    const fn = createFilter({ exclude: ['NOISY'] });
    expect(fn('noisy log output')).toBe(false);
    expect(fn('Noisy Log Output')).toBe(false);
  });
});
