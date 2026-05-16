import { describe, expect, it } from 'vitest';

import type { Outbound, ServerMsg } from './messages.js';
import { GameRoom } from './room.js';
import { ALIGNMENT_OF, Role } from './types.js';

function startGame(peerCount = 5, seed = 42) {
  const room = new GameRoom('r1', { useLadyOfTheLake: false, useMordred: false, useMorganaPercival: false, useOberon: false, rngSeed: seed });
  for (let i = 0; i < peerCount; i++) {
    room.addPeer(i, `Player${i + 1}`);
  }
  // Host is peer 0.
  room.apply(0, { type: 'StartGame' });
  return room;
}

/** Pull the most recent GameStateUpdate sent to a given peer out of an outbound list. */
function lastUpdateFor(out: Outbound[], peer: number): ServerMsg | undefined {
  for (let i = out.length - 1; i >= 0; i--) {
    const o = out[i]!;
    if (o.peer === peer && o.msg.type === 'GameStateUpdate') return o.msg;
  }
  return undefined;
}

function findCaptainPeerId(room: GameRoom): number {
  const state = room._stateForTesting();
  const captain = state.players[state.captainSeat]!;
  // PeerIds happen to equal seat-index because of our test setup.
  return state.players.findIndex((p) => p.id === captain.id);
}

describe('GameRoom — peer lifecycle', () => {
  it('seats peers and broadcasts updates', () => {
    const room = new GameRoom('r1', { useLadyOfTheLake: false, useMordred: false, useMorganaPercival: false, useOberon: false });
    const out1 = room.addPeer(0, 'Alice');
    expect(out1.find((o) => o.msg.type === 'Welcome')).toBeDefined();
    expect(out1.find((o) => o.msg.type === 'RoomJoined')).toBeDefined();
    expect(room.peerCount()).toBe(1);

    const out2 = room.addPeer(1, 'Bob');
    // Alice should see a GameStateUpdate now that Bob joined.
    const aliceUpdate = lastUpdateFor(out2, 0);
    expect(aliceUpdate?.type).toBe('GameStateUpdate');
    expect(room.peerCount()).toBe(2);
  });

  it('rejects start with fewer than 5 players', () => {
    const room = new GameRoom('r1', { useLadyOfTheLake: false, useMordred: false, useMorganaPercival: false, useOberon: false });
    for (let i = 0; i < 4; i++) room.addPeer(i, `P${i}`);
    const out = room.apply(0, { type: 'StartGame' });
    expect(out.some((o) => o.msg.type === 'Error')).toBe(true);
    expect(room._stateForTesting().phase).toBe('lobby');
  });

  it('only host can start', () => {
    const room = new GameRoom('r1', { useLadyOfTheLake: false, useMordred: false, useMorganaPercival: false, useOberon: false });
    for (let i = 0; i < 5; i++) room.addPeer(i, `P${i}`);
    const out = room.apply(2, { type: 'StartGame' });
    expect(out.some((o) => o.msg.type === 'Error')).toBe(true);
  });
});

describe('GameRoom — start game and role reveal', () => {
  it('assigns correct role distribution for 5 players', () => {
    const room = startGame(5);
    const state = room._stateForTesting();
    const roles = state.players.map((p) => p.role!);
    expect(roles.filter((r) => r === Role.Merlin).length).toBe(1);
    expect(roles.filter((r) => r === Role.Assassin).length).toBe(1);
    expect(roles.filter((r) => r === Role.Minion).length).toBe(1);
    expect(roles.filter((r) => r === Role.LoyalServant).length).toBe(2);
    expect(state.phase).toBe('team_selection');
  });

  it('emits one RoleReveal per peer', () => {
    const room = new GameRoom('r1', { useLadyOfTheLake: false, useMordred: false, useMorganaPercival: false, useOberon: false, rngSeed: 7 });
    for (let i = 0; i < 5; i++) room.addPeer(i, `P${i}`);
    const out = room.apply(0, { type: 'StartGame' });
    const reveals = out.filter((o) => o.msg.type === 'RoleReveal');
    expect(reveals.length).toBe(5);
  });
});

