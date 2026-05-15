import { DEFAULT_ROOM_CONFIG } from '@avalon/game-core';
import { parseClientMsg } from '@avalon/protocol';
import { Hono } from 'hono';
import type { ServerWebSocket } from 'bun';

import { type PeerSink, RoomRegistry } from './registry.js';

const PORT = Number(process.env.PORT ?? 3000);

interface WsData {
  peerId: number;
  roomId: string;
  displayName: string;
  isLobby: boolean;
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
  fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade paths.
    if (url.pathname === '/ws' || url.pathname.startsWith('/ws/') || url.pathname === '/lobby') {
      const isLobby = url.pathname === '/lobby';
      const roomId = isLobby ? '' : url.pathname === '/ws' ? 'main' : url.pathname.slice(4);
      const displayName = url.searchParams.get('name') ?? 'Player';
      const peerId = registry.allocatePeerId();

      const upgraded = server.upgrade(req, {
        data: { peerId, roomId, displayName, isLobby },
      });
      if (upgraded) return undefined;
      return new Response('Upgrade failed', { status: 400 });
    }

    // Fall through to Hono for HTTP.
    return app.fetch(req);
  },
  websocket: {
    open(ws: ServerWebSocket<WsData>) {
      const sink: PeerSink = makeSink(ws);
      if (ws.data.isLobby) {
        registry.subscribeLobby(sink);
        return;
      }
      // Ensure room exists (Phase 1: any roomId on /ws/<id> auto-creates with default config).
      if (ws.data.roomId !== 'main') {
        registry.getOrCreateRoom(ws.data.roomId, DEFAULT_ROOM_CONFIG);
      }
      registry.joinRoom(ws.data.roomId, ws.data.displayName, sink);
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
