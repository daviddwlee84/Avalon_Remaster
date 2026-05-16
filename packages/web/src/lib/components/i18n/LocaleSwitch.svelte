<script lang="ts">
  import { LOCALES, localeStore, t } from '$lib/i18n/locale.svelte';
  import { onMount } from 'svelte';

  onMount(() => {
    localeStore.hydrate();
  });
</script>

<div
  class="inline-flex overflow-hidden rounded-full border border-ink/20 text-xs"
  role="group"
  aria-label={t('home.locale.switch')}
>
  {#each LOCALES as loc (loc)}
    <button
      type="button"
      class="px-3 py-1 transition"
      class:bg-ink={localeStore.current === loc}
      class:text-parchment={localeStore.current === loc}
      class:opacity-70={localeStore.current !== loc}
      aria-pressed={localeStore.current === loc}
      onclick={() => localeStore.setLocale(loc)}
    >
      {loc === 'zh-TW' ? t('home.locale.zh') : t('home.locale.en')}
    </button>
  {/each}
</div>
