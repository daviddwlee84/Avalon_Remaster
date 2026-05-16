import type { Alignment, ChatLine, PlayerView, ServerMsg } from '@avalon/game-core';

import { t } from './i18n/locale.svelte';
import type { Session } from './transport/types';
import { clearReconnect, saveReconnect } from './storage';

interface LadyResult {
  aboutPlayerId: string;
  alignment: Alignment;
}

/**
 * Reactive view of game state for a single connected session.
 * Listens to ServerMsgs and mutates reactive state so .svelte components re-render.
 */
export class GameStore {
  myPlayerId: string | null = $state(null);
  myPeerId: number | null = $state(null);
  view: PlayerView | null = $state(null);
  /** Brief flash messages emitted by the server (errors, quest results, etc). */
  toasts: Array<{ id: number; text: string; kind: 'info' | 'error' }> = $state([]);
  chat: ChatLine[] = $state([]);
  /** True after a RoleReveal message arrives — used to flash the role card. */
  showRoleReveal: boolean = $state(false);
  /**
   * Latest Lady-of-the-Lake reveal addressed to the local player. Set when a
   * GameStateUpdate arrives carrying `ladyOfTheLakeLearned`; cleared by
   * dismissLadyResult(). The engine only ships `ladyOfTheLakeLearned` to the
   * holder for one update, so this view-side latch keeps the modal visible
   * across subsequent state updates.
   */
  ladyResult: LadyResult | null = $state(null);

  private nextToastId = 1;
  private unsub: (() => void) | null = null;

  /**
   * Set by the route hosting this GameStore. When set, GameStore latches the
   * server's Welcome.reconnectToken into localStorage so a refresh can resume
   * the same seat via the reattach query params. Clearing it on game-end
   * is the route's responsibility (or just clearReconnect manually).
   */
  reconnectRoomId: string | null = null;
  /**
   * Set true by the route when it constructed the WS URL with a reattach
   * bundle. If the server replies with Error{unknown_room|bad_password} as
   * the FIRST message, we treat the bundle as stale, clear it, and call
   * onStaleReattach so the route can reconnect as a fresh join. Without
   * this, the user sits on "Connecting…" forever because the server is up
   * (likely cold-restarted via ACA scale-to-zero) but the seat no longer
   * exists in its in-memory state.
   */
  attemptedReattach = false;
  onStaleReattach: (() => void) | null = null;
  /** Number of Server messages received — for the "first reply" check. */
  private msgCount = 0;

  constructor(private session: Session) {
    this.unsub = session.subscribe((msg) => this.handle(msg));
  }

  dispose(): void {
    this.unsub?.();
    this.unsub = null;
  }

  private handle(msg: ServerMsg): void {
    this.msgCount++;
    // Stale reattach detection: if the very first server reply to a reattach
    // attempt is an Error about a missing seat / wrong token, dump the
    // stale bundle and let the route reconnect fresh.
    if (
      this.attemptedReattach &&
      this.msgCount === 1 &&
      msg.type === 'Error' &&
      (msg.code === 'unknown_room' || msg.code === 'bad_password') &&
      this.reconnectRoomId
    ) {
      clearReconnect(this.reconnectRoomId);
      this.attemptedReattach = false;
      this.onStaleReattach?.();
      return; // skip the regular Error toast — recovery is silent
    }
    switch (msg.type) {
      case 'Welcome':
        this.myPeerId = msg.peerId;
        this.myPlayerId = msg.yourPlayerId;
        if (this.reconnectRoomId) {
          saveReconnect(this.reconnectRoomId, {
            playerId: msg.yourPlayerId,
            token: msg.reconnectToken,
          });
        }
        break;
      case 'GameStateUpdate':
        // Game-end → drop the stash so the next visit starts a fresh seat.
        if (msg.state.phase === 'finished' && this.reconnectRoomId) {
          clearReconnect(this.reconnectRoomId);
        }
        this.view = msg.state;
        if (msg.state.ladyOfTheLakeLearned) {
          this.ladyResult = {
            aboutPlayerId: msg.state.ladyOfTheLakeLearned.aboutPlayerId,
            alignment: msg.state.ladyOfTheLakeLearned.alignment,
          };
        }
        break;
      case 'RoomJoined':
        this.view = msg.state;
        break;
      case 'RoleReveal':
        this.view = msg.state;
        this.showRoleReveal = true;
        break;
      case 'QuestResult': {
        const key = msg.outcome === 'success' ? 'toast.questResult.success' : 'toast.questResult.fail';
        this.pushToast(
          t(key, { round: msg.round, n: msg.fails, s: msg.fails === 1 ? '' : 's' }),
          msg.outcome === 'success' ? 'info' : 'error',
        );
        break;
      }
      case 'ChatLine':
        this.chat = [...this.chat, msg.line];
        break;
      case 'ChatHistory':
        this.chat = msg.lines;
        break;
      case 'Error':
        this.pushToast(msg.message, 'error');
        break;
      case 'Pong':
      case 'RoomList':
        break;
    }
  }

  private pushToast(text: string, kind: 'info' | 'error'): void {
    const id = this.nextToastId++;
    this.toasts = [...this.toasts, { id, text, kind }];
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    }, 4000);
  }

  dismissRoleReveal(): void {
    this.showRoleReveal = false;
  }

  dismissLadyResult(): void {
    this.ladyResult = null;
  }
}
