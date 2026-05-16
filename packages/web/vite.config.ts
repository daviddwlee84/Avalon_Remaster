import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// When deployed under a sub-path (GitHub Pages: /Avalon_Remaster), the PWA
// manifest's start_url + scope + icon paths must use that prefix. Driven by
// the same BASE_PATH env var that svelte.config.js reads. BUILD_TARGET=static
// (Docker self-host) uses an empty base path — the bundle is served from root.
const target = process.env.BUILD_TARGET;
const isPagesBuild = target === 'pages';
const basePath = isPagesBuild ? (process.env.BASE_PATH ?? '') : '';
const prefix = (p: string) => `${basePath}${p}`;

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    SvelteKitPWA({
      strategies: 'generateSW',
      // 'prompt' — mid-game players never get reloaded silently. New SW
      // activates only when the user clicks the update toast.
      registerType: 'prompt',
      manifest: {
        name: 'Avalon — The Resistance',
        short_name: 'Avalon',
        description: 'Hidden-role social deduction game · Bun + SvelteKit PWA',
        theme_color: '#1a0f00',
        background_color: '#f5e9d3',
        display: 'standalone',
        orientation: 'any',
        start_url: prefix('/'),
        scope: prefix('/'),
        id: prefix('/'),
        lang: 'zh-TW',
        icons: [
          { src: prefix('/icon.svg'), sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          {
            src: prefix('/icon.svg'),
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff2}'],
        // The Bun WS server is mounted under /ws/<roomId> + /lobby; never let
        // the SW intercept those upgrades. /health is the Hono REST surface.
        navigateFallbackDenylist: [/^\/ws/, /^\/lobby/, /^\/health/, /^\/rooms/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          // Role-card / board / token JPGs + PNGs.
          {
            urlPattern: /\/images\/.+\.(?:jpg|jpeg|png|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'avalon-images',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          // Google Fonts stylesheets + glyphs.
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
        ],
      },
      // SW is intentionally OFF in dev. Run `bun run build && bun run preview`
      // to verify the service worker locally. Keeping the dev SW disabled avoids
      // route-interception surprises during the Playwright smoke (which runs
      // against `vite dev`, not the production build).
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