describe('GameRoom — full happy-path game (5 players)', () => {
  it('completes a game with 3 successes → assassination → assassin misses Merlin', () => {
    const room = startGame(5, 1);
    const state = room._stateForTesting();
    const merlin = state.players.find((p) => p.role === Role.Merlin)!;
    const assassin = state.players.find((p) => p.role === Role.Assassin)!;
    const loyals = state.players.filter((p) => p.role === Role.LoyalServant);

    // Helper to play out one quest where good wins (all-good team, all vote success).
    function playGoodQuest() {
      const cap = findCaptainPeerId(room);
      const required = state.players.length >= 5
        ? (state.players.length === 5 && state.currentRound === 1 ? 2 : 0)
        : 0;
      // Use the rules table directly for clarity.
      const size = [2, 3, 2, 3, 3][state.currentRound - 1]!;
      const team = [merlin.id, ...loyals.slice(0, size - 1).map((p) => p.id)];
      room.apply(cap, { type: 'ProposeTeam', playerIds: team });
      // All 5 vote approve.
      for (let i = 0; i < 5; i++) room.apply(i, { type: 'VoteTeam', approve: true });
      // Team members vote success.
      const teamPeers = team.map((id) => state.players.findIndex((p) => p.id === id));
      for (const peer of teamPeers) room.apply(peer, { type: 'VoteQuest', success: true });
      void required;
      void size;
    }

    playGoodQuest();
    expect(state.currentRound).toBe(2);
    playGoodQuest();
    expect(state.currentRound).toBe(3);
    playGoodQuest();
    expect(state.phase).toBe('assassination');

    // Assassin picks a non-Merlin good player → good wins.
    const assassinPeer = state.players.findIndex((p) => p.id === assassin.id);
    const target = loyals[0]!;
    const out = room.apply(assassinPeer, { type: 'NominateAssassinTarget', targetPlayerId: target.id });
    expect(state.phase).toBe('finished');
    expect(state.winner).toBe('good');
    expect(state.winReason).toBe('assassin_missed');
    expect(out.some((o) => o.msg.type === 'GameStateUpdate')).toBe(true);
  });

  it('assassin hitting Merlin flips good → evil', () => {
    const room = startGame(5, 99);
    const state = room._stateForTesting();
    const merlin = state.players.find((p) => p.role === Role.Merlin)!;
    const assassin = state.players.find((p) => p.role === Role.Assassin)!;

    // Force three successes the same way.
    function play() {
      const cap = findCaptainPeerId(room);
      const size = [2, 3, 2, 3, 3][state.currentRound - 1]!;
      const good = state.players.filter((p) => ALIGNMENT_OF[p.role!] === 'good');
      const team = good.slice(0, size).map((p) => p.id);
      room.apply(cap, { type: 'ProposeTeam', playerIds: team });
      for (let i = 0; i < 5; i++) room.apply(i, { type: 'VoteTeam', approve: true });
      for (const id of team) {
        const peer = state.players.findIndex((p) => p.id === id);
        room.apply(peer, { type: 'VoteQuest', success: true });
      }
    }
    play();
    play();
    play();
    expect(state.phase).toBe('assassination');

    const aPeer = state.players.findIndex((p) => p.id === assassin.id);
    room.apply(aPeer, { type: 'NominateAssassinTarget', targetPlayerId: merlin.id });
    expect(state.winner).toBe('evil');
    expect(state.winReason).toBe('assassin_hit_merlin');
  });
});

describe('GameRoom — config validation at StartGame', () => {
  it('rejects 5p + Mordred + Oberon with invalid_team rather than throwing', () => {
    const room = new GameRoom('r1', {
      useLadyOfTheLake: false,
      useMordred: true,
      useMorganaPercival: false,
      useOberon: true,
      rngSeed: 1,
    });
    for (let i = 0; i < 5; i++) room.addPeer(i, `P${i}`);
    const out = room.apply(0, { type: 'StartGame' });
    const err = out.find((o) => o.msg.type === 'Error');
    expect(err).toBeDefined();
    if (err && err.msg.type === 'Error') expect(err.msg.code).toBe('invalid_team');
    expect(room._stateForTesting().phase).toBe('lobby');
  });

  it('rejects 6p + Lady of the Lake', () => {
    const room = new GameRoom('r1', {
      useLadyOfTheLake: true,
      useMordred: false,
      useMorganaPercival: false,
      useOberon: false,
      rngSeed: 1,
    });
    for (let i = 0; i < 6; i++) room.addPeer(i, `P${i}`);
    const out = room.apply(0, { type: 'StartGame' });
    const err = out.find((o) => o.msg.type === 'Error');
    expect(err && err.msg.type === 'Error' ? err.msg.code : null).toBe('invalid_team');
  });

  it('accepts 7p + Lady of the Lake and seeds holder to seat left of captain', () => {
    const room = new GameRoom('r1', {
      useLadyOfTheLake: true,
      useMordred: false,
      useMorganaPercival: false,
      useOberon: false,
      rngSeed: 42,
    });
    for (let i = 0; i < 7; i++) room.addPeer(i, `P${i}`);
    room.apply(0, { type: 'StartGame' });
    const state = room._stateForTesting();
    expect(state.phase).toBe('team_selection');
    expect(state.ladyOfTheLakeHolder).toBeDefined();
    const n = state.players.length;
    const expectedSeat = (state.captainSeat - 1 + n) % n;
    expect(state.ladyOfTheLakeHolder).toBe(state.players[expectedSeat]!.id);
  });
});

