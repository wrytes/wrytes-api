import { defineConfig } from 'tsup';

export default defineConfig({
  entry:    ['exports/index.ts'],
  format:   ['cjs'],
  dts:      true,
  clean:    true,
  outDir:   'pkg',
  tsconfig: 'exports/tsconfig.json',
  external: [
    '@nestjs/common',
    '@nestjs/core',
    'reflect-metadata',
  ],
});
