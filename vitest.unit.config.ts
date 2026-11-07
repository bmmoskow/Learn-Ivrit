import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.unittest.{ts,tsx}', 'supabase/**/*.unittest.{ts,tsx}'],
    // A handful of heavy tests (multi-step userEvent typing + Radix Select +
    // several waitFors — e.g. Contact's edge-function form, the in-process
    // integration suites) legitimately take a few seconds. Under a full parallel
    // run on a busy machine (e.g. with the local Supabase Docker stack also
    // running) they can blow the 5s default and flake, even though they pass in
    // isolation and in CI. Raise the ceiling so a genuinely-passing-but-slow test
    // is never failed for load; a truly hung test still fails, just later.
    testTimeout: 15000,
    hookTimeout: 15000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
