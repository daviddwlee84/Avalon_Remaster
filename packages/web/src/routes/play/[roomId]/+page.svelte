<script lang="ts">
  import { page } from '$app/state';
  import { GameStore } from '$lib/game-store.svelte';
  import { loadDisplayName } from '$lib/storage';
  import { WsSession, buildRoomWsUrl } from '$lib/transport/ws.svelte';
  import { onDestroy, onMount } from 'svelte';

  const roomId = page.params.roomId ?? 'main';

  let session = $state<WsSession | null>(null);
  let store = $state<GameStore | null>(null);
  let selectedTeam = $state<string[]>([]);
  let chatInput = $state('');
  let displayName = $state('Player');

  onMount(() => {
    displayName = loadDisplayName() || 'Player';
    const s = new WsSession(buildRoomWsUrl(roomId, displayName));
    session = s;
    store = new GameStore(s);
  });

  onDestroy(() => {
    store?.dispose();
    session?.close();
  });

  // Convenience derived state.
  const view = $derived(store?.view ?? null);
  const myPlayerId = $derived(store?.myPlayerId ?? null);
  const isHost = $derived(view !== null && myPlayerId !== null && view.hostPlayerId === myPlayerId);
  const me = $derived(view?.players.find((p) => p.id === myPlayerId) ?? null);
  const captain = $derived(view?.players.find((p) => p.isCaptain) ?? null);
  const iAmCaptain = $derived(captain?.id === myPlayerId);
  const iAmOnTeam = $derived(me?.isOnProposedTeam ?? false);

  function toggleTeamMember(pid: string) {
    if (selectedTeam.includes(pid)) {
      selectedTeam = selectedTeam.filter((x) => x !== pid);
    } else if (view && selectedTeam.length < view.teamSizeRequired) {
      selectedTeam = [...selectedTeam, pid];
    }
  }

  function proposeTeam() {
    if (!view || !session) return;
    if (selectedTeam.length !== view.teamSizeRequired) return;
    session.send({ type: 'ProposeTeam', playerIds: selectedTeam });
    selectedTeam = [];
  }

  function voteTeam(approve: boolean) {
    session?.send({ type: 'VoteTeam', approve });
  }

  function voteQuest(success: boolean) {
    session?.send({ type: 'VoteQuest', success });
  }

  function startGame() {
    session?.send({ type: 'StartGame' });
  }

  function sendChat(e: Event) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !session) return;
    session.send({ type: 'Chat', text });
    chatInput = '';
  }

  function nominateAssassin(targetId: string) {
    session?.send({ type: 'NominateAssassinTarget', targetPlayerId: targetId });
  }

  function winLabel(w: string | undefined, reason: string | undefined): string {
    if (!w) return '';
    const who = w === 'good' ? 'Good wins' : 'Evil wins';
    const why = reason
      ?.replaceAll('_', ' ')
      .replace('three quests good', 'three quests succeeded')
      .replace('three quests evil', 'three quests failed')
      .replace('five rejections', 'five team rejections')
      .replace('assassin hit merlin', 'Assassin found Merlin')
      .replace('assassin missed', 'Assassin missed Merlin');
    return `${who} — ${why}`;
  }
</script>

<svelte:head>
  <title>Room {roomId} — Avalon</title>
</svelte:head>

<a href="/" class="text-sm underline">← Leave</a>

