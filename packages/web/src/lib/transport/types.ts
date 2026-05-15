import type { ClientMsg, ServerMsg } from '@avalon/game-core';

export type ConnState = 'connecting' | 'open' | 'closed' | 'error';

export type ServerMsgHandler = (msg: ServerMsg) => void;

export interface Transport {
  send(msg: ClientMsg): boolean;
  close(): void;
}

export interface Session {
  transport: Transport;
  readonly state: ConnState;
  subscribe(handler: ServerMsgHandler): () => void;
}
