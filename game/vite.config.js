import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022', chunkSizeWarningLimit: 1000,
    rollupOptions: { input: { main: 'index.html', fps: 'fps.html' } }, // the brawler and the shooter
  },
  esbuild: { target: 'es2022' },
});