{#if !view}
  <p class="mt-6 opacity-70">Connecting to room <strong>{roomId}</strong>…</p>
  <p class="mt-2 text-xs opacity-60">Connection: {session?.connState ?? 'init'}</p>
{:else}
  <div class="mt-2 mb-4 flex items-baseline justify-between">
    <h1 class="text-2xl font-bold">Room {view.roomId}</h1>
    <span class="text-xs opacity-60">
      You: {displayName} ({me?.id.slice(0, 6)}) — phase: <strong>{view.phase}</strong>
    </span>
  </div>

  <!-- Players list -->
  <ul class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
    {#each view.players as p (p.id)}
      {@const align = view.knownAlignments[p.id]}
      <li
        class="rounded border px-2 py-1 text-sm"
        class:border-blood={align === 'evil'}
        class:border-gold={align === 'merlin-like'}
        class:border-black={!align}
        class:opacity-50={!p.connected}
        class:bg-yellow-100={p.isCaptain}
      >
        <div class="font-medium">
          {p.displayName}
          {#if p.id === myPlayerId}<span class="text-xs opacity-60">(you)</span>{/if}
        </div>
        <div class="text-xs opacity-70">
          {#if p.isCaptain}👑 Captain{/if}
          {#if p.isOnProposedTeam}🛡 On team{/if}
          {#if p.isLadyOfTheLakeHolder}🌊 Lady{/if}
          {#if align}— knownAs: {align}{/if}
        </div>
      </li>
    {/each}
  </ul>

  <!-- Quest history strip -->
  <div class="mb-4">
    <div class="text-xs opacity-60">Quest history</div>
    <div class="flex gap-1">
      {#each Array(5) as _, i (i)}
        {@const q = view.questHistory[i]}
        <div
          class="flex h-10 w-10 items-center justify-center rounded border text-xs"
          class:bg-green-200={q?.outcome === 'success'}
          class:bg-red-200={q?.outcome === 'fail'}
          class:bg-white={!q}
        >
          {#if q}
            {q.outcome === 'success' ? '✓' : '✗'}
            {#if q.questVoteCounts.fails > 0}
              <span class="ml-0.5 text-[10px]">{q.questVoteCounts.fails}f</span>
            {/if}
          {:else}
            R{i + 1}
          {/if}
        </div>
      {/each}
    </div>
    <div class="mt-1 text-xs opacity-60">
      Round {view.currentRound} · team size: {view.teamSizeRequired || '-'} ·
      rejections: {view.consecutiveRejections}/5
      {#if view.twoFailsRequired}· <span class="text-blood font-medium">2 fails to fail</span>{/if}
    </div>
  </div>

  <!-- Phase-specific UI -->
  <section class="mb-4 rounded-lg border border-black/10 bg-white/40 p-4">
    {#if view.phase === 'lobby'}
      <h2 class="mb-2 text-lg font-bold">Lobby</h2>
      <p class="text-sm opacity-70">
        {view.players.length} player{view.players.length === 1 ? '' : 's'} waiting.
        {#if isHost}You are the host.{/if}
      </p>
      {#if isHost}
        <button
          class="mt-2 rounded bg-black px-4 py-2 text-white disabled:opacity-30"
          disabled={view.players.length < 5}
          onclick={startGame}
        >
          Start game ({view.players.length}/5+)
        </button>
      {:else}
        <p class="mt-2 text-sm opacity-60">Waiting for host to start…</p>
      {/if}
    {:else if view.phase === 'team_selection'}
      <h2 class="mb-2 text-lg font-bold">Captain selects team</h2>
      {#if iAmCaptain}
        <p class="text-sm opacity-70">
          Pick exactly {view.teamSizeRequired} players. Selected: {selectedTeam.length}/{view.teamSizeRequired}
        </p>
        <div class="my-2 flex flex-wrap gap-1">
          {#each view.players as p (p.id)}
            <button
              class="rounded border px-2 py-1 text-sm"
              class:bg-black={selectedTeam.includes(p.id)}
              class:text-white={selectedTeam.includes(p.id)}
              onclick={() => toggleTeamMember(p.id)}
            >
              {p.displayName}
            </button>
          {/each}
        </div>
        <button
          class="rounded bg-black px-4 py-2 text-white disabled:opacity-30"
          disabled={selectedTeam.length !== view.teamSizeRequired}
          onclick={proposeTeam}
        >
          Propose team
        </button>
      {:else}
        <p class="text-sm opacity-70">
          Waiting for captain <strong>{captain?.displayName}</strong> to pick a team of {view.teamSizeRequired}…
        </p>
      {/if}
    {:else if view.phase === 'team_vote'}
      <h2 class="mb-2 text-lg font-bold">Vote on team</h2>
      <p class="mb-2 text-sm">
        Proposed: {view.proposedTeam
          .map((id) => view.players.find((p) => p.id === id)?.displayName ?? id.slice(0, 6))
          .join(', ')}
      </p>
      {#if view.myPendingApproveVote === null}
        <div class="flex gap-2">
          <button class="rounded bg-green-700 px-4 py-2 text-white" onclick={() => voteTeam(true)}>
            Approve
          </button>
          <button class="rounded bg-red-700 px-4 py-2 text-white" onclick={() => voteTeam(false)}>
            Reject
          </button>
        </div>
      {:else}
        <p class="text-sm opacity-70">
          You voted: <strong>{view.myPendingApproveVote ? 'Approve' : 'Reject'}</strong>. Waiting for others…
        </p>
      {/if}
      <div class="mt-2 text-xs opacity-60">
        Votes in: {Object.values(view.approveVoteSubmitted).filter(Boolean).length}/{view.players.length}
      </div>
    {:else if view.phase === 'quest'}
      <h2 class="mb-2 text-lg font-bold">Quest</h2>
      {#if iAmOnTeam}
        {#if view.myPendingQuestVote === null}
          <p class="text-sm">You are on this quest. Vote secretly:</p>
          <div class="mt-2 flex gap-2">
            <button
              class="rounded bg-green-700 px-4 py-2 text-white"
              onclick={() => voteQuest(true)}
            >
              Success
            </button>
            {#if me?.id && view.myRole && (view.myRole === 'Assassin' || view.myRole === 'Morgana' || view.myRole === 'Mordred' || view.myRole === 'Oberon' || view.myRole === 'Minion')}
              <button
                class="rounded bg-red-700 px-4 py-2 text-white"
                onclick={() => voteQuest(false)}
              >
                Fail
              </button>
            {/if}
          </div>
        {:else}
          <p class="text-sm opacity-70">
            You voted: <strong>{view.myPendingQuestVote}</strong>. Waiting for the rest of the team…
          </p>
        {/if}
      {:else}
        <p class="text-sm opacity-70">
          Quest team is voting. Submitted: {Object.values(view.questVoteSubmitted).filter(Boolean)
            .length}/{view.proposedTeam.length}
        </p>
      {/if}
    {:else if view.phase === 'assassination'}
      <h2 class="mb-2 text-lg font-bold">Assassination</h2>
      {#if view.myRole === 'Assassin'}
        <p class="text-sm">Good won 3 quests. Choose a target to assassinate. Hit Merlin → evil wins.</p>
        <div class="mt-2 flex flex-wrap gap-1">
          {#each view.players.filter((p) => p.id !== myPlayerId) as p (p.id)}
            <button
              class="rounded border border-black/20 bg-white px-2 py-1 text-sm hover:bg-black hover:text-white"
              onclick={() => nominateAssassin(p.id)}
            >
              {p.displayName}
            </button>
          {/each}
        </div>
      {:else}
        <p class="text-sm opacity-70">Waiting for the Assassin to pick their target…</p>
      {/if}
    {:else if view.phase === 'finished'}
      <h2 class="mb-2 text-lg font-bold">Game over</h2>
      <p
        class="text-xl font-bold"
        class:text-good={view.winner === 'good'}
        class:text-blood={view.winner === 'evil'}
      >
        {winLabel(view.winner, view.winReason)}
      </p>
      <a href="/" class="mt-2 inline-block underline">Back to home</a>
    {:else if view.phase === 'role_reveal'}
      <p class="text-sm opacity-70">Roles dealt…</p>
    {:else if view.phase === 'lady_of_lake'}
      <p class="text-sm opacity-70">Lady of the Lake — coming in Phase 3.</p>
    {/if}
  </section>

  <!-- Chat -->
  <section class="rounded-lg border border-black/10 bg-white/40 p-4">
    <h2 class="mb-2 text-sm font-bold">Chat</h2>
    <ul class="mb-2 max-h-40 space-y-1 overflow-y-auto text-sm">
      {#each store?.chat ?? [] as line (line.tsMs + ':' + line.fromPlayerId)}
        <li>
          <strong>{line.fromDisplayName}:</strong>
          {line.text}
        </li>
      {/each}
    </ul>
    <form class="flex gap-2" onsubmit={sendChat}>
      <input
        class="flex-1 rounded border border-black/20 bg-white px-2 py-1 text-sm"
        bind:value={chatInput}
        maxlength="256"
        placeholder="Type a message…"
      />
      <button type="submit" class="rounded bg-black px-3 py-1 text-sm text-white">Send</button>
    </form>
  </section>

  <!-- Role reveal modal -->
  {#if store?.showRoleReveal && view.myRole}
    <div
      class="fixed inset-0 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
    >
      <div class="max-w-sm rounded-lg bg-white p-6 text-center">
        <p class="text-sm opacity-60">Your role</p>
        <h2 class="my-2 text-3xl font-bold">{view.myRole}</h2>
        {#if Object.keys(view.knownAlignments).length > 0}
          <p class="text-sm">You see:</p>
          <ul class="text-sm">
            {#each Object.entries(view.knownAlignments) as [pid, what] (pid)}
              <li>
                <strong>{view.players.find((p) => p.id === pid)?.displayName}</strong>
                — {what}
              </li>
            {/each}
          </ul>
        {/if}
        <button
          class="mt-4 rounded bg-black px-4 py-2 text-white"
          onclick={() => store?.dismissRoleReveal()}
        >
          Got it
        </button>
      </div>
    </div>
  {/if}

  <!-- Toasts -->
  <div class="fixed right-4 bottom-4 space-y-2">
    {#each store?.toasts ?? [] as t (t.id)}
      <div
        class="rounded px-3 py-2 text-sm shadow-lg"
        class:bg-red-700={t.kind === 'error'}
        class:bg-black={t.kind === 'info'}
        class:text-white={true}
      >
        {t.text}
      </div>
    {/each}
  </div>
{/if}
