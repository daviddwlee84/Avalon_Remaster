# Phase 2: UI beautification with shadcn-svelte

**Status**: P1
**Effort**: L (1–2 weeks)
**Related**: `TODO.md` · `packages/web/src/routes/play/[roomId]/+page.svelte` · `packages/web/static/images/`

## Context

2026-05-16, after Phase 1 (minimum playable Net mode) shipped. The functional UI is intentionally bare-bones — raw buttons, black text on parchment, no animations, no sounds. Now that the game-flow plumbing is verified, the next milestone is making it look like a real product without changing any game logic.

User's explicit cadence: "先求復現效果 → 然後美化 UI → 然後再來添加各種複雜功能". This phase is step 2.

## Investigation

- **Component library decision** (locked in plan): **shadcn-svelte** + Tailwind v4. Already have Tailwind v4 wired and theme colors stubbed in `src/app.css` (`--color-parchment`, `--color-ink`, `--color-gold`, `--color-blood`, `--color-good`, `--color-evil`).
- **Animation strategy**: pure CSS where possible (3D card flip with `transform-style: preserve-3d`); reach for `motion-one` only if we need orchestrated sequences.
- **Asset inventory** (already in `static/images/`): English-renamed copies of all 8 role cards (`merlin.jpg` etc.), 6 board variants (`board_5.jpg` through `board_10.jpg`), tokens (`mission_token.png`, `vote_token.png`, `success_token.png`, `fail_token.png`), and originals with Chinese filenames preserved as historical record.

## Concrete scope

In order:

1. **shadcn-svelte install + base components**: `Button`, `Card`, `Dialog` (replace the role-reveal modal), `Sheet` (chat panel), `Tabs` (settings/tutorial subviews), `Tooltip`, `Toast` (replace ad-hoc toast in `GameStore`).
2. **Theme**: parchment + gold + blood palette. Dark-mode variant cheap if Tailwind v4's `@variant` picks it up.
3. **Role card flip animation**: 3D CSS transform; uses the existing `static/images/<role>.jpg` art.
4. **Quest token strip**: 5 token slots, animated reveal of `success_token.png` / `fail_token.png` on quest resolution.
5. **Captain crown indicator**: pulse animation on the current captain's avatar tile.
6. **Vote-reveal animation**: yes/no tokens flip in sequence after `team_vote` closes (uses `view.approveVotesRevealed`).
7. **Audio cues**: short clips on vote-cast / quest-resolved / game-over. Gated behind `Settings → sound on/off`.
8. **Responsive layout**: arc-around-board on desktop (~768px+), vertical stack on mobile (320–767px). Test on Chrome DevTools device emulation + actual iOS Safari.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **shadcn-svelte** (chosen) | copy-paste components live in our repo, fully customizable, no runtime cost | each component needs manual install |
| Skeleton UI | one install, complete framework, built-in theming | less popular, fewer examples |
| DaisyUI on Tailwind | fastest prototype | more "bootstrap-looking", harder to bend toward Avalon aesthetic |

## Open questions

- Where do board images (`board_5.jpg` ... `board_10.jpg`) go in the layout — fullscreen background, or compact corner badge? Original Avalon used fullscreen but it eats vertical space on phones.
- Card flip animation latency: 600ms feels theatrical but blocks impatient players. Add a "skip animation" toggle?
- Sound asset format: original Avalon has no audio. Source from CC0 sample packs (e.g. Freesound) — list each in a SOUNDS.md credits file.

## Decision

Not yet — Phase 1 just shipped 2026-05-16; awaiting user signal to start Phase 2.

## References

- shadcn-svelte: https://shadcn-svelte.com
- Tailwind v4 theme directives: https://tailwindcss.com/docs/v4-beta
- Plan doc: `.claude/plans/avalon-pwa-game-references-avalon-abstract-duckling.md` Phase 2 section
