import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { createInterface } from 'readline';
import type { Platform } from './types.js';

export async function detectAppId(cwd: string, platform: Platform): Promise<string | null> {
  const ids = await collectAllIds(cwd, platform);

  if (ids.length === 0) return null;
  if (ids.length === 1) return ids[0];

  return promptChoice(ids);
}

export async function collectAllIds(cwd: string, platform: Platform): Promise<string[]> {
  const found = new Set<string>();

  // 1. Try app.json (Expo + bare RN)
  const appJsonIds = await tryAppJson(cwd, platform);
  for (const id of appJsonIds) found.add(id);

  // 2. Try platform-specific files
  if (platform === 'android') {
    const gradleIds = await tryBuildGradle(cwd);
    for (const id of gradleIds) found.add(id);
  }
  if (platform === 'ios') {
    const xcodeIds = await tryXcodeProject(cwd);
    for (const id of xcodeIds) found.add(id);
  }

  return [...found];
}

async function tryAppJson(cwd: string, platform: Platform): Promise<string[]> {
  try {
    const raw = await readFile(join(cwd, 'app.json'), 'utf8');
    const json = JSON.parse(raw);
    const ids: string[] = [];
    if (platform === 'android') {
      const id = json?.expo?.android?.package ?? json?.android?.package;
      if (id) ids.push(id);
    }
    if (platform === 'ios') {
      const id = json?.expo?.ios?.bundleIdentifier ?? json?.ios?.bundleIdentifier;
      if (id) ids.push(id);
    }
    return ids;
  } catch {
    return [];
  }
}

async function tryBuildGradle(cwd: string): Promise<string[]> {
  try {
    const raw = await readFile(join(cwd, 'android', 'app', 'build.gradle'), 'utf8');

    // Collect base applicationIds from productFlavors
    const baseIds = [...raw.matchAll(/applicationId\s+["']([^"']+)["']/g)].map((m) => m[1]);

    // Collect applicationIdSuffix from buildTypes
    const suffixes = [...raw.matchAll(/applicationIdSuffix\s+["']([^"']*)["']/g)]
      .map((m) => m[1])
      .filter((s) => s.length > 0);
    const uniqueSuffixes = [...new Set(suffixes)];

    // Generate all combinations: base + suffix
    const ids = new Set(baseIds);
    for (const base of baseIds) {
      for (const suffix of uniqueSuffixes) {
        ids.add(base + suffix);
      }
    }

    return [...ids];
  } catch {
    return [];
  }
}

async function tryXcodeProject(cwd: string): Promise<string[]> {
  try {
    const iosDir = join(cwd, 'ios');
    const files = await readdir(iosDir);
    const xcodeproj = files.find((f) => f.endsWith('.xcodeproj'));
    if (!xcodeproj) return [];
    const pbx = await readFile(join(iosDir, xcodeproj, 'project.pbxproj'), 'utf8');
    const matches = [...pbx.matchAll(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*([^;]+)/g)];
    const ids = new Set<string>();
    for (const m of matches) {
      const id = m[1].trim().replace(/"/g, '');
      if (id && !id.includes('$(')) ids.add(id);
    }
    return [...ids];
  } catch {
    return [];
  }
}

export function promptChoice(ids: string[]): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    console.log('\nMultiple app identifiers found:\n');
    ids.forEach((id, i) => console.log(`  ${i + 1}) ${id}`));
    console.log('');
    rl.question('Select [1]: ', (answer) => {
      rl.close();
      const idx = parseInt(answer || '1', 10) - 1;
      resolve(ids[idx] ?? ids[0]);
    });
  });
}
