<script lang="ts">
  import { goto } from '$app/navigation';
  import { loadDisplayName, saveDisplayName } from '$lib/storage';

  let displayName = $state('');
  let roomId = $state('main');

  $effect(() => {
    displayName = loadDisplayName();
  });

  function start(e: Event) {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) return;
    saveDisplayName(name);
    goto(`/play/${encodeURIComponent(roomId.trim() || 'main')}`);
  }
</script>

<svelte:head>
  <title>Avalon</title>
</svelte:head>

<section class="mx-auto max-w-md">
  <h1 class="mb-2 text-4xl font-bold">Avalon</h1>
  <p class="mb-6 text-sm opacity-70">The Resistance — modern PWA edition</p>

  <form class="space-y-4 rounded-lg border border-black/10 bg-white/40 p-4" onsubmit={start}>
    <label class="block">
      <span class="mb-1 block text-sm font-medium">Display name</span>
      <input
        type="text"
        class="w-full rounded border border-black/20 bg-white px-3 py-2"
        placeholder="Arthur"
        maxlength="24"
        required
        bind:value={displayName}
      />
    </label>
    <label class="block">
      <span class="mb-1 block text-sm font-medium">Room name</span>
      <input
        type="text"
        class="w-full rounded border border-black/20 bg-white px-3 py-2"
        placeholder="main"
        bind:value={roomId}
      />
    </label>
    <button type="submit" class="w-full rounded bg-black px-4 py-2 font-medium text-white">
      Join room
    </button>
  </form>

  <p class="mt-6 text-center text-xs opacity-60">
    Phase 1 — Net mode only. 5–10 players. <a href="/lobby" class="underline">View room list</a>
  </p>
</section>
