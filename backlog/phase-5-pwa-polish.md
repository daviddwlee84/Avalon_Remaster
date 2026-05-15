# Phase 5: PWA polish via @vite-pwa/sveltekit

**Status**: P2
**Effort**: M (~1 week)
**Related**: `packages/web/vite.config.ts` · `packages/web/static/` · `packages/web/src/app.html`

## Context

Phase 1 is just a regular SvelteKit app — no service worker, no manifest, no install prompt. To make it feel like a native app (especially for LAN mode where the PWA effectively IS the game), Phase 5 wires `@vite-pwa/sveltekit` with conservative defaults.

## Scope

1. **Install plugin**: `bun add -D @vite-pwa/sveltekit` and wire into `vite.config.ts`.
2. **Manifest**: name, short name, theme color (`#1a0f00` ink), background color (`#f5e9d3` parchment), `display: "standalone"`, `start_url: "/"`, `scope: "/"`. Icons: 192 / 512 / maskable variants (generate from a single source via `pwa-asset-generator`).
3. **Service worker strategy** — `registerType: "prompt"` (NOT `"autoUpdate"`):
   - A mid-game player must NEVER get silently reloaded. New SW activates only when the user accepts an "Update available" toast.
   - Precache: app shell (JS/CSS), role-card images (all 8, ~50KB each), audio sprite (if Phase 2 added one), default locale message bundle.
   - Runtime cache: other locale bundles (CacheFirst with 7-day expiration), Google Fonts if used.
4. **navigateFallbackDenylist**: `/^\/ws/`, `/^\/api/` — the SW must not intercept WebSocket upgrades or REST.
5. **Install UX**:
   - Capture `beforeinstallprompt`, expose via Svelte store, render a dismissable banner on second visit (localStorage gate).
   - iOS Safari doesn't fire `beforeinstallprompt`: static "Add to Home Screen" instructional overlay on iOS.
6. **Offline detection**:
   - `navigator.onLine` listener.
   - When offline AND on `/play/[roomId]` in Net mode: banner "You're offline — Net mode unavailable. Try LAN mode."
   - LAN mode + tutorial work fully offline once installed.

## Config sketch

```ts
// vite.config.ts
SvelteKitPWA({
  strategies: 'generateSW',
  registerType: 'prompt',
  manifest: { /* ... */ },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp,woff2}'],
    runtimeCaching: [
      { urlPattern: /\/messages\/.+\.json$/, handler: 'CacheFirst',
        options: { cacheName: 'i18n', expiration: { maxAgeSeconds: 7 * 86400 } } },
      { urlPattern: /\/role-cards\//, handler: 'CacheFirst' },
    ],
    navigateFallbackDenylist: [/^\/ws/, /^\/api/],
  },
  devOptions: { enabled: true },
})
```

## Open questions

- Cross-origin to `:3000` server in dev — does the SW correctly let WebSocket pass-through during dev? Test with `devOptions.enabled: true`.
- Should the SW precache `/play/[roomId]` HTML so LAN-host mode boots offline? It's hashed routes, but SvelteKit's app-shell pattern (`fallback: 'index.html'` in adapter config) can make this work.
- Icon generation: pwa-asset-generator vs. hand-craft. Hand-craft if Phase 2 produces a logo we want pixel-perfect at small sizes.

## Decision

Not yet — depends on Phase 2 logo + Phase 4 LAN mode shape.

## References

- @vite-pwa/sveltekit: https://vite-pwa-org.netlify.app/frameworks/sveltekit.html
- Plan doc Phase 5 section
- chess-web SW handling — same `registerType: "prompt"` posture (see its `CLAUDE.md`)
