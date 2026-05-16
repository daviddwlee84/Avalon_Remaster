<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    targetName: string;
    alignment: 'good' | 'evil';
    onDismiss: () => void;
  }

  let { targetName, alignment, onDismiss }: Props = $props();

  let flipped = $state(false);

  onMount(() => {
    const t = setTimeout(() => {
      flipped = true;
    }, 80);
    return () => clearTimeout(t);
  });
</script>

<div class="text-center">
  <p class="font-display text-xs tracking-[0.25em] opacity-60 uppercase">Lady of the Lake</p>
  <p class="mt-2 text-sm opacity-70">
    Inspecting <strong class="font-display">{targetName}</strong>
  </p>

  <div class="mx-auto mt-3 mb-4 h-[200px] w-[200px] flip-3d">
    <div class="flip-3d-inner" class:is-flipped={flipped}>
      <!-- Cover (water motif) -->
      <div
        class="flip-3d-face overflow-hidden rounded-xl border-2 border-good/80 bg-gradient-to-br from-good to-ink shadow-2xl"
      >
        <div
          class="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_50%_30%,rgba(212,166,75,0.35),transparent_70%)]"
        >
          <span class="text-7xl">🌊</span>
        </div>
      </div>

      <!-- Face: alignment reveal -->
      <div
        class="flip-3d-face flip-3d-face-back grid place-items-center overflow-hidden rounded-xl border-2 shadow-2xl"
        class:border-blood={alignment === 'evil'}
        class:bg-evil={alignment === 'evil'}
        class:border-gold={alignment === 'good'}
        class:bg-good={alignment === 'good'}
      >
        <div class="text-parchment">
          <div class="font-display text-5xl font-bold tracking-widest uppercase">
            {alignment}
          </div>
          <div class="mt-1 text-xs tracking-wider opacity-80 uppercase">
            {alignment === 'evil' ? 'Servant of Mordred' : 'Loyal to Arthur'}
          </div>
        </div>
      </div>
    </div>
  </div>

  <button
    type="button"
    class="font-display inline-flex h-11 items-center justify-center rounded-md border border-gold/60 bg-gradient-to-b from-gold-bright to-gold px-6 text-sm font-medium tracking-wider text-ink uppercase shadow-[0_2px_0_rgba(0,0,0,0.25)] transition hover:from-[#e0b35a] hover:to-[#c89720] focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-parchment focus-visible:outline-none active:translate-y-px"
    onclick={onDismiss}
  >
    Keep it secret
  </button>
</div>
