import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include:     ['src/**/__tests__/**/*.test.js'],
  },
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src'),
    },
  },
});
