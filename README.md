# Avalon Remaster

A modern PWA reimagining of The Resistance: Avalon, with both Net-mode (centralised
server) and LAN-mode (host-as-server over WebRTC) multiplayer. Built on **Bun +
SvelteKit + Tailwind + shadcn-svelte** as a single workspace.

> **Status**: Phase 1 — minimum viable Net mode. A 5-player game can be played end-to-end on a real Bun WebSocket server. UI is intentionally bare-bones; Phase 2 brings shadcn-svelte styling, Phase 3 adds the full role set + Lady of the Lake, Phase 4 adds LAN/WebRTC.

See [`.claude/plans/avalon-pwa-game-references-avalon-abstract-duckling.md`](./.claude/plans/avalon-pwa-game-references-avalon-abstract-duckling.md) for the full roadmap.

## Quick start

```bash
# install once
bun install

# run server + web (in two terminals, or use one pane each)
bun run dev:server   # Bun + Hono WebSocket server on :3000
bun run dev:web      # Vite dev server on :5173

# Or in two terminals so output stays readable:
#   T1: bun run dev:server
#   T2: bun run dev:web
```

Open <http://localhost:5173> in 5 tabs (different profiles or incognito so each gets its own localStorage), enter different names, join the same room, and the first one to join starts the game.

## Test

```bash
# unit tests for the game engine (200+ tests, <1s)
bun run --filter '@avalon/game-core' test

# multi-browser end-to-end smoke test (drives 5 contexts through role reveal)
bun run --filter '@avalon/web' test:e2e
```

## Workspace layout

```
packages/
├── game-core/     # @avalon/game-core   pure TS engine: roles, rules, GameRoom, projectView
├── protocol/      # @avalon/protocol    Zod schemas validating ClientMsg / ServerMsg
├── server/        # @avalon/server      Bun + Hono + Bun.serve WebSocket (Net mode)
├── web/           # @avalon/web         SvelteKit 2 + Svelte 5 + Tailwind v4 PWA
└── tui/           # @avalon/tui         Placeholder for future Ink-based TUI (Phase 8)
```

**Import direction**: `game-core ← protocol ← {web, server, tui}`. `game-core` has no I/O and zero browser/Bun-specific deps, so it runs the same in browser, Bun, and Vitest.

## Key architectural pattern: transport-agnostic Room

Lifted from `references/Chinese-Chess_Xiangqi/crates/chess-net/src/room.rs`. The `GameRoom` class is a pure state machine — a single `apply(peerId, msg)` entry point returning `Outbound[]` for the transport to fan out. The same `GameRoom` runs:

1. Server-side on Bun (peer = WebSocket connection ID).
2. Browser-side on a LAN host (peer = WebRTC DataChannel ID, with a local-loopback peer for the host's own UI) — **Phase 4**.

Every `ServerMsg` carrying state ships a per-recipient `PlayerView` (projected by `projectView()`), never the raw `GameState`. Role visibility filtering lives entirely inside `projectView` — the transport layer can never accidentally leak hidden info. A Vitest property test (`view-leak.property.test.ts`) guarantees this invariant across all reachable states.

## Roadmap (high level)

| Phase | Scope | Status |
|---|---|---|
| 1 | Minimum playable Net-mode game (5p basic roles, no styling) | **done** |
| 2 | shadcn-svelte UI, animations, audio, responsive layout | next |
| 3 | All 8 roles, Mordred/Morgana/Percival/Oberon, Lady of the Lake | |
| 4 | LAN mode (WebRTC + QR pairing + manual SDP fallback) | |
| 5 | PWA polish (`@vite-pwa/sveltekit`, install prompt, offline) | |
| 6 | i18n (zh-TW + en) with paraglide-js, a11y | |
| 7 | Reconnection grace, spectators | |
| 8 | TUI client (Ink + Bun JSX) — *backlog* | |

## References

- `references/Avalon/` — original Socket.io + vanilla JS Chinese version. Rules sourced 1:1; role-card and board art reused in `packages/web/static/images/`.
- `references/Chinese-Chess_Xiangqi/` — Rust + Leptos + WebRTC project we steal the transport-agnostic Room pattern from. Especially `crates/chess-net/src/room.rs`, `clients/chess-web/src/transport/`, `clients/chess-web/src/host_room.rs`.

## Tech stack

- **Bun 1.3+** as runtime and package manager (workspaces)
- **SvelteKit 2** + Svelte 5 runes + **Vite 6**
- **Tailwind CSS v4** + shadcn-svelte (Phase 2)
- **Hono** for HTTP routing on the Bun server
- **Zod** for wire-protocol runtime validation
- **Vitest** + fast-check for unit + property tests
- **Playwright** for multi-browser-context e2e
