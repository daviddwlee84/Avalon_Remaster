<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { Button, Card, Dialog, DialogContent } from '$lib/components/ui';
  import CreateRoomForm from '$lib/components/game/CreateRoomForm.svelte';
  import LocaleSwitch from '$lib/components/i18n/LocaleSwitch.svelte';
  import { t } from '$lib/i18n/locale.svelte';
  import { loadDisplayName, saveDisplayName, stashPendingConfig } from '$lib/storage';
  import type { RoomCreateConfig } from '$lib/transport/ws.svelte';
  import { onMount } from 'svelte';

  let displayName = $state('');
  let roomId = $state('main');
  let createOpen = $state(false);
  /**
   * Net mode requires a Bun WS server. Three ways it gets enabled:
   * 1. Build-time PUBLIC_AVALON_WS_ORIGIN baked in (the GH Pages →
   *    cloud-WS pattern: bundle knows where to dial).
   * 2. Running on localhost — dev `bun run dev:server` is on :3000.
   * 3. Same-origin /health probe returns 200 — the self-hosted Docker /
   *    Azure deploy serves the SvelteKit bundle AND the WS server from
   *    one origin, so the bundle can just dial its current host.
   * Default false so the flash-of-Net-mode-then-hide on Pages doesn't
   * happen; the probe flips it on the rare same-origin server case.
   */
  let netAvailable = $state(false);

  onMount(async () => {
    displayName = loadDisplayName();
    const envOrigin =
      (import.meta as unknown as { env?: Record<string, string | undefined> }).env
        ?.PUBLIC_AVALON_WS_ORIGIN ?? '';
    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (envOrigin || isLocalhost) {
      netAvailable = true;
      return;
    }
    // Same-origin probe — short timeout so a slow / hostile network doesn't
    // hold the home page hostage. GH Pages 404s, self-hosted 200s.
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 2500);
      const res = await fetch(`${base}/health`, { signal: ctl.signal });
      clearTimeout(t);
      netAvailable = res.ok;
    } catch {
      netAvailable = false;
    }
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
    goto(`${base}/play/${encodeURIComponent(roomId.trim() || 'main')}`);
  }

  function openCreate() {
    if (!commitName()) {
      (document.getElementById('displayName-input') as HTMLInputElement | null)?.focus();
      return;
    }
    createOpen = true;
  }

  function onCreateSubmit({ roomId: id, config }: { roomId: string; config: RoomCreateConfig }) {
    stashPendingConfig(id, config);
    createOpen = false;
    goto(`${base}/play/${encodeURIComponent(id)}`);
  }
</script>

<svelte:head>
  <title>Avalon</title>
</svelte:head>

<section class="mx-auto max-w-md py-6 sm:py-12">
  <div class="mb-2 flex justify-end">
    <LocaleSwitch />
  </div>
  <div class="mb-6 text-center">
    <h1
      class="font-display text-5xl font-bold tracking-wide text-gold drop-shadow-[0_1px_0_rgba(0,0,0,0.25)] sm:text-6xl"
    >
      Avalon
    </h1>
    <p class="mt-2 text-xs tracking-[0.3em] opacity-60 uppercase">{t('home.tagline')}</p>
  </div>

  {#if netAvailable}
    <Card>
      <form class="space-y-4" onsubmit={join}>
        <label class="block">
          <span class="font-display mb-1 block text-xs tracking-wider opacity-70 uppercase"
            >{t('home.displayName')}</span
          >
          <input
            id="displayName-input"
            type="text"
            class="w-full rounded-md border border-ink/30 bg-parchment/80 px-3 py-2 placeholder:opacity-50 focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none"
            placeholder={t('home.displayName.placeholder')}
            maxlength="24"
            required
            bind:value={displayName}
          />
        </label>
        <label class="block">
          <span class="font-display mb-1 block text-xs tracking-wider opacity-70 uppercase"
            >{t('home.roomName')}</span
          >
          <input
            type="text"
            class="w-full rounded-md border border-ink/30 bg-parchment/80 px-3 py-2 placeholder:opacity-50 focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none"
            placeholder={t('home.roomName.placeholder')}
            bind:value={roomId}
          />
        </label>
        <div class="grid grid-cols-2 gap-2">
          <Button variant="gold" size="lg" type="submit" class="w-full">
            {t('home.joinRoom')}
          </Button>
          <Button variant="outline" size="lg" type="button" class="w-full" onclick={openCreate}>
            {t('home.createRoom')}
          </Button>
        </div>
      </form>
    </Card>
  {/if}

  <!-- Display name input is needed for LAN flow too — render a standalone copy
       when Net mode is unavailable so the LAN buttons still have a name. -->
  {#if !netAvailable}
    <Card>
      <label class="block">
        <span class="font-display mb-1 block text-xs tracking-wider opacity-70 uppercase"
          >{t('home.displayName')}</span
        >
        <input
          id="displayName-input"
          type="text"
          class="w-full rounded-md border border-ink/30 bg-parchment/80 px-3 py-2 placeholder:opacity-50 focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none"
          placeholder={t('home.displayName.placeholder')}
          maxlength="24"
          required
          bind:value={displayName}
          onblur={() => {
            if (displayName.trim()) saveDisplayName(displayName.trim());
          }}
        />
      </label>
    </Card>
  {/if}

  <Card class="mt-4">
    <div class="text-center">
      <p class="font-display text-xs tracking-[0.25em] opacity-70 uppercase">
        {t('home.lan.section')}
      </p>
      <p class="mt-1 text-xs opacity-60">{t('home.lan.description')}</p>
      <div class="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="lg"
          type="button"
          class="w-full"
          onclick={() => {
            if (displayName.trim()) saveDisplayName(displayName.trim());
            goto(`${base}/lan/host`);
          }}
        >
          {t('home.lan.host')}
        </Button>
        <Button
          variant="outline"
          size="lg"
          type="button"
          class="w-full"
          onclick={() => {
            if (displayName.trim()) saveDisplayName(displayName.trim());
            goto(`${base}/lan/join`);
          }}
        >
          {t('home.lan.join')}
        </Button>
      </div>
    </div>
  </Card>

  {#if netAvailable}
    <p class="mt-6 text-center text-xs tracking-wider opacity-60">
      <a href="{base}/lobby" class="underline decoration-gold/60 underline-offset-2 hover:text-gold"
        >{t('home.viewRooms')}</a
      >
    </p>
  {:else}
    <p class="mt-6 text-center text-xs tracking-wider opacity-60">
      Net mode requires a server. This deploy is LAN-only.
    </p>
  {/if}
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
