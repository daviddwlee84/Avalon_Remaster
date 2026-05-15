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
