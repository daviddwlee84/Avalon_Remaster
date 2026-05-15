import type { ChatLine, PlayerView, ServerMsg } from '@avalon/game-core';

import type { Session } from './transport/types';

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

  private nextToastId = 1;
  private unsub: (() => void) | null = null;

  constructor(private session: Session) {
    this.unsub = session.subscribe((msg) => this.handle(msg));
  }

  dispose(): void {
    this.unsub?.();
    this.unsub = null;
  }

  private handle(msg: ServerMsg): void {
    switch (msg.type) {
      case 'Welcome':
        this.myPeerId = msg.peerId;
        this.myPlayerId = msg.yourPlayerId;
        break;
      case 'RoomJoined':
        this.view = msg.state;
        break;
      case 'GameStateUpdate':
        this.view = msg.state;
        break;
      case 'RoleReveal':
        this.view = msg.state;
        this.showRoleReveal = true;
        break;
      case 'QuestResult':
        this.pushToast(
          `Round ${msg.round}: ${msg.outcome.toUpperCase()} (${msg.fails} fail${msg.fails === 1 ? '' : 's'})`,
          msg.outcome === 'success' ? 'info' : 'error',
        );
        break;
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
}
