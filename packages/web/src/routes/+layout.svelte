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
    // Hide the inline app.html splash now that JS has hydrated. The fade-out
    // takes 300 ms (see #avalon-splash CSS in app.html); after that, mark
    // the element 'gone' so it stops eating clicks even if it stuck around.
    if (typeof document !== 'undefined') {
      document.body.classList.add('app-ready');
      setTimeout(() => {
        document.getElementById('avalon-splash')?.classList.add('gone');
      }, 350);
    }
  });
</script>

<main class="mx-auto min-h-screen max-w-5xl px-4 py-6">
  {@render children?.()}
</main>

<OfflineBanner />
<PwaRegister />
