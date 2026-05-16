import { questTeamSize, twoFailsRequired } from './rules.js';
import type { Alignment, GameState, PlayerId, PlayerView } from './types.js';
import { ALIGNMENT_OF, Role } from './types.js';

/**
 * Project a per-player view of the game state. This is THE critical security boundary —
 * it must never leak another player's role or quest vote to the recipient.
 *
 * Mirrors chess-net's `PlayerView::project` pattern.
 */
export function projectView(
  state: GameState,
  viewer: PlayerId,
  opts: { ladyOfTheLakeLearned?: { aboutPlayerId: PlayerId; alignment: Alignment } } = {},
): PlayerView {
  const me = state.players.find((p) => p.id === viewer);
  if (!me) {
    throw new Error(`projectView: viewer ${viewer} is not in this room`);
  }

  const teamSizeRequired =
    state.phase === 'lobby' || state.phase === 'finished'
      ? 0
      : state.players.length >= 5
        ? questTeamSize(state.players.length, state.currentRound)
        : 0;

  const captainPlayerId = state.players[state.captainSeat % state.players.length]?.id;

  const playersView = state.players.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    seat: p.seat,
    connected: p.connected,
    isCaptain: p.id === captainPlayerId,
    isOnProposedTeam: state.proposedTeam.includes(p.id),
    isLadyOfTheLakeHolder: state.ladyOfTheLakeHolder === p.id,
  }));

  const knownAlignments = computeKnownAlignments(state, me.role, viewer);

  const teamVoteComplete = isTeamVoteComplete(state);
  const approveVotesRevealed = teamVoteComplete
    ? Object.fromEntries(
        Object.entries(state.pendingApproveVotes).filter(
          (entry): entry is [PlayerId, boolean] => entry[1] !== null,
        ),
      )
    : null;

  const approveVoteSubmitted = Object.fromEntries(
    Object.entries(state.pendingApproveVotes).map(([pid, v]) => [pid, v !== null] as const),
  );

  const questVoteSubmitted = Object.fromEntries(
    Object.entries(state.pendingQuestVotes).map(([pid, v]) => [pid, v !== null] as const),
  );

  return {
    roomId: state.roomId,
    phase: state.phase,
    myPlayerId: viewer,
    myRole: me.role,
    knownAlignments,
    players: playersView,
    hostPlayerId: state.hostPlayerId,
    config: state.config,
    currentRound: state.currentRound,
    captainSeat: state.captainSeat,
    consecutiveRejections: state.consecutiveRejections,
    proposedTeam: [...state.proposedTeam],
    teamSizeRequired,
    twoFailsRequired:
      state.players.length >= 5 && twoFailsRequired(state.players.length, state.currentRound),
    approveVotesRevealed,
    myPendingApproveVote: state.pendingApproveVotes[viewer] ?? null,
    approveVoteSubmitted,
    myPendingQuestVote: state.pendingQuestVotes[viewer] ?? null,
    questVoteSubmitted,
    questHistory: state.questHistory.map((q) => ({ ...q })),
    ladyOfTheLakeLearned: opts.ladyOfTheLakeLearned,
    ladyOfTheLakeUsedOn: [...state.ladyOfTheLakeUsedOn],
    winner: state.winner,
    winReason: state.winReason,
    assassinTarget: state.assassinTarget,
  };
}

function isTeamVoteComplete(state: GameState): boolean {
  if (state.phase === 'team_vote') return false;
  // After team_vote closes, the phase advances to quest / team_selection / etc.
  // approveVotes are kept in pendingApproveVotes until the next round's vote phase opens.
  const values = Object.values(state.pendingApproveVotes);
  return values.length > 0 && values.every((v) => v !== null);
}

/**
 * Compute the set of alignments the viewer can see, based on their role.
 *
 * Visibility rules (sourced from references/Avalon/client.js + standard Avalon rules):
 * - **Merlin** sees all evil players EXCEPT Mordred.
 * - **Percival** sees Merlin and Morgana as 'merlin-like' (indistinguishable).
 * - **Loyal Servant**: no info.
 * - **Assassin / Morgana / Mordred / Minion** see each other (all evil except Oberon) as 'evil'.
 * - **Oberon**: no info (Oberon is alone among evil).
 *
 * Never includes the viewer themself.
 */
function computeKnownAlignments(
  state: GameState,
  myRole: Role | undefined,
  viewer: PlayerId,
): Record<PlayerId, Alignment | 'merlin-like'> {
  if (!myRole) return {};
  // Pre-role_reveal, no info.
  if (state.phase === 'lobby') return {};

  const out: Record<PlayerId, Alignment | 'merlin-like'> = {};

  for (const p of state.players) {
    if (p.id === viewer) continue;
    if (!p.role) continue;
    const pAlign = ALIGNMENT_OF[p.role];

    switch (myRole) {
      case Role.Merlin:
        if (pAlign === 'evil' && p.role !== Role.Mordred) {
          out[p.id] = 'evil';
        }
        break;

      case Role.Percival:
        if (p.role === Role.Merlin || p.role === Role.Morgana) {
          out[p.id] = 'merlin-like';
        }
        break;

      case Role.Assassin:
      case Role.Morgana:
      case Role.Mordred:
      case Role.Minion:
        // Evil sees other evil, EXCEPT Oberon.
        if (pAlign === 'evil' && p.role !== Role.Oberon) {
          out[p.id] = 'evil';
        }
        break;

      case Role.Oberon:
      case Role.LoyalServant:
      default:
        // No information.
        break;
    }
  }

  return out;
}
