import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@dashboard': path.resolve(__dirname, 'src/app/dashboard'),
    },
  },
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      '/auth': 'http://localhost:3000',
      '/me': 'http://localhost:3000',
      '/users': 'http://localhost:3000',
      '/roles': 'http://localhost:3000',
      '/organizations': 'http://localhost:3000',
      '/contracts': 'http://localhost:3000',
      '/demo': 'http://localhost:3000',
      '/simulations': 'http://localhost:3000',
      '/compliance': 'http://localhost:3000',
      '/risk': 'http://localhost:3000',
      '/audit-trail': 'http://localhost:3000',
      '/catalog': 'http://localhost:3000',
      '/review-queue': 'http://localhost:3000',
      '/extracted-fields': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
      '/advisor': 'http://localhost:3000',
    },
  },
});
