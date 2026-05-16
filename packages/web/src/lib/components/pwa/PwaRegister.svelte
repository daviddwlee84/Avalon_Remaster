<script lang="ts">
  import { Button } from '$lib/components/ui';
  import { t } from '$lib/i18n/locale.svelte';
  import { useRegisterSW } from 'virtual:pwa-register/svelte';

  const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
    immediate: true,
    onRegistered(reg) {
      // Hourly background update check while the tab is open.
      if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000);
    },
    onRegisterError(err) {
      console.error('[pwa] SW registration failed:', err);
    },
  });

  function dismissUpdate() {
    needRefresh.set(false);
  }

  function dismissOfflineReady() {
    offlineReady.set(false);
  }
</script>

{#if $needRefresh}
  <div
    class="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-lg border-2 border-gold/60 bg-parchment shadow-2xl sm:right-4 sm:left-auto"
    role="alert"
  >
    <div class="p-3">
      <p class="font-display text-sm font-bold tracking-wider uppercase">{t('pwa.update.title')}</p>
      <p class="mt-1 text-xs opacity-70">{t('pwa.update.body')}</p>
      <div class="mt-2 flex gap-2">
        <Button
          variant="gold"
          size="sm"
          onclick={() => {
            void updateServiceWorker(true);
          }}
        >
          {t('pwa.update.reload')}
        </Button>
        <Button variant="outline" size="sm" onclick={dismissUpdate}>{t('pwa.update.later')}</Button>
      </div>
    </div>
  </div>
{/if}

{#if $offlineReady}
  <div
    class="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-md border border-good/60 bg-good/10 p-2 text-center text-xs shadow-lg sm:right-4 sm:left-auto"
    role="status"
  >
    <span class="font-display tracking-wider text-good uppercase">{t('pwa.offlineReady')}</span>
    <button class="ml-2 underline hover:opacity-80" onclick={dismissOfflineReady}
      >{t('pwa.dismiss')}</button
    >
  </div>
{/if}
