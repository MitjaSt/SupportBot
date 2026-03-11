import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Dev-only plugin: replaces Vite's default index.html with admin.html so the
// admin dev server (port 5174) serves the admin entry point instead of chat.
// Uses transformIndexHtml (guaranteed to run in Vite's HTML pipeline) rather
// than a configureServer middleware, which has ordering issues in Vite 7.
function serveAdminHtml(): Plugin {
  return {
    name: 'serve-admin-html',
    transformIndexHtml: {
      order: 'pre',
      handler() {
        return fs.readFileSync(path.resolve(__dirname, 'admin.html'), 'utf-8');
      },
    },
  };
}

// Admin app Vite config.
// Dev: runs at localhost:5174 with base '/'.
// Prod build: base '/admin/' so assets resolve correctly under the /admin/ path prefix.
export default defineConfig(({ command }) => ({
  plugins: [react(), serveAdminHtml()],
  cacheDir: 'node_modules/.vite-admin',
  base: command === 'build' ? '/admin/' : '/',
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'admin.html'),
    },
    outDir: 'dist/admin',
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3030',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
}));
