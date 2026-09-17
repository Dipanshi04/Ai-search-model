import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  build: {
    // heic-to (the iPhone HEIC-photo conversion library) is the only chunk
    // that trips Vite's default 500kB warning — it's already dynamically
    // imported (see packages/shared/src/heic.ts) and confirmed via network
    // inspection to never load except when a user actually uploads a HEIC
    // photo on the Register page, so the warning is a false alarm. Raised
    // rather than silenced entirely, so a genuinely new oversized chunk in
    // the *initial* bundle would still get flagged.
    chunkSizeWarningLimit: 3200,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@isa/types': path.resolve(__dirname, '../../packages/types/src'),
      '@isa/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@isa/config': path.resolve(__dirname, '../../packages/config/src'),
      '@isa/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@isa/socket-client': path.resolve(__dirname, '../../packages/socket-client/src'),
    },
  },
  server: {
    port: 3000,
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
