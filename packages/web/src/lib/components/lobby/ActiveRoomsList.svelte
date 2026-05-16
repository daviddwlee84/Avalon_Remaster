<script lang="ts">
  import { base } from '$app/paths';
  import type { RoomSummary } from '@avalon/game-core';
  import { parseServerMsg } from '@avalon/protocol';
  import { Button } from '$lib/components/ui';
  import { t } from '$lib/i18n/locale.svelte';
  import { buildLobbyWsUrl } from '$lib/transport/ws.svelte';
  import { onDestroy, onMount } from 'svelte';

  interface Props {
    /**
     * Cap the inline preview to keep the home page tidy. Full list lives at
     * /lobby. `Infinity` = render everything (used by the /lobby route).
     */
    limit?: number;
    /** Show a "View full list" link below when truncated. */
    showViewAll?: boolean;
  }

  let { limit = 6, showViewAll = true }: Props = $props();

  let rooms = $state<RoomSummary[]>([]);
  let connState: 'connecting' | 'open' | 'closed' = $state('connecting');
  let ws: WebSocket | null = null;

  onMount(() => {
    ws = new WebSocket(buildLobbyWsUrl());
    ws.onopen = () => (connState = 'open');
    ws.onclose = () => (connState = 'closed');
    ws.onerror = () => (connState = 'closed');
    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      try {
        const msg = parseServerMsg(JSON.parse(ev.data));
        if (msg?.type === 'RoomList') rooms = msg.rooms;
      } catch {
        /* ignore */
      }
    };
  });

  onDestroy(() => ws?.close());

  // Hide the persistent default "main" room from the inline preview if it's
  // empty — it's always there but rarely the room the user actually wants.
  const visibleRooms = $derived(
    rooms.filter((r) => !(r.roomId === 'main' && r.playerCount === 0)),
  );
  const shown = $derived(visibleRooms.slice(0, limit));
  const hasMore = $derived(visibleRooms.length > limit);
</script>

<div>
  <div class="mb-2 flex items-baseline justify-between">
    <p class="font-display text-xs tracking-[0.25em] opacity-70 uppercase">
      {t('lobby.inline.title')}
    </p>
    <span class="text-[10px] tracking-wider opacity-50 uppercase">
      <span
        class="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle"
        class:bg-good={connState === 'open'}
        class:bg-blood={connState === 'closed'}
        class:bg-gold={connState === 'connecting'}
      ></span>
      {connState}
    </span>
  </div>

  {#if visibleRooms.length === 0}
    <p class="rounded-md border border-ink/10 bg-parchment/40 p-3 text-center text-xs opacity-60">
      {t('lobby.inline.empty')}
    </p>
  {:else}
    <ul class="space-y-1.5">
      {#each shown as room (room.roomId)}
        <li
          class="flex items-center justify-between rounded-md border border-ink/15 bg-parchment/60 px-3 py-1.5 hover:border-gold-bright"
        >
          <span class="min-w-0 flex-1">
            <strong class="font-display block truncate text-sm">{room.roomId}</strong>
            <span class="text-[10px] tracking-wider opacity-60 uppercase">
              {t(room.playerCount === 1 ? 'lobby.playerCount.one' : 'lobby.playerCount.many', {
                n: room.playerCount,
              })} · {t(`phase.${room.phase}`)}
            </span>
          </span>
          <Button size="sm" variant="gold" onclick={() => (window.location.href = `${base}/play/${room.roomId}`)}>
            {t('lobby.join')}
          </Button>
        </li>
      {/each}
    </ul>
    {#if hasMore && showViewAll}
      <p class="mt-2 text-center text-xs opacity-60">
        <a
          href="{base}/lobby"
          class="underline decoration-gold/60 underline-offset-2 hover:text-gold"
        >
          {t('lobby.inline.viewAll')} ({visibleRooms.length})
        </a>
      </p>
    {/if}
  {/if}
</div>
