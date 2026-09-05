import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Dev server talks to the API on its own port; in production the API serves
    // this bundle from the same origin, so the front end always calls "/api/...".
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  build: { outDir: 'dist', sourcemap: true },
});
