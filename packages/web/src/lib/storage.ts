import type { RoomCreateConfig } from './transport/ws.svelte';

const DISPLAY_NAME_KEY = 'avalon.displayName';
const PENDING_CONFIG_PREFIX = 'avalon.pendingConfig.';
const RECONNECT_PREFIX = 'avalon.reconnect.';

export interface ReconnectStash {
  playerId: string;
  token: string;
}

export function loadDisplayName(): string {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(DISPLAY_NAME_KEY) ?? '';
}

export function saveDisplayName(name: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(DISPLAY_NAME_KEY, name);
}

/**
 * Stash the config the host picked at "Create room" time so the /play/[roomId]
 * page can include it in the WS URL on first connection. Removed after read.
 */
export function stashPendingConfig(roomId: string, config: RoomCreateConfig): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(PENDING_CONFIG_PREFIX + roomId, JSON.stringify(config));
}

export function takePendingConfig(roomId: string): RoomCreateConfig | undefined {
  if (typeof sessionStorage === 'undefined') return undefined;
  const raw = sessionStorage.getItem(PENDING_CONFIG_PREFIX + roomId);
  if (!raw) return undefined;
  sessionStorage.removeItem(PENDING_CONFIG_PREFIX + roomId);
  try {
    return JSON.parse(raw) as RoomCreateConfig;
  } catch {
    return undefined;
  }
}

/**
 * Stash the reconnect bundle the server hands us in Welcome.reconnectToken +
 * Welcome.yourPlayerId. Saved per-roomId so a player can have rejoinable
 * games in multiple rooms simultaneously (different localStorage keys, no
 * collision).
 */
export function saveReconnect(roomId: string, stash: ReconnectStash): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(RECONNECT_PREFIX + roomId, JSON.stringify(stash));
}

export function loadReconnect(roomId: string): ReconnectStash | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  const raw = localStorage.getItem(RECONNECT_PREFIX + roomId);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as ReconnectStash;
  } catch {
    return undefined;
  }
}

export function clearReconnect(roomId: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(RECONNECT_PREFIX + roomId);
}
