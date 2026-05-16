<script lang="ts">
  interface PlayerLike {
    id: string;
    displayName: string;
    seat: number;
    connected: boolean;
    isCaptain: boolean;
    isOnProposedTeam: boolean;
    isLadyOfTheLakeHolder: boolean;
  }

  interface Props {
    player: PlayerLike;
    isMe: boolean;
    alignment?: 'good' | 'evil' | 'merlin-like';
    selectable?: boolean;
    selected?: boolean;
    onClick?: () => void;
  }

  let { player, isMe, alignment, selectable = false, selected = false, onClick }: Props = $props();

  // First letter of display name as a simple "avatar" — placeholder until real avatars in a later phase.
  const initial = $derived((player.displayName[0] ?? '?').toUpperCase());
</script>

{#snippet body()}
  <div class="relative flex w-full items-center gap-3">
    <!-- Avatar -->
    <div
      class="font-display relative grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 text-lg font-bold shadow-inner"
      class:border-blood={alignment === 'evil'}
      class:bg-evil={alignment === 'evil'}
      class:text-parchment={alignment === 'evil'}
      class:border-gold={alignment === 'merlin-like'}
      class:bg-gold-bright={alignment === 'merlin-like'}
      class:text-ink={alignment !== 'evil'}
      class:border-ink={!alignment}
      class:bg-parchment-deep={!alignment}
    >
      {initial}
      {#if player.isCaptain}
        <span
          class="absolute -top-3 left-1/2 -translate-x-1/2 text-xl drop-shadow"
          style="animation: var(--animate-crown-pulse);"
          aria-label="Captain">👑</span
        >
      {/if}
      {#if player.isLadyOfTheLakeHolder}
        <span
          class="absolute -right-1 -bottom-1 grid h-5 w-5 place-items-center rounded-full bg-good text-[10px] shadow"
          aria-label="Lady of the Lake">🌊</span
        >
      {/if}
    </div>

    <!-- Name + status -->
    <div class="min-w-0 flex-1 text-left">
      <div class="flex items-baseline gap-1 truncate">
        <span class="truncate font-medium">{player.displayName}</span>
        {#if isMe}<span class="text-[10px] tracking-wider opacity-60 uppercase">you</span>{/if}
      </div>
      <div class="flex flex-wrap items-center gap-1 text-[10px] tracking-wider uppercase">
        {#if player.isCaptain}<span class="font-medium text-gold">Captain</span>{/if}
        {#if player.isOnProposedTeam}<span class="font-medium text-good">On team</span>{/if}
        {#if !player.connected}<span class="font-medium text-blood">Offline</span>{/if}
        {#if alignment === 'evil'}<span class="font-medium text-blood">Evil</span>{/if}
        {#if alignment === 'merlin-like'}<span class="font-medium text-gold">Merlin-like</span
          >{/if}
      </div>
    </div>

    {#if player.isOnProposedTeam}
      <span
        class="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 text-base drop-shadow"
        aria-hidden="true">🛡</span
      >
    {/if}
  </div>
{/snippet}

{#if selectable}
  <button
    type="button"
    onclick={onClick}
    class="group relative flex w-full items-center rounded-xl border bg-parchment/60 p-2.5 text-sm transition focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:outline-none"
    class:border-blood={alignment === 'evil' && !selected}
    class:border-gold={alignment === 'merlin-like' && !selected}
    class:border-ink={!alignment && !selected}
    class:border-good={selected}
    class:bg-good={selected}
    class:!text-parchment={selected}
    class:opacity-50={!player.connected}
    class:ring-2={selected}
    class:ring-good={selected}
    class:hover:border-gold-bright={!selected}
    class:hover:bg-parchment-deep={!selected}
  >
    {@render body()}
  </button>
{:else}
  <div
    class="relative flex w-full items-center rounded-xl border bg-parchment/60 p-2.5 text-sm"
    class:border-blood={alignment === 'evil'}
    class:border-gold={alignment === 'merlin-like'}
    class:border-ink={!alignment}
    class:opacity-50={!player.connected}
  >
    {@render body()}
  </div>
{/if}
