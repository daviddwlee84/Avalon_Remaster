import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

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
        start_url: '/',
        scope: '/',
        lang: 'zh-TW',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          {
            src: '/icon.svg',
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
