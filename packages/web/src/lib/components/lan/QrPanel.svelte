<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    value: string;
    /** Canvas pixel size; rendered larger via CSS for high-DPI clarity. */
    size?: number;
    /** Caption rendered above the QR. */
    label?: string;
  }

  let { value, size = 240, label }: Props = $props();

  let canvas = $state<HTMLCanvasElement | null>(null);
  let renderError = $state<string | null>(null);

  // qrcode is ~30 KiB; dynamic-import so the SPA shell loads without it
  // on first paint and only fetches it when the user hits the LAN flow.
  async function render() {
    if (!canvas || !value) return;
    renderError = null;
    try {
      const { default: QRCode } = await import('qrcode');
      await QRCode.toCanvas(canvas, value, {
        width: size,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#1a0f00', light: '#f5e9d3' },
      });
    } catch (e) {
      renderError = (e as Error).message;
    }
  }

  onMount(() => {
    void render();
  });

  $effect(() => {
    // Re-render whenever the value changes.
    void value;
    void render();
  });
</script>

<div class="flex flex-col items-center gap-2">
  {#if label}
    <p class="font-display text-xs tracking-[0.2em] opacity-70 uppercase">{label}</p>
  {/if}
  <canvas
    bind:this={canvas}
    width={size}
    height={size}
    class="rounded-lg border-2 border-gold/40 bg-parchment shadow"
    style="image-rendering: pixelated; width: {size}px; height: {size}px;"
  ></canvas>
  {#if renderError}
    <p class="text-xs text-blood">QR unavailable — copy the text below. ({renderError})</p>
  {/if}
</div>
