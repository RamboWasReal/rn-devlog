import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'bin/rn-devlog.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  splitting: false,
  outExtension: () => ({ js: '.js' }),
  banner: ({ format }) => {
    if (format === 'esm') return { js: '' };
    return {};
  },
});
