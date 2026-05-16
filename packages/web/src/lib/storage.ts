import type { RoomCreateConfig } from './transport/ws.svelte';

const DISPLAY_NAME_KEY = 'avalon.displayName';
const PENDING_CONFIG_PREFIX = 'avalon.pendingConfig.';

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
