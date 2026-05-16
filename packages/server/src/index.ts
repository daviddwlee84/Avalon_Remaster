import { DEFAULT_ROOM_CONFIG, type RoomConfig } from '@avalon/game-core';
import { parseClientMsg } from '@avalon/protocol';
import { Hono } from 'hono';
import type { ServerWebSocket } from 'bun';

import { type PeerSink, RoomRegistry } from './registry.js';

const PORT = Number(process.env.PORT ?? 3000);
/**
 * Optional static directory served as the SPA fallback after WS upgrades
 * and Hono REST. Set to /app/packages/web/build in the Docker image so a
 * single container ships both the Bun WS server and the SvelteKit client.
 */
const STATIC_DIR = process.env.AVALON_STATIC_DIR;

interface WsData {
  peerId: number;
  roomId: string;
  displayName: string;
  isLobby: boolean;
  /** Config supplied via WS query params; only honoured if the room is being created fresh. */
  desiredConfig: RoomConfig;
  /** Reconnect bundle from a returning peer's localStorage stash. */
  reattach?: { playerId: string; token: string };
}

function parseConfigFromQuery(params: URLSearchParams): RoomConfig {
  const truthy = (v: string | null): boolean => v === '1' || v === 'true';
  return {
    useMordred: truthy(params.get('mordred')),
    useMorganaPercival: truthy(params.get('morgana')),
    useOberon: truthy(params.get('oberon')),
    useLadyOfTheLake: truthy(params.get('lady')),
  };
}

const registry = new RoomRegistry();
// Phase 1: a single default room called "main" is always available.
registry.getOrCreateRoom('main', DEFAULT_ROOM_CONFIG);

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, rooms: registry.listRooms() }));
app.get('/rooms', (c) => c.json({ rooms: registry.listRooms() }));

// ────────────────────────────────────────────────────────────────────────
// Bun.serve with WebSocket upgrade
// ────────────────────────────────────────────────────────────────────────

const server = Bun.serve<WsData>({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade paths.
    if (url.pathname === '/ws' || url.pathname.startsWith('/ws/') || url.pathname === '/lobby') {
      const isLobby = url.pathname === '/lobby';
      const roomId = isLobby ? '' : url.pathname === '/ws' ? 'main' : url.pathname.slice(4);
      const displayName = url.searchParams.get('name') ?? 'Player';
      const peerId = registry.allocatePeerId();
      const desiredConfig = parseConfigFromQuery(url.searchParams);
      const reattachToken = url.searchParams.get('token');
      const reattachPlayerId = url.searchParams.get('playerId');
      const reattach =
        reattachToken && reattachPlayerId
          ? { playerId: reattachPlayerId, token: reattachToken }
          : undefined;

      const upgraded = server.upgrade(req, {
        data: { peerId, roomId, displayName, isLobby, desiredConfig, reattach },
      });
      if (upgraded) return undefined;
      return new Response('Upgrade failed', { status: 400 });
    }

    // Hono REST routes are explicit — anything else is either a static asset
    // or a SPA route the SvelteKit client owns.
    if (url.pathname === '/health' || url.pathname === '/rooms') {
      return app.fetch(req);
    }

    // Static fallback when packaged with the SvelteKit build (Docker image).
    if (STATIC_DIR) {
      // Strip leading slash, refuse ../ traversal. The Bun.file fetch handles
      // mime types from extension and 404s gracefully.
      const safePath = decodeURIComponent(url.pathname).replace(/\.\.\/?/g, '');
      const target = safePath === '/' ? '/index.html' : safePath;
      const file = Bun.file(STATIC_DIR + target);
      if (await file.exists()) return new Response(file);
      // SPA fallback — any unknown route ships index.html so the SvelteKit
      // client router resolves it client-side. Matches the GH Pages 404.html
      // trick but in-process.
      const fallback = Bun.file(STATIC_DIR + '/index.html');
      if (await fallback.exists()) return new Response(fallback);
    }

    return app.fetch(req);
  },
  websocket: {
    open(ws: ServerWebSocket<WsData>) {
      const sink: PeerSink = makeSink(ws);
      if (ws.data.isLobby) {
        registry.subscribeLobby(sink);
        return;
      }
      // Ensure room exists. The first connecting peer's desiredConfig becomes the room
      // config; later joiners' configs are ignored (host's config wins, per Phase 3 design).
      // The persistent "main" room always stays on DEFAULT_ROOM_CONFIG.
      if (ws.data.roomId !== 'main') {
        registry.getOrCreateRoom(ws.data.roomId, ws.data.desiredConfig);
      }
      if (ws.data.reattach) {
        registry.reattachPeer(
          ws.data.roomId,
          ws.data.reattach.playerId,
          ws.data.reattach.token,
          sink,
        );
      } else {
        registry.joinRoom(ws.data.roomId, ws.data.displayName, sink);
      }
    },
    message(ws: ServerWebSocket<WsData>, raw: string | Buffer) {
      const text = typeof raw === 'string' ? raw : raw.toString('utf8');
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        ws.send(
          JSON.stringify({ type: 'Error', code: 'malformed_message', message: 'Bad JSON' }),
        );
        return;
      }
      const msg = parseClientMsg(parsed);
      if (!msg) {
        ws.send(
          JSON.stringify({
            type: 'Error',
            code: 'malformed_message',
            message: 'Schema validation failed',
          }),
        );
        return;
      }
      if (ws.data.isLobby) {
        // Lobby connections accept only Ping.
        if (msg.type === 'Ping') {
          ws.send(JSON.stringify({ type: 'Pong' }));
        }
        return;
      }
      registry.applyToRoom(ws.data.peerId, msg);
    },
    close(ws: ServerWebSocket<WsData>) {
      registry.removePeer(ws.data.peerId);
    },
  },
});

function makeSink(ws: ServerWebSocket<WsData>): PeerSink {
  return {
    peerId: ws.data.peerId,
    send(msg) {
      try {
        ws.send(JSON.stringify(msg));
        return true;
      } catch {
        return false;
      }
    },
    close() {
      try {
        ws.close();
      } catch {
        // ignore
      }
    },
  };
}

console.log(`[avalon-server] listening on http://localhost:${server.port}`);
console.log(`  - WebSocket: ws://localhost:${server.port}/ws  (default room "main")`);
console.log(`  - Lobby:     ws://localhost:${server.port}/lobby`);
console.log(`  - Health:    http://localhost:${server.port}/health`);
