import type { ClientMsg, ErrorCode, Outbound, ServerMsg } from './messages.js';
import { PROTOCOL_VERSION } from './messages.js';
import {
  MAX_CONSECUTIVE_REJECTIONS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  QUEST_WIN_THRESHOLD,
  ladyOfTheLakeActiveThisRound,
  questTeamSize,
  rolePool,
  twoFailsRequired,
  validateConfigForPlayerCount,
} from './rules.js';
import { mulberry32, shuffleInPlace } from './rng.js';
import type {
  Alignment,
  ChatLine,
  GameState,
  PeerId,
  Player,
  PlayerId,
  QuestRecord,
  RoomConfig,
  RoomId,
  RoomSummary,
} from './types.js';
import { ALIGNMENT_OF, DEFAULT_ROOM_CONFIG, Role } from './types.js';
import { projectView } from './view.js';

const CHAT_RING_CAPACITY = 50;

/**
 * Transport-agnostic Avalon room state machine.
 *
 * Mirrors chess-net's `Room` (crates/chess-net/src/room.rs): a single `apply(peer, msg)` entry point
 * that returns `Outbound[]` for the transport to fan out. NO I/O, NO async, fully testable.
 *
 * The same GameRoom instance runs:
 *   - server-side on Bun (peer = WebSocket connection ID)
 *   - browser-side on LAN host (peer = WebRTC DataChannel ID, with self-loopback)
 */
export class GameRoom {
  private readonly state: GameState;
  /** Maps transport-level PeerId to game-level PlayerId. */
  private readonly seats: Map<PeerId, PlayerId> = new Map();
  /** Maps PlayerId back to current PeerId (for reconnection mapping later). */
  private readonly playerToPeer: Map<PlayerId, PeerId> = new Map();
  private readonly chat: ChatLine[] = [];
  private readonly rng: () => number;
  /** Per-recipient ephemeral payloads that get attached on the very next view projection. */
  private readonly pendingLadyLearnings: Map<
    PlayerId,
    { aboutPlayerId: PlayerId; alignment: Alignment }
  > = new Map();
  /** Reconnect token for each seated player. Issued at addPeer; presented at reattachPeer. */
  private readonly reconnectTokens: Map<PlayerId, string> = new Map();

