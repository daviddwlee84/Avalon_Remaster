# Phase 4: LAN mode via WebRTC DataChannel

**Status**: P1
**Effort**: XL (2 weeks — highest-risk phase, design doc required)
**Related**: `packages/game-core/src/room.ts` (GameRoom is already transport-agnostic) · `packages/web/src/lib/transport/` (need WebRtcTransport + HostRoomBridge)

## Context

Avalon is inherently multi-player (5–10 players) so single-screen mode is meaningless. Users want two networking modes:

1. **Net mode** — centralized Bun server. Phase 1 shipped this.
2. **LAN mode** — one player's browser hosts the room directly over WebRTC; no server required at all once installed as a PWA.

Both modes must drive the **same `GameRoom`** without changes. That requirement shaped Phase 1's architecture (transport-agnostic `apply(peerId, msg) → Outbound[]` pattern) and pays off here.

## Investigation — what we lift from chess-web

Direct reference: `references/Chinese-Chess_Xiangqi/clients/chess-web/src/`. They solved this exact problem in Rust + Leptos + WebRTC. Files to study:

- `transport/mod.rs` — `Session` abstraction with `Incoming` queue (NOT a latched signal — critical for back-to-back messages)
- `transport/webrtc.rs` (400 lines) — host and joiner paths, ICE timeout, mDNS candidate handling, DataChannel lifecycle
- `host_room.rs` (200 lines) — wraps `chess_net::room::Room` with `Map<PeerId, PeerSink>` where sink is one of `{ Local(queue) | Dc(channel) | Mock }`. The host gets `PeerId(1)` (local-loopback), joiners increment.
- `docs/lan-multiplayer-webrtc.md` — full architecture + pitfalls + porting recipe. **Read this first.**
- `pitfalls/webrtc-mdns-lan-ap-isolation.md` — common LAN P2P failure modes (Xiaomi AX9000 mDNS drop, AWDL interference, AP isolation).

## Architecture (translated to TS)

```
┌── HostRoomBridge ─────────────────────────────────────────┐
│   gameRoom: GameRoom                                       │
│   sinks: Map<PeerId, PeerSink>                             │
│   PeerSink = { Local(queue) | Dc(RTCDataChannel) | Mock }  │
│                                                            │
│   - createOffer() → { offer SDP, handshake }              │
│   - acceptAnswer(handshake, answer SDP) → spawn DC        │
│   - onDataChannelMessage → parseClientMsg → apply →       │
│     fan out Outbound[] to right sinks                     │
└────────────────────────────────────────────────────────────┘
            ▲                                ▲
            │ Session                        │ Session
       ┌────┴────┐                      ┌────┴────────┐
       │ Host UI │ (local-loopback)     │ Joiner UI    │ (over DC)
       │ /play/  │                      │ /play/       │
       └─────────┘                      └──────────────┘
```

Joiner uses `WebRtcTransport` implementing the same `Session` interface as `WsTransport` (Phase 1). `/play/[roomId]` doesn't know which is underneath.

## Scope

1. `packages/web/src/lib/transport/webrtc.svelte.ts` — `WebRtcTransport` for joiner side. Lifts `connect_as_joiner` from chess-web verbatim.
2. `packages/web/src/lib/transport/host-bridge.svelte.ts` — `HostRoomBridge` wrapping `GameRoom` with the peer routing table.
3. `packages/web/src/routes/lan/host/+page.svelte` — host setup: choose player count + role config, click "Start hosting", show offer QR + manual paste textarea, accept joiners one at a time.
4. `packages/web/src/routes/lan/join/+page.svelte` — joiner: scan QR (BarcodeDetector API + `jsqr` fallback) OR paste offer, generate answer, hand back via QR + textarea.
5. SDP envelope: JSON wrapping raw SDP, includes `RoomConfig` preview so the joiner sees "Joining 7-player game with Lady of the Lake" before accepting.
6. Update `/play/[roomId]` to read its `Session` from a Svelte context — host page injects `HostRoomBridge.selfSession()`, joiner page injects `WebRtcTransport`, Net mode injects `WsSession`.
7. Document mDNS / AP-isolation / VPN gotchas in `pitfalls/` as we hit them.

## Options for SDP exchange UX (user already chose "both")

| Option | Why |
|---|---|
| QR + manual paste (chosen) | QR is the happy path on phones; manual paste fallback for browsers without BarcodeDetector (Firefox, Safari mobile) and for desktops |
| Manual paste only | Simpler, but 5–10 players × pasting SDP twice is brutal |
| QR only | Excludes Firefox mobile (no BarcodeDetector API) |
| Use Net server as signaling broker | Defeats the purpose of "LAN works with no server" |

## Risks to validate (do these BEFORE writing the full impl)

1. **SDP size and QR readability across browsers**: pure-LAN mDNS SDP is ~1KB which fits comfortably in a v10–v15 QR. STUN-augmented can balloon past 2KB and some QR readers start failing. Test on iOS Safari, Android Chrome, Android Firefox before committing to QR as primary.
2. **mDNS resolution on real routers**: chess-web hit silent mDNS drops on Xiaomi AX9000. Test on the user's actual router; fall back to documented STUN servers if not LAN-only.
3. **WebRTC reference-cycle gotcha**: `host_room.rs` uses `Weak<HostRoom>` in callback closures to avoid GC hangs. TS equivalent: hold `WeakRef` in callbacks. Document and test.

## Open questions

- Auto-discovery via mDNS browsing? Original chess-web has it on backlog — Phase 4 keeps to manual SDP exchange.
- Host disconnects mid-game: who promotes? Probably "game over, restart" rather than seat migration. Spectator mode (Phase 7) overlaps here.
- LAN mode + reconnection (Phase 7) compatibility: localStorage `playerId` token works the same way, but the host's `HostRoomBridge` needs to re-issue an offer to the reconnecting joiner.

## References

- chess-web LAN doc: `references/Chinese-Chess_Xiangqi/docs/lan-multiplayer-webrtc.md`
- chess-web LAN pitfalls: `references/Chinese-Chess_Xiangqi/pitfalls/webrtc-mdns-lan-ap-isolation.md`
- Plan doc Phase 4 section + risk #2