describe('GameRoom — Lady of the Lake state machine', () => {
  it('triggers lady_of_lake phase after round 2 then resolves via UseLadyOfLake', () => {
    const room = new GameRoom('r1', {
      useLadyOfTheLake: true,
      useMordred: false,
      useMorganaPercival: false,
      useOberon: false,
      rngSeed: 21,
    });
    for (let i = 0; i < 7; i++) room.addPeer(i, `P${i}`);
    room.apply(0, { type: 'StartGame' });
    const state = room._stateForTesting();
    const initialHolderId = state.ladyOfTheLakeHolder!;

    // Play 2 good quests by piling onto good players. Source: rules.ts team sizes for 7p = [2,3,3,4,4].
    const teamSizes = [2, 3];
    for (let round = 0; round < 2; round++) {
      const cap = state.players.findIndex(
        (p) => p.id === state.players[state.captainSeat]!.id,
      );
      const good = state.players.filter((p) => p.role && p.role !== 'Assassin' && p.role !== 'Minion');
      const team = good.slice(0, teamSizes[round]!).map((p) => p.id);
      room.apply(cap, { type: 'ProposeTeam', playerIds: team });
      for (let i = 0; i < 7; i++) room.apply(i, { type: 'VoteTeam', approve: true });
      for (const id of team) {
        const peer = state.players.findIndex((p) => p.id === id);
        room.apply(peer, { type: 'VoteQuest', success: true });
      }
    }

    expect(state.phase).toBe('lady_of_lake');
    expect(state.ladyOfTheLakeHolder).toBe(initialHolderId);

    // Lady uses on a non-self target. Pick someone who hasn't been inspected.
    const holderPeer = state.players.findIndex((p) => p.id === initialHolderId);
    const targetId = state.players.find((p) => p.id !== initialHolderId)!.id;
    const out = room.apply(holderPeer, {
      type: 'UseLadyOfLake',
      targetPlayerId: targetId,
    });

    // Holder should get a GameStateUpdate that carries ladyOfTheLakeLearned.
    const holderUpdate = out.find(
      (o) => o.peer === holderPeer && o.msg.type === 'GameStateUpdate',
    );
    expect(holderUpdate).toBeDefined();
    if (holderUpdate && holderUpdate.msg.type === 'GameStateUpdate') {
      expect(holderUpdate.msg.state.ladyOfTheLakeLearned?.aboutPlayerId).toBe(targetId);
      expect(holderUpdate.msg.state.ladyOfTheLakeLearned?.alignment).toMatch(/^(good|evil)$/);
    }
    // No one else should see the learning.
    for (const o of out) {
      if (o.peer === holderPeer) continue;
      if (o.msg.type === 'GameStateUpdate') {
        expect(o.msg.state.ladyOfTheLakeLearned).toBeUndefined();
      }
    }

    // Token transfers to inspected target; phase returns to team_selection.
    expect(state.phase).toBe('team_selection');
    expect(state.ladyOfTheLakeHolder).toBe(targetId);
    expect(state.ladyOfTheLakeUsedOn).toContain(targetId);

    // Re-inspecting the same target is rejected.
    const repeat = room.apply(holderPeer, {
      type: 'UseLadyOfLake',
      targetPlayerId: targetId,
    });
    // We're no longer in lady_of_lake phase, so this errors with bad_phase first.
    const err = repeat.find((o) => o.msg.type === 'Error');
    expect(err).toBeDefined();
  });
});

