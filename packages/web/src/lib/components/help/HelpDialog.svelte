<script lang="ts">
  import { Button, Dialog, DialogContent } from '$lib/components/ui';
  import HelpContent from './HelpContent.svelte';
  import { t } from '$lib/i18n/locale.svelte';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  let { open, onOpenChange }: Props = $props();
</script>

<Dialog {open} {onOpenChange}>
  <DialogContent
    class="!w-[min(95vw,46rem)] !max-h-[88vh] !overflow-y-auto !p-4 sm:!p-6"
  >
    <div class="mb-3 flex items-baseline justify-between gap-2">
      <h2 class="font-display text-2xl font-bold tracking-wide">{t('help.title')}</h2>
      <Button variant="ghost" size="sm" onclick={() => onOpenChange(false)}>
        ✕
      </Button>
    </div>
    <HelpContent />
  </DialogContent>
</Dialog>
