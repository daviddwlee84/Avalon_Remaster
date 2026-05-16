<script lang="ts" module>
  import { tv, type VariantProps } from 'tailwind-variants';

  export const buttonVariants = tv({
    base: 'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium tracking-wide whitespace-nowrap transition-[background,color,border,box-shadow,transform] duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-parchment disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-px',
    variants: {
      variant: {
        primary:
          'bg-ink text-parchment hover:bg-ink/85 shadow-[0_2px_0_rgba(0,0,0,0.35)] disabled:shadow-none',
        gold: 'border border-gold/60 bg-gradient-to-b from-[#d4a64b] to-[#b8860b] text-ink shadow-[0_2px_0_rgba(0,0,0,0.25)] hover:from-[#e0b35a] hover:to-[#c89720] disabled:shadow-none',
        outline:
          'border border-ink/30 bg-parchment/40 text-ink hover:bg-parchment/70 hover:border-ink/50',
        ghost: 'text-ink hover:bg-ink/10',
        approve: 'bg-good text-parchment hover:bg-good/85 shadow-[0_2px_0_rgba(0,0,0,0.25)]',
        reject: 'bg-blood text-parchment hover:bg-blood/85 shadow-[0_2px_0_rgba(0,0,0,0.25)]',
        success: 'bg-good text-parchment hover:bg-good/85 shadow-[0_2px_0_rgba(0,0,0,0.25)]',
        fail: 'bg-evil text-parchment hover:bg-evil/85 shadow-[0_2px_0_rgba(0,0,0,0.25)]',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  });

  export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
  export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  import { cn } from '$lib/utils';

  interface Props extends HTMLButtonAttributes {
    variant?: ButtonVariant;
    size?: ButtonSize;
    children?: Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    class: className,
    type = 'button',
    children,
    ...rest
  }: Props = $props();
</script>

<button class={cn(buttonVariants({ variant, size }), className)} {type} {...rest}>
  {@render children?.()}
</button>