  constructor(roomId: RoomId, config: RoomConfig, rng?: () => number) {
    this.state = {
      roomId,
      phase: 'lobby',
      players: [],
      hostPlayerId: '',
      config: { ...DEFAULT_ROOM_CONFIG, ...config },
      ladyOfTheLakeUsedOn: [],
      currentRound: 1,
      captainSeat: 0,
      consecutiveRejections: 0,
      proposedTeam: [],
      pendingApproveVotes: {},
      pendingQuestVotes: {},
      questHistory: [],
    };
    this.rng = rng ?? (config.rngSeed !== undefined ? mulberry32(config.rngSeed) : Math.random);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Peer lifecycle
  // ────────────────────────────────────────────────────────────────────────

  /** Seat a new peer in the lobby. Returns Welcome + RoomJoined to them + broadcast to others. */
  addPeer(peerId: PeerId, displayName: string): Outbound[] {
    if (this.state.phase !== 'lobby') {
      return [
        {
          peer: peerId,
          msg: errMsg('bad_phase', 'Cannot join a game already in progress'),
        },
      ];
    }
    if (this.state.players.length >= MAX_PLAYERS) {
      return [{ peer: peerId, msg: errMsg('room_full', `Room full (max ${MAX_PLAYERS})`) }];
    }

    const playerId = `p_${randHex(this.rng, 8)}`;
    const seat = this.state.players.length;
    const player: Player = {
      id: playerId,
      displayName: sanitizeName(displayName) || `Player ${seat + 1}`,
      seat,
      connected: true,
    };
    this.state.players.push(player);
    this.seats.set(peerId, playerId);
    this.playerToPeer.set(playerId, peerId);

    if (this.state.players.length === 1) {
      this.state.hostPlayerId = playerId;
    }

    const reconnectToken = randHex(this.rng, 16);
    this.reconnectTokens.set(playerId, reconnectToken);

    const out: Outbound[] = [
      {
        peer: peerId,
        msg: {
          type: 'Welcome',
          protocol: PROTOCOL_VERSION,
          peerId,
          yourPlayerId: playerId,
          reconnectToken,
        },
      },
      {
        peer: peerId,
        msg: { type: 'RoomJoined', state: projectView(this.state, playerId) },
      },
    ];
    this.broadcastUpdate(out, { except: peerId });
    return out;
  }

  /**
   * Re-attach a returning peer to an existing in-game player slot. The caller
   * (transport layer) supplies the new peerId allocated for this socket plus
   * the playerId + reconnectToken the client stashed in localStorage on
   * first join.
   *
   * Returns Error{unknown_room|bad_password} on token mismatch (re-using the
   * existing error codes — both signal "you can't have this seat").
   */
  reattachPeer(peerId: PeerId, playerId: PlayerId, token: string): Outbound[] {
    const expected = this.reconnectTokens.get(playerId);
    if (!expected || expected !== token) {
      return [{ peer: peerId, msg: errMsg('bad_password', 'Invalid reconnect token') }];
    }
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) {
      return [{ peer: peerId, msg: errMsg('unknown_room', 'Player no longer in this room') }];
    }
    // Bump the seat to the new peerId. Old peerId may already be cleared
    // (server-side close handler ran).
    const oldPeer = this.playerToPeer.get(playerId);
    if (oldPeer !== undefined) this.seats.delete(oldPeer);
    this.seats.set(peerId, playerId);
    this.playerToPeer.set(playerId, peerId);
    player.connected = true;

    const out: Outbound[] = [
      {
        peer: peerId,
        msg: {
          type: 'Welcome',
          protocol: PROTOCOL_VERSION,
          peerId,
          yourPlayerId: playerId,
          reconnectToken: token,
        },
      },
      { peer: peerId, msg: { type: 'GameStateUpdate', state: projectView(this.state, playerId) } },
    ];
    // Tell everyone else the player is back online.
    this.broadcastUpdate(out, { except: peerId });
    return out;
  }

