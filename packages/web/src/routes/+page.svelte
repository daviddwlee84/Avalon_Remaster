<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button, Card } from '$lib/components/ui';
  import { loadDisplayName, saveDisplayName } from '$lib/storage';
  import { onMount } from 'svelte';

  let displayName = $state('');
  let roomId = $state('main');

  onMount(() => {
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

<section class="mx-auto max-w-md py-6 sm:py-12">
  <div class="mb-6 text-center">
    <h1
      class="font-display text-5xl font-bold tracking-wide text-gold drop-shadow-[0_1px_0_rgba(0,0,0,0.25)] sm:text-6xl"
    >
      Avalon
    </h1>
    <p class="mt-2 text-xs tracking-[0.3em] opacity-60 uppercase">The Resistance · Modern PWA</p>
  </div>

  <Card>
    <form class="space-y-4" onsubmit={start}>
      <label class="block">
        <span class="font-display mb-1 block text-xs tracking-wider opacity-70 uppercase"
          >Display name</span
        >
        <input
          type="text"
          class="w-full rounded-md border border-ink/30 bg-parchment/80 px-3 py-2 placeholder:opacity-50 focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none"
          placeholder="Arthur"
          maxlength="24"
          required
          bind:value={displayName}
        />
      </label>
      <label class="block">
        <span class="font-display mb-1 block text-xs tracking-wider opacity-70 uppercase"
          >Room name</span
        >
        <input
          type="text"
          class="w-full rounded-md border border-ink/30 bg-parchment/80 px-3 py-2 placeholder:opacity-50 focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none"
          placeholder="main"
          bind:value={roomId}
        />
      </label>
      <Button variant="gold" size="lg" type="submit" class="w-full">Join room</Button>
    </form>
  </Card>

  <p class="mt-6 text-center text-xs tracking-wider opacity-60">
    Phase 2 · Net mode · 5–10 players ·
    <a href="/lobby" class="underline decoration-gold/60 underline-offset-2 hover:text-gold"
      >View room list</a
    >
  </p>
</section>
