<script lang="ts" module>
  import { validateConfigForPlayerCount } from '@avalon/game-core';
  import type { RoomConfig } from '@avalon/game-core';

  /**
   * Smallest player count at which the chosen config is viable.
   * Used to render an inline hint under the checkboxes.
   * Returns 11 (== unsupportable) if no count in [5, 10] satisfies the config.
   */
  export function minPlayersFor(config: RoomConfig): number {
    for (let n = 5; n <= 10; n++) {
      if (validateConfigForPlayerCount(n, config).ok) return n;
    }
    return 11;
  }
</script>

<script lang="ts">
  import type { RoomCreateConfig } from '$lib/transport/ws.svelte';
  import { Button } from '$lib/components/ui';

  interface Props {
    onSubmit: (args: { roomId: string; config: RoomCreateConfig }) => void;
    onCancel: () => void;
  }

  let { onSubmit, onCancel }: Props = $props();

  let roomId = $state(randomRoomId());
  let useMordred = $state(false);
  let useMorganaPercival = $state(false);
  let useOberon = $state(false);
  let useLadyOfTheLake = $state(false);

  const config = $derived<RoomCreateConfig>({
    useMordred,
    useMorganaPercival,
    useOberon,
    useLadyOfTheLake,
  });

  const minPlayers = $derived(minPlayersFor(config));
  const usable = $derived(minPlayers <= 10);

  function submit(e: Event) {
    e.preventDefault();
    const id = roomId.trim();
    if (!id || !usable) return;
    onSubmit({ roomId: id, config });
  }

  function randomRoomId(): string {
    // 4-char-letter slug for fewer collisions than "main".
    const letters = 'abcdefghjkmnpqrstuvwxyz';
    let out = '';
    for (let i = 0; i < 4; i++) out += letters[Math.floor(Math.random() * letters.length)];
    return out;
  }
</script>

<form class="space-y-4 text-left" onsubmit={submit}>
  <h2 class="font-display text-center text-2xl font-bold tracking-wider">Create a room</h2>

  <label class="block">
    <span class="font-display mb-1 block text-xs tracking-wider opacity-70 uppercase"
      >Room name</span
    >
    <input
      type="text"
      class="w-full rounded-md border border-ink/30 bg-parchment/80 px-3 py-2 placeholder:opacity-50 focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none"
      placeholder="cliff"
      maxlength="32"
      required
      bind:value={roomId}
    />
  </label>

  <fieldset class="space-y-2">
    <legend class="font-display mb-1 text-xs tracking-wider opacity-70 uppercase">
      Special roles
    </legend>

    {#each [
      { key: 'mordred', label: 'Mordred', desc: 'Evil. Hidden from Merlin.', bind: () => useMordred, set: (v: boolean) => (useMordred = v) },
      { key: 'morgana', label: 'Morgana + Percival', desc: 'Adds Percival (good) and Morgana (evil). Percival sees both as Merlin-like.', bind: () => useMorganaPercival, set: (v: boolean) => (useMorganaPercival = v) },
      { key: 'oberon', label: 'Oberon', desc: 'Evil. Hidden from other evil. Merlin sees him.', bind: () => useOberon, set: (v: boolean) => (useOberon = v) },
    ] as opt (opt.key)}
      <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-ink/15 bg-parchment/60 p-3 transition hover:border-gold-bright">
        <input
          type="checkbox"
          class="mt-1 h-4 w-4 accent-gold"
          checked={opt.bind()}
          onchange={(e) => opt.set((e.target as HTMLInputElement).checked)}
        />
        <span class="min-w-0 flex-1">
          <span class="font-display block text-sm font-medium">{opt.label}</span>
          <span class="block text-xs opacity-70">{opt.desc}</span>
        </span>
      </label>
    {/each}

    <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-ink/15 bg-parchment/60 p-3 transition hover:border-gold-bright">
      <input
        type="checkbox"
        class="mt-1 h-4 w-4 accent-gold"
        checked={useLadyOfTheLake}
        onchange={(e) => (useLadyOfTheLake = (e.target as HTMLInputElement).checked)}
      />
      <span class="min-w-0 flex-1">
        <span class="font-display block text-sm font-medium">Lady of the Lake</span>
        <span class="block text-xs opacity-70">
          Hard-interrupt phase after rounds 2/3/4: holder learns one target's alignment privately.
          Requires 7+ players.
        </span>
      </span>
    </label>
  </fieldset>

  <p
    class="rounded-md border px-3 py-2 text-xs tracking-wider uppercase"
    class:border-blood={!usable}
    class:bg-blood={!usable}
    class:text-parchment={!usable}
    class:border-good={usable}
    class:bg-good={usable && minPlayers > 5}
    class:!text-parchment={usable}
    class:border-ink={usable && minPlayers === 5}
    class:bg-parchment-deep={usable && minPlayers === 5}
    class:!text-ink={usable && minPlayers === 5}
  >
    {#if !usable}
      This combination is impossible — too many special roles for any supported player count.
    {:else if minPlayers === 5}
      Playable from 5+ players · default settings work for any group.
    {:else}
      Needs at least {minPlayers} players to start.
    {/if}
  </p>

  <div class="flex justify-end gap-2 pt-2">
    <Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
    <Button type="submit" variant="gold" disabled={!usable}>Create &amp; join</Button>
  </div>
</form>