  /** Disconnect a peer. In lobby: drop them. In-game: mark disconnected (reconnection in Phase 7). */
  removePeer(peerId: PeerId): Outbound[] {
    const playerId = this.seats.get(peerId);
    if (!playerId) return [];
    this.seats.delete(peerId);
    this.playerToPeer.delete(playerId);

    if (this.state.phase === 'lobby') {
      // Drop the player entirely; renumber seats. Token is no longer useful.
      this.state.players = this.state.players
        .filter((p) => p.id !== playerId)
        .map((p, idx) => ({ ...p, seat: idx }));
      this.reconnectTokens.delete(playerId);
      // If host left, promote next seat.
      if (this.state.hostPlayerId === playerId) {
        this.state.hostPlayerId = this.state.players[0]?.id ?? '';
      }
    } else {
      // Mark disconnected; reconnection grace handled by transport later.
      // Keep the playerId reservation + reconnectToken alive so reattachPeer
      // can resume the seat.
      const player = this.state.players.find((p) => p.id === playerId);
      if (player) player.connected = false;
    }

    const out: Outbound[] = [];
    this.broadcastUpdate(out);
    return out;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Main message entry point
  // ────────────────────────────────────────────────────────────────────────

  apply(peerId: PeerId, msg: ClientMsg): Outbound[] {
    const playerId = this.seats.get(peerId);
    if (!playerId && msg.type !== 'Hello' && msg.type !== 'Ping') {
      return [{ peer: peerId, msg: errMsg('internal', 'Peer not seated') }];
    }

    switch (msg.type) {
      case 'Ping':
        return [{ peer: peerId, msg: { type: 'Pong' } }];

      case 'Hello':
        // Hello is handled by transport (calls addPeer); included for completeness.
        return [];

      case 'LeaveRoom':
        return this.removePeer(peerId);

      case 'StartGame':
        return this.handleStartGame(peerId, playerId!);

      case 'ProposeTeam':
        return this.handleProposeTeam(peerId, playerId!, msg.playerIds);

      case 'VoteTeam':
        return this.handleVoteTeam(peerId, playerId!, msg.approve);

      case 'VoteQuest':
        return this.handleVoteQuest(peerId, playerId!, msg.success);

      case 'UseLadyOfLake':
        return this.handleUseLadyOfLake(peerId, playerId!, msg.targetPlayerId);

      case 'NominateAssassinTarget':
        return this.handleAssassination(peerId, playerId!, msg.targetPlayerId);

      case 'Chat':
        return this.handleChat(peerId, playerId!, msg.text);

      case 'CreateRoom':
      case 'JoinRoom':
        // These are handled by the transport layer (which owns the room registry).
        return [{ peer: peerId, msg: errMsg('internal', `${msg.type} handled by transport`) }];

      default: {
        const _exhaustive: never = msg;
        void _exhaustive;
        return [{ peer: peerId, msg: errMsg('malformed_message', 'Unknown message type') }];
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Read-only accessors
  // ────────────────────────────────────────────────────────────────────────

  summary(): RoomSummary {
    return {
      roomId: this.state.roomId,
      phase: this.state.phase,
      playerCount: this.state.players.length,
      hasPassword: false,
    };
  }

  isEmpty(): boolean {
    return this.seats.size === 0;
  }

  peerCount(): number {
    return this.seats.size;
  }

  /** Test-only access to internal state. */
  _stateForTesting(): Readonly<GameState> {
    return this.state;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Game-phase handlers
  // ────────────────────────────────────────────────────────────────────────

  private handleStartGame(peerId: PeerId, playerId: PlayerId): Outbound[] {
    if (this.state.phase !== 'lobby') {
      return [{ peer: peerId, msg: errMsg('bad_phase', 'Game already started') }];
    }
    if (playerId !== this.state.hostPlayerId) {
      return [{ peer: peerId, msg: errMsg('not_your_turn', 'Only the host can start') }];
    }
    if (this.state.players.length < MIN_PLAYERS) {
      return [
        {
          peer: peerId,
          msg: errMsg('bad_phase', `Need at least ${MIN_PLAYERS} players to start`),
        },
      ];
    }

    // Validate config can be satisfied (e.g. 5p + Mordred + Oberon over-consumes Minion slots).
    const valid = validateConfigForPlayerCount(this.state.players.length, this.state.config);
    if (!valid.ok) {
      return [{ peer: peerId, msg: errMsg('invalid_team', valid.message) }];
    }

    // Assign roles.
    const pool = rolePool(this.state.players.length, this.state.config);
    shuffleInPlace(pool, this.rng);
    for (let i = 0; i < this.state.players.length; i++) {
      this.state.players[i]!.role = pool[i];
    }

    // Captain starts random.
    this.state.captainSeat = Math.floor(this.rng() * this.state.players.length);

    // Lady of the Lake starts in the hand of the player to the right of the first captain.
    // Source: standard Avalon rules — Lady gate already enforced by validateConfigForPlayerCount.
    if (this.state.config.useLadyOfTheLake) {
      const n = this.state.players.length;
      const holderSeat = (this.state.captainSeat - 1 + n) % n;
      this.state.ladyOfTheLakeHolder = this.state.players[holderSeat]!.id;
    }

    this.state.phase = 'role_reveal';
    this.state.currentRound = 1;
    this.state.consecutiveRejections = 0;
    this.state.proposedTeam = [];
    this.state.pendingApproveVotes = {};
    this.state.pendingQuestVotes = {};
    this.state.questHistory = [];

    // Send RoleReveal to each player, then auto-advance to team_selection.
    const out: Outbound[] = [];
    for (const [pId, pidStr] of this.seats.entries()) {
      const view = projectView(this.state, pidStr);
      out.push({ peer: pId, msg: { type: 'RoleReveal', state: view } });
    }

    // Advance to team_selection and broadcast.
    this.state.phase = 'team_selection';
    this.broadcastUpdate(out);
    return out;
  }

  private handleProposeTeam(peerId: PeerId, playerId: PlayerId, ids: PlayerId[]): Outbound[] {
    if (this.state.phase !== 'team_selection') {
      return [{ peer: peerId, msg: errMsg('bad_phase', 'Not in team selection') }];
    }
    if (!this.isCaptain(playerId)) {
      return [{ peer: peerId, msg: errMsg('not_your_turn', 'Only the captain can propose') }];
    }
    const required = questTeamSize(this.state.players.length, this.state.currentRound);
    if (ids.length !== required) {
      return [
        {
          peer: peerId,
          msg: errMsg('invalid_team', `Team must have exactly ${required} players`),
        },
      ];
    }
    const validIds = new Set(this.state.players.map((p) => p.id));
    const unique = new Set(ids);
    if (unique.size !== ids.length || ids.some((id) => !validIds.has(id))) {
      return [{ peer: peerId, msg: errMsg('invalid_team', 'Team contains invalid player IDs') }];
    }

    this.state.proposedTeam = [...ids];
    this.state.pendingApproveVotes = Object.fromEntries(
      this.state.players.map((p) => [p.id, null] as const),
    );
    this.state.phase = 'team_vote';

    const out: Outbound[] = [];
    this.broadcastUpdate(out);
    return out;
  }

  private handleVoteTeam(peerId: PeerId, playerId: PlayerId, approve: boolean): Outbound[] {
    if (this.state.phase !== 'team_vote') {
      return [{ peer: peerId, msg: errMsg('bad_phase', 'Not in team vote') }];
    }
    if (!(playerId in this.state.pendingApproveVotes)) {
      return [{ peer: peerId, msg: errMsg('internal', 'Player not in vote pool') }];
    }
    if (this.state.pendingApproveVotes[playerId] !== null) {
      return [{ peer: peerId, msg: errMsg('already_voted', 'You already voted on this team') }];
    }

    this.state.pendingApproveVotes[playerId] = approve;

    // If anyone hasn't voted yet, just broadcast progress.
    if (Object.values(this.state.pendingApproveVotes).some((v) => v === null)) {
      const out: Outbound[] = [];
      this.broadcastUpdate(out);
      return out;
    }

    // All votes in. Tally.
    const approves = Object.values(this.state.pendingApproveVotes).filter((v) => v === true).length;
    const majority = approves > this.state.players.length / 2;

    const out: Outbound[] = [];

    if (majority) {
      // Approval — move to quest. Reset rejection counter.
      this.state.consecutiveRejections = 0;
      this.state.pendingQuestVotes = Object.fromEntries(
        this.state.proposedTeam.map((id) => [id, null] as const),
      );
      this.state.phase = 'quest';
      this.broadcastUpdate(out);
      return out;
    }

    // Rejection.
    this.state.consecutiveRejections++;
    if (this.state.consecutiveRejections >= MAX_CONSECUTIVE_REJECTIONS) {
      this.state.winner = 'evil';
      this.state.winReason = 'five_rejections';
      this.state.phase = 'finished';
      this.broadcastUpdate(out);
      return out;
    }

    // Rotate captain, reset proposal, return to team_selection.
    this.rotateCaptain();
    this.state.proposedTeam = [];
    this.state.pendingApproveVotes = {};
    this.state.phase = 'team_selection';
    this.broadcastUpdate(out);
    return out;
  }

  private handleVoteQuest(peerId: PeerId, playerId: PlayerId, success: boolean): Outbound[] {
    if (this.state.phase !== 'quest') {
      return [{ peer: peerId, msg: errMsg('bad_phase', 'Not in quest phase') }];
    }
    if (!this.state.proposedTeam.includes(playerId)) {
      return [{ peer: peerId, msg: errMsg('not_on_team', 'You are not on this quest team') }];
    }
    if (this.state.pendingQuestVotes[playerId] !== null) {
      return [{ peer: peerId, msg: errMsg('already_voted', 'You already voted on this quest') }];
    }

    // Enforce: good players cannot fail.
    const player = this.state.players.find((p) => p.id === playerId);
    if (player?.role && ALIGNMENT_OF[player.role] === 'good' && !success) {
      return [{ peer: peerId, msg: errMsg('invalid_team', 'Good players cannot fail a quest') }];
    }

    this.state.pendingQuestVotes[playerId] = success ? 'success' : 'fail';

    // Wait for all team members to vote.
    if (Object.values(this.state.pendingQuestVotes).some((v) => v === null)) {
      const out: Outbound[] = [];
      this.broadcastUpdate(out);
      return out;
    }

    // Tally.
    const votes = Object.values(this.state.pendingQuestVotes) as Array<'success' | 'fail'>;
    const fails = votes.filter((v) => v === 'fail').length;
    const successes = votes.filter((v) => v === 'success').length;
    const twoFails = twoFailsRequired(this.state.players.length, this.state.currentRound);
    const outcome: 'success' | 'fail' = fails >= (twoFails ? 2 : 1) ? 'fail' : 'success';

    const record: QuestRecord = {
      round: this.state.currentRound,
      teamSize: this.state.proposedTeam.length,
      teamPlayerIds: [...this.state.proposedTeam],
      approveVotes: Object.fromEntries(
        Object.entries(this.state.pendingApproveVotes).filter(
          (entry): entry is [PlayerId, boolean] => entry[1] !== null,
        ),
      ),
      questVoteCounts: { fails, successes },
      outcome,
      twoFailsRequired: twoFails,
    };
    this.state.questHistory.push(record);

    // Broadcast result + then either advance round, trigger Lady, trigger assassination, or finish.
    const out: Outbound[] = [];
    for (const pId of this.seats.keys()) {
      out.push({
        peer: pId,
        msg: { type: 'QuestResult', round: record.round, outcome, fails, successes },
      });
    }

    const successCount = this.state.questHistory.filter((q) => q.outcome === 'success').length;
    const failCount = this.state.questHistory.filter((q) => q.outcome === 'fail').length;

    if (successCount >= QUEST_WIN_THRESHOLD) {
      // Good has won the quest portion; go to assassination.
      this.state.phase = 'assassination';
      this.state.proposedTeam = [];
      this.state.pendingQuestVotes = {};
      this.broadcastUpdate(out);
      return out;
    }
    if (failCount >= QUEST_WIN_THRESHOLD) {
      this.state.winner = 'evil';
      this.state.winReason = 'three_quests_evil';
      this.state.phase = 'finished';
      this.broadcastUpdate(out);
      return out;
    }

    // Otherwise advance to next round.
    this.advanceToNextRound();
    this.broadcastUpdate(out);
    return out;
  }

  private handleUseLadyOfLake(
    peerId: PeerId,
    playerId: PlayerId,
    targetId: PlayerId,
  ): Outbound[] {
    if (this.state.phase !== 'lady_of_lake') {
      return [{ peer: peerId, msg: errMsg('bad_phase', 'Not in Lady of the Lake phase') }];
    }
    if (this.state.ladyOfTheLakeHolder !== playerId) {
      return [{ peer: peerId, msg: errMsg('not_your_turn', 'You do not hold the Lady') }];
    }
    const target = this.state.players.find((p) => p.id === targetId);
    if (!target || target.id === playerId) {
      return [{ peer: peerId, msg: errMsg('invalid_team', 'Invalid Lady target') }];
    }
    if (this.state.ladyOfTheLakeUsedOn.includes(targetId)) {
      return [
        { peer: peerId, msg: errMsg('invalid_team', 'Target was already inspected by Lady') },
      ];
    }

    const alignment: Alignment = target.role ? ALIGNMENT_OF[target.role] : 'good';
    this.state.ladyOfTheLakeUsedOn.push(targetId);
    this.state.ladyOfTheLakeHolder = targetId;
    this.pendingLadyLearnings.set(playerId, { aboutPlayerId: targetId, alignment });

    // After Lady, captain proposes the next team.
    this.state.phase = 'team_selection';

    const out: Outbound[] = [];
    this.broadcastUpdate(out);
    return out;
  }

  private handleAssassination(
    peerId: PeerId,
    playerId: PlayerId,
    targetId: PlayerId,
  ): Outbound[] {
    if (this.state.phase !== 'assassination') {
      return [{ peer: peerId, msg: errMsg('bad_phase', 'Not in assassination phase') }];
    }
    const me = this.state.players.find((p) => p.id === playerId);
    if (me?.role !== Role.Assassin) {
      return [{ peer: peerId, msg: errMsg('not_your_turn', 'Only the Assassin can choose') }];
    }
    const target = this.state.players.find((p) => p.id === targetId);
    if (!target || ALIGNMENT_OF[target.role!] === 'evil') {
      return [{ peer: peerId, msg: errMsg('invalid_team', 'Must target a good player') }];
    }

    this.state.assassinTarget = targetId;
    if (target.role === Role.Merlin) {
      this.state.winner = 'evil';
      this.state.winReason = 'assassin_hit_merlin';
    } else {
      this.state.winner = 'good';
      this.state.winReason = 'assassin_missed';
    }
    this.state.phase = 'finished';

    const out: Outbound[] = [];
    this.broadcastUpdate(out);
    return out;
  }

  private handleChat(peerId: PeerId, playerId: PlayerId, raw: string): Outbound[] {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return [];
    const text = sanitizeChat(raw);
    if (!text) return [];
    const line: ChatLine = {
      fromPlayerId: playerId,
      fromDisplayName: player.displayName,
      text,
      tsMs: Date.now(),
    };
    this.chat.push(line);
    if (this.chat.length > CHAT_RING_CAPACITY) this.chat.shift();
    const out: Outbound[] = [];
    for (const pId of this.seats.keys()) {
      out.push({ peer: pId, msg: { type: 'ChatLine', line } });
    }
    return out;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────────────

  private isCaptain(playerId: PlayerId): boolean {
    const captain = this.state.players[this.state.captainSeat % this.state.players.length];
    return captain?.id === playerId;
  }

  private rotateCaptain(): void {
    this.state.captainSeat = (this.state.captainSeat + 1) % this.state.players.length;
  }

  private advanceToNextRound(): void {
    this.state.currentRound++;
    this.rotateCaptain();
    this.state.proposedTeam = [];
    this.state.pendingApproveVotes = {};
    this.state.pendingQuestVotes = {};
    this.state.consecutiveRejections = 0;

    // Lady of the Lake check (after rounds 2/3/4, before next team_selection).
    if (
      this.state.ladyOfTheLakeHolder &&
      ladyOfTheLakeActiveThisRound(
        this.state.players.length,
        this.state.currentRound - 1,
        this.state.config,
      )
    ) {
      this.state.phase = 'lady_of_lake';
      return;
    }

    this.state.phase = 'team_selection';
  }

  /** Append a GameStateUpdate (per-player projection) to `out` for every seated peer. */
  private broadcastUpdate(out: Outbound[], opts: { except?: PeerId } = {}): void {
    for (const [pId, pidStr] of this.seats.entries()) {
      if (opts.except !== undefined && pId === opts.except) continue;
      const learned = this.pendingLadyLearnings.get(pidStr);
      const view = projectView(this.state, pidStr, learned ? { ladyOfTheLakeLearned: learned } : {});
      out.push({ peer: pId, msg: { type: 'GameStateUpdate', state: view } });
      this.pendingLadyLearnings.delete(pidStr);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────
// Module-local helpers
// ────────────────────────────────────────────────────────────────────────

function errMsg(code: ErrorCode, message: string): ServerMsg {
  return { type: 'Error', code, message };
}

function sanitizeName(name: string): string {
  return name.replace(/[\x00-\x1f<>]/g, '').slice(0, 24).trim();
}

function sanitizeChat(text: string): string {
  return text.replace(/[\x00-\x1f]/g, '').slice(0, 256).trim();
}

function randHex(rng: () => number, len: number): string {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(rng() * 16)];
  }
  return out;
}
