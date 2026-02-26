import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    base: process.env.GITHUB_ACTIONS ? '/StickerNest5.0/' : '/',
    resolve: {
        dedupe: ['three', 'react', 'react-dom'],
        alias: {
            '@sn/types': path.resolve(__dirname, './src/kernel/schemas/index.ts'),
        },
    },
    server: {
        port: 5173,
        strictPort: false,
    },
});
//# sourceMappingURL=vite.config.js.map