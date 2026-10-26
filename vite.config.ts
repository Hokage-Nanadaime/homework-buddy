import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [preact(), viteSingleFile()],
  test: { testTimeout: 60000, include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'src/**/*.test.ts'] },
});
