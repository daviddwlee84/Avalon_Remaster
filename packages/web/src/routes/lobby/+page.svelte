<script lang="ts">
  import type { RoomSummary } from '@avalon/game-core';
  import { parseServerMsg } from '@avalon/protocol';
  import { buildLobbyWsUrl } from '$lib/transport/ws.svelte';
  import { onDestroy, onMount } from 'svelte';

  let rooms = $state<RoomSummary[]>([]);
  let connState: 'connecting' | 'open' | 'closed' = $state('connecting');
  let ws: WebSocket | null = null;

  onMount(() => {
    ws = new WebSocket(buildLobbyWsUrl());
    ws.onopen = () => (connState = 'open');
    ws.onclose = () => (connState = 'closed');
    ws.onmessage = (ev) => {
      try {
        const msg = parseServerMsg(JSON.parse(ev.data));
        if (msg?.type === 'RoomList') rooms = msg.rooms;
      } catch {
        /* ignore */
      }
    };
  });

  onDestroy(() => ws?.close());
</script>

<svelte:head>
  <title>Lobby — Avalon</title>
</svelte:head>

<section>
  <a href="/" class="text-sm underline">← Back</a>
  <h1 class="mt-2 mb-4 text-3xl font-bold">Rooms</h1>
  <p class="mb-4 text-sm opacity-60">Connection: {connState}</p>

  {#if rooms.length === 0}
    <p class="opacity-70">No active rooms yet.</p>
  {:else}
    <ul class="space-y-2">
      {#each rooms as room (room.roomId)}
        <li class="flex items-center justify-between rounded border border-black/10 bg-white/40 px-3 py-2">
          <span>
            <strong>{room.roomId}</strong>
            — {room.playerCount} players, {room.phase}
          </span>
          <a href="/play/{room.roomId}" class="rounded bg-black px-3 py-1 text-sm text-white">
            Join
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</section>
