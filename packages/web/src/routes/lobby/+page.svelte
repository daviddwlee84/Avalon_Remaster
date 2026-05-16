<script lang="ts">
  import { base } from '$app/paths';
  import { Card } from '$lib/components/ui';
  import { t } from '$lib/i18n/locale.svelte';
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
  <a
    href={base || '/'}
    class="font-display inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100"
    >{t('lobby.back')}</a
  >
  <header class="mt-2 mb-4 flex items-baseline justify-between">
    <h1 class="font-display text-3xl font-bold tracking-wide sm:text-4xl">{t('lobby.title')}</h1>
    <span class="text-xs tracking-wider opacity-60 uppercase">
      <span
        class="mr-1 inline-block h-2 w-2 rounded-full align-middle"
        class:bg-good={connState === 'open'}
        class:bg-blood={connState === 'closed'}
        class:bg-gold={connState === 'connecting'}
      ></span>
      {connState}
    </span>
  </header>

  {#if rooms.length === 0}
    <Card class="text-center text-sm opacity-70">{t('lobby.empty')}</Card>
  {:else}
    <ul class="space-y-2">
      {#each rooms as room (room.roomId)}
        <li>
          <Card
            class="flex items-center justify-between !p-3 hover:border-gold-bright hover:bg-parchment-deep/40"
          >
            <span class="min-w-0 flex-1">
              <strong class="font-display block truncate text-base">{room.roomId}</strong>
              <span class="text-xs tracking-wider opacity-60 uppercase">
                {t(room.playerCount === 1 ? 'lobby.playerCount.one' : 'lobby.playerCount.many', {
                  n: room.playerCount,
                })} · {t(`phase.${room.phase}`)}
              </span>
            </span>
            <a
              href="{base}/play/{room.roomId}"
              class="font-display inline-flex h-10 items-center rounded-md border border-gold/60 bg-gradient-to-b from-gold-bright to-gold px-4 text-sm font-medium tracking-wider text-ink uppercase shadow-[0_2px_0_rgba(0,0,0,0.25)] hover:from-[#e0b35a] hover:to-[#c89720]"
            >
              {t('lobby.join')}
            </a>
          </Card>
        </li>
      {/each}
    </ul>
  {/if}
</section>
