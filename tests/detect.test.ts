import { describe, it, expect } from 'vitest';
import { detectAppId, collectAllIds } from '../src/detect.js';
import { mkdtemp, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('detectAppId', () => {
  let dir: string;

  const setup = async () => {
    dir = await mkdtemp(join(tmpdir(), 'rn-devlog-'));
  };
  const cleanup = async () => rm(dir, { recursive: true });

  it('reads android package from app.json (expo)', async () => {
    await setup();
    await writeFile(join(dir, 'app.json'), JSON.stringify({
      expo: { android: { package: 'com.expo.app' } }
    }));
    const result = await detectAppId(dir, 'android');
    expect(result).toBe('com.expo.app');
    await cleanup();
  });

  it('reads ios bundle id from app.json (expo)', async () => {
    await setup();
    await writeFile(join(dir, 'app.json'), JSON.stringify({
      expo: { ios: { bundleIdentifier: 'com.expo.ios' } }
    }));
    const result = await detectAppId(dir, 'ios');
    expect(result).toBe('com.expo.ios');
    await cleanup();
  });

  it('reads applicationId from build.gradle', async () => {
    await setup();
    await mkdir(join(dir, 'android', 'app'), { recursive: true });
    await writeFile(join(dir, 'android', 'app', 'build.gradle'),
      'android {\n  defaultConfig {\n    applicationId "com.gradle.app"\n  }\n}'
    );
    const result = await detectAppId(dir, 'android');
    expect(result).toBe('com.gradle.app');
    await cleanup();
  });

  it('returns null when nothing found', async () => {
    await setup();
    const result = await detectAppId(dir, 'android');
    expect(result).toBeNull();
    await cleanup();
  });

  it('collects multiple applicationIds from build.gradle flavors', async () => {
    await setup();
    await mkdir(join(dir, 'android', 'app'), { recursive: true });
    await writeFile(join(dir, 'android', 'app', 'build.gradle'),
      'productFlavors {\n  main {\n    applicationId "com.app.main"\n  }\n  staging {\n    applicationId "com.app.staging"\n  }\n}'
    );
    const ids = await collectAllIds(dir, 'android');
    expect(ids).toContain('com.app.main');
    expect(ids).toContain('com.app.staging');
    expect(ids.length).toBe(2);
    await cleanup();
  });
});
