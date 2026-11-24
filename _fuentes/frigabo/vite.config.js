import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Dos apps independientes: tienda (index.html) y panel (admin.html)
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: { tienda: resolve(__dirname, 'index.html'), admin: resolve(__dirname, 'admin.html') },
    },
  },
});
