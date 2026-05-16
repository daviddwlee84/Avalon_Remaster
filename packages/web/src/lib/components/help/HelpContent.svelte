<script lang="ts">
  import { base } from '$app/paths';
  import { Card } from '$lib/components/ui';
  import { t } from '$lib/i18n/locale.svelte';
  import type { Snippet } from 'svelte';

  // 5-10 player × 5-round quest team sizes. Source of truth lives in
  // packages/game-core/src/rules.ts:13-20 (QUEST_TEAM_SIZES) — duplicated
  // here for display only; if rules change, update both.
  const TEAM_SIZES: Array<{ count: number; sizes: number[] }> = [
    { count: 5, sizes: [2, 3, 2, 3, 3] },
    { count: 6, sizes: [2, 3, 4, 3, 4] },
    { count: 7, sizes: [2, 3, 3, 4, 4] },
    { count: 8, sizes: [3, 4, 4, 5, 5] },
    { count: 9, sizes: [3, 4, 4, 5, 5] },
    { count: 10, sizes: [3, 4, 4, 5, 5] },
  ];

  const GOOD_ROLES = [
    { id: 'Merlin', img: 'merlin.jpg', tipKey: 'help.role.merlin' },
    { id: 'Percival', img: 'percival.jpg', tipKey: 'help.role.percival' },
    { id: 'LoyalServant', img: 'loyal-servant.jpg', tipKey: 'help.role.loyalServant' },
  ] as const;

  const EVIL_ROLES = [
    { id: 'Assassin', img: 'assassin.jpg', tipKey: 'help.role.assassin' },
    { id: 'Morgana', img: 'morgana.jpg', tipKey: 'help.role.morgana' },
    { id: 'Mordred', img: 'mordred.jpg', tipKey: 'help.role.mordred' },
    { id: 'Oberon', img: 'oberon.jpg', tipKey: 'help.role.oberon' },
    { id: 'Minion', img: 'minion.jpg', tipKey: 'help.role.minion' },
  ] as const;

  let openSection = $state<string | null>('overview');

  function toggle(id: string) {
    openSection = openSection === id ? null : id;
  }
</script>

{#snippet section(id: string, titleKey: string, content: Snippet)}
  <Card class="!p-0">
    <button
      type="button"
      class="font-display flex w-full items-baseline justify-between px-4 py-3 text-left text-base font-medium tracking-wide"
      onclick={() => toggle(id)}
      aria-expanded={openSection === id}
    >
      <span>{t(titleKey)}</span>
      <span class="text-xs opacity-50">{openSection === id ? '▾' : '▸'}</span>
    </button>
    {#if openSection === id}
      <div class="border-t border-ink/10 px-4 py-3 text-sm leading-relaxed">
        {@render content()}
      </div>
    {/if}
  </Card>
{/snippet}

{#snippet overview()}
  <p class="whitespace-pre-line">{t('help.overview.body')}</p>
  <div class="mt-3 grid gap-2 sm:grid-cols-2">
    <div class="rounded-md border border-good/40 bg-good/10 p-3">
      <p class="font-display text-xs font-bold tracking-wider text-good uppercase">
        {t('help.win.good.title')}
      </p>
      <p class="mt-1 text-xs">{t('help.win.good.body')}</p>
    </div>
    <div class="rounded-md border border-blood/40 bg-blood/10 p-3">
      <p class="font-display text-xs font-bold tracking-wider text-blood uppercase">
        {t('help.win.evil.title')}
      </p>
      <p class="mt-1 text-xs">{t('help.win.evil.body')}</p>
    </div>
  </div>
{/snippet}

{#snippet roles()}
  <p class="font-display mb-2 text-xs tracking-wider opacity-70 uppercase">
    {t('help.roles.good')}
  </p>
  <ul class="space-y-2">
    {#each GOOD_ROLES as r (r.id)}
      <li class="flex gap-3 rounded-md border border-gold/30 bg-parchment-deep/30 p-2">
        <img
          src="{base}/images/{r.img}"
          alt={t(`role.name.${r.id}`)}
          class="h-16 w-12 shrink-0 rounded border border-gold/40 object-cover"
          loading="lazy"
        />
        <div class="min-w-0">
          <p class="font-display text-sm font-medium">{t(`role.name.${r.id}`)}</p>
          <p class="mt-0.5 text-xs opacity-80">{t(r.tipKey)}</p>
        </div>
      </li>
    {/each}
  </ul>
  <p class="font-display mt-4 mb-2 text-xs tracking-wider opacity-70 uppercase">
    {t('help.roles.evil')}
  </p>
  <ul class="space-y-2">
    {#each EVIL_ROLES as r (r.id)}
      <li class="flex gap-3 rounded-md border border-blood/40 bg-blood/10 p-2">
        <img
          src="{base}/images/{r.img}"
          alt={t(`role.name.${r.id}`)}
          class="h-16 w-12 shrink-0 rounded border border-blood/60 object-cover"
          loading="lazy"
        />
        <div class="min-w-0">
          <p class="font-display text-sm font-medium">{t(`role.name.${r.id}`)}</p>
          <p class="mt-0.5 text-xs opacity-80">{t(r.tipKey)}</p>
        </div>
      </li>
    {/each}
  </ul>
{/snippet}

{#snippet teamSizes()}
  <div class="overflow-x-auto">
    <table class="w-full text-xs">
      <thead>
        <tr class="border-b border-ink/30">
          <th class="font-display py-1 pr-2 text-left tracking-wider opacity-70 uppercase">
            {t('home.lan.section').replace('LAN 模式', '人數').replace('LAN mode', 'Players')}
          </th>
          {#each [1, 2, 3, 4, 5] as r (r)}
            <th class="font-display py-1 text-center tracking-wider opacity-70 uppercase">
              R{r}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each TEAM_SIZES as row (row.count)}
          <tr class="border-b border-ink/10">
            <td class="py-1 pr-2 font-medium">{row.count}p</td>
            {#each row.sizes as size, i (i)}
              {@const r4special = row.count >= 7 && i === 3}
              <td
                class="py-1 text-center"
                class:bg-blood={r4special}
                class:!text-parchment={r4special}
                class:font-bold={r4special}
              >
                {size}{#if r4special} <sup>⚠</sup>{/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="mt-2 text-xs opacity-70">{t('help.teamSizes.note')}</p>
{/snippet}

{#snippet flow()}
  <p class="whitespace-pre-line">{t('help.flow.body')}</p>
{/snippet}

{#snippet lady()}
  <p>{t('help.lady.body')}</p>
{/snippet}

{#snippet tips()}
  <p class="whitespace-pre-line">{t('help.tips.body')}</p>
{/snippet}

<div class="space-y-3">
  {@render section('overview', 'help.overview.title', overview)}
  {@render section('roles', 'help.roles.title', roles)}
  {@render section('team-sizes', 'help.teamSizes.title', teamSizes)}
  {@render section('flow', 'help.flow.title', flow)}
  {@render section('lady', 'help.lady.title', lady)}
  {@render section('tips', 'help.tips.title', tips)}
</div>
