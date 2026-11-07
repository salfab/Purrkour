import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A repository Pages site is published under /Purrkour/, not at /.
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === 'true' ? '/Purrkour/' : '/',
  server: { host: '0.0.0.0' },
});
