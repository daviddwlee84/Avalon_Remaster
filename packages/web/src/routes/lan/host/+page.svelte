<script lang="ts">
  import { Button, Card } from '$lib/components/ui';
  import CreateRoomForm from '$lib/components/game/CreateRoomForm.svelte';
  import PlayLayout from '$lib/components/game/PlayLayout.svelte';
  import { HostRoomBridge } from '$lib/transport/host-bridge';
  import { connectAsHost, waitForDcOpen, type HostHandshake } from '$lib/transport/webrtc.svelte';
  import type { Session } from '$lib/transport/types';
  import { loadDisplayName } from '$lib/storage';
  import type { RoomConfig } from '@avalon/game-core';
  import { onDestroy, onMount } from 'svelte';

  type Stage =
    | { kind: 'configure' }
    | { kind: 'seated'; roster: string[] }
    | { kind: 'inviting'; handshake: HostHandshake; joinerName: string; answer: string; error: string | null }
    | { kind: 'playing' };

  let stage = $state<Stage>({ kind: 'configure' });
  let bridge = $state<HostRoomBridge | null>(null);
  let hostSession = $state<Session | null>(null);
  let displayName = $state('Host');
  let lastError = $state<string | null>(null);

  onMount(() => {
    displayName = loadDisplayName() || 'Host';
  });

  onDestroy(() => {
    // Closing the bridge tears down all DataChannels via dropPeer.
    // bridge currently has no explicit close; relying on tab unload is fine
    // for Phase-4 manual smoke. Future polish: add bridge.close() that
    // iterates sinks and dc.close()s each.
  });

  function onCreateConfig({ config }: { roomId: string; config: RoomConfig }) {
    const id = `lan-${Math.floor(Math.random() * 1e6).toString(36)}`;
    const b = new HostRoomBridge(id, config);
    const { session } = b.attachLocalPeer(displayName);
    bridge = b;
    hostSession = session;
    stage = { kind: 'seated', roster: [displayName] };
  }

  async function inviteNext() {
    if (!bridge) return;
    lastError = null;
    try {
      const hh = await connectAsHost('lan-only');
      stage = { kind: 'inviting', handshake: hh, joinerName: '', answer: '', error: null };
    } catch (e) {
      lastError = `Failed to generate offer: ${(e as Error).message}`;
    }
  }

  async function acceptAnswer() {
    if (stage.kind !== 'inviting' || !bridge) return;
    const { handshake, joinerName, answer } = stage;
    if (!joinerName.trim()) {
      stage = { ...stage, error: 'Enter the joiner\'s display name first.' };
      return;
    }
    const result = await handshake.acceptAnswer(answer);
    if (!result.ok) {
      stage = { ...stage, error: result.error };
      return;
    }
    const opened = await waitForDcOpen(handshake.dc, 10_000);
    if (!opened) {
      stage = {
        ...stage,
        error:
          'DataChannel did not open within 10 s. Are both devices on the same LAN with no VPN active?',
      };
      return;
    }
    bridge.attachJoinerDataChannel(handshake.dc, joinerName.trim());
    const roster =
      stage.kind === 'inviting'
        ? // After attachJoinerDataChannel, peerCount = host + joiners so far.
          [
            displayName,
            ...Array.from({ length: bridge.peerCount() - 1 }, (_, i) =>
              i === bridge!.peerCount() - 2 ? joinerName.trim() : `Joiner ${i + 2}`,
            ),
          ]
        : [displayName];
    stage = { kind: 'seated', roster };
  }

  function cancelInvite() {
    if (stage.kind !== 'inviting') return;
    try {
      stage.handshake.pc.close();
    } catch {
      /* ignore */
    }
    stage = { kind: 'seated', roster: [displayName] };
  }

  function startPlaying() {
    stage = { kind: 'playing' };
  }

  function copy(text: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
  }
</script>

<svelte:head>
  <title>LAN host — Avalon</title>
</svelte:head>

<a
  href="/"
  class="font-display inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100"
>
  ← Back
</a>

