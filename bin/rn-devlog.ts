#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import { detectAppId } from '../src/detect.js';
import { streamAndroid } from '../src/android.js';
import { streamIos } from '../src/ios.js';
import { createFilter } from '../src/filter.js';
import { createSaver, clearLogs } from '../src/save.js';
import { createNoiseFilter } from '../src/noise.js';
import { parseDuration, createSinceFilter } from '../src/since.js';
import { createStats } from '../src/stats.js';

// Load .devlogrc defaults from cwd
function loadRc(): Record<string, unknown> {
  const rcPath = '.devlogrc';
  try {
    const content = fs.readFileSync(rcPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

const rc = loadRc();

program
  .name('rn-devlog')
  .description('Stream Android & iOS logs for React Native apps')
  .option('--android', 'Force Android')
  .option('--ios', 'Force iOS')
  .option('--appId <id>', 'Manual app identifier')
  .option('--error', 'Show only errors')
  .option('--warn', 'Show warnings and above')
  .option('--info', 'Show info and above')
  .option('--debug', 'Show debug and above')
  .option('--filter <pattern...>', 'Filter by text pattern')
  .option('--save [path]', 'Save logs to file')
  .option('--clear', 'Delete saved logs')
  .option('--all', 'Show all device logs (no app filter)')
  .option('--tail <n>', 'Show last N lines then exit', parseInt)
  .option('-f, --follow', 'Keep listening after --tail (default without --tail)')
  .option('--exclude <pattern...>', 'Exclude lines matching pattern (opposite of --filter)')
  .option('--since <duration>', 'Only show logs from the last duration (e.g. 5m, 30s, 1h)')
  .option('--regex', 'Treat --filter and --exclude patterns as regex (default: plain text)')
  .option('--no-dedup', 'Show duplicate consecutive lines (default: collapsed)')
  .option('--no-stats', 'Hide session stats on exit')
  .option('--verbose', 'Show all logs including system noise (GC, metro polling, etc.)')
  .option('--js', 'Show only JavaScript logs (ReactNativeJS)')
  .option('--native', 'Show only native logs (skip JS)')
  .parse();

// Merge: CLI opts override .devlogrc
const cliOpts = program.opts() as any;
const opts = { ...rc, ...cliOpts };

// Handle --clear
if (opts.clear) {
  await clearLogs('./logs');
  console.log(chalk.green('Logs cleared.'));
  process.exit(0);
}

// Determine platform
let platform: string;
if (opts.android) platform = 'android';
else if (opts.ios) platform = 'ios';
else {
  // Auto-detect: try adb first, then iOS
  try {
    const { execSync } = await import('child_process');
    execSync('adb get-state', { stdio: 'ignore' });
    platform = 'android';
  } catch {
    platform = 'ios';
  }
}

// Resolve appId
let appId = opts.appId;
if (!appId && !opts.all) {
  appId = await detectAppId(process.cwd(), platform as 'android' | 'ios');
  if (!appId) {
    console.error(chalk.red('Could not detect app identifier. Use --appId <id> or --all'));
    process.exit(1);
  }
  console.log(chalk.cyan(`Detected app: ${appId}`));
}

// Determine log level filter
let level: string | null = null;
if (opts.error) level = 'error';
else if (opts.warn) level = 'warn';
else if (opts.info) level = 'info';
else if (opts.debug) level = 'debug';

// Create filter
const filter = createFilter({
  level: level ?? undefined,
  patterns: opts.filter,
  exclude: opts.exclude,
  regex: opts.regex,
});

// Create saver if --save
let saver = null;
if (opts.save !== undefined) {
  saver = createSaver(opts.save === true ? true : opts.save);
  console.log(chalk.cyan(`Saving logs to: ${saver.path || 'file'}`));
}

// Since filter
let sinceFilter = null;
if (opts.since) {
  const ms = parseDuration(opts.since);
  sinceFilter = createSinceFilter(ms);
}

// Stats
const stats = opts.stats !== false ? createStats() : null;

// Stream
// follow = true by default, unless --tail without -f
const follow = opts.tail ? !!opts.follow : true;
const noiseFilter = opts.verbose ? null : createNoiseFilter();
const streamOpts = {
  appId,
  filter,
  noiseFilter,
  sinceFilter,
  saver,
  all: opts.all,
  tail: opts.tail,
  follow,
  patterns: opts.filter,
  dedup: opts.dedup !== false,
  jsOnly: opts.js,
  nativeOnly: opts.native,
  stats,
};

try {
  if (platform === 'android') {
    await streamAndroid(streamOpts);
  } else {
    await streamIos(streamOpts);
  }
} catch (err: any) {
  console.error(chalk.red(err.message));
  process.exit(1);
}
