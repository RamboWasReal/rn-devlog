export type Platform = 'android' | 'ios';
export type LogLevel = 'verbose' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface Saver {
  path: string;
  write(line: string): void;
  close(): void;
}

export interface StreamOptions {
  appId: string;
  filter: (line: string) => boolean;
  noiseFilter: ((line: string) => boolean) | null;
  saver: Saver | null;
  all: boolean;
  tail?: number;
  follow: boolean;
  patterns?: string[];
  dedup?: boolean;
  jsOnly?: boolean;
  nativeOnly?: boolean;
}

export interface FilterOptions {
  level?: string;
  patterns?: string[];
  regex?: boolean;
}
