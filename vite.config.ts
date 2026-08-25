import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const configuredMode = process.env.VITE_APP_RUNTIME_MODE ?? loadEnv(mode, process.cwd(), '').VITE_APP_RUNTIME_MODE;
  return ({
  base: '/ai-office/',
  define: {
    'import.meta.env.VITE_APP_RUNTIME_MODE': JSON.stringify(configuredMode || (command === 'serve' ? 'local-ai' : 'public-demo')),
  },
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    globals: true,
  },
  });
});
