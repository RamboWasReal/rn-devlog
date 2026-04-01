import { describe, it, expect } from 'vitest';
import { createNoiseFilter } from '../src/noise.js';

describe('createNoiseFilter', () => {
  const isNotNoise = createNoiseFilter();

  it('passes normal app logs through', () => {
    expect(isNotNoise('03-25 10:00:00.000  1234  5678 I MyTag: user logged in')).toBe(true);
    expect(isNotNoise('03-25 10:00:00.000  1234  5678 E MyTag: crash happened')).toBe(true);
  });

  it('filters Android GC noise', () => {
    expect(isNotNoise('Background concurrent mark compact GC freed 1234 objects')).toBe(false);
    expect(isNotNoise('Background young concurrent copying GC freed 500 objects')).toBe(false);
    expect(isNotNoise('Explicit concurrent mark compact GC freed 200 objects')).toBe(false);
  });

  it('filters Android system noise', () => {
    expect(isNotNoise('hiddenapi: Accessing hidden method Landroid/os/some')).toBe(false);
    expect(isNotNoise('nativeloader: Load /data/app/lib.so')).toBe(false);
    expect(isNotNoise('ProfileInstaller: Installing profile')).toBe(false);
    expect(isNotNoise('Choreographer: Skipped 30 frames!')).toBe(false);
  });

  it('filters RN dev server polling noise', () => {
    expect(isNotNoise('[EventSource][onreadystatechange] readyState: 0')).toBe(false);
    expect(isNotNoise('Failed to connect to /10.0.2.2:8081')).toBe(false);
    expect(isNotNoise('Cannot connect to Metro')).toBe(false);
  });

  it('filters iOS system noise', () => {
    expect(isNotNoise('[com.apple.network: something')).toBe(false);
    expect(isNotNoise('[com.apple.CFNetwork: something')).toBe(false);
    expect(isNotNoise('nw_connection_create')).toBe(false);
    expect(isNotNoise('nw_endpoint_flow')).toBe(false);
  });

  it('does not filter legitimate iOS/Android logs', () => {
    expect(isNotNoise('2026-03-25 10:00:00.000 Db MyApp[123:456] User tapped button')).toBe(true);
    expect(isNotNoise('03-25 10:00:00.000  1234  5678 I ReactNativeJS: render complete')).toBe(
      true,
    );
  });
});
