<script lang="ts">
  import { Button, Card, Dialog, DialogContent } from '$lib/components/ui';
  import LadyResult from '$lib/components/game/LadyResult.svelte';
  import PlayerTile from '$lib/components/game/PlayerTile.svelte';
  import QuestTokenStrip from '$lib/components/game/QuestTokenStrip.svelte';
  import RoleCardReveal from '$lib/components/game/RoleCardReveal.svelte';
  import VoteRevealStrip from '$lib/components/game/VoteRevealStrip.svelte';
  import { GameStore } from '$lib/game-store.svelte';
  import HelpDialog from '$lib/components/help/HelpDialog.svelte';
  import { t } from '$lib/i18n/locale.svelte';
  import type { Session } from '$lib/transport/types';
  import { onDestroy, untrack } from 'svelte';

  interface Props {
    session: Session;
    displayName: string;
    /** Heading text — e.g. the room id, or "LAN host" for LAN mode. */
    roomLabel: string;
    /** URL the "Leave" link goes to. Defaults to home. */
    leaveHref?: string;
    /**
     * When set, the GameStore stashes the server's reconnect token under this
     * roomId so a refresh resumes the seat. Net-mode passes the URL roomId;
     * LAN-mode leaves it undefined (LAN session is transient, no replay).
     */
    reconnectRoomId?: string;
    /** True if the parent built the WS URL with reattach params. */
    attemptedReattach?: boolean;
    /** Parent's callback when the server tells us the reattach token is dead. */
    onStaleReattach?: () => void;
  }

  let {
    session,
    displayName,
    roomLabel,
    leaveHref = '/',
    reconnectRoomId,
    attemptedReattach = false,
    onStaleReattach,
  }: Props = $props();

  // `session` is owned by the parent route and stable for the life of this layout.
  // Reading it via untrack so Svelte doesn't warn about capturing only the initial value.
  const store = new GameStore(untrack(() => session));
  store.reconnectRoomId = untrack(() => reconnectRoomId) ?? null;
  store.attemptedReattach = untrack(() => attemptedReattach);
  store.onStaleReattach = untrack(() => onStaleReattach) ?? null;

  let selectedTeam = $state<string[]>([]);
  let chatInput = $state('');
  let chatOpen = $state(false);
  let helpOpen = $state(false);

  onDestroy(() => {
    store.dispose();
  });

  const view = $derived(store.view);
  const myPlayerId = $derived(store.myPlayerId);
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

  function toggleTeamMember(pid: string) {
    if (!view) return;
    if (selectedTeam.includes(pid)) {
      selectedTeam = selectedTeam.filter((x) => x !== pid);
    } else if (selectedTeam.length < view.teamSizeRequired) {
      selectedTeam = [...selectedTeam, pid];
    }
  }

  function proposeTeam() {
    if (!view) return;
    if (selectedTeam.length !== view.teamSizeRequired) return;
    session.transport.send({ type: 'ProposeTeam', playerIds: selectedTeam });
    selectedTeam = [];
  }

  function voteTeam(approve: boolean) {
    session.transport.send({ type: 'VoteTeam', approve });
  }

  function voteQuest(success: boolean) {
    session.transport.send({ type: 'VoteQuest', success });
  }

  function startGame() {
    session.transport.send({ type: 'StartGame' });
  }

  function sendChat(e: Event) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    session.transport.send({ type: 'Chat', text });
    chatInput = '';
  }

  function nominateAssassin(targetId: string) {
    session.transport.send({ type: 'NominateAssassinTarget', targetPlayerId: targetId });
  }

  function useLady(targetId: string) {
    session.transport.send({ type: 'UseLadyOfLake', targetPlayerId: targetId });
  }

  const ladyTargetName = $derived(
    store.ladyResult
      ? (view?.players.find((p) => p.id === store.ladyResult!.aboutPlayerId)?.displayName ?? '?')
      : '',
  );

  const ladyHolder = $derived(view?.players.find((p) => p.isLadyOfTheLakeHolder) ?? null);
  const iHoldLady = $derived(ladyHolder?.id === myPlayerId);

  function winLabel(w: string | undefined, reason: string | undefined): string {
    if (!w) return '';
    const who = t(w === 'good' ? 'play.win.good' : 'play.win.evil');
    const why = reason ? t(`play.winReason.${reason}`) : '';
    return why ? `${who} — ${why}` : who;
  }

  const EVIL_ROLES = new Set(['Assassin', 'Morgana', 'Mordred', 'Oberon', 'Minion']);
  const iCanFailQuest = $derived(!!view?.myRole && EVIL_ROLES.has(view.myRole));

  /**
   * Players whose seat is offline AND whose action the current phase needs
   * to advance. The engine already pauses transitions on missing input
   * (pendingApproveVotes / pendingQuestVotes / captain pick / Lady holder
   * pick / Assassin pick), but other players have no UI cue — they just see
   * the phase frozen. This list drives the explicit "waiting for X to
   * reconnect" banner.
   */
  const blockingDisconnects = $derived.by(() => {
    if (!view) return [] as string[];
    const offline = view.players.filter((p) => !p.connected);
    if (offline.length === 0) return [];
    const names = (ps: typeof view.players): string[] => ps.map((p) => p.displayName);
    switch (view.phase) {
      case 'team_selection':
        return names(offline.filter((p) => p.isCaptain));
      case 'team_vote':
        return names(
          offline.filter((p) => view.approveVoteSubmitted[p.id] === false),
        );
      case 'quest':
        return names(
          offline.filter(
            (p) =>
              view.proposedTeam.includes(p.id) && view.questVoteSubmitted[p.id] === false,
          ),
        );
      case 'lady_of_lake':
        return names(offline.filter((p) => p.isLadyOfTheLakeHolder));
      case 'assassination':
        // No isAssassin flag on the public view — fall back to "any offline
        // player who isn't me", since the Assassin's identity is hidden.
        return names(offline.filter((p) => p.id !== myPlayerId));
      default:
        return [];
    }
  });
