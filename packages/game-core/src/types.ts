/**
 * Avalon roles. The 8 canonical roles from The Resistance: Avalon.
 */
export const Role = {
  Merlin: 'Merlin',
  Percival: 'Percival',
  LoyalServant: 'LoyalServant',
  Assassin: 'Assassin',
  Morgana: 'Morgana',
  Mordred: 'Mordred',
  Oberon: 'Oberon',
  Minion: 'Minion',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export type Alignment = 'good' | 'evil';

export const ALIGNMENT_OF: Record<Role, Alignment> = {
  Merlin: 'good',
  Percival: 'good',
  LoyalServant: 'good',
  Assassin: 'evil',
  Morgana: 'evil',
  Mordred: 'evil',
  Oberon: 'evil',
  Minion: 'evil',
};

export type Phase =
  | 'lobby'
  | 'role_reveal'
  | 'team_selection'
  | 'team_vote'
  | 'quest'
  | 'quest_reveal'
  | 'lady_of_lake'
  | 'assassination'
  | 'finished';

export type PlayerId = string;
export type PeerId = number;
export type RoomId = string;

export interface RoomConfig {
  /** Optional Lady of the Lake (rounds 3-5, 7+ players). */
  useLadyOfTheLake: boolean;
  /** Replace one Minion with Mordred (hidden from Merlin). */
  useMordred: boolean;
  /** Replace one Loyal with Percival + one Minion with Morgana. */
  useMorganaPercival: boolean;
  /** Add Oberon (hidden from other evil). Counts toward evil distribution. */
  useOberon: boolean;
  /** Seed for shuffle determinism; only used in tests. Server uses crypto-random. */
  rngSeed?: number;
}

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  useLadyOfTheLake: false,
  useMordred: false,
  useMorganaPercival: false,
  useOberon: false,
};

export interface Player {
  id: PlayerId;
  displayName: string;
  /** Seat index 0..N-1; determines turn order. */
  seat: number;
  /** False during reconnect grace window. */
  connected: boolean;
  /** Assigned at role_reveal; NEVER ships in PlayerView for OTHER players. */
  role?: Role;
}

export interface QuestRecord {
  /** 1..5 */
  round: number;
  teamSize: number;
  teamPlayerIds: PlayerId[];
  /** Visible to everyone after team_vote closes. */
  approveVotes: Record<PlayerId, boolean>;
  /** Counts only — identities of fail/success voters NEVER revealed. */
  questVoteCounts: { fails: number; successes: number };
  outcome: 'success' | 'fail';
  /** 8-10p round 4 special rule was active. */
  twoFailsRequired: boolean;
}

export interface GameState {
  roomId: RoomId;
  phase: Phase;
  players: Player[];
  hostPlayerId: PlayerId;
  config: RoomConfig;

  /** Holder of the Lady of the Lake token; rotates after each use in rounds 3-5. */
  ladyOfTheLakeHolder?: PlayerId;
  /** Players who have already been Lady's target (cannot be targeted again). */
  ladyOfTheLakeUsedOn: PlayerId[];

  /** 1..5 */
  currentRound: number;
  /** Index into players[] for current captain. */
  captainSeat: number;
  /** Resets on team approval; 5 → evil wins. */
  consecutiveRejections: number;

  /** Current proposal during team_selection. */
  proposedTeam: PlayerId[];

  /** Pending votes during team_vote phase. null = not voted yet. */
  pendingApproveVotes: Record<PlayerId, boolean | null>;
  /** Pending quest votes; only proposed-team members can vote. */
  pendingQuestVotes: Record<PlayerId, 'success' | 'fail' | null>;

  /** Append-only history of completed quests. */
  questHistory: QuestRecord[];

  /** Set during assassination phase. */
  assassinTarget?: PlayerId;
  winner?: Alignment;
  winReason?:
    | 'three_quests_good'
    | 'three_quests_evil'
    | 'five_rejections'
    | 'assassin_hit_merlin'
    | 'assassin_missed';
}

/**
 * Per-player view derived from GameState. NEVER ship the raw GameState to clients —
 * always project it through {@link projectView} first.
 */
export interface PlayerView {
  roomId: RoomId;
  phase: Phase;
  myPlayerId: PlayerId;
  myRole?: Role;

  /**
   * Alignments this player is privileged to know.
   * - Merlin: sees all evil except Mordred → { id: 'evil' }
   * - Percival: sees Merlin and Morgana as { id: 'merlin-like' } indistinguishably
   * - Minions/Assassin/Morgana/Mordred: see each other → { id: 'evil' } (excluding Oberon)
   * - Oberon and Loyal Servants: empty
   */
  knownAlignments: Record<PlayerId, Alignment | 'merlin-like'>;

  players: Array<{
    id: PlayerId;
    displayName: string;
    seat: number;
    connected: boolean;
    isCaptain: boolean;
    isOnProposedTeam: boolean;
    isLadyOfTheLakeHolder: boolean;
  }>;

  hostPlayerId: PlayerId;
  config: RoomConfig;

  currentRound: number;
  captainSeat: number;
  consecutiveRejections: number;

  proposedTeam: PlayerId[];
  teamSizeRequired: number;
  twoFailsRequired: boolean;

  /** Public after team_vote closes; null while still pending. */
  approveVotesRevealed: Record<PlayerId, boolean> | null;
  myPendingApproveVote: boolean | null;
  /** Only filled in if I have a pending team vote; tracks who else has voted (without revealing how). */
  approveVoteSubmitted: Record<PlayerId, boolean>;

  myPendingQuestVote: 'success' | 'fail' | null;
  /** Track who has submitted a quest vote (without revealing how). */
  questVoteSubmitted: Record<PlayerId, boolean>;

  questHistory: QuestRecord[];

  /** Visible ONLY to the holder right after they use Lady of the Lake. */
  ladyOfTheLakeLearned?: { aboutPlayerId: PlayerId; alignment: Alignment };

  winner?: Alignment;
  winReason?: GameState['winReason'];
  assassinTarget?: PlayerId;
}

export interface RoomSummary {
  roomId: RoomId;
  phase: Phase;
  playerCount: number;
  hasPassword: boolean;
}

export interface ChatLine {
  fromPlayerId: PlayerId;
  fromDisplayName: string;
  text: string;
  tsMs: number;
}
