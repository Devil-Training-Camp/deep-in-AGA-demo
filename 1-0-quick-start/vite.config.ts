import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
    coverage: {
      include: ['src/utils/**'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
