import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { join } from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          'd3': ['d3'],
          'opencv': ['opencv.js']
        }
      }
    }
  },
  server: {
    port: 5173
  },
  optimizeDeps: {
    exclude: ['opencv.js']
  }
});