describe('GameRoom — reattach grace flow', () => {
  it('Welcome carries a reconnectToken that reattachPeer accepts', () => {
    const room = new GameRoom('r1', {
      useLadyOfTheLake: false,
      useMordred: false,
      useMorganaPercival: false,
      useOberon: false,
      rngSeed: 99,
    });
    const welcome1 = room.addPeer(10, 'Alice').find((o) => o.msg.type === 'Welcome');
    if (!welcome1 || welcome1.msg.type !== 'Welcome') throw new Error('no Welcome');
    const { yourPlayerId, reconnectToken } = welcome1.msg;
    expect(reconnectToken).toMatch(/^[0-9a-f]{16}$/);

    // Seat 5 players total + start the game so we're in-game.
    for (let i = 1; i < 5; i++) room.addPeer(10 + i, `P${i}`);
    room.apply(10, { type: 'StartGame' });
    expect(room._stateForTesting().phase).toBe('team_selection');

    // Simulate Alice disconnecting — server-side removePeer fires.
    room.removePeer(10);
    const alice = room._stateForTesting().players.find((p) => p.id === yourPlayerId);
    expect(alice?.connected).toBe(false);

    // Alice reconnects with a new peerId, valid token.
    const out = room.reattachPeer(99, yourPlayerId, reconnectToken);
    const welcome2 = out.find((o) => o.peer === 99 && o.msg.type === 'Welcome');
    expect(welcome2?.msg.type).toBe('Welcome');
    if (welcome2?.msg.type === 'Welcome') {
      expect(welcome2.msg.yourPlayerId).toBe(yourPlayerId);
      expect(welcome2.msg.reconnectToken).toBe(reconnectToken);
    }
    expect(alice?.connected).toBe(true);
  });

  it('reattach with wrong token returns Error', () => {
    const room = new GameRoom('r1', {
      useLadyOfTheLake: false,
      useMordred: false,
      useMorganaPercival: false,
      useOberon: false,
      rngSeed: 5,
    });
    const w = room.addPeer(1, 'A').find((o) => o.msg.type === 'Welcome');
    if (!w || w.msg.type !== 'Welcome') throw new Error('no Welcome');
    const out = room.reattachPeer(2, w.msg.yourPlayerId, 'not-the-right-token');
    const err = out.find((o) => o.msg.type === 'Error');
    expect(err && err.msg.type === 'Error' ? err.msg.code : null).toBe('bad_password');
  });

  it('reattach for unknown playerId returns Error', () => {
    const room = new GameRoom('r1', {
      useLadyOfTheLake: false,
      useMordred: false,
      useMorganaPercival: false,
      useOberon: false,
      rngSeed: 2,
    });
    room.addPeer(1, 'A');
    const out = room.reattachPeer(99, 'p_deadbeef', 'whatever');
    expect(out.some((o) => o.msg.type === 'Error')).toBe(true);
  });

  it('lobby-phase disconnect drops the player and invalidates the token', () => {
    const room = new GameRoom('r1', {
      useLadyOfTheLake: false,
      useMordred: false,
      useMorganaPercival: false,
      useOberon: false,
      rngSeed: 3,
    });
    const w = room.addPeer(1, 'A').find((o) => o.msg.type === 'Welcome');
    if (!w || w.msg.type !== 'Welcome') throw new Error('no Welcome');
    room.addPeer(2, 'B');
    expect(room._stateForTesting().phase).toBe('lobby');

    room.removePeer(1);
    // Token should no longer reattach.
    const out = room.reattachPeer(3, w.msg.yourPlayerId, w.msg.reconnectToken);
    expect(out.some((o) => o.msg.type === 'Error')).toBe(true);
  });
});

describe('GameRoom — losing paths', () => {
  it('5 consecutive rejections → evil wins by five_rejections', () => {
    const room = startGame(5, 5);
    const state = room._stateForTesting();
    for (let attempt = 0; attempt < 5; attempt++) {
      const cap = findCaptainPeerId(room);
      const others = state.players.filter((p) => p.id !== state.players[cap]!.id).slice(0, 1);
      const team = [state.players[cap]!.id, ...others.map((p) => p.id)];
      room.apply(cap, { type: 'ProposeTeam', playerIds: team });
      // Everyone rejects.
      for (let i = 0; i < 5; i++) room.apply(i, { type: 'VoteTeam', approve: false });
    }
    expect(state.phase).toBe('finished');
    expect(state.winner).toBe('evil');
    expect(state.winReason).toBe('five_rejections');
  });

  it('3 quest failures → evil wins by three_quests_evil', () => {
    const room = startGame(5, 13);
    const state = room._stateForTesting();
    const assassin = state.players.find((p) => p.role === Role.Assassin)!;
    const minion = state.players.find((p) => p.role === Role.Minion)!;

    function failQuest() {
      const cap = findCaptainPeerId(room);
      const size = [2, 3, 2, 3, 3][state.currentRound - 1]!;
      // Put both evil on the team to be sure of a fail (5p needs only 1 fail).
      const team = [assassin.id, minion.id, ...state.players.slice(0, size - 2).filter((p) => p.id !== assassin.id && p.id !== minion.id).map((p) => p.id)];
      while (team.length < size) {
        const next = state.players.find((p) => !team.includes(p.id))!;
        team.push(next.id);
      }
      room.apply(cap, { type: 'ProposeTeam', playerIds: team.slice(0, size) });
      for (let i = 0; i < 5; i++) room.apply(i, { type: 'VoteTeam', approve: true });
      const teamPeers = team.slice(0, size).map((id) => state.players.findIndex((p) => p.id === id));
      for (const peer of teamPeers) {
        const playerRole = state.players[peer]!.role!;
        const evilVote = ALIGNMENT_OF[playerRole] === 'evil';
        room.apply(peer, { type: 'VoteQuest', success: !evilVote });
      }
    }
    failQuest();
    failQuest();
    failQuest();
    expect(state.phase).toBe('finished');
    expect(state.winner).toBe('evil');
    expect(state.winReason).toBe('three_quests_evil');
  });
});
