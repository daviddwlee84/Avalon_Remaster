import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { GameRoom } from './room.js';
import { Role } from './types.js';
import { projectView } from './view.js';

/**
 * NORTH-STAR property test: for any post-role-reveal GameState produced via the room API,
 * a PlayerView for any viewer must never contain another player's role name as a JSON value.
 *
 * Mirrors chess-net's no-leak proptest in tests/view_projection.rs.
 */
describe('PROPERTY: PlayerView never leaks other players roles', () => {
  it('no role string of another player appears in any projected view', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 5, max: 10 }),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (seed, count, mordred, morganaP, oberon, lady) => {
          // Each special role consumes one Minion slot.
          // 5-6p has 1 Minion → at most 1 swap; 7-9p has 2 → at most 2; 10p has 3 → up to 3.
          const minionCount = count <= 6 ? 1 : count <= 9 ? 2 : 3;
          const flags = [mordred, morganaP, oberon];
          const requested = flags.filter(Boolean).length;
          // Clamp: keep flags in order of preference, dropping any that exceed minionCount.
          let used = 0;
          const effective = flags.map((f) => (f && used < minionCount ? (used++, true) : false));
          void requested;

          const room = new GameRoom('r1', {
            useLadyOfTheLake: lady,
            useMordred: effective[0]!,
            useMorganaPercival: effective[1]!,
            useOberon: effective[2]!,
            rngSeed: seed,
          });
          for (let i = 0; i < count; i++) room.addPeer(i, `P${i}`);
          room.apply(0, { type: 'StartGame' });
          const state = room._stateForTesting();

          for (const viewer of state.players) {
            const view = projectView(state, viewer.id);
            const serialised = JSON.stringify(view);

            // Other players role-name JSON values should never appear.
            for (const other of state.players) {
              if (other.id === viewer.id) continue;
              if (!other.role) continue;
              const needle = `"role":"${other.role}"`;
              expect(serialised, `seed=${seed} viewer=${viewer.role}`).not.toContain(needle);
            }
          }
          return true;
        },
      ),
      { numRuns: 200, verbose: false },
    );
  });

  it('Merlin can never observe Mordred via knownAlignments', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), fc.integer({ min: 7, max: 10 }), (seed, count) => {
        const room = new GameRoom('r1', {
          useLadyOfTheLake: false,
          useMordred: true,
          useMorganaPercival: false,
          useOberon: false,
          rngSeed: seed,
        });
        for (let i = 0; i < count; i++) room.addPeer(i, `P${i}`);
        room.apply(0, { type: 'StartGame' });
        const state = room._stateForTesting();

        const merlin = state.players.find((p) => p.role === Role.Merlin);
        const mordred = state.players.find((p) => p.role === Role.Mordred);
        if (!merlin || !mordred) return true; // distribution edge case
        const view = projectView(state, merlin.id);
        expect(view.knownAlignments[mordred.id]).toBeUndefined();
        return true;
      }),
      { numRuns: 100 },
    );
  });
});
