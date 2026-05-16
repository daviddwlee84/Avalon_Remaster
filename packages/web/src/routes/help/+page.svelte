<script lang="ts">
  import { base } from '$app/paths';
  import HelpContent from '$lib/components/help/HelpContent.svelte';
  import { t } from '$lib/i18n/locale.svelte';
</script>

<svelte:head>
  <title>{t('help.title')} · Avalon</title>
</svelte:head>

<section class="mx-auto max-w-3xl space-y-3 py-4">
  <a
    href={base || '/'}
    class="font-display inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100"
    >{t('help.back')}</a
  >

  <h1 class="font-display mt-2 text-3xl font-bold tracking-wide sm:text-4xl">
    {t('help.title')}
  </h1>

  <HelpContent />
</section>
