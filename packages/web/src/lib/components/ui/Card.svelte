<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  import { cn } from '$lib/utils';

  interface Props extends HTMLAttributes<HTMLDivElement> {
    children?: Snippet;
  }

  let { class: className, children, ...rest }: Props = $props();
</script>

<div
  class={cn(
    'rounded-xl border border-ink/15 bg-parchment/60 p-4 shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_4px_14px_-8px_rgba(0,0,0,0.35)] backdrop-blur-[1px]',
    className,
  )}
  {...rest}
>
  {@render children?.()}
</div>
