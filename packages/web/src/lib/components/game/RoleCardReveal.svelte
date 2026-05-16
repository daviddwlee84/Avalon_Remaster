<script lang="ts" module>
  /**
   * Maps a Role string to its portrait image filename under /images/.
   * Defaults to unknown.jpg if the role is missing or unrecognised.
   */
  const ROLE_IMAGE: Record<string, string> = {
    Merlin: 'merlin.jpg',
    Percival: 'percival.jpg',
    LoyalServant: 'loyal-servant.jpg',
    Assassin: 'assassin.jpg',
    Morgana: 'morgana.jpg',
    Mordred: 'mordred.jpg',
    Oberon: 'oberon.jpg',
    Minion: 'minion.jpg',
  };

  const ROLE_ALIGNMENT: Record<string, 'good' | 'evil'> = {
    Merlin: 'good',
    Percival: 'good',
    LoyalServant: 'good',
    Assassin: 'evil',
    Morgana: 'evil',
    Mordred: 'evil',
    Oberon: 'evil',
    Minion: 'evil',
  };
</script>

<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    role: string;
    knownAlignments: Record<string, 'good' | 'evil' | 'merlin-like'>;
    players: Array<{ id: string; displayName: string }>;
    onDismiss: () => void;
  }

  let { role, knownAlignments, players, onDismiss }: Props = $props();

  let flipped = $state(false);

  const alignment = $derived(ROLE_ALIGNMENT[role] ?? 'good');
  const image = $derived(`/images/${ROLE_IMAGE[role] ?? 'unknown.jpg'}`);
  const seenList = $derived(
    Object.entries(knownAlignments).map(([pid, what]) => {
      const player = players.find((p) => p.id === pid);
      return {
        pid,
        name: player?.displayName ?? pid.slice(0, 6),
        label: what === 'merlin-like' ? 'Merlin or Morgana' : what === 'evil' ? 'Evil' : 'Good',
      };
    }),
  );

  onMount(() => {
    // Auto-flip on a tiny delay so the animation is visible (not pre-flipped on mount).
    const t = setTimeout(() => {
      flipped = true;
    }, 80);
    return () => clearTimeout(t);
  });
</script>

<div class="text-center">
  <p class="font-display text-xs tracking-[0.25em] opacity-60 uppercase">Your role</p>

  <div class="mx-auto mt-3 mb-4 h-[300px] w-[200px] flip-3d">
    <div class="flip-3d-inner" class:is-flipped={flipped}>
      <!-- Card back (cover) -->
      <div
        class="flip-3d-face overflow-hidden rounded-xl border-2 border-gold/80 bg-gradient-to-br from-evil to-ink shadow-2xl"
      >
        <div
          class="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(184,134,11,0.35),transparent_70%)]"
        >
          <span class="font-display text-5xl text-gold/80">A</span>
        </div>
      </div>

      <!-- Card face -->
      <div
        class="flip-3d-face flip-3d-face-back overflow-hidden rounded-xl border-2 shadow-2xl"
        class:border-blood={alignment === 'evil'}
        class:border-gold={alignment === 'good'}
      >
        <img
          src={image}
          alt={role}
          class="h-full w-full object-cover"
          loading="eager"
          decoding="async"
        />
      </div>
    </div>
  </div>

  <h2
    class="font-display text-3xl font-bold"
    class:text-blood={alignment === 'evil'}
    class:text-good={alignment === 'good'}
  >
    {role}
  </h2>
  <p class="mt-1 text-xs tracking-wider opacity-60 uppercase">
    {alignment === 'evil' ? 'Servant of Mordred' : 'Loyal Servant of Arthur'}
  </p>

  {#if seenList.length > 0}
    <div class="mt-4 rounded-lg border border-ink/15 bg-parchment-deep/40 p-3 text-left">
      <p class="mb-1 text-xs font-medium tracking-wider opacity-70 uppercase">You see</p>
      <ul class="space-y-1 text-sm">
        {#each seenList as s (s.pid)}
          <li class="flex items-baseline justify-between gap-2">
            <span class="font-medium">{s.name}</span>
            <span
              class="rounded-full px-2 py-0.5 text-xs"
              class:bg-blood={s.label === 'Evil'}
              class:text-parchment={s.label === 'Evil' || s.label === 'Merlin or Morgana'}
              class:bg-gold={s.label === 'Merlin or Morgana'}
              class:bg-good={s.label === 'Good'}>{s.label}</span
            >
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <button
    type="button"
    class="font-display mt-5 inline-flex h-11 items-center justify-center rounded-md border border-gold/60 bg-gradient-to-b from-gold-bright to-gold px-6 text-sm font-medium tracking-wider text-ink uppercase shadow-[0_2px_0_rgba(0,0,0,0.25)] transition hover:from-[#e0b35a] hover:to-[#c89720] focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-parchment focus-visible:outline-none active:translate-y-px"
    onclick={onDismiss}
  >
    I am ready
  </button>
</div>
