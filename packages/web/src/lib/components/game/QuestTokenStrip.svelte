<script lang="ts">
  import type { QuestRecord } from '@avalon/game-core';

  interface Props {
    history: readonly QuestRecord[];
    playerCount: number;
    teamSizes: readonly number[];
    currentRound: number;
  }

  let { history, playerCount, teamSizes, currentRound }: Props = $props();
</script>

<div class="flex items-end gap-2 sm:gap-3">
  {#each Array(5) as _, i (i)}
    {@const q = history[i]}
    {@const teamSize = teamSizes[i] ?? '-'}
    {@const isCurrent = !q && i + 1 === currentRound}
    {@const isFuture = !q && i + 1 > currentRound}
    <div class="flex flex-col items-center gap-1">
      <div
        class="flip-3d relative h-14 w-14 sm:h-16 sm:w-16"
        aria-label={q
          ? `Round ${i + 1}: ${q.outcome}, ${q.questVoteCounts.fails} fails`
          : `Round ${i + 1} pending`}
      >
        {#if q}
          <img
            src={q.outcome === 'success' ? '/images/success_token.png' : '/images/fail_token.png'}
            alt={q.outcome}
            class="h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
            style="animation: var(--animate-token-reveal);"
          />
          {#if q.questVoteCounts.fails > 0}
            <span
              class="absolute -right-1 -bottom-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blood px-1 text-[10px] font-bold text-parchment shadow"
            >
              {q.questVoteCounts.fails}✗
            </span>
          {/if}
        {:else}
          <img
            src="/images/mission_token.png"
            alt="Round {i + 1} pending"
            class="h-full w-full object-contain transition-opacity"
            class:opacity-25={isFuture}
            class:opacity-60={isCurrent}
            class:animate-pulse={isCurrent}
          />
          <span
            class="font-display absolute inset-0 flex items-center justify-center text-lg font-bold text-ink/70"
          >
            {i + 1}
          </span>
        {/if}
      </div>
      <span class="text-[10px] tracking-wider opacity-60 uppercase">
        {teamSize}p
        {#if playerCount >= 7 && i + 1 === 4}
          <span class="ml-0.5 text-blood">2✗</span>
        {/if}
      </span>
    </div>
  {/each}
</div>
