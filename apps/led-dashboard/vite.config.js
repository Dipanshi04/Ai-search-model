import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
export default defineConfig({
    plugins: [react(), tailwindcss()],
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
        port: 3004,
        host: 'localhost',
        proxy: {
            '/api': {
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
