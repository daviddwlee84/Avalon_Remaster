# Vite WebSocket proxy ECONNRESET when forwarding to Bun.serve

**Symptoms** (grep this section): `[vite] ws proxy socket error: Error: read ECONNRESET` · `TCP.onStreamRead (node:internal/stream_base_commons:216:20)` · WebSocket through Vite dev server (port 5173) immediately closes when target is a `Bun.serve` WebSocket endpoint on a different port · client never receives any frames despite Vite logging the proxy upgrade attempt
**First seen**: 2026-05-16 (Avalon Remaster Phase 1, Vite 6 + Bun 1.3.9)
**Affects**: Vite 5/6 dev server with `server.proxy: { '/ws': { ws: true, target: 'ws://localhost:<port>' } }` when target is a `Bun.serve({ websocket: ... })` endpoint
**Status**: workaround documented (skip Vite's WS proxy in dev, connect direct to Bun's port)

## Symptom

`vite.config.ts` is configured to proxy WebSocket connections from the Vite dev server's `/ws` path to a separate Bun WebSocket server:

```ts
server: {
  port: 5173,
  proxy: {
    '/ws': {
      target: 'ws://localhost:3000',
      ws: true,
      rewriteWsOrigin: true,
    },
  },
}
```

Browser connects to `ws://localhost:5173/ws/<roomId>?name=Alice`. Vite logs:

```
[vite] ws proxy socket error:
Error: read ECONNRESET
    at TCP.onStreamRead (node:internal/stream_base_commons:216:20)
[vite] ws proxy socket error:
Error: read ECONNRESET
    at TCP.onStreamRead (node:internal/stream_base_commons:216:20)
```

…on a tight loop. The browser sees `readyState` flip from `CONNECTING` to `CLOSED` immediately. The Bun server logs **no** incoming peer at all — the upgrade never completes from its perspective.

Crucially: connecting **directly** to `ws://localhost:3000/ws/<roomId>?name=Alice` works perfectly:

```sh
$ bun -e 'const ws = new WebSocket("ws://localhost:3000/ws/test?name=X"); ws.onmessage = (e) => console.log(e.data);'
{"type":"Welcome","protocol":1,"peerId":1,"yourPlayerId":"p_..."}
{"type":"RoomJoined","state":{...}}
```

So the problem is Vite's proxy, not the server.

## Root cause

Vite uses `http-proxy` (the venerable node-http-proxy) under the hood for `server.proxy`. When `ws: true` it routes WebSocket upgrades through that library. `http-proxy` expects the target server to follow a specific upgrade-frame format that `Bun.serve`'s native WebSocket handling doesn't quite emit in the way the proxy expects — Bun closes the underlying TCP socket faster than the proxy library can shuttle the handshake, yielding ECONNRESET on the proxy side and an aborted handshake on the browser side.

(Not a bug in Bun per se — the same issue has been reported against Vite+Cloudflare-Workers and Vite+other-non-Node servers. `http-proxy` is showing its age.)

## Workaround

**Skip the Vite proxy entirely.** Have the browser connect direct to the Bun server's port in development. In production behind a single origin (we use `@sveltejs/adapter-node`), there's no cross-origin issue.

```ts
// packages/web/src/lib/transport/ws.svelte.ts
export function buildRoomWsUrl(roomId: string, displayName: string): string {
  const params = new URLSearchParams({ name: displayName });
  const path = roomId === 'main' ? '/ws' : `/ws/${encodeURIComponent(roomId)}`;

  // Optional env override for staging.
  const envOrigin = import.meta.env.PUBLIC_AVALON_WS_ORIGIN ?? '';
  if (envOrigin) return `${envOrigin}${path}?${params}`;

  // In dev (Vite on 5173): point at Bun on 3000. In prod (adapter-node): same-origin.
  const isDev = window.location.port === '5173';
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = isDev ? `${window.location.hostname}:3000` : window.location.host;
  return `${proto}://${host}${path}?${params}`;
}
```

And remove the `proxy` block from `vite.config.ts` entirely:

```diff
 server: {
   port: 5173,
-  proxy: {
-    '/ws': {
-      target: 'ws://localhost:3000',
-      ws: true,
-      rewriteWsOrigin: true,
-    },
-  },
 }
```

## Prevention

- When working with non-Node WebSocket servers (Bun, Cloudflare Workers, etc.), don't proxy through Vite's dev server. Connect direct.
- If you need single-port dev for some reason (e.g. tunneling through a single ngrok URL), put a real reverse proxy in front (Caddy, nginx) — both handle WebSocket upgrades properly against Bun.
- In production deployments where the SvelteKit app and the Bun server live on the same origin (Node adapter), this entire problem disappears because the request goes through one server.

## Related

- Vite proxy docs: https://vite.dev/config/server-options.html#server-proxy
- `http-proxy` upgrade handling: https://github.com/http-party/node-http-proxy
- Same symptom reported with Bun: there are several scattered GitHub issues — search "Vite ws proxy ECONNRESET Bun"
- Source code reference: `packages/web/src/lib/transport/ws.svelte.ts` `buildRoomWsUrl()`
