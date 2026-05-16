<script lang="ts">
  import { base } from '$app/paths';
  import { Button, Card } from '$lib/components/ui';
  import PlayLayout from '$lib/components/game/PlayLayout.svelte';
  import QrPanel from '$lib/components/lan/QrPanel.svelte';
  import QrScanDialog from '$lib/components/lan/QrScanDialog.svelte';
  import { t } from '$lib/i18n/locale.svelte';
  import { loadDisplayName, saveDisplayName } from '$lib/storage';
  import { connectAsJoiner, type WebRtcSession } from '$lib/transport/webrtc.svelte';
  import { onMount } from 'svelte';

  type Stage =
    | { kind: 'paste-offer' }
    | { kind: 'generating' }
    | { kind: 'show-answer'; answer: string; session: WebRtcSession }
    | { kind: 'playing'; session: WebRtcSession };

  let stage = $state<Stage>({ kind: 'paste-offer' });
  let displayName = $state('Joiner');
  let offerBlob = $state('');
  let lastError = $state<string | null>(null);
  let scanOpen = $state(false);

  onMount(() => {
    displayName = loadDisplayName() || 'Joiner';
  });

  async function generateAnswer() {
    const name = displayName.trim();
    if (!name) {
      lastError = t('lan.join.nameRequired');
      return;
    }
    saveDisplayName(name);
    lastError = null;
    stage = { kind: 'generating' };
    const result = await connectAsJoiner(offerBlob, 'lan-only');
    if (!result.ok) {
      lastError = result.error;
      stage = { kind: 'paste-offer' };
      return;
    }
    stage = { kind: 'show-answer', answer: result.handshake.answerBlob, session: result.handshake.session };
  }

  function enterGame() {
    if (stage.kind !== 'show-answer') return;
    stage = { kind: 'playing', session: stage.session };
  }

  function copy(text: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
  }
</script>

<svelte:head>
  <title>LAN join — Avalon</title>
</svelte:head>

<a
  href={base || '/'}
  class="font-display inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100"
>
  {t('lan.host.back')}
</a>

{#if stage.kind === 'paste-offer' || stage.kind === 'generating'}
  <section class="mx-auto max-w-2xl py-6 space-y-4">
    <h1 class="font-display text-3xl font-bold tracking-wide">{t('lan.join.title')}</h1>
    <Card>
      <label class="block mb-3">
        <span class="font-display mb-1 block text-xs tracking-wider opacity-70 uppercase"
          >{t('lan.join.displayName')}</span
        >
        <input
          type="text"
          class="w-full rounded-md border border-ink/30 bg-parchment/80 px-3 py-2"
          maxlength="24"
          required
          bind:value={displayName}
        />
      </label>
      <h2 class="font-display mb-2 text-xs tracking-wider opacity-70 uppercase">
        {t('lan.join.pasteOffer')}
      </h2>
      <textarea
        class="block h-32 w-full rounded-md border border-ink/30 bg-parchment/80 p-2 font-mono text-xs"
        placeholder={'{"type":"offer","sdp":"..."}'}
        bind:value={offerBlob}
      ></textarea>
      {#if lastError}
        <p class="mt-2 rounded border border-blood/60 bg-blood/10 p-2 text-xs text-blood">
          {lastError}
        </p>
      {/if}
      <div class="mt-3 flex flex-wrap gap-2">
        <Button
          variant="gold"
          size="lg"
          disabled={stage.kind === 'generating'}
          onclick={generateAnswer}
        >
          {stage.kind === 'generating' ? t('lan.join.generating') : t('lan.join.generate')}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onclick={() => (scanOpen = true)}
          disabled={stage.kind === 'generating'}
        >
          📷 {t('lan.qr.scanOffer')}
        </Button>
      </div>
    </Card>
    <QrScanDialog
      open={scanOpen}
      onOpenChange={(o) => (scanOpen = o)}
      onResult={(text) => (offerBlob = text)}
    />
  </section>
{:else if stage.kind === 'show-answer'}
  <section class="mx-auto max-w-2xl py-6 space-y-4">
    <h1 class="font-display text-2xl font-bold tracking-wide">{t('lan.join.sendAnswer.title')}</h1>
    <Card>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
        <QrPanel value={stage.answer} label={t('lan.qr.answerLabel')} />
        <div class="flex-1">
          <textarea
            class="block h-32 w-full rounded-md border border-ink/30 bg-parchment/80 p-2 font-mono text-xs"
            readonly
            value={stage.answer}
          ></textarea>
          <Button
            class="mt-2"
            size="sm"
            variant="outline"
            onclick={() => copy(stage.kind === 'show-answer' ? stage.answer : '')}
          >
            {t('lan.join.copyAnswer')}
          </Button>
        </div>
      </div>
      <p class="mt-3 text-xs opacity-70">{t('lan.join.answerNote')}</p>
      <Button class="mt-3" variant="gold" onclick={enterGame}>{t('lan.join.iSentIt')}</Button>
    </Card>
  </section>
{:else if stage.kind === 'playing'}
  <PlayLayout session={stage.session} {displayName} roomLabel="LAN" leaveHref={base || '/'} />
{/if}
