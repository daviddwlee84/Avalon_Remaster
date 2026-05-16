<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';

  let online = $state(true);

  onMount(() => {
    online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const onOnline = () => (online = true);
    const onOffline = () => (online = false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  });

  const isNetPlay = $derived(page.url.pathname.startsWith('/play/'));
  const isLan = $derived(page.url.pathname.startsWith('/lan/'));
</script>

{#if !online}
  <div
    class="fixed inset-x-4 top-4 z-40 mx-auto max-w-md rounded-md border border-blood/60 bg-blood text-parchment shadow-lg sm:left-4"
    role="status"
  >
    <div class="px-3 py-2 text-xs">
      <p class="font-display tracking-wider uppercase">⚠ You are offline</p>
      {#if isNetPlay}
        <p class="mt-0.5">
          Net mode needs internet. Try <a href="/lan/host" class="font-medium underline">LAN mode</a>
          — works on the same WiFi with no server.
        </p>
      {:else if isLan}
        <p class="mt-0.5">LAN mode works without internet once the SDP exchange is done.</p>
      {:else}
        <p class="mt-0.5">Net play is unavailable until you reconnect; LAN mode still works.</p>
      {/if}
    </div>
  </div>
{/if}
