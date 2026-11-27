import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Host binding is 0.0.0.0 for VM previews. Extra allowed hosts come from
// VITE_ALLOWED_HOSTS at launch time, so no hostname is baked into the repo.
const allowedHosts = (process.env.VITE_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts,
    proxy: {
      '/v1': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/socket.io': { target: 'http://127.0.0.1:4000', changeOrigin: true, ws: true },
      // Dev-only bridge to the embedded S3 API so presigned browser uploads
      // stay same-origin (production presigns straight to R2).
      '/s3': {
        target: 'http://127.0.0.1:4568',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/s3/, ''),
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
