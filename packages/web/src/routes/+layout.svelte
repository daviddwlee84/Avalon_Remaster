<script lang="ts">
  import '../app.css';

  let { children } = $props();
</script>

<main class="mx-auto min-h-screen max-w-5xl px-4 py-6">
  {@render children?.()}
</main>
