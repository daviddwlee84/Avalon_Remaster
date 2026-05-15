import type { ChatLine, PeerId, PlayerId, PlayerView, RoomConfig, RoomSummary } from './types.js';

/** Wire-protocol version. Bump when message schemas change incompatibly. */
export const PROTOCOL_VERSION = 1;

/**
 * Messages sent from client to server (or LAN joiner to host).
 */
export type ClientMsg =
  | { type: 'Hello'; displayName: string }
  | { type: 'CreateRoom'; config: RoomConfig; password?: string }
  | { type: 'JoinRoom'; roomId: string; password?: string }
  | { type: 'LeaveRoom' }
  | { type: 'StartGame' }
  | { type: 'ProposeTeam'; playerIds: PlayerId[] }
  | { type: 'VoteTeam'; approve: boolean }
  | { type: 'VoteQuest'; success: boolean }
  | { type: 'UseLadyOfLake'; targetPlayerId: PlayerId }
  | { type: 'NominateAssassinTarget'; targetPlayerId: PlayerId }
  | { type: 'Chat'; text: string }
  | { type: 'Ping' };

/**
 * Messages sent from server to client (or LAN host to joiner).
 * Every state-carrying message ships a {@link PlayerView}, pre-projected per recipient.
 */
export type ServerMsg =
  | { type: 'Welcome'; protocol: number; peerId: PeerId; yourPlayerId: PlayerId }
  | { type: 'RoomList'; rooms: RoomSummary[] }
  | { type: 'RoomJoined'; state: PlayerView }
  | { type: 'GameStateUpdate'; state: PlayerView }
  | { type: 'RoleReveal'; state: PlayerView }
  | { type: 'QuestResult'; round: number; outcome: 'success' | 'fail'; fails: number; successes: number }
  | { type: 'ChatLine'; line: ChatLine }
  | { type: 'ChatHistory'; lines: ChatLine[] }
  | { type: 'Error'; code: ErrorCode; message: string }
  | { type: 'Pong' };

export type ErrorCode =
  | 'bad_phase'
  | 'not_your_turn'
  | 'invalid_team'
  | 'already_voted'
  | 'not_on_team'
  | 'room_full'
  | 'bad_password'
  | 'unknown_room'
  | 'malformed_message'
  | 'rate_limited'
  | 'internal';

/**
 * The transport produces (peer, ServerMsg) pairs; the transport layer fans them out.
 * Mirrors chess-net's `Outbound` type.
 */
export interface Outbound {
  peer: PeerId;
  msg: ServerMsg;
}
