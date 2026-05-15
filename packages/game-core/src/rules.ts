import { Role, type RoomConfig } from './types.js';

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;
export const ROUNDS_PER_GAME = 5;
export const MAX_CONSECUTIVE_REJECTIONS = 5;
export const QUEST_WIN_THRESHOLD = 3;

/**
 * Quest team size per round, indexed by player count.
 * Source: references/Avalon/index.js:9-16 (amountList).
 */
const QUEST_TEAM_SIZES: Record<number, readonly number[]> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

export function questTeamSize(playerCount: number, round: number): number {
  const sizes = QUEST_TEAM_SIZES[playerCount];
  if (!sizes) throw new Error(`Unsupported player count: ${playerCount}`);
  const size = sizes[round - 1];
  if (size === undefined) throw new Error(`Invalid round: ${round}`);
  return size;
}

/**
 * Round 4 with 7+ players requires 2 fail votes to fail the mission.
 * Source: references/Avalon/index.js:571
 */
export function twoFailsRequired(playerCount: number, round: number): boolean {
  return playerCount >= 7 && round === 4;
}

/**
 * Default role distribution (Merlin + N Loyal + Assassin + M Minion) per player count.
 * Source: references/Avalon/index.js:18-25 (bgamount).
 */
const DEFAULT_DISTRIBUTION: Record<number, readonly Role[]> = {
  5: [Role.Merlin, Role.LoyalServant, Role.LoyalServant, Role.Assassin, Role.Minion],
  6: [Role.Merlin, Role.LoyalServant, Role.LoyalServant, Role.LoyalServant, Role.Assassin, Role.Minion],
  7: [
    Role.Merlin,
    Role.LoyalServant,
    Role.LoyalServant,
    Role.LoyalServant,
    Role.Assassin,
    Role.Minion,
    Role.Minion,
  ],
  8: [
    Role.Merlin,
    Role.LoyalServant,
    Role.LoyalServant,
    Role.LoyalServant,
    Role.LoyalServant,
    Role.Assassin,
    Role.Minion,
    Role.Minion,
  ],
  9: [
    Role.Merlin,
    Role.LoyalServant,
    Role.LoyalServant,
    Role.LoyalServant,
    Role.LoyalServant,
    Role.LoyalServant,
    Role.Assassin,
    Role.Minion,
    Role.Minion,
  ],
  10: [
    Role.Merlin,
    Role.LoyalServant,
    Role.LoyalServant,
    Role.LoyalServant,
    Role.LoyalServant,
    Role.LoyalServant,
    Role.Assassin,
    Role.Minion,
    Role.Minion,
    Role.Minion,
  ],
};

/**
 * Build the role pool for a game given config. Applies special-role swaps to the default distribution.
 */
export function rolePool(playerCount: number, config: RoomConfig): Role[] {
  const base = DEFAULT_DISTRIBUTION[playerCount];
  if (!base) throw new Error(`Unsupported player count: ${playerCount}`);
  const pool = [...base];

  if (config.useMorganaPercival) {
    swapFirst(pool, Role.LoyalServant, Role.Percival);
    swapFirst(pool, Role.Minion, Role.Morgana);
  }
  if (config.useMordred) {
    swapFirst(pool, Role.Minion, Role.Mordred);
  }
  if (config.useOberon) {
    swapFirst(pool, Role.Minion, Role.Oberon);
  }

  return pool;
}

function swapFirst(pool: Role[], from: Role, to: Role): void {
  const idx = pool.indexOf(from);
  if (idx === -1) {
    throw new Error(`Cannot apply special-role swap: no ${from} left to convert into ${to}`);
  }
  pool[idx] = to;
}

/**
 * Lady of the Lake is available in rounds 3, 4, and 5 when:
 * - config.useLadyOfTheLake is true
 * - 7+ players (source: references/Avalon/index.js:631)
 * Triggered AFTER a round's quest resolves, BEFORE the next round's team_selection.
 */
export function ladyOfTheLakeActiveThisRound(
  playerCount: number,
  round: number,
  config: RoomConfig,
): boolean {
  return config.useLadyOfTheLake && playerCount >= 7 && round >= 2 && round <= 4;
}
