import { readFile } from 'fs/promises';
import { join } from 'path';

export async function detectAppId(cwd, platform) {
  const appId = await tryAppJson(cwd, platform);
  if (appId) return appId;

  if (platform === 'android') return tryBuildGradle(cwd);
  if (platform === 'ios') return tryXcodeProject(cwd);

  return null;
}

async function tryAppJson(cwd, platform) {
  try {
    const raw = await readFile(join(cwd, 'app.json'), 'utf8');
    const json = JSON.parse(raw);
    if (platform === 'android') return json?.expo?.android?.package ?? json?.android?.package ?? null;
    if (platform === 'ios') return json?.expo?.ios?.bundleIdentifier ?? json?.ios?.bundleIdentifier ?? null;
  } catch { return null; }
}

async function tryBuildGradle(cwd) {
  try {
    const raw = await readFile(join(cwd, 'android', 'app', 'build.gradle'), 'utf8');
    const match = raw.match(/applicationId\s+["']([^"']+)["']/);
    return match?.[1] ?? null;
  } catch { return null; }
}

async function tryXcodeProject(cwd) {
  try {
    const { readdir } = await import('fs/promises');
    const iosDir = join(cwd, 'ios');
    const files = await readdir(iosDir);
    const xcodeproj = files.find(f => f.endsWith('.xcodeproj'));
    if (!xcodeproj) return null;
    const pbx = await readFile(join(iosDir, xcodeproj, 'project.pbxproj'), 'utf8');
    const match = pbx.match(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*([^;]+)/);
    return match?.[1]?.trim()?.replace(/"/g, '') ?? null;
  } catch { return null; }
}
