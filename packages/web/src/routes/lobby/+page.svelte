<script lang="ts">
  import { base } from '$app/paths';
  import ActiveRoomsList from '$lib/components/lobby/ActiveRoomsList.svelte';
  import { t } from '$lib/i18n/locale.svelte';
</script>

<svelte:head>
  <title>{t('lobby.title')} — Avalon</title>
</svelte:head>

<section>
  <a
    href={base || '/'}
    class="font-display inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100"
    >{t('lobby.back')}</a
  >
  <h1 class="font-display mt-2 mb-4 text-3xl font-bold tracking-wide sm:text-4xl">
    {t('lobby.title')}
  </h1>
  <ActiveRoomsList limit={Number.POSITIVE_INFINITY} showViewAll={false} />
</section>
