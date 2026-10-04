import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { contentSecurityPolicy } from './csp.ts';

function cspMetaTag(authDomain: string): Plugin {
  return {
    name: 'csp-meta-tag',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: {
          'http-equiv': 'Content-Security-Policy',
          content: contentSecurityPolicy(authDomain),
        },
        injectTo: 'head-prepend',
      },
    ],
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    cspMetaTag(loadEnv(mode, process.cwd(), 'VITE_').VITE_FIREBASE_AUTH_DOMAIN ?? ''),
    VitePWA({
      // Let the user decide when to reload, so an update never interrupts an edit in progress.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Salva Dico',
        short_name: 'Dico',
        description: 'Dictionnaire personnel français, anglais, espagnol, italien.',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f7f7f5',
        theme_color: '#1f4e79',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the whole app shell so the app opens offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        // Never serve the SPA shell for serverless functions or the Firebase auth helper.
        navigateFallbackDenylist: [/^\/\.netlify\//, /^\/api\//, /^\/__\//],
      },
    }),
  ],
  build: {
    // The Firebase SDK chunk (~600 kB, ~180 kB gzipped) is expected and precached once.
    chunkSizeWarningLimit: 650,
    rolldownOptions: {
      output: {
        // Vendor chunks change rarely: an app update then only re-downloads app code.
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/](@firebase|firebase)[\\/]/ },
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    clearMocks: true,
    restoreMocks: true,
  },
}));
