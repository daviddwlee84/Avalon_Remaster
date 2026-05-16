import type { Alignment, ChatLine, PlayerView, ServerMsg } from '@avalon/game-core';

import { t } from './i18n/locale.svelte';
import type { Session } from './transport/types';

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
        if (msg.state.ladyOfTheLakeLearned) {
          this.ladyResult = {
            aboutPlayerId: msg.state.ladyOfTheLakeLearned.aboutPlayerId,
            alignment: msg.state.ladyOfTheLakeLearned.alignment,
          };
        }
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
