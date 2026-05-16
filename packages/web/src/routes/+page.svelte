<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button, Card, Dialog, DialogContent } from '$lib/components/ui';
  import CreateRoomForm from '$lib/components/game/CreateRoomForm.svelte';
  import { loadDisplayName, saveDisplayName, stashPendingConfig } from '$lib/storage';
  import type { RoomCreateConfig } from '$lib/transport/ws.svelte';
  import { onMount } from 'svelte';

  let displayName = $state('');
  let roomId = $state('main');
  let createOpen = $state(false);

  onMount(() => {
    displayName = loadDisplayName();
  });

  function commitName(): boolean {
    const name = displayName.trim();
    if (!name) return false;
    saveDisplayName(name);
    return true;
  }

  function join(e: Event) {
    e.preventDefault();
    if (!commitName()) return;
    goto(`/play/${encodeURIComponent(roomId.trim() || 'main')}`);
  }

  function openCreate() {
    if (!commitName()) {
      // Surface the validation via the join form's required input.
      (document.getElementById('displayName-input') as HTMLInputElement | null)?.focus();
      return;
    }
    createOpen = true;
  }

  function onCreateSubmit({ roomId: id, config }: { roomId: string; config: RoomCreateConfig }) {
    stashPendingConfig(id, config);
    createOpen = false;
    goto(`/play/${encodeURIComponent(id)}`);
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
    <form class="space-y-4" onsubmit={join}>
      <label class="block">
        <span class="font-display mb-1 block text-xs tracking-wider opacity-70 uppercase"
          >Display name</span
        >
        <input
          id="displayName-input"
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
      <div class="grid grid-cols-2 gap-2">
        <Button variant="gold" size="lg" type="submit" class="w-full">Join room</Button>
        <Button variant="outline" size="lg" type="button" class="w-full" onclick={openCreate}>
          Create room
        </Button>
      </div>
    </form>
  </Card>

  <Card class="mt-4">
    <div class="text-center">
      <p class="font-display text-xs tracking-[0.25em] opacity-70 uppercase">LAN mode</p>
      <p class="mt-1 text-xs opacity-60">
        No server. Two browsers on the same WiFi exchange SDP once and play.
      </p>
      <div class="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" size="lg" type="button" class="w-full" onclick={() => goto('/lan/host')}>
          Host LAN game
        </Button>
        <Button variant="outline" size="lg" type="button" class="w-full" onclick={() => goto('/lan/join')}>
          Join LAN game
        </Button>
      </div>
    </div>
  </Card>

  <p class="mt-6 text-center text-xs tracking-wider opacity-60">
    Phase 4 · Net + LAN · 5–10 players ·
    <a href="/lobby" class="underline decoration-gold/60 underline-offset-2 hover:text-gold"
      >View room list</a
    >
  </p>
</section>

<Dialog
  open={createOpen}
  onOpenChange={(o) => {
    createOpen = o;
  }}
>
  <DialogContent>
    <CreateRoomForm onSubmit={onCreateSubmit} onCancel={() => (createOpen = false)} />
  </DialogContent>
</Dialog>
