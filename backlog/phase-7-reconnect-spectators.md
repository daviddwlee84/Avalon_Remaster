# Phase 7: reconnection grace and spectator mode

**Status**: P2
**Effort**: L (1–2 weeks)
**Related**: `packages/server/src/registry.ts` · `packages/game-core/src/room.ts` (removePeer already marks `connected:false` in-game) · `packages/web/src/lib/storage.ts`

## Context

Phase 1 limitation: closing the browser tab loses your seat immediately. For a 30-minute game with 5–10 humans, network blips and accidental closures are inevitable. Need a grace window.

Also: the original Avalon doesn't have spectators, but `references/Chinese-Chess_Xiangqi` does (max 16 per room, `?role=spectator` query) and it's a small extension once we have the projection machinery.

## Scope

### Reconnection

1. **Issue a token at addPeer time**: server returns a short opaque session token in `Welcome` (e.g. 16 hex chars). Client stores `{ roomId, playerId, token }` in localStorage keyed by roomId.
2. **Grace window on close**: when `removePeer` fires mid-game, don't drop the player; mark `connected: false` and schedule a 60s timer. If a peer arrives with a valid `{ roomId, playerId, token }` within 60s, re-attach to the seat.
3. **GameRoom changes**: `addPeer` currently always allocates a new `playerId`. Add `reattachPeer(peerId, token)` that takes a known playerId and resumes. Emit `GameStateUpdate` to the rejoiner immediately so they catch up.
4. **UI**: on `/play/[roomId]` load, if localStorage has a token for this room, send `Reattach` instead of plain `Hello`. Show a "Reconnecting…" overlay until `GameStateUpdate` arrives.
5. **Cleanup**: if 60s elapses without reconnection, drop the player. If game ended, clear the token.

### Spectators

1. **Query param**: `/play/[roomId]?role=spectator` — joins as spectator instead of player.
2. **GameRoom changes**: track `spectators: Map<PeerId, ...>` separately from seated players. Spectators receive `GameStateUpdate` projections too, but with `myRole: undefined` and `knownAlignments: {}` always.
3. **Cap**: 16 spectators per room (matches chess-web default).
4. **Can't chat as a spectator** (chess-web's stance): replies with `Error{code:'rate_limited'}` or new code `'spectator_no_chat'`.
5. **UI variant**: `/play` page renders a "Spectating" badge in the header; vote/team-selection buttons hidden.

## Open questions

- **Token security posture**: chess-net's auth is "password is a friend-lock, not security". Token here is same — localStorage isn't tamper-proof but for a friend-only fun project, fine. If we ever deploy publicly, swap to signed server tokens.
- **Reconnection mid-vote / mid-quest**: rejoiner gets the projection with `myPendingApproveVote` populated from their previous vote. They can't change it. UI must reflect this.
- **Stale grace timers across server restarts**: Phase 1 server is in-memory only. A server restart clears all rooms and tokens. Phase 7 doesn't change that — persistence would be Phase 8+ scope.
- **Spectator + LAN mode**: trivially works because `HostRoomBridge` already maps PeerId to PeerSink — spectator just gets a DC with no input handlers. Just need a separate "spectate link" QR alongside the join link.

## Open design choice

When a player is `connected: false` (in grace window), does the game pause or continue with their pending vote treated as null?
- **Pause** (recommended): block phase transitions on disconnected players whose action is required. Safer, matches physical board game intuition.
- **Continue**: keep rotating captain or treating their vote as abstain. Risks unfair game progression while they reconnect.

User to confirm before implementation.

## References

- chess-net spectator implementation: `references/Chinese-Chess_Xiangqi/crates/chess-net/src/server.rs` (route handling) + `room.rs::Room` (spectators tracked separately)
- chess-net reconnection: chess-net doesn't have token reconnection — it's an Avalon-specific addition
- Plan doc Phase 7 section
