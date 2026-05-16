<script lang="ts">
  import { Button } from '$lib/components/ui';
  import { useRegisterSW } from 'virtual:pwa-register/svelte';

  const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
    immediate: true,
    onRegistered(reg) {
      // Hourly background update check while the tab is open.
      if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000);
    },
    onRegisterError(err) {
      console.error('[pwa] SW registration failed:', err);
    },
  });

  function dismissUpdate() {
    needRefresh.set(false);
  }

  function dismissOfflineReady() {
    offlineReady.set(false);
  }
</script>

{#if $needRefresh}
  <div
    class="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-lg border-2 border-gold/60 bg-parchment shadow-2xl sm:right-4 sm:left-auto"
    role="alert"
  >
    <div class="p-3">
      <p class="font-display text-sm font-bold tracking-wider uppercase">Update available</p>
      <p class="mt-1 text-xs opacity-70">
        A new version has been downloaded. Reload now or keep playing on the old one — your
        choice.
      </p>
      <div class="mt-2 flex gap-2">
        <Button
          variant="gold"
          size="sm"
          onclick={() => {
            void updateServiceWorker(true);
          }}
        >
          Reload now
        </Button>
        <Button variant="outline" size="sm" onclick={dismissUpdate}>Later</Button>
      </div>
    </div>
  </div>
{/if}

{#if $offlineReady}
  <div
    class="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-md border border-good/60 bg-good/10 p-2 text-center text-xs shadow-lg sm:right-4 sm:left-auto"
    role="status"
  >
    <span class="font-display tracking-wider text-good uppercase">Ready for offline play</span>
    <button class="ml-2 underline hover:opacity-80" onclick={dismissOfflineReady}>dismiss</button>
  </div>
{/if}
