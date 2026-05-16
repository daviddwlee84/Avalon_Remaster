<script lang="ts">
  import '../app.css';
  import OfflineBanner from '$lib/components/pwa/OfflineBanner.svelte';
  import PwaRegister from '$lib/components/pwa/PwaRegister.svelte';

  let { children } = $props();
</script>

<main class="mx-auto min-h-screen max-w-5xl px-4 py-6">
  {@render children?.()}
</main>

<OfflineBanner />
<PwaRegister />
