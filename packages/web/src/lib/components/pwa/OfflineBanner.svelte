<script lang="ts">
  import { page } from '$app/state';
  import { base } from '$app/paths';
  import { t } from '$lib/i18n/locale.svelte';
  import { onMount } from 'svelte';

  let online = $state(true);

  onMount(() => {
    online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const onOnline = () => (online = true);
    const onOffline = () => (online = false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  });

  const isNetPlay = $derived(page.url.pathname.startsWith(`${base}/play/`));
  const isLan = $derived(page.url.pathname.startsWith(`${base}/lan/`));
</script>

{#if !online}
  <div
    class="fixed inset-x-4 top-4 z-40 mx-auto max-w-md rounded-md border border-blood/60 bg-blood text-parchment shadow-lg sm:left-4"
    role="status"
  >
    <div class="px-3 py-2 text-xs">
      <p class="font-display tracking-wider uppercase">{t('offline.title')}</p>
      {#if isNetPlay}
        <p class="mt-0.5">
          {t('offline.netPlay')}<a href="{base}/lan/host" class="font-medium underline"
            >{t('offline.netPlay.link')}</a
          >{t('offline.netPlay.tail')}
        </p>
      {:else if isLan}
        <p class="mt-0.5">{t('offline.lan')}</p>
      {:else}
        <p class="mt-0.5">{t('offline.generic')}</p>
      {/if}
    </div>
  </div>
{/if}
