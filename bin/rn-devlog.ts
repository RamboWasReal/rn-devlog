#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import { detectAppId } from '../src/detect.js';
import { streamAndroid } from '../src/android.js';
import { streamIos } from '../src/ios.js';
import { createFilter } from '../src/filter.js';
import { createSaver, clearLogs } from '../src/save.js';
import { createNoiseFilter } from '../src/noise.js';

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
  .option('--regex', 'Treat --filter patterns as regex (default: plain text)')
  .option('--no-dedup', 'Show duplicate consecutive lines (default: collapsed)')
  .option('--verbose', 'Show all logs including system noise (GC, metro polling, etc.)')
  .option('--js', 'Show only JavaScript logs (ReactNativeJS)')
  .option('--native', 'Show only native logs (skip JS)')
  .parse();

const opts = program.opts() as any;

// Handle --clear
if (opts.clear) {
  await clearLogs('./logs');
  console.log(chalk.green('Logs cleared.'));
  process.exit(0);
}

// Determine platform
let platform: string | null = null;
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
const filter = createFilter({ level: level ?? undefined, patterns: opts.filter, regex: opts.regex });

// Create saver if --save
let saver = null;
if (opts.save !== undefined) {
  saver = createSaver(opts.save === true ? true : opts.save);
  console.log(chalk.cyan(`Saving logs to: ${saver.path || 'file'}`));
}

// Stream
// follow = true by default, unless --tail without -f
const follow = opts.tail ? !!opts.follow : true;
const noiseFilter = opts.verbose ? null : createNoiseFilter();
const streamOpts = { appId, filter, noiseFilter, saver, all: opts.all, tail: opts.tail, follow, patterns: opts.filter, dedup: opts.dedup !== false, jsOnly: opts.js, nativeOnly: opts.native };

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
