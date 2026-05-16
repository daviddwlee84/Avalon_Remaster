import {
  type Alignment,
  type ClientMsg,
  type ErrorCode,
  PROTOCOL_VERSION,
  type Phase,
  type PlayerView,
  type Role,
  type RoomConfig,
  type ServerMsg,
} from '@avalon/game-core';
import { z } from 'zod';

export { PROTOCOL_VERSION };

// ────────────────────────────────────────────────────────────────────────
// Primitive shapes
// ────────────────────────────────────────────────────────────────────────

export const RoleSchema = z.enum([
  'Merlin',
  'Percival',
  'LoyalServant',
  'Assassin',
  'Morgana',
  'Mordred',
  'Oberon',
  'Minion',
]) satisfies z.ZodType<Role>;

export const AlignmentSchema = z.enum(['good', 'evil']) satisfies z.ZodType<Alignment>;

export const PhaseSchema = z.enum([
  'lobby',
  'role_reveal',
  'team_selection',
  'team_vote',
  'quest',
  'quest_reveal',
  'lady_of_lake',
  'assassination',
  'finished',
]) satisfies z.ZodType<Phase>;

export const RoomConfigSchema = z.object({
  useLadyOfTheLake: z.boolean(),
  useMordred: z.boolean(),
  useMorganaPercival: z.boolean(),
  useOberon: z.boolean(),
  rngSeed: z.number().optional(),
}) satisfies z.ZodType<RoomConfig>;

const ChatLineSchema = z.object({
  fromPlayerId: z.string(),
  fromDisplayName: z.string(),
  text: z.string(),
  tsMs: z.number(),
});

const RoomSummarySchema = z.object({
  roomId: z.string(),
  phase: PhaseSchema,
  playerCount: z.number().int().min(0),
  hasPassword: z.boolean(),
});

const QuestRecordSchema = z.object({
  round: z.number().int().min(1).max(5),
  teamSize: z.number().int().min(1),
  teamPlayerIds: z.array(z.string()),
  approveVotes: z.record(z.string(), z.boolean()),
  questVoteCounts: z.object({
    fails: z.number().int().min(0),
    successes: z.number().int().min(0),
  }),
  outcome: z.enum(['success', 'fail']),
  twoFailsRequired: z.boolean(),
});

const PlayerViewSchema = z.object({
  roomId: z.string(),
  phase: PhaseSchema,
  myPlayerId: z.string(),
  myRole: RoleSchema.optional(),
  knownAlignments: z.record(z.string(), z.union([AlignmentSchema, z.literal('merlin-like')])),
  players: z.array(
    z.object({
      id: z.string(),
      displayName: z.string(),
      seat: z.number().int().min(0),
      connected: z.boolean(),
      isCaptain: z.boolean(),
      isOnProposedTeam: z.boolean(),
      isLadyOfTheLakeHolder: z.boolean(),
    }),
  ),
  hostPlayerId: z.string(),
  config: RoomConfigSchema,
  currentRound: z.number().int().min(1).max(5),
  captainSeat: z.number().int().min(0),
  consecutiveRejections: z.number().int().min(0).max(5),
  proposedTeam: z.array(z.string()),
  teamSizeRequired: z.number().int().min(0),
  twoFailsRequired: z.boolean(),
  approveVotesRevealed: z.record(z.string(), z.boolean()).nullable(),
  myPendingApproveVote: z.boolean().nullable(),
  approveVoteSubmitted: z.record(z.string(), z.boolean()),
  myPendingQuestVote: z.enum(['success', 'fail']).nullable(),
  questVoteSubmitted: z.record(z.string(), z.boolean()),
  questHistory: z.array(QuestRecordSchema),
  ladyOfTheLakeLearned: z
    .object({ aboutPlayerId: z.string(), alignment: AlignmentSchema })
    .optional(),
  ladyOfTheLakeUsedOn: z.array(z.string()),
  winner: AlignmentSchema.optional(),
  winReason: z
    .enum([
      'three_quests_good',
      'three_quests_evil',
      'five_rejections',
      'assassin_hit_merlin',
      'assassin_missed',
    ])
    .optional(),
  assassinTarget: z.string().optional(),
}) satisfies z.ZodType<PlayerView>;

export const ErrorCodeSchema = z.enum([
  'bad_phase',
  'not_your_turn',
  'invalid_team',
  'already_voted',
  'not_on_team',
  'room_full',
  'bad_password',
  'unknown_room',
  'malformed_message',
  'rate_limited',
  'internal',
]) satisfies z.ZodType<ErrorCode>;

// ────────────────────────────────────────────────────────────────────────
// ClientMsg
// ────────────────────────────────────────────────────────────────────────

export const ClientMsgSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Hello'), displayName: z.string().min(1).max(24) }),
  z.object({ type: z.literal('CreateRoom'), config: RoomConfigSchema, password: z.string().optional() }),
  z.object({ type: z.literal('JoinRoom'), roomId: z.string(), password: z.string().optional() }),
  z.object({ type: z.literal('LeaveRoom') }),
  z.object({ type: z.literal('StartGame') }),
  z.object({ type: z.literal('ProposeTeam'), playerIds: z.array(z.string()).min(1).max(10) }),
  z.object({ type: z.literal('VoteTeam'), approve: z.boolean() }),
  z.object({ type: z.literal('VoteQuest'), success: z.boolean() }),
  z.object({ type: z.literal('UseLadyOfLake'), targetPlayerId: z.string() }),
  z.object({ type: z.literal('NominateAssassinTarget'), targetPlayerId: z.string() }),
  z.object({ type: z.literal('Chat'), text: z.string().min(1).max(256) }),
  z.object({ type: z.literal('Ping') }),
]) satisfies z.ZodType<ClientMsg>;

// ────────────────────────────────────────────────────────────────────────
// ServerMsg
// ────────────────────────────────────────────────────────────────────────

export const ServerMsgSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('Welcome'),
    protocol: z.number(),
    peerId: z.number(),
    yourPlayerId: z.string(),
    reconnectToken: z.string(),
  }),
  z.object({ type: z.literal('RoomList'), rooms: z.array(RoomSummarySchema) }),
  z.object({ type: z.literal('RoomJoined'), state: PlayerViewSchema }),
  z.object({ type: z.literal('GameStateUpdate'), state: PlayerViewSchema }),
  z.object({ type: z.literal('RoleReveal'), state: PlayerViewSchema }),
  z.object({
    type: z.literal('QuestResult'),
    round: z.number().int(),
    outcome: z.enum(['success', 'fail']),
    fails: z.number().int().min(0),
    successes: z.number().int().min(0),
  }),
  z.object({ type: z.literal('ChatLine'), line: ChatLineSchema }),
  z.object({ type: z.literal('ChatHistory'), lines: z.array(ChatLineSchema) }),
  z.object({ type: z.literal('Error'), code: ErrorCodeSchema, message: z.string() }),
  z.object({ type: z.literal('Pong') }),
]) satisfies z.ZodType<ServerMsg>;

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

export function parseClientMsg(raw: unknown): ClientMsg | null {
  const result = ClientMsgSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function parseServerMsg(raw: unknown): ServerMsg | null {
  const result = ServerMsgSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export type { ClientMsg, ServerMsg } from '@avalon/game-core';
