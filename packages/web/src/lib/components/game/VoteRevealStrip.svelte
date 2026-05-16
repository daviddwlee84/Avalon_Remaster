<script lang="ts">
  interface Props {
    votes: Record<string, boolean>;
    players: Array<{ id: string; displayName: string }>;
  }

  let { votes, players }: Props = $props();

  // Stable order by seat (we passed players in seat order).
  const ordered = $derived(
    players
      .filter((p) => p.id in votes)
      .map((p) => ({ id: p.id, name: p.displayName, approve: votes[p.id] })),
  );
</script>

<div class="flex flex-wrap justify-center gap-3">
  {#each ordered as v, idx (v.id)}
    <div
      class="flex w-14 flex-col items-center text-center"
      style="animation: var(--animate-token-reveal); animation-delay: {idx * 110}ms; opacity: 0;"
    >
      <img
        src={v.approve ? '/images/yes.jpg' : '/images/no.jpg'}
        alt={v.approve ? 'Approve' : 'Reject'}
        class="h-12 w-12 rounded-full border-2 object-cover shadow-md"
        class:border-good={v.approve}
        class:border-blood={!v.approve}
      />
      <span class="mt-1 truncate text-[10px] tracking-wider uppercase">{v.name}</span>
    </div>
  {/each}
</div>
