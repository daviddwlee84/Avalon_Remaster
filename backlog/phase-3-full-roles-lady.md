# Phase 3: full role set + Lady of the Lake

**Status**: P1
**Effort**: L (~1 week)
**Related**: `packages/game-core/src/rules.ts` · `packages/game-core/src/view.ts` · `packages/game-core/src/room.ts`

## Context

Phase 1 ships only the default-distribution roles (Merlin + N Loyal + Assassin + M Minion). The engine already supports the full 8-role set via `RoomConfig` toggles (`useMordred`, `useMorganaPercival`, `useOberon`, `useLadyOfTheLake`) and `rolePool()` applies the swaps correctly. **What's missing is the UI surface to configure rooms and the in-game Lady-of-the-Lake interaction.**

## Investigation — what already works

- `rules.ts` already implements:
  - Special-role swaps in `rolePool(playerCount, config)` (Mordred / Morgana+Percival / Oberon each consume one Minion slot).
  - `ladyOfTheLakeActiveThisRound(playerCount, round, config)` returns true for 7+ players in rounds 2/3/4 (so it triggers between rounds 2→3, 3→4, 4→5).
  - `twoFailsRequired(playerCount, round)` returns true for 7+ players in round 4.
- `view.ts` `computeKnownAlignments()` already handles:
  - Merlin sees evil except Mordred.
  - Percival sees Merlin + Morgana as `'merlin-like'`.
  - Evil (except Oberon) see each other (except Oberon).
- `room.ts` has `handleUseLadyOfLake()` wired and emits `ladyOfTheLakeLearned` privately to the holder via the projection's optional opts.
- Vitest covers all of the above (see `view.test.ts` and the `view-leak.property.test.ts` proptest sweeps these combos).

## What's actually needed

1. **Create Room dialog with role config**: checkboxes for "Mordred", "Morgana + Percival", "Oberon", "Lady of the Lake". Validate combinations client-side (each special role consumes 1 Minion → display "needs 7+ players" hint when player count too low).
2. **Lady of the Lake UI** (`packages/web/src/routes/play/[roomId]/+page.svelte` already has a `lady_of_lake` phase placeholder — wire it up):
   - Show "You hold the Lady of the Lake — pick a player to inspect" to the holder.
   - On `UseLadyOfLake` server response, the holder gets `ladyOfTheLakeLearned` in their PlayerView for one render — display "X is GOOD/EVIL" privately.
   - Disable previously-inspected targets (`ladyOfTheLakeUsedOn`).
3. **Round-4 twoFailsRequired UI hint**: already shown as "2 fails to fail" badge in `view.twoFailsRequired`. Make it visually prominent during the quest phase.
4. **Server-side validation**: today `RoomConfig` over-consumption (e.g. 6p + Mordred + Oberon) crashes in `rolePool()` rather than returning an Error. See P3 TODO "Validate RoomConfig at room creation".
5. **Property tests for projection extensions**: add proptests for the 9p/10p combos and the rare cases like Merlin + Mordred + Oberon where Merlin's `knownAlignments` shrinks to just (Assassin, Morgana, Minion).

## Open questions

- **Lady of the Lake state-machine modeling** (flagged in original plan as risk #4): we shipped Phase 1 with `lady_of_lake` as a hard-interrupt phase between rounds — this matches the physical board's flow. Confirm with user before Phase 3 starts that this is the desired behavior vs. an optional soft action.
- **Lady reveal duration**: same UX question as role-reveal — auto-dismiss vs. tap-to-continue. Probably tap-to-continue since it's privileged info.
- **Reveal to whole table?** Some house rules let the Lady's holder publicly call the result; the standard rule is private. Default to standard; possible Phase 7+ toggle.

## Decision

Hard-interrupt phase model retained from Phase 1 engine implementation. Will re-confirm with user before code work begins.

## References

- Plan doc: `.claude/plans/avalon-pwa-game-references-avalon-abstract-duckling.md` Phase 3 section
- Original rules sourced from `references/Avalon/index.js:18-25` (bgamount), `:571-580` (round-4 special), `:631` (Lady gate)
- Avalon rule reference: https://andyventure.com/boardgame-avalon/
