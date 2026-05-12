import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    TanStackRouterVite({ routesDirectory: 'src/routes', generatedRouteTree: 'src/routeTree.gen.ts' }),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Service worker is disabled in dev; enable in build only
      devOptions: { enabled: false },
      manifest: {
        name: 'K-OS',
        short_name: 'K-OS',
        description: 'Personal life-management OS',
        theme_color: '#5a7a4a',
        background_color: '#fbfbfb',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      // Forward /api/* to the local Hono dev server (packages/api dev script, port 3000).
      // Production uses Vercel Serverless Functions (apps/web/api/[[...route]].ts).
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
