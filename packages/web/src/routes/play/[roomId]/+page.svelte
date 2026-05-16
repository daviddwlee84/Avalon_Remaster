<script lang="ts">
  import { page } from '$app/state';
  import { Button, Card, Dialog, DialogContent } from '$lib/components/ui';
  import PlayerTile from '$lib/components/game/PlayerTile.svelte';
  import QuestTokenStrip from '$lib/components/game/QuestTokenStrip.svelte';
  import RoleCardReveal from '$lib/components/game/RoleCardReveal.svelte';
  import VoteRevealStrip from '$lib/components/game/VoteRevealStrip.svelte';
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
  let chatOpen = $state(false);

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

  // Quest team sizes table — for QuestTokenStrip header. Source: rules.ts:13-20.
  const TEAM_SIZES: Record<number, readonly number[]> = {
    5: [2, 3, 2, 3, 3],
    6: [2, 3, 4, 3, 4],
    7: [2, 3, 3, 4, 4],
    8: [3, 4, 4, 5, 5],
    9: [3, 4, 4, 5, 5],
    10: [3, 4, 4, 5, 5],
  };
  const teamSizes = $derived(
    view ? (TEAM_SIZES[view.players.length] ?? [0, 0, 0, 0, 0]) : [0, 0, 0, 0, 0],
  );

  // Captain-only: cap team picks to the requested size, but don't show selection UI for non-captains.
  function toggleTeamMember(pid: string) {
    if (!view) return;
    if (selectedTeam.includes(pid)) {
      selectedTeam = selectedTeam.filter((x) => x !== pid);
    } else if (selectedTeam.length < view.teamSizeRequired) {
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

  // Evil roles (the only ones allowed to vote fail). Mirrors play-page Phase-1 logic.
  const EVIL_ROLES = new Set(['Assassin', 'Morgana', 'Mordred', 'Oberon', 'Minion']);
  const iCanFailQuest = $derived(!!view?.myRole && EVIL_ROLES.has(view.myRole));
</script>

<svelte:head>
  <title>Room {roomId} — Avalon</title>
</svelte:head>

<a href="/" class="font-display inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100"
  >← Leave</a
>

{#if !view}
  <div class="mt-12 text-center">
    <p class="font-display text-lg tracking-wide opacity-80">
      Connecting to room <strong>{roomId}</strong>…
    </p>
    <p class="mt-2 text-xs opacity-60">Connection: {session?.connState ?? 'init'}</p>
  </div>
{:else}
  <header class="mt-3 mb-4 flex items-baseline justify-between gap-3">
    <h1 class="font-display text-3xl font-bold tracking-wide sm:text-4xl">
      Room <span class="text-gold">{view.roomId}</span>
    </h1>
    <span class="text-right text-xs opacity-60">
      <span class="block sm:inline">You: {displayName}</span>
      <span class="hidden sm:inline"> · </span>
      <span class="block sm:inline">
        Phase: <strong class="font-display tracking-wider uppercase">{view.phase}</strong>
      </span>
    </span>
  </header>

  <div class="grid gap-4 lg:grid-cols-[1fr_minmax(0,360px)]">
    <!-- ───────────── Main column ───────────── -->
    <div class="space-y-4">
      <!-- Players -->
      <Card class="!p-3">
        <h2
          class="font-display mb-3 text-sm tracking-[0.2em] opacity-70 uppercase"
          data-testid="players-heading"
        >
          Players · {view.players.length}/10
        </h2>
        <ul class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {#each view.players as p (p.id)}
            <li>
              <PlayerTile
                player={p}
                isMe={p.id === myPlayerId}
                alignment={view.knownAlignments[p.id]}
              />
            </li>
          {/each}
        </ul>
      </Card>

      <!-- Phase panel -->
      <Card class="border-gold/30 bg-parchment-deep/30">
        {#if view.phase === 'lobby'}
          <h2 class="font-display mb-2 text-xl font-bold">Lobby</h2>
          <p class="text-sm opacity-70">
            {view.players.length} player{view.players.length === 1 ? '' : 's'} seated.
            {#if isHost}<span class="font-display text-gold">You are the host.</span>{/if}
          </p>
          {#if isHost}
            <div class="mt-3">
              <Button
                variant="gold"
                size="lg"
                disabled={view.players.length < 5}
                onclick={startGame}
              >
                Start game · {view.players.length}/5
              </Button>
            </div>
          {:else}
            <p class="mt-2 text-sm opacity-60">Waiting for host to start…</p>
          {/if}
        {:else if view.phase === 'team_selection'}
          <h2 class="font-display mb-2 text-xl font-bold">
            Captain {captain?.displayName} proposes
          </h2>
          {#if iAmCaptain}
            <p class="text-sm opacity-70">
              Pick exactly {view.teamSizeRequired} players. Selected: <span class="font-medium"
                >{selectedTeam.length}/{view.teamSizeRequired}</span
              >
            </p>
            <ul class="my-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {#each view.players as p (p.id)}
                <li>
                  <PlayerTile
                    player={p}
                    isMe={p.id === myPlayerId}
                    alignment={view.knownAlignments[p.id]}
                    selectable
                    selected={selectedTeam.includes(p.id)}
                    onClick={() => toggleTeamMember(p.id)}
                  />
                </li>
              {/each}
            </ul>
            <Button
              variant="gold"
              size="lg"
              disabled={selectedTeam.length !== view.teamSizeRequired}
              onclick={proposeTeam}
            >
              Propose team
            </Button>
          {:else}
            <p class="text-sm opacity-70">
              Waiting for captain <strong>{captain?.displayName}</strong> to pick a team of
              {view.teamSizeRequired}…
            </p>
          {/if}
        {:else if view.phase === 'team_vote'}
          <h2 class="font-display mb-2 text-xl font-bold">Vote on the proposal</h2>
          <p class="mb-3 text-sm">
            <span class="opacity-70">Proposed team:</span>
            <strong>
              {view.proposedTeam
                .map((id) => view.players.find((p) => p.id === id)?.displayName ?? id.slice(0, 6))
                .join(', ')}
            </strong>
          </p>
          {#if view.approveVotesRevealed}
            <VoteRevealStrip votes={view.approveVotesRevealed} players={view.players} />
          {:else if view.myPendingApproveVote === null}
            <div class="flex flex-wrap gap-3">
              <Button variant="approve" size="lg" onclick={() => voteTeam(true)}>✓ Approve</Button>
              <Button variant="reject" size="lg" onclick={() => voteTeam(false)}>✗ Reject</Button>
            </div>
          {:else}
            <p class="text-sm opacity-70">
              You voted: <strong class="font-display tracking-wider uppercase"
                >{view.myPendingApproveVote ? 'Approve' : 'Reject'}</strong
              >. Waiting for others…
            </p>
          {/if}
          <p class="mt-3 text-xs opacity-60">
            Votes in: {Object.values(view.approveVoteSubmitted).filter(Boolean).length}/{view
              .players.length}
          </p>
        {:else if view.phase === 'quest'}
          <h2 class="font-display mb-2 text-xl font-bold">Quest underway</h2>
          {#if iAmOnTeam}
            {#if view.myPendingQuestVote === null}
              <p class="text-sm">You are on this quest. Vote secretly:</p>
              <div class="mt-3 flex flex-wrap gap-3">
                <Button variant="success" size="lg" onclick={() => voteQuest(true)}>
                  ✓ Success
                </Button>
                {#if iCanFailQuest}
                  <Button variant="fail" size="lg" onclick={() => voteQuest(false)}>
                    ✗ Fail
                  </Button>
                {/if}
              </div>
            {:else}
              <p class="text-sm opacity-70">
                You voted: <strong class="font-display tracking-wider uppercase"
                  >{view.myPendingQuestVote}</strong
                >. Waiting for the rest of the team…
              </p>
            {/if}
          {:else}
            <p class="text-sm opacity-70">
              Quest team is voting. Submitted: {Object.values(view.questVoteSubmitted).filter(
                Boolean,
              ).length}/{view.proposedTeam.length}
            </p>
          {/if}
        {:else if view.phase === 'assassination'}
          <h2 class="font-display mb-2 text-xl font-bold text-blood">Assassination</h2>
          {#if view.myRole === 'Assassin'}
            <p class="text-sm">
              Good has won 3 quests. Choose your target — strike Merlin and evil still wins.
            </p>
            <ul class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {#each view.players.filter((p) => p.id !== myPlayerId) as p (p.id)}
                <li>
                  <PlayerTile
                    player={p}
                    isMe={false}
                    alignment={view.knownAlignments[p.id]}
                    selectable
                    onClick={() => nominateAssassin(p.id)}
                  />
                </li>
              {/each}
            </ul>
          {:else}
            <p class="text-sm opacity-70">Waiting for the Assassin to pick their target…</p>
          {/if}
        {:else if view.phase === 'finished'}
          <h2 class="font-display mb-2 text-xl font-bold">Game over</h2>
          <p
            class="font-display text-2xl font-bold tracking-wide"
            class:text-good={view.winner === 'good'}
            class:text-blood={view.winner === 'evil'}
          >
            {winLabel(view.winner, view.winReason)}
          </p>
          <a
            href="/"
            class="font-display mt-3 inline-block text-sm tracking-wider underline uppercase opacity-70 hover:opacity-100"
            >Back to home</a
          >
        {:else if view.phase === 'role_reveal'}
          <p class="text-sm opacity-70">Roles dealt — see your card.</p>
        {:else if view.phase === 'lady_of_lake'}
          <p class="text-sm opacity-70">Lady of the Lake — coming in Phase 3.</p>
        {/if}
      </Card>
    </div>

    <!-- ───────────── Sidebar ───────────── -->
    <aside class="space-y-4">
      <Card class="!p-3">
        <h2 class="font-display mb-3 text-sm tracking-[0.2em] opacity-70 uppercase">Quests</h2>
        <QuestTokenStrip
          history={view.questHistory}
          playerCount={view.players.length}
          {teamSizes}
          currentRound={view.currentRound}
        />
        <div class="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div class="rounded-md border border-ink/10 bg-parchment/60 py-1.5">
            <div class="font-display text-lg leading-none">{view.currentRound}/5</div>
            <div class="text-[10px] tracking-wider opacity-60 uppercase">Round</div>
          </div>
          <div class="rounded-md border border-ink/10 bg-parchment/60 py-1.5">
            <div class="font-display text-lg leading-none">{view.teamSizeRequired || '–'}</div>
            <div class="text-[10px] tracking-wider opacity-60 uppercase">Team size</div>
          </div>
          <div
            class="rounded-md border border-ink/10 bg-parchment/60 py-1.5"
            class:!border-blood={view.consecutiveRejections >= 3}
          >
            <div
              class="font-display text-lg leading-none"
              class:text-blood={view.consecutiveRejections >= 3}
            >
              {view.consecutiveRejections}/5
            </div>
            <div class="text-[10px] tracking-wider opacity-60 uppercase">Rejections</div>
          </div>
        </div>
        {#if view.twoFailsRequired}
          <p class="mt-2 text-center text-xs font-medium tracking-wider text-blood uppercase">
            ⚠ 2 fails required to fail this round
          </p>
        {/if}
      </Card>

      <Card class="!p-0">
        <button
          type="button"
          class="font-display flex w-full items-baseline justify-between px-4 py-3 text-sm tracking-[0.2em] uppercase"
          onclick={() => (chatOpen = !chatOpen)}
          aria-expanded={chatOpen}
        >
          <span class="opacity-70">Chat · {store?.chat.length ?? 0}</span>
          <span class="text-xs opacity-50">{chatOpen ? '▾' : '▸'}</span>
        </button>
        {#if chatOpen}
          <div class="border-t border-ink/10 p-3">
            <ul class="mb-2 max-h-48 space-y-1 overflow-y-auto text-sm">
              {#each store?.chat ?? [] as line (line.tsMs + ':' + line.fromPlayerId)}
                <li class="leading-snug">
                  <strong class="text-gold">{line.fromDisplayName}:</strong>
                  {line.text}
                </li>
              {/each}
              {#if (store?.chat.length ?? 0) === 0}
                <li class="text-xs opacity-50">No messages yet.</li>
              {/if}
            </ul>
            <form class="flex gap-2" onsubmit={sendChat}>
              <input
                class="flex-1 rounded border border-ink/30 bg-parchment/80 px-2 py-1.5 text-sm placeholder:opacity-50 focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none"
                bind:value={chatInput}
                maxlength="256"
                placeholder="Type a message…"
              />
              <Button type="submit" size="sm">Send</Button>
            </form>
          </div>
        {/if}
      </Card>
    </aside>
  </div>

  <!-- Role-reveal Dialog -->
  {#if view.myRole}
    <Dialog
      open={store?.showRoleReveal ?? false}
      onOpenChange={(o) => {
        if (!o) store?.dismissRoleReveal();
      }}
    >
      <DialogContent>
        <RoleCardReveal
          role={view.myRole}
          knownAlignments={view.knownAlignments}
          players={view.players}
          onDismiss={() => store?.dismissRoleReveal()}
        />
      </DialogContent>
    </Dialog>
  {/if}

  <!-- Toasts -->
  <div class="fixed right-4 bottom-4 z-40 space-y-2">
    {#each store?.toasts ?? [] as t (t.id)}
      <div
        class="font-display rounded-lg border px-4 py-2 text-sm tracking-wider shadow-lg uppercase"
        class:border-blood={t.kind === 'error'}
        class:bg-blood={t.kind === 'error'}
        class:text-parchment={true}
        class:border-ink={t.kind !== 'error'}
        class:bg-ink={t.kind !== 'error'}
      >
        {t.text}
      </div>
    {/each}
  </div>
{/if}
