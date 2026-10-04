import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Plain `.js` on purpose.
 *
 * Vite transpiles a TypeScript config by launching the esbuild service as a
 * child process, which some sandboxed and locked-down Windows environments
 * block. A JavaScript config is loaded directly by Node, so `vite dev`,
 * `vite build` and `vite preview` all work without spawning a helper process.
 */

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      // Keeps the browser on a single origin in development, mirroring the
      // Vercel rewrite used in production.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    /**
     * Minification is on by default and is what production deploys use.
     *
     * Setting `RF_NO_MINIFY=1` disables it. esbuild's minify pass writes a temp
     * file and then deletes it, and some locked-down Windows hosts deny that
     * delete to the esbuild service process. Verification suites can therefore
     * request an unminified bundle, which exercises identical application code
     * without depending on that step.
     */
    minify: process.env.RF_NO_MINIFY === '1' ? false : 'esbuild',
    rollupOptions: {
      output: {
        /**
         * Vendor splitting for the libraries every page needs.
         *
         * Three.js / React Three Fiber are deliberately NOT listed here. Pinning
         * a lazily-imported library into a named chunk makes Rollup treat that
         * chunk as a dependency of the importing chunk, so Vite emits
         * `<link rel="modulepreload">` for it in index.html — which made every
         * visitor, phones included, download the ~820 kB 3D bundle before the
         * hero guard could decide whether the scene was wanted. Left automatic,
         * Rollup emits it as a true async chunk that only loads on demand.
         */
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          state: ['@reduxjs/toolkit', 'react-redux'],
          charts: ['recharts'],
          motion: ['framer-motion'],
          i18n: ['i18next', 'react-i18next'],
        },
      },
    },
  },
});
