# Architecture (Phase 1 snapshot)

## Goals

1. **Replicate Avalon faithfully** — every rule from the reference Chinese-language Socket.io project (`references/Avalon/`) at parity, including special roles, Lady of the Lake, and round-4 two-fails-required.
2. **Make connection-layer swap trivial** — the same game engine must drive a centralised Bun server (Net mode) and a host-as-server browser (LAN over WebRTC) without changes.
3. **Make role visibility leak-proof at the type system level** — the only way a client ever learns about another player's role is through the projection helper, which is property-tested.

## Module boundaries

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ @avalon/game-core│◄───│ @avalon/protocol │◄───│ @avalon/server   │
│ (pure logic)     │    │ (Zod validation) │    │ (Bun WebSocket)  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
        ▲                       ▲
        │                       │
        │                ┌──────────────────┐
        └────────────────│ @avalon/web      │
                         │ (SvelteKit PWA)  │
                         └──────────────────┘
```

Direction is strict. `game-core` never imports anything; `protocol` only depends on game-core for type re-exports; `web` and `server` are siblings that don't talk to each other except over the wire.

## The state machine — `GameRoom`

`packages/game-core/src/room.ts`

Single entry point: `apply(peerId: PeerId, msg: ClientMsg) → Outbound[]`. The transport layer
hands in messages, gets back a list of `{ peer, ServerMsg }` pairs to deliver. The `GameRoom`
holds no I/O references — it has nothing to do with sockets or DataChannels.

This is the pattern we lifted from
`references/Chinese-Chess_Xiangqi/crates/chess-net/src/room.rs::Room::apply`. The benefit is
direct: same engine drives Net mode (`@avalon/server`) and (future) LAN mode where one
browser hosts the room in-process over WebRTC DataChannels.

### Phase transitions
```
lobby → role_reveal → team_selection → team_vote → quest → quest_reveal
                          ▲                  │            │
                          │     (rejection)  │            │
                          └──────────────────┘            │
                                                          ▼
                                         ┌── 3 fails → finished (evil)
                                         ├── 3 successes → assassination → finished
                                         └── otherwise → next round (with optional Lady)
```

`5 rejections → finished (evil)` is checked inside `team_vote`.

## The projection — `projectView`

`packages/game-core/src/view.ts`

```
GameState ───projectView(viewer)──► PlayerView (this viewer can see)
```

`PlayerView` is what travels on the wire. The server never sends `GameState` directly. The
projection:
- Always includes the viewer's own role.
- For Merlin: includes all evil players (except Mordred) tagged as `'evil'` in `knownAlignments`.
- For Percival: Merlin and Morgana as `'merlin-like'` (indistinguishably).
- For evil players (except Oberon): other evil (except Oberon) as `'evil'`.
- For Loyal Servants / Oberon: empty `knownAlignments`.

A `fast-check` property test in `src/view-leak.property.test.ts` asserts that for any
reachable `GameState`, `JSON.stringify(projectView(state, viewer))` never contains another
player's role name as a JSON value. This is our north-star invariant.

## Wire protocol

`packages/protocol/src/index.ts` exposes Zod schemas matching the TS unions in
`game-core/src/messages.ts`. Server-side parse-on-receive uses `parseClientMsg` (returns
`null` on schema mismatch and the server replies with an `Error{code:'malformed_message'}`).
Client-side parses with `parseServerMsg` for symmetry.

**Why both TS types AND Zod schemas?** The TS types live in `game-core` so the engine can
construct messages without depending on Zod. The Zod schemas live in `protocol` and exist
solely to validate untrusted input at the transport boundary. A `satisfies z.ZodType<T>`
guarantees the schema matches the TS type at compile time.

## Server (Net mode)

`packages/server/src/index.ts` + `registry.ts`

- One `Bun.serve` with custom `fetch` that handles WebSocket upgrades and falls through to
  Hono for HTTP routes (`/health`, `/rooms`).
- WebSocket paths: `/ws` (default room `main`), `/ws/<roomId>` (per-room), `/lobby`
  (subscribe to `RoomList` push updates).
- Each peer carries a `WsData` (peerId, roomId, displayName, isLobby) attached via
  `server.upgrade(req, { data })`.
- `RoomRegistry` owns the `Map<string, GameRoom>` plus `Map<peerId, registration>`, and
  routes incoming messages and outgoing `Outbound`s to the right sockets.

## Web client

`packages/web/`

- SvelteKit 2 with Svelte 5 runes (`$state`, `$derived`, `$effect`). Routes:
  - `/` mode selector / join form
  - `/lobby` Net-mode room list with live `RoomList` updates
  - `/play/[roomId]` the actual game — entirely driven by `PlayerView`
- `src/lib/transport/types.ts` defines the `Session` interface. Phase 1 has only
  `WsSession` (browser `WebSocket`); Phase 4 will add `WebRtcTransport` + `HostRoomBridge`
  with the same interface so `/play/[roomId]` doesn't have to know which is underneath.
- `src/lib/game-store.svelte.ts` subscribes to a `Session`, listens to `ServerMsg`s, and
  exposes reactive `view`, `chat`, `toasts`, `showRoleReveal`. Components just bind to it.

## Testing

Three tiers:

1. **Engine unit + property tests** (`packages/game-core`): `room.test.ts`, `view.test.ts`,
   `view-leak.property.test.ts`. Drives `GameRoom` directly, no async. Property tests cap
   at 200 runs and complete in <1s.
2. **Server smoke** (manual right now): `curl http://localhost:3000/health` and a one-shot
   WebSocket roundtrip. Phase 2 will add a Bun test that exercises the registry.
3. **Multi-browser e2e** (`packages/web/tests/smoke.spec.ts`): 5 Playwright browser
   contexts, one per simulated player, against the real Bun WebSocket server (Playwright's
   `webServer` config boots both servers automatically).

## Phase-1 limitations (intentional)

- Only default-distribution roles (Merlin + N Loyal + Assassin + M Minion). Special-role
  toggles in `RoomConfig` work in the engine but the lobby UI doesn't expose them yet —
  Phase 3.
- No reconnection grace window — drop the tab, lose your seat.
- No LAN mode — Phase 4.
- No i18n — Phase 6. All visible strings are English in Phase 1.
- No PWA service worker — Phase 5.
- No sounds, no animations, no role-card art — Phase 2.

## Gotchas worth remembering

- **`$effect` re-runs on `$state` assignment**: Setting up a WebSocket inside `$effect`
  that assigns to `$state` causes an infinite loop. Use `onMount` for one-shot side
  effects. (We hit this; see `routes/play/[roomId]/+page.svelte`.)
- **Vite WebSocket proxy is flaky against Bun.serve upgrades**: We connect the client
  directly to `:3000` in dev rather than proxying through Vite's `:5173`. Production
  (adapter-node) is same-origin and so doesn't have this problem.
- **`getByText` strict mode**: Player names appear in multiple places (status bar +
  player list), so e2e tests must use `.first()` or more specific locators.
