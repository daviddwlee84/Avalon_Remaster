<script lang="ts">
  import '../app.css';
  import OfflineBanner from '$lib/components/pwa/OfflineBanner.svelte';
  import PwaRegister from '$lib/components/pwa/PwaRegister.svelte';
  import { localeStore } from '$lib/i18n/locale.svelte';
  import { onMount } from 'svelte';

  let { children } = $props();

  // Hydrate the locale store on every navigation so all routes (not just /)
  // pick up the user's saved choice or navigator-detected default.
  onMount(() => {
    localeStore.hydrate();
  });
</script>

<main class="mx-auto min-h-screen max-w-5xl px-4 py-6">
  {@render children?.()}
</main>

<OfflineBanner />
<PwaRegister />
