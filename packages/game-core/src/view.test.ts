import { describe, expect, it } from 'vitest';

import { GameRoom } from './room.js';
import { Role } from './types.js';
import { projectView } from './view.js';

function startGame(seed: number, extra: Partial<{ useMordred: boolean; useMorganaPercival: boolean; useOberon: boolean; useLadyOfTheLake: boolean }> = {}) {
  const config = { useLadyOfTheLake: false, useMordred: false, useMorganaPercival: false, useOberon: false, rngSeed: seed, ...extra };
  const room = new GameRoom('r1', config);
  for (let i = 0; i < 5; i++) room.addPeer(i, `P${i}`);
  if (config.useMorganaPercival) {
    // Need 6+ players to fit Percival without dropping Loyal below 0. Re-do with 7p.
  }
  return room;
}

describe('projectView — role visibility', () => {
  it('Merlin sees all evil except Mordred', () => {
    const config = { useLadyOfTheLake: false, useMordred: true, useMorganaPercival: false, useOberon: false, rngSeed: 1 };
    const room = new GameRoom('r1', config);
    for (let i = 0; i < 7; i++) room.addPeer(i, `P${i}`);
    room.apply(0, { type: 'StartGame' });
    const state = room._stateForTesting();
    const merlin = state.players.find((p) => p.role === Role.Merlin)!;
    const view = projectView(state, merlin.id);

    for (const p of state.players) {
      if (p.id === merlin.id) continue;
      if (p.role === Role.Assassin || p.role === Role.Minion) {
        expect(view.knownAlignments[p.id]).toBe('evil');
      } else if (p.role === Role.Mordred) {
        expect(view.knownAlignments[p.id]).toBeUndefined();
      } else {
        expect(view.knownAlignments[p.id]).toBeUndefined();
      }
    }
  });

  it('Percival sees Merlin and Morgana as merlin-like (indistinguishably)', () => {
    const config = { useLadyOfTheLake: false, useMordred: false, useMorganaPercival: true, useOberon: false, rngSeed: 2 };
    const room = new GameRoom('r1', config);
    for (let i = 0; i < 7; i++) room.addPeer(i, `P${i}`);
    room.apply(0, { type: 'StartGame' });
    const state = room._stateForTesting();
    const percival = state.players.find((p) => p.role === Role.Percival)!;
    const merlin = state.players.find((p) => p.role === Role.Merlin)!;
    const morgana = state.players.find((p) => p.role === Role.Morgana)!;
    const view = projectView(state, percival.id);

    expect(view.knownAlignments[merlin.id]).toBe('merlin-like');
    expect(view.knownAlignments[morgana.id]).toBe('merlin-like');
  });

  it('Evil teammates see each other except Oberon', () => {
    const config = { useLadyOfTheLake: false, useMordred: false, useMorganaPercival: false, useOberon: true, rngSeed: 3 };
    const room = new GameRoom('r1', config);
    for (let i = 0; i < 7; i++) room.addPeer(i, `P${i}`);
    room.apply(0, { type: 'StartGame' });
    const state = room._stateForTesting();
    const assassin = state.players.find((p) => p.role === Role.Assassin)!;
    const oberon = state.players.find((p) => p.role === Role.Oberon)!;
    const view = projectView(state, assassin.id);

    // Assassin should NOT see Oberon, but should see other Minion(s).
    expect(view.knownAlignments[oberon.id]).toBeUndefined();
    const otherMinion = state.players.find(
      (p) => p.role === Role.Minion && p.id !== assassin.id && p.id !== oberon.id,
    );
    if (otherMinion) {
      expect(view.knownAlignments[otherMinion.id]).toBe('evil');
    }
  });

  it('Loyal Servant sees nobody', () => {
    const room = new GameRoom('r1', { useLadyOfTheLake: false, useMordred: false, useMorganaPercival: false, useOberon: false, rngSeed: 4 });
    for (let i = 0; i < 5; i++) room.addPeer(i, `P${i}`);
    room.apply(0, { type: 'StartGame' });
    const state = room._stateForTesting();
    const loyal = state.players.find((p) => p.role === Role.LoyalServant)!;
    const view = projectView(state, loyal.id);
    expect(Object.keys(view.knownAlignments)).toHaveLength(0);
  });

  it('Oberon (evil) sees nobody', () => {
    const config = { useLadyOfTheLake: false, useMordred: false, useMorganaPercival: false, useOberon: true, rngSeed: 5 };
    const room = new GameRoom('r1', config);
    for (let i = 0; i < 7; i++) room.addPeer(i, `P${i}`);
    room.apply(0, { type: 'StartGame' });
    const state = room._stateForTesting();
    const oberon = state.players.find((p) => p.role === Role.Oberon);
    if (oberon) {
      const view = projectView(state, oberon.id);
      expect(Object.keys(view.knownAlignments)).toHaveLength(0);
    }
  });
});

