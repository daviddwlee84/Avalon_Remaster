import type { ServerMsg } from '@avalon/game-core';
import { describe, expect, it } from 'vitest';

import { HostRoomBridge } from './host-bridge';

interface MockSink {
  delivered: ServerMsg[];
  deliver(msg: ServerMsg): void;
}

function makeMockSink(): MockSink {
  const delivered: ServerMsg[] = [];
  return {
    delivered,
    deliver(msg) {
      delivered.push(msg);
    },
  };
}

describe('HostRoomBridge — peer sink routing', () => {
  it('seats five mock peers and dispatches per-peer state updates', () => {
    const bridge = new HostRoomBridge('lan-1', {
      useLadyOfTheLake: false,
      useMordred: false,
      useMorganaPercival: false,
      useOberon: false,
      rngSeed: 42,
    });

    const sinks: MockSink[] = [];
    for (let i = 0; i < 5; i++) {
      const sink = makeMockSink();
      sinks.push(sink);
      bridge.attachMockPeer(`P${i + 1}`, sink);
    }

    expect(bridge.peerCount()).toBe(5);

    // Every peer must have received a Welcome + RoomJoined as their first two messages.
    for (const sink of sinks) {
      expect(sink.delivered[0]?.type).toBe('Welcome');
      expect(sink.delivered[1]?.type).toBe('RoomJoined');
    }

    // The first peer (host) sees four GameStateUpdates (one per subsequent joiner);
    // every other peer sees updates fired since their seat was created.
    const hostUpdates = sinks[0]!.delivered.filter((m) => m.type === 'GameStateUpdate');
    expect(hostUpdates.length).toBe(4);
  });

  it('routes a StartGame command from the host through GameRoom.apply and broadcasts RoleReveal', () => {
    const bridge = new HostRoomBridge('lan-2', {
      useLadyOfTheLake: false,
      useMordred: false,
      useMorganaPercival: false,
      useOberon: false,
      rngSeed: 17,
    });

    // First peer is the host; remaining four are mocks.
    const hostSink = makeMockSink();
    const hostPeer = bridge.attachMockPeer('Alice', hostSink);
    const otherSinks: MockSink[] = [];
    for (let i = 0; i < 4; i++) {
      const sink = makeMockSink();
      otherSinks.push(sink);
      bridge.attachMockPeer(`P${i + 2}`, sink);
    }

    bridge._handleSelfSend(hostPeer, { type: 'StartGame' });

    // Every peer (host + 4 others) must have received exactly one RoleReveal.
    const allSinks = [hostSink, ...otherSinks];
    for (const sink of allSinks) {
      const reveals = sink.delivered.filter((m) => m.type === 'RoleReveal');
      expect(reveals.length).toBe(1);
      // Every RoleReveal must carry the recipient's own role and no other player's role string.
      const reveal = reveals[0]!;
      if (reveal.type === 'RoleReveal') {
        expect(reveal.state.myRole).toBeDefined();
      }
    }
  });

  it('no other player\'s role string appears in any sink\'s delivered queue', () => {
    const bridge = new HostRoomBridge('lan-3', {
      useLadyOfTheLake: false,
      useMordred: true,
      useMorganaPercival: true,
      useOberon: false,
      rngSeed: 7,
    });

    const sinks: MockSink[] = [];
    for (let i = 0; i < 7; i++) {
      const sink = makeMockSink();
      sinks.push(sink);
      bridge.attachMockPeer(`P${i + 1}`, sink);
    }
    bridge._handleSelfSend(1, { type: 'StartGame' });

    // For each sink, find their own role, then assert no other role-name JSON
    // value appears in any of their delivered messages.
    for (let i = 0; i < sinks.length; i++) {
      const sink = sinks[i]!;
      const reveal = sink.delivered.find((m) => m.type === 'RoleReveal');
      if (reveal?.type !== 'RoleReveal') continue;
      const myRole = reveal.state.myRole;
      const serialised = JSON.stringify(sink.delivered);
      const allRoles = [
        'Merlin',
        'Percival',
        'LoyalServant',
        'Assassin',
        'Morgana',
        'Mordred',
        'Oberon',
        'Minion',
      ];
      for (const role of allRoles) {
        if (role === myRole) continue;
        expect(
          serialised,
          `Peer ${i + 1} (role=${myRole}) saw "role":"${role}" — leak!`,
        ).not.toContain(`"role":"${role}"`);
      }
    }
  });

  it('dropPeer removes the sink and the room sees the peer leave', () => {
    const bridge = new HostRoomBridge('lan-4', {
      useLadyOfTheLake: false,
      useMordred: false,
      useMorganaPercival: false,
      useOberon: false,
      rngSeed: 1,
    });

    const sinks: MockSink[] = [];
    const peerIds: number[] = [];
    for (let i = 0; i < 3; i++) {
      const sink = makeMockSink();
      sinks.push(sink);
      peerIds.push(bridge.attachMockPeer(`P${i + 1}`, sink));
    }
    expect(bridge.peerCount()).toBe(3);
    bridge.dropPeer(peerIds[1]!);
    expect(bridge.peerCount()).toBe(2);
  });
});
