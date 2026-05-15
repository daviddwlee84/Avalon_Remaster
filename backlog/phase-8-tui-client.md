# Phase 8: TUI client (Ink + Bun JSX)

**Status**: P3 (backlog — not on the critical path)
**Effort**: L
**Related**: `packages/tui/` (placeholder package) · `packages/protocol/`

## Context

User explicitly asked for a Net-server TUI version as a backlog item. Use cases:

- Babysitter / admin client: join a room as an observer to see what's happening server-side without spinning up a browser.
- Stress-test driver: scripted Bun program drives N TUI clients through canned action sequences for soak testing.
- Headless CI: run the same game flow in a terminal without Playwright overhead.

Note: this is `@avalon/tui` — already scaffolded as an empty package in Phase 1 with a README pointing here.

## Scope

1. **Choose framework**: **Ink** (React-for-CLI) over alternatives.
   - Bun has native JSX support — no build step.
   - Ink has mature primitives: `ink-table`, `ink-select-input`, `ink-text-input`, `ink-spinner`.
   - React's component model maps directly to our existing per-player view-projection (one component per phase, props = `PlayerView`).
2. **Transport**: consume `@avalon/protocol` over WebSocket. Either Bun's built-in `WebSocket` (browser-shaped) or `ws` package. Both work fine.
3. **Layout**: same `Session` interface as the web client; render `PlayerView` into terminal components.
4. **Two modes**:
   - `--lobby ws://host` → room browser (list rooms, watch as spectator).
   - `--connect ws://host/ws/<roomId> --name <displayName>` → join directly as a player.
5. **Key bindings**: vim-style (`hjkl` / arrows), `Space`/`Enter` to confirm, `:` for command input (similar to chess-tui).

## Why Phase 3 priority

User explicitly said this is **backlog** ("TUI 版的可以做為 backlog"). It's not on the critical path to a playable PWA. Pick this up when:

- All other phases shipped, OR
- We need a programmatic stress-test driver for the Net server, OR
- We want to ship a "headless Avalon" for terminal enthusiasts.

## Options considered

| Approach | Pros | Cons |
|---|---|---|
| **Ink + Bun JSX** (chosen) | Component model matches existing code; React ecosystem; no build step | React in a terminal is a bit "much" for a simple TUI |
| Bun + Blessed | Lighter, no React | More imperative; less idiomatic for someone who wrote the web client |
| Rust + Ratatui (chess-tui pattern) | Tiny binary, no Node | Different stack — defeats the workspace-uniformity goal |

## Open questions

- Should the TUI also be able to **host** a LAN game (browser-less)? Probably no — WebRTC in a TUI is masochistic. Net-mode only.
- Reconnection: same token mechanism as Phase 7 web client?
- Color support: Ink degrades gracefully on dumb terminals; should default to colors-on but provide `--no-color`.

## References

- Ink: https://github.com/vadimdemedes/ink
- chess-tui (Rust + Ratatui) as inspiration: `references/Chinese-Chess_Xiangqi/clients/chess-tui/`
- Plan doc Phase 8 backlog section
