import type { ClientMsg, ServerMsg } from '@avalon/game-core';
import { parseServerMsg } from '@avalon/protocol';

import type { ConnState, ServerMsgHandler, Session, Transport } from './types';

/**
 * A WebSocket-backed Session that drives reactive Svelte 5 state.
 *
 * Reads server messages as JSON, validates with Zod, fans them out to subscribers.
 */
export class WsSession implements Session, Transport {
  private ws: WebSocket;
  state: ConnState = $state('connecting');
  private readonly handlers = new Set<ServerMsgHandler>();

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.addEventListener('open', () => {
      this.state = 'open';
    });
    this.ws.addEventListener('close', () => {
      this.state = 'closed';
    });
    this.ws.addEventListener('error', () => {
      this.state = 'error';
    });
    this.ws.addEventListener('message', (ev: MessageEvent) => {
      if (typeof ev.data !== 'string') return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(ev.data);
      } catch {
        return;
      }
      const msg = parseServerMsg(parsed);
      if (!msg) return;
      for (const h of this.handlers) h(msg);
    });
  }

  get transport(): Transport {
    return this;
  }

  send(msg: ClientMsg): boolean {
    if (this.ws.readyState !== WebSocket.OPEN) return false;
    try {
      this.ws.send(JSON.stringify(msg));
      return true;
    } catch {
      return false;
    }
  }

  close(): void {
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }

  subscribe(handler: ServerMsgHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /** Type guard the consumer can use to access state reactively from .svelte files. */
  get connState(): ConnState {
    return this.state;
  }
}

/**
 * Build the WebSocket URL for a given room.
 *
 * Connects directly to the Bun server (port 3000 in dev; same-origin in production with adapter-node).
 * We don't route through Vite's HMR proxy because it tends to drop frames on Bun-native upgrades.
 */
export function buildRoomWsUrl(roomId: string, displayName: string): string {
  const params = new URLSearchParams({ name: displayName });
  const path = roomId === 'main' ? '/ws' : `/ws/${encodeURIComponent(roomId)}`;

  // In dev: Vite on :5173, Bun server on :3000. Override via PUBLIC_AVALON_WS_ORIGIN if needed.
  const envOrigin =
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.PUBLIC_AVALON_WS_ORIGIN ?? '';
  if (envOrigin) {
    return `${envOrigin}${path}?${params.toString()}`;
  }

  const isDev = window.location.port === '5173';
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = isDev ? `${window.location.hostname}:3000` : window.location.host;
  return `${proto}://${host}${path}?${params.toString()}`;
}

/** Same logic for the lobby socket. */
export function buildLobbyWsUrl(): string {
  const envOrigin =
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.PUBLIC_AVALON_WS_ORIGIN ?? '';
  if (envOrigin) return `${envOrigin}/lobby`;

  const isDev = window.location.port === '5173';
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = isDev ? `${window.location.hostname}:3000` : window.location.host;
  return `${proto}://${host}/lobby`;
}
