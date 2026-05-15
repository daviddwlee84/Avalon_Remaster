# @avalon/tui — Backlog Placeholder

This package is reserved for a future **TUI (terminal UI) client** of Avalon.

## Plan

When picked up:

- **Framework**: [Ink](https://github.com/vadimdemedes/ink) — React for CLIs
- **Runtime**: Bun (native JSX, no build step)
- **Transport**: Same `@avalon/protocol` Zod schemas over a WebSocket client (`ws` or Bun's built-in `WebSocket`)
- **Layout**: `ink-table` / `ink-select-input` / `ink-text-input` primitives map onto our existing per-player view-projection model

The TUI client only depends on `@avalon/protocol` and (optionally) `@avalon/game-core` — it never knows about SvelteKit, WebRTC, or PWA concerns. The Net mode server (`@avalon/server`) is reusable from this client without changes.

See `.claude/plans/avalon-pwa-game-references-avalon-abstract-duckling.md` for the full roadmap.