</script>

<div class="flex items-baseline justify-between gap-2">
  <a
    href={leaveHref}
    class="font-display inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100"
  >
    {t('play.leave')}
  </a>
  <button
    type="button"
    class="font-display inline-flex items-center gap-1 text-xs opacity-70 hover:opacity-100"
    title={t('help.title')}
    onclick={() => (helpOpen = true)}
  >
    {t('help.button')}
  </button>
</div>

<HelpDialog open={helpOpen} onOpenChange={(o) => (helpOpen = o)} />

{#if !view}
  <div class="mt-12 text-center">
    <p class="font-display text-lg tracking-wide opacity-80">
      {t('play.connecting')} <strong>{roomLabel}</strong>…
    </p>
    <p class="mt-2 text-xs opacity-60">{t('play.connection.label')}: {session.state}</p>
  </div>
{:else}
  <header class="mt-3 mb-4 flex items-baseline justify-between gap-3" role="status" aria-live="polite">
    <h1 class="font-display text-3xl font-bold tracking-wide sm:text-4xl">
      <span class="text-gold">{view.roomId}</span>
    </h1>
    <span class="text-right text-xs opacity-60">
      <span class="block sm:inline">{t('play.you')}: {displayName}</span>
      <span class="hidden sm:inline"> · </span>
      <span class="block sm:inline">
        {t('play.phase')}:
        <strong class="font-display tracking-wider uppercase">{t(`phase.${view.phase}`)}</strong>
      </span>
    </span>
  </header>

  <div class="grid gap-4 lg:grid-cols-[1fr_minmax(0,360px)]">
    <!-- ───────────── Main column ───────────── -->
    <div class="space-y-4">
      <Card class="!p-3">
        <h2
          class="font-display mb-3 text-sm tracking-[0.2em] opacity-70 uppercase"
          data-testid="players-heading"
        >
          {t('play.players.heading')} · {view.players.length}/10
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

      {#if blockingDisconnects.length > 0}
        <div
          class="rounded-lg border-2 border-gold/70 bg-gold/15 p-3 text-center"
          role="status"
          aria-live="polite"
          data-testid="waiting-banner"
        >
          <p class="font-display text-sm font-bold tracking-wider uppercase">
            {t('disconnect.waiting.title')}
          </p>
          <p class="mt-0.5 text-xs">
            {t('disconnect.waiting.body', { names: blockingDisconnects.join(', ') })}
          </p>
        </div>
      {/if}

      <Card class="border-gold/30 bg-parchment-deep/30">
        {#if view.phase === 'lobby'}
          <h2 class="font-display mb-2 text-xl font-bold">{t('phase.lobby')}</h2>
          <p class="text-sm opacity-70">
            {t(view.players.length === 1 ? 'play.lobby.seated.one' : 'play.lobby.seated.many', {
              n: view.players.length,
            })}
            {#if isHost}<span class="font-display text-gold">{t('play.lobby.youAreHost')}</span
              >{/if}
          </p>
          {#if isHost}
            <div class="mt-3">
              <Button
                variant="gold"
                size="lg"
                disabled={view.players.length < 5}
                onclick={startGame}
              >
                {t('play.lobby.startGame')} · {view.players.length}/5
              </Button>
            </div>
          {:else}
            <p class="mt-2 text-sm opacity-60">{t('play.lobby.waiting')}</p>
          {/if}
        {:else if view.phase === 'team_selection'}
          <h2 class="font-display mb-2 text-xl font-bold">
            {t('play.team_selection.captain', { name: captain?.displayName ?? '?' })}
          </h2>
          {#if iAmCaptain}
            <p class="text-sm opacity-70">
              {t('play.team_selection.captain.instruction', { n: view.teamSizeRequired })}
              <span class="font-medium">{selectedTeam.length}/{view.teamSizeRequired}</span>
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
              {t('play.team_selection.propose')}
            </Button>
          {:else}
            <p class="text-sm opacity-70">
              {t('play.team_selection.waiting', {
                name: captain?.displayName ?? '?',
                n: view.teamSizeRequired,
              })}
            </p>
          {/if}
        {:else if view.phase === 'team_vote'}
          <h2 class="font-display mb-2 text-xl font-bold">{t('play.team_vote.heading')}</h2>
          <p class="mb-3 text-sm">
            <span class="opacity-70">{t('play.team_vote.proposedTeam')}</span>
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
              <Button variant="approve" size="lg" onclick={() => voteTeam(true)}
                >{t('play.team_vote.approve')}</Button
              >
              <Button variant="reject" size="lg" onclick={() => voteTeam(false)}
                >{t('play.team_vote.reject')}</Button
              >
            </div>
          {:else}
            <p class="text-sm opacity-70">
              {t('play.team_vote.youVoted')}
              <strong class="font-display tracking-wider uppercase"
                >{view.myPendingApproveVote
                  ? t('play.team_vote.approved')
                  : t('play.team_vote.rejected')}</strong
              >. {t('play.team_vote.waiting')}
            </p>
          {/if}
          <p class="mt-3 text-xs opacity-60">
            {t('play.team_vote.votesIn')}: {Object.values(view.approveVoteSubmitted).filter(Boolean)
              .length}/{view.players.length}
          </p>
        {:else if view.phase === 'quest'}
          <h2 class="font-display mb-2 text-xl font-bold">{t('play.quest.heading')}</h2>
          {#if view.twoFailsRequired}
            <div
              class="mb-3 rounded-lg border-2 border-blood/70 bg-blood/10 p-3 text-center"
              data-testid="two-fails-banner"
              role="alert"
            >
              <p class="font-display text-sm font-bold tracking-wider text-blood uppercase">
                {t('play.quest.twoFailsBanner.title')}
              </p>
              <p class="mt-0.5 text-xs tracking-wider uppercase">
                <strong>{t('play.quest.twoFailsBanner.boldText')}</strong>
                {t('play.quest.twoFailsBanner.body', { bold: '' }).replace('{bold}', '').trim()}
              </p>
            </div>
          {/if}
          {#if iAmOnTeam}
            {#if view.myPendingQuestVote === null}
              <p class="text-sm">{t('play.quest.youAreOnTeam')}</p>
              <div class="mt-3 flex flex-wrap gap-3">
                <Button variant="success" size="lg" onclick={() => voteQuest(true)}>
                  {t('play.quest.success')}
                </Button>
                {#if iCanFailQuest}
                  <Button variant="fail" size="lg" onclick={() => voteQuest(false)}>
                    {t('play.quest.fail')}
                  </Button>
                {/if}
              </div>
            {:else}
              <p class="text-sm opacity-70">
                {t('play.quest.youVoted')}
                <strong class="font-display tracking-wider uppercase"
                  >{view.myPendingQuestVote}</strong
                >. {t('play.quest.waiting.team')}
              </p>
            {/if}
          {:else}
            <p class="text-sm opacity-70">
              {t('play.quest.waiting.outsider')} {t('play.quest.submitted')}: {Object.values(
                view.questVoteSubmitted,
              ).filter(Boolean).length}/{view.proposedTeam.length}
            </p>
          {/if}
        {:else if view.phase === 'assassination'}
          <h2 class="font-display mb-2 text-xl font-bold text-blood">
            {t('play.assassination.heading')}
          </h2>
          {#if view.myRole === 'Assassin'}
            <p class="text-sm">{t('play.assassination.instruction')}</p>
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
            <p class="text-sm opacity-70">{t('play.assassination.waiting')}</p>
          {/if}
        {:else if view.phase === 'finished'}
          <h2 class="font-display mb-2 text-xl font-bold">{t('play.finished.heading')}</h2>
          <p
            class="font-display text-2xl font-bold tracking-wide"
            class:text-good={view.winner === 'good'}
            class:text-blood={view.winner === 'evil'}
          >
            {winLabel(view.winner, view.winReason)}
          </p>
          <a
            href={leaveHref}
            class="font-display mt-3 inline-block text-sm tracking-wider underline uppercase opacity-70 hover:opacity-100"
            >{t('play.back')}</a
          >
        {:else if view.phase === 'role_reveal'}
          <p class="text-sm opacity-70">{t('phase.role_reveal')}…</p>
        {:else if view.phase === 'lady_of_lake'}
          <h2 class="font-display mb-2 text-xl font-bold">{t('play.lady.heading')}</h2>
          {#if iHoldLady}
            <p class="text-sm">{t('play.lady.instruction')}</p>
            <ul class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {#each view.players.filter((p) => p.id !== myPlayerId && !view.ladyOfTheLakeUsedOn.includes(p.id)) as p (p.id)}
                <li>
                  <PlayerTile
                    player={p}
                    isMe={false}
                    alignment={view.knownAlignments[p.id]}
                    selectable
                    onClick={() => useLady(p.id)}
                  />
                </li>
              {/each}
            </ul>
            {#if view.ladyOfTheLakeUsedOn.length > 0}
              <p class="mt-3 text-xs opacity-60">
                {t('play.lady.alreadyInspected')}
                {view.ladyOfTheLakeUsedOn
                  .map((id) => view.players.find((p) => p.id === id)?.displayName ?? id.slice(0, 6))
                  .join(', ')}
              </p>
            {/if}
          {:else}
            <p class="text-sm opacity-70">
              {t('play.lady.waiting', { name: ladyHolder?.displayName ?? '—' })}
            </p>
          {/if}
        {/if}
      </Card>
    </div>

    <!-- ───────────── Sidebar ───────────── -->
    <aside class="space-y-4">
      <Card class="!p-3">
        <h2 class="font-display mb-3 text-sm tracking-[0.2em] opacity-70 uppercase">
          {t('sidebar.quests')}
        </h2>
        <QuestTokenStrip
          history={view.questHistory}
          playerCount={view.players.length}
          {teamSizes}
          currentRound={view.currentRound}
        />
        <div class="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div class="rounded-md border border-ink/10 bg-parchment/60 py-1.5">
            <div class="font-display text-lg leading-none">{view.currentRound}/5</div>
            <div class="text-[10px] tracking-wider opacity-60 uppercase">{t('sidebar.round')}</div>
          </div>
          <div class="rounded-md border border-ink/10 bg-parchment/60 py-1.5">
            <div class="font-display text-lg leading-none">{view.teamSizeRequired || '–'}</div>
            <div class="text-[10px] tracking-wider opacity-60 uppercase">
              {t('sidebar.teamSize')}
            </div>
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
            <div class="text-[10px] tracking-wider opacity-60 uppercase">
              {t('sidebar.rejections')}
            </div>
          </div>
        </div>
        {#if view.twoFailsRequired}
          <p class="mt-2 text-center text-xs font-medium tracking-wider text-blood uppercase">
            {t('play.quest.twoFailsBadge')}
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
          <span class="opacity-70">{t('sidebar.chat.label')} · {store.chat.length}</span>
          <span class="text-xs opacity-50">{chatOpen ? '▾' : '▸'}</span>
        </button>
        {#if chatOpen}
          <div class="border-t border-ink/10 p-3">
            <ul
              class="mb-2 max-h-48 space-y-1 overflow-y-auto text-sm"
              aria-live="polite"
              aria-atomic="false"
            >
              {#each store.chat as line (line.tsMs + ':' + line.fromPlayerId)}
                <li class="leading-snug">
                  <strong class="text-gold">{line.fromDisplayName}:</strong>
                  {line.text}
                </li>
              {/each}
              {#if store.chat.length === 0}
                <li class="text-xs opacity-50">{t('sidebar.chat.empty')}</li>
              {/if}
            </ul>
            <form class="flex gap-2" onsubmit={sendChat}>
              <input
                class="flex-1 rounded border border-ink/30 bg-parchment/80 px-2 py-1.5 text-sm placeholder:opacity-50 focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none"
                bind:value={chatInput}
                maxlength="256"
                placeholder={t('sidebar.chat.placeholder')}
              />
              <Button type="submit" size="sm">{t('sidebar.chat.send')}</Button>
            </form>
          </div>
        {/if}
      </Card>
    </aside>
  </div>

  <!-- Role-reveal Dialog -->
  {#if view.myRole}
    <Dialog
      open={store.showRoleReveal}
      onOpenChange={(o) => {
        if (!o) store.dismissRoleReveal();
      }}
    >
      <DialogContent>
        <RoleCardReveal
          role={view.myRole}
          knownAlignments={view.knownAlignments}
          players={view.players}
          onDismiss={() => store.dismissRoleReveal()}
        />
      </DialogContent>
    </Dialog>
  {/if}

  <!-- Lady of the Lake private reveal -->
  {#if store.ladyResult}
    <Dialog
      open={true}
      onOpenChange={(o) => {
        if (!o) store.dismissLadyResult();
      }}
    >
      <DialogContent>
        <LadyResult
          targetName={ladyTargetName}
          alignment={store.ladyResult.alignment}
          onDismiss={() => store.dismissLadyResult()}
        />
      </DialogContent>
    </Dialog>
  {/if}

  <!-- Toasts -->
  <div class="fixed right-4 bottom-4 z-40 space-y-2" aria-live="polite" role="status">
    {#each store.toasts as toast (toast.id)}
      <div
        class="font-display rounded-lg border px-4 py-2 text-sm tracking-wider shadow-lg uppercase"
        class:border-blood={toast.kind === 'error'}
        class:bg-blood={toast.kind === 'error'}
        class:text-parchment={true}
        class:border-ink={toast.kind !== 'error'}
        class:bg-ink={toast.kind !== 'error'}
      >
        {toast.text}
      </div>
    {/each}
  </div>
{/if}
