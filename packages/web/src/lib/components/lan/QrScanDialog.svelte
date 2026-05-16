<script lang="ts">
  import { Button, Dialog, DialogContent } from '$lib/components/ui';
  import { t } from '$lib/i18n/locale.svelte';
  import { onDestroy } from 'svelte';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onResult: (text: string) => void;
  }

  let { open, onOpenChange, onResult }: Props = $props();

  let videoEl = $state<HTMLVideoElement | null>(null);
  let scanner: import('qr-scanner').default | null = null;
  let error = $state<string | null>(null);

  // qr-scanner is ~12 KiB + lazy worker; dynamic-import so the bundle isn't
  // hit until the user clicks "Scan QR" once.
  async function startScanning() {
    if (!videoEl) return;
    error = null;
    try {
      const QrScanner = (await import('qr-scanner')).default;
      scanner = new QrScanner(
        videoEl,
        (result) => {
          onResult(result.data);
          stopScanning();
          onOpenChange(false);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
        },
      );
      await scanner.start();
    } catch (e) {
      error = (e as Error).message || t('lan.qr.cameraUnavailable');
    }
  }

  function stopScanning() {
    if (scanner) {
      try {
        scanner.stop();
        scanner.destroy();
      } catch {
        /* ignore */
      }
      scanner = null;
    }
  }

  $effect(() => {
    if (open) {
      // Defer until video element is mounted on next microtask.
      queueMicrotask(() => void startScanning());
    } else {
      stopScanning();
    }
  });

  onDestroy(() => stopScanning());
</script>

<Dialog
  {open}
  onOpenChange={(o) => {
    if (!o) stopScanning();
    onOpenChange(o);
  }}
>
  <DialogContent>
    <div class="text-center">
      <h2 class="font-display mb-3 text-xl font-bold tracking-wide">{t('lan.qr.scan')}</h2>
      <p class="mb-3 text-xs opacity-70">{t('lan.qr.alignHint')}</p>

      <div class="relative mx-auto overflow-hidden rounded-lg border-2 border-gold/40 bg-ink">
        <!-- svelte-ignore a11y_media_has_caption -->
        <video bind:this={videoEl} class="block h-[300px] w-full object-cover" playsinline></video>
      </div>

      {#if error}
        <p class="mt-3 rounded border border-blood/60 bg-blood/10 p-2 text-xs text-blood">
          {error}
        </p>
      {/if}

      <Button class="mt-4" variant="outline" onclick={() => onOpenChange(false)}>
        {t('lan.qr.close')}
      </Button>
    </div>
  </DialogContent>
</Dialog>