{#if stage.kind === 'configure'}
  <section class="mx-auto max-w-md py-6">
    <h1 class="font-display mb-4 text-center text-3xl font-bold tracking-wide">
      Host a LAN game
    </h1>
    <Card>
      <CreateRoomForm
        onSubmit={onCreateConfig}
        onCancel={() => history.back()}
      />
    </Card>
  </section>
{:else if stage.kind === 'seated'}
  <section class="mx-auto max-w-lg py-6 space-y-4">
    <h1 class="font-display text-3xl font-bold tracking-wide">Inviting players</h1>
    <Card>
      <p class="font-display mb-2 text-xs tracking-wider opacity-70 uppercase">Seated</p>
      <ul class="space-y-1 text-sm">
        {#each stage.roster as name (name)}
          <li class="rounded border border-ink/10 bg-parchment/60 px-3 py-1.5">{name}</li>
        {/each}
      </ul>
      <p class="mt-3 text-xs opacity-60">
        {bridge?.peerCount() ?? 0}/5–10 players seated.
      </p>
    </Card>
    {#if lastError}
      <p class="rounded border border-blood/60 bg-blood/10 p-3 text-sm text-blood">{lastError}</p>
    {/if}
    <div class="flex flex-wrap gap-2">
      <Button variant="gold" size="lg" onclick={inviteNext}>Invite next player</Button>
      <Button
        variant="primary"
        size="lg"
        disabled={(bridge?.peerCount() ?? 0) < 5}
        onclick={startPlaying}
      >
        Enter game · {bridge?.peerCount() ?? 0}/5
      </Button>
    </div>
    <p class="text-xs opacity-60">
      Tip: each invite is a one-shot offer/answer dance. Open <code class="rounded bg-parchment-deep
        px-1">/lan/join</code> on the joiner's device, paste the offer, paste the answer back.
    </p>
  </section>
{:else if stage.kind === 'inviting'}
  <section class="mx-auto max-w-2xl py-6 space-y-4">
    <h1 class="font-display text-2xl font-bold tracking-wide">Invite a player</h1>
    <Card>
      <h2 class="font-display mb-2 text-xs tracking-wider opacity-70 uppercase">
        1 · Send this offer to the joiner
      </h2>
      <textarea
        class="block h-32 w-full rounded-md border border-ink/30 bg-parchment/80 p-2 font-mono text-xs"
        readonly
        value={stage.handshake.offerBlob}
      ></textarea>
      <Button class="mt-2" size="sm" variant="outline" onclick={() => copy(stage.kind === 'inviting' ? stage.handshake.offerBlob : '')}>
        Copy offer
      </Button>
    </Card>
    <Card>
      <h2 class="font-display mb-2 text-xs tracking-wider opacity-70 uppercase">
        2 · Paste the joiner's answer
      </h2>
      <label class="block mb-2 text-xs">
        <span class="font-display block tracking-wider opacity-70 uppercase">Joiner display name</span>
        <input
          type="text"
          maxlength="24"
          required
          class="mt-1 w-full rounded-md border border-ink/30 bg-parchment/80 px-2 py-1.5 text-sm"
          value={stage.joinerName}
          oninput={(e) => {
            if (stage.kind === 'inviting') {
              stage = { ...stage, joinerName: (e.target as HTMLInputElement).value };
            }
          }}
        />
      </label>
      <textarea
        class="block h-32 w-full rounded-md border border-ink/30 bg-parchment/80 p-2 font-mono text-xs"
        placeholder={'{"type":"answer","sdp":"..."}'}
        value={stage.answer}
        oninput={(e) => {
          if (stage.kind === 'inviting') {
            stage = { ...stage, answer: (e.target as HTMLTextAreaElement).value };
          }
        }}
      ></textarea>
      {#if stage.error}
        <p class="mt-2 rounded border border-blood/60 bg-blood/10 p-2 text-xs text-blood">
          {stage.error}
        </p>
      {/if}
      <div class="mt-3 flex gap-2">
        <Button variant="gold" onclick={acceptAnswer}>Accept answer</Button>
        <Button variant="outline" onclick={cancelInvite}>Cancel</Button>
      </div>
    </Card>
  </section>
{:else if stage.kind === 'playing' && hostSession}
  <PlayLayout
    session={hostSession}
    {displayName}
    roomLabel="LAN host"
    leaveHref="/"
  />
{/if}
