import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Relative base so the game works on GitHub Pages project URLs
  // (e.g. https://thelukehendy.github.io/global-entry-passport/)
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        trumpPreview: resolve(__dirname, 'trump-preview.html'),
      },
    },
  },
});
