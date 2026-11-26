import { defineConfig } from 'vite';

// One script, one stylesheet, the zombie models inlined: the input for scripts/pack-single.mjs,
// which makes the one-file page that gets published as the claude.ai artifact.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022', outDir: 'dist-single', emptyOutDir: true, cssCodeSplit: false,
    assetsInlineLimit: 1e9, modulePreload: false, chunkSizeWarningLimit: 6000,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
