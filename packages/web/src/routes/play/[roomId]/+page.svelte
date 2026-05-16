<script lang="ts">
  import { page } from '$app/state';
  import PlayLayout from '$lib/components/game/PlayLayout.svelte';
  import { loadDisplayName, loadReconnect, takePendingConfig } from '$lib/storage';
  import { WsSession, buildRoomWsUrl } from '$lib/transport/ws.svelte';
  import { onDestroy, onMount } from 'svelte';

  const roomId = page.params.roomId ?? 'main';

  let session = $state<WsSession | null>(null);
  let displayName = $state('Player');

  onMount(() => {
    displayName = loadDisplayName() || 'Player';
    const pendingConfig = takePendingConfig(roomId);
    const reconnect = loadReconnect(roomId);
    session = new WsSession(buildRoomWsUrl(roomId, displayName, pendingConfig, reconnect));
  });

  onDestroy(() => session?.close());
</script>

<svelte:head>
  <title>Room {roomId} — Avalon</title>
</svelte:head>

{#if session}
  <PlayLayout {session} {displayName} roomLabel="room {roomId}" reconnectRoomId={roomId} />
{:else}
  <p class="mt-12 text-center opacity-70">Loading…</p>
{/if}