describe('projectView — Merlin sight with Mordred and Oberon specials', () => {
  // Rule: Merlin sees ALL evil players (including Oberon) EXCEPT Mordred.
  // Oberon's hidden-from-evil property is asymmetric to Merlin's sight.

  // 9p base distribution: 1 Merlin, 5 Loyal, 1 Assassin, 2 Minion.
  // useMordred consumes 1 Minion; useOberon consumes the second.
  it('9p + Mordred + Oberon: Merlin sees Assassin and Oberon but NOT Mordred', () => {
    const config = {
      useLadyOfTheLake: false,
      useMordred: true,
      useMorganaPercival: false,
      useOberon: true,
      rngSeed: 17,
    };
    const room = new GameRoom('r1', config);
    for (let i = 0; i < 9; i++) room.addPeer(i, `P${i}`);
    room.apply(0, { type: 'StartGame' });
    const state = room._stateForTesting();
    expect(state.phase).not.toBe('lobby'); // confirm StartGame succeeded
    const merlin = state.players.find((p) => p.role === Role.Merlin)!;
    const view = projectView(state, merlin.id);

    for (const p of state.players) {
      if (p.id === merlin.id) continue;
      if (p.role === Role.Assassin || p.role === Role.Oberon) {
        expect(view.knownAlignments[p.id], `Merlin should see ${p.role}`).toBe('evil');
      } else {
        // Mordred + Loyals → invisible.
        expect(view.knownAlignments[p.id], `Merlin should NOT see ${p.role}`).toBeUndefined();
      }
    }
  });

  it('10p + everything: Merlin sees Assassin + Morgana + Minion + Oberon, NOT Mordred', () => {
    // 10p base: 1 Merlin, 5 Loyal, 1 Assassin, 3 Minion → can fit all 4 specials.
    const config = {
      useLadyOfTheLake: true,
      useMordred: true,
      useMorganaPercival: true,
      useOberon: true,
      rngSeed: 25,
    };
    const room = new GameRoom('r1', config);
    for (let i = 0; i < 10; i++) room.addPeer(i, `P${i}`);
    room.apply(0, { type: 'StartGame' });
    const state = room._stateForTesting();
    expect(state.phase).not.toBe('lobby');
    const merlin = state.players.find((p) => p.role === Role.Merlin)!;
    const view = projectView(state, merlin.id);

    for (const p of state.players) {
      if (p.id === merlin.id) continue;
      if (
        p.role === Role.Assassin ||
        p.role === Role.Morgana ||
        p.role === Role.Minion ||
        p.role === Role.Oberon
      ) {
        expect(view.knownAlignments[p.id], `Merlin should see ${p.role}`).toBe('evil');
      } else {
        // Mordred, Loyals, Percival → invisible.
        expect(view.knownAlignments[p.id], `Merlin should NOT see ${p.role}`).toBeUndefined();
      }
    }
  });

  it('Assassin in 10p + Oberon: sees Morgana + other Minions, NOT Oberon', () => {
    // Locks down the asymmetry: evil-team visibility excludes Oberon.
    const room = new GameRoom('r1', {
      useLadyOfTheLake: false,
      useMordred: false,
      useMorganaPercival: true,
      useOberon: true,
      rngSeed: 33,
    });
    for (let i = 0; i < 10; i++) room.addPeer(i, `P${i}`);
    room.apply(0, { type: 'StartGame' });
    const state = room._stateForTesting();
    const assassin = state.players.find((p) => p.role === Role.Assassin)!;
    const oberon = state.players.find((p) => p.role === Role.Oberon)!;
    const view = projectView(state, assassin.id);

    expect(view.knownAlignments[oberon.id]).toBeUndefined();
    const morgana = state.players.find((p) => p.role === Role.Morgana);
    if (morgana) expect(view.knownAlignments[morgana.id]).toBe('evil');
  });
});

describe('projectView — projection shape', () => {
  it('omits other players roles entirely from serialised view', () => {
    const room = new GameRoom('r1', { useLadyOfTheLake: false, useMordred: true, useMorganaPercival: true, useOberon: true, rngSeed: 8 });
    for (let i = 0; i < 10; i++) room.addPeer(i, `P${i}`);
    room.apply(0, { type: 'StartGame' });
    const state = room._stateForTesting();

    for (const viewer of state.players) {
      const view = projectView(state, viewer.id);
      const serialised = JSON.stringify(view);
      for (const other of state.players) {
        if (other.id === viewer.id) continue;
        // Other players role names should not appear anywhere in the view.
        // (Counter-example: viewer's own role is OK — only check other players.)
        expect(serialised, `viewer=${viewer.role} should not see ${other.role}`).not.toContain(
          `"role":"${other.role}"`,
        );
      }
    }
  });
});
