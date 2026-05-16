<script lang="ts">
  import { Button, Card } from '$lib/components/ui';
  import PlayLayout from '$lib/components/game/PlayLayout.svelte';
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

  onMount(() => {
    displayName = loadDisplayName() || 'Joiner';
  });

  async function generateAnswer() {
    const name = displayName.trim();
    if (!name) {
      lastError = 'Enter a display name first.';
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
  href="/"
  class="font-display inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100"
>
  ← Back
</a>

{#if stage.kind === 'paste-offer' || stage.kind === 'generating'}
  <section class="mx-auto max-w-2xl py-6 space-y-4">
    <h1 class="font-display text-3xl font-bold tracking-wide">Join a LAN game</h1>
    <Card>
      <label class="block mb-3">
        <span class="font-display mb-1 block text-xs tracking-wider opacity-70 uppercase"
          >Display name</span
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
        Paste the host's offer
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
      <Button
        class="mt-3"
        variant="gold"
        size="lg"
        disabled={stage.kind === 'generating'}
        onclick={generateAnswer}
      >
        {stage.kind === 'generating' ? 'Generating…' : 'Generate answer'}
      </Button>
    </Card>
  </section>
{:else if stage.kind === 'show-answer'}
  <section class="mx-auto max-w-2xl py-6 space-y-4">
    <h1 class="font-display text-2xl font-bold tracking-wide">Send this answer to the host</h1>
    <Card>
      <textarea
        class="block h-32 w-full rounded-md border border-ink/30 bg-parchment/80 p-2 font-mono text-xs"
        readonly
        value={stage.answer}
      ></textarea>
      <Button class="mt-2" size="sm" variant="outline" onclick={() => copy(stage.kind === 'show-answer' ? stage.answer : '')}>
        Copy answer
      </Button>
      <p class="mt-3 text-xs opacity-70">
        After the host pastes this into their tab and accepts, the connection opens automatically and
        you'll see the game.
      </p>
      <Button class="mt-3" variant="gold" onclick={enterGame}>I've sent the answer — enter game</Button>
    </Card>
  </section>
{:else if stage.kind === 'playing'}
  <PlayLayout session={stage.session} {displayName} roomLabel="LAN" leaveHref="/" />
{/if}
