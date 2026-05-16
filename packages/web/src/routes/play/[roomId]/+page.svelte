<script lang="ts">
  import { page } from '$app/state';
  import { base } from '$app/paths';
  import PlayLayout from '$lib/components/game/PlayLayout.svelte';
  import { clearReconnect, loadDisplayName, loadReconnect, takePendingConfig } from '$lib/storage';
  import { WsSession, buildRoomWsUrl } from '$lib/transport/ws.svelte';
  import { onDestroy, onMount } from 'svelte';

  const roomId = page.params.roomId ?? 'main';

  let session = $state<WsSession | null>(null);
  let displayName = $state('Player');
  let attemptedReattach = $state(false);
  /**
   * Bumped each time we rebuild the session (initial mount + once on stale
   * reattach recovery). Used as the PlayLayout key so it remounts and
   * GameStore re-subscribes to the new socket.
   */
  let sessionKey = $state(0);

  function openSession(useReconnect: boolean): void {
    const reconnect = useReconnect ? loadReconnect(roomId) : undefined;
    attemptedReattach = Boolean(reconnect);
    session?.close();
    session = new WsSession(
      buildRoomWsUrl(roomId, displayName, undefined, reconnect),
    );
    sessionKey++;
  }

  onMount(() => {
    displayName = loadDisplayName() || 'Player';
    // takePendingConfig is single-shot — only the URL the host opened with
    // sees the config; reattach attempts shouldn't request it again.
    const pendingConfig = takePendingConfig(roomId);
    const reconnect = loadReconnect(roomId);
    attemptedReattach = Boolean(reconnect);
    session = new WsSession(buildRoomWsUrl(roomId, displayName, pendingConfig, reconnect));
    sessionKey++;
  });

  onDestroy(() => session?.close());

  function handleStaleReattach() {
    // Server rejected our reattach (room/token gone — typically after the
    // ACA container scaled to zero and lost state). Drop the stash and
    // reconnect as a fresh peer.
    clearReconnect(roomId);
    openSession(false);
  }
</script>

<svelte:head>
  <title>Room {roomId} — Avalon</title>
</svelte:head>

{#if session}
  {#key sessionKey}
    <PlayLayout
      {session}
      {displayName}
      roomLabel="room {roomId}"
      reconnectRoomId={roomId}
      {attemptedReattach}
      onStaleReattach={handleStaleReattach}
      leaveHref={base || '/'}
    />
  {/key}
{:else}
  <p class="mt-12 text-center opacity-70">Loading…</p>
{/if}
