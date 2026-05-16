# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A from-scratch PWA rewrite of The Resistance: Avalon. The original socket.io + vanilla JS Chinese implementation at `references/Avalon/` is the source of game rules and reused art; the active codebase lives in `packages/`. The Rust + WebRTC project at `references/Chinese-Chess_Xiangqi/` is **not Avalon** — it's a structural reference we lift networking patterns from (especially the transport-agnostic room state machine).

Phase 1 (minimum playable Net mode) has shipped. The roadmap and current backlog are in `TODO.md` (kanban view via `scripts/todo-kanban.sh`) with per-phase research in `backlog/`.

## Commands

Always run from the repo root (Bun workspaces resolve `--filter` patterns there). The dev servers must run separately because `bun run dev` backgrounds the server (shell quirk) — use two terminals.

```bash
bun install                                 # install all workspace deps

# Dev — two terminals
bun run dev:server                          # Bun WS server on :3000
bun run dev:web                             # Vite dev server on :5173

# Tests
bun run --filter '@avalon/game-core' test   # engine unit + property tests (~1s)
bun run --filter '@avalon/web' test:e2e     # Playwright 5-context smoke

# Single Vitest file or test name
cd packages/game-core && bun run vitest run src/view.test.ts
cd packages/game-core && bun run vitest run -t "Merlin sees all evil except Mordred"

# Single Playwright file or test name
cd packages/web && bunx playwright test smoke.spec.ts
cd packages/web && bunx playwright test -g "5 players can join"

# Build / typecheck
bun run build                               # builds every package
bun run --filter '@avalon/web' check        # svelte-check + svelte-kit sync
bun run --filter '@avalon/server' typecheck

# Server smoke
curl http://localhost:3000/health
```

If a Playwright run leaves servers behind: `lsof -ti:3000 -ti:5173 | xargs kill -9`.

## Architecture — the parts that aren't discoverable

Read `docs/architecture.md` for the long form. The non-obvious points:

### Strict module dependency direction

```
game-core ◄── protocol ◄── { web, server, tui }
```

`@avalon/game-core` has **zero** runtime dependencies (zod is a peer of `@avalon/protocol`, not game-core) so it runs identically in browser / Bun / Vitest. Never add a Node-only or browser-only import to it. The TS message types live in `game-core/src/messages.ts`; the Zod schemas that validate them at the wire boundary live in `@avalon/protocol`. Both must stay in sync — `satisfies z.ZodType<T>` in `protocol/src/index.ts` enforces that at compile time.

### Transport-agnostic `GameRoom` (`packages/game-core/src/room.ts`)

Single entry point `apply(peerId: PeerId, msg: ClientMsg) → Outbound[]`. The same instance is meant to drive:
- The Bun WS server (Phase 1 done; `packages/server/src/registry.ts` maps `peerId ↔ WebSocket`)
- A LAN host browser over WebRTC DataChannels (Phase 4 — pattern lifted from `references/Chinese-Chess_Xiangqi/clients/chess-web/src/host_room.rs`)

Never put transport-specific logic into `GameRoom`. Everything that crosses the wire goes through `Outbound[]` so the transport layer can fan-out without inspecting message content.

### `projectView` is the security boundary (`packages/game-core/src/view.ts`)

The server never ships `GameState` to clients. Every state-carrying `ServerMsg` carries a per-recipient `PlayerView` projected by `projectView(state, viewerPlayerId)`. Role visibility (Merlin sees evil except Mordred, Percival sees Merlin+Morgana indistinguishably, etc.) is filtered there and nowhere else. **Before merging any change to `GameRoom` or `projectView`, ensure `view-leak.property.test.ts` still passes** — the property test asserts no other player's role string appears in any reachable view's JSON.

### Web client is mode-agnostic by design

`packages/web/src/lib/transport/types.ts` defines a `Session` interface. Today only `WsSession` (browser `WebSocket`) implements it; Phase 4 adds `WebRtcTransport` and `HostRoomBridge` with the same interface. The play page (`src/routes/play/[roomId]/+page.svelte`) must not branch on which transport is underneath — that's how we'll get LAN mode without duplicating the gameplay UI.

## Workflow with the knowledge harness

Three repo-root surfaces work together — full rules in `AGENTS.md`:

- **`TODO.md`** — long-term backlog. **Do not create new `ROADMAP.md` / `IDEAS.md` / `BACKLOG.md` files.** Use `scripts/add-todo.sh --priority {P1|P2|P3|P?} --effort {S|M|L|XL} --title "…" --description "…"` (add `--backlog` to scaffold a research doc). Validate with `scripts/todo-kanban.sh --validate-only TODO.md` after manual edits.
- **`backlog/<slug>.md`** — per-item research notes. Required for `[L]` / `[XL]` items and any `P?` item.
- **`pitfalls/<slug>.md`** — symptom-first knowledge base. Title by the verbatim error or observable behaviour, NOT the root cause. Copy errors exactly — paraphrasing kills grep-ability.

When implementing a TODO item: `scripts/promote-todo.sh --title "<substring>" --summary "<what shipped>"` in the same commit moves it to the `## Done` lane with the dated syntax.

## Pitfalls already captured (read before re-debugging)

If you encounter any of these symptoms, **check `pitfalls/` first** — they're documented:

- `WebSocket failed: Insufficient resources` or rapid open/close churn after navigating to a Svelte page → `$effect` re-running because of `$state` writes inside it. Use `onMount` for one-shot setup.
- `[vite] ws proxy socket error: read ECONNRESET` → Vite's WebSocket proxy doesn't handle `Bun.serve` upgrades cleanly. Connect direct to `:3000` in dev (`buildRoomWsUrl()` in `packages/web/src/lib/transport/ws.svelte.ts` already does this — don't reintroduce the Vite proxy).
- `strict mode violation: getByText(...) resolved to N elements` → Player names appear in both the status bar and player list. Use `.first()` or a parent-scoped locator (`page.getByRole('listitem', ...)` + scoped `getByText`).

## When you find a new gotcha

Spend more than ~15 minutes on something non-googleable? Write `pitfalls/<symptom-slug>.md` while the trace is fresh, copy errors verbatim, and update `pitfalls/README.md`'s index table. See `AGENTS.md` "Past pitfalls → `pitfalls/`" for the full template.

## References

- Implementation plan: `.claude/plans/avalon-pwa-game-references-avalon-abstract-duckling.md`
- Architecture deep dive: `docs/architecture.md`
- Game rules (canonical source, Chinese): `references/Avalon/index.js` — quest team sizes at `:9-16`, role distributions at `:18-25`, round-4 special rule at `:571-580`
- Networking pattern source (Rust): `references/Chinese-Chess_Xiangqi/crates/chess-net/src/room.rs`, `clients/chess-web/src/transport/`, `clients/chess-web/src/host_room.rs`
