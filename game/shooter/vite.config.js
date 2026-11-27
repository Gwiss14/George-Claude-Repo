import { defineConfig } from 'vite';

// Rooftop Shootout as a normal site: `npm run dev`, `npm run build` (dist/).
export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 1000 },
});
