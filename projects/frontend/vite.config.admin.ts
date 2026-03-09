import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Dev-only plugin: intercepts all non-asset, non-API requests and serves
// admin.html via Vite's transformIndexHtml (which injects the HMR client).
// Without this, Vite's dev server would serve index.html (the chat app) for /.
function serveAdminHtml(): Plugin {
  return {
    name: 'serve-admin-html',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '/';
        // Strip query string before checking for a file extension — Vite appends
        // ?v=<hash> for cache-busting, which would fool a naive end-of-string check.
        const pathname = url.split('?')[0];
        const hasExtension = /\.\w+$/.test(pathname);
        const isViteInternal = url.startsWith('/@') || url.startsWith('/__') || pathname.startsWith('/node_modules/');
        if (!hasExtension && !isViteInternal && !url.startsWith('/api')) {
          const adminHtmlPath = path.resolve(__dirname, 'admin.html');
          const raw = fs.readFileSync(adminHtmlPath, 'utf-8');
          const html = await server.transformIndexHtml(url, raw);
          res.setHeader('Content-Type', 'text/html');
          res.end(html);
          return;
        }
        next();
      });
    },
  };
}

// Admin app Vite config.
// Dev: runs at localhost:5174 with base '/'.
// Prod build: base '/admin/' so assets resolve correctly under the /admin/ path prefix.
export default defineConfig(({ command }) => ({
  plugins: [react(), serveAdminHtml()],
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
