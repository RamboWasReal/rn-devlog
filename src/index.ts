export { detectAppId, collectAllIds } from './detect.js';
export { colorizeLine, parseLogLevel, highlightPatterns } from './colorize.js';
export { createFilter } from './filter.js';
export { createSaver, clearLogs } from './save.js';
export { createDedup } from './dedup.js';
export { createNoiseFilter } from './noise.js';
export { streamAndroid } from './android.js';
export { streamIos } from './ios.js';
export type { Platform, LogLevel, Saver, StreamOptions, FilterOptions } from './types.js';
