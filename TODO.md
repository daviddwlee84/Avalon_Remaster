# TODO

Long-term backlog for Avalon Remaster. See AGENTS.md
for the maintenance workflow that agents should follow.

> **For agents**: when the user surfaces an idea explicitly **not** being
> implemented this session (signals: "maybe later", "nice to have",
> "工程量太大需要再評估", "先記下來"), add it here with priority + effort tags.
> Do not create new `ROADMAP.md` / `IDEAS.md` / `BACKLOG.md` files —
> `TODO.md` is the single backlog index. Long-form research goes in
> [`backlog/<slug>.md`](backlog/).

<!-- Use the exact section order: P1, P2, P3, P?, Done.
     The bundled scripts/todo-kanban.sh validator only inspects top-level
     `- [ ]` and `- ✅` items inside these sections. Prose paragraphs,
     blockquotes, indented sub-bullets, HTML comments, and `---` rules are
     ignored — feel free to add inline guidance like this without breaking
     machine readability. -->

## P1

Likely next batch — items you'd reach for if you sat down to work today.

## P2

Worth doing, no rush.
- [ ] **[M] Expand Playwright e2e to full game flows** — Current smoke test stops after role-reveal. Add: complete 3-quest win → assassination → miss/hit Merlin; 5 consecutive rejections → evil wins; 3 failed quests → evil wins. Drive deterministically via X-Avalon-Seed header so outcomes are reproducible.
- [ ] **[S] 30-minute Bun.serve WebSocket soak test** — Phase 1 risk item: Bun.serve close-frame handling has had subtle bugs. Run 5 players in reconnect loops for 30 minutes, watch for resource leaks or stuck rooms. Fallback if unstable: swap to hono/node-server + ws (same code outside src/index.ts entry).
- [ ] **[M] Audio cues + Settings (sound on/off)** — Short SFX clips on vote-cast / quest-resolved / game-over. Gate behind a Settings drawer (shadcn-svelte Sheet + Tabs). Source CC0 audio (Freesound), credit in SOUNDS.md. Deferred from Phase 2 UI beautification because asset sourcing + a Settings surface is a separable mini-phase.
- [ ] **[M] Phase 4 follow-ups: QR pairing + STUN fallback + mobile testing** — Phase 4 shipped manual SDP paste only on LAN-only ICE. Defer: (a) QR encoding/scanning via BarcodeDetector + jsqr fallback for Firefox/Safari; (b) WebRtcConfig.iceMode='with-stun' UI toggle with CN-friendly server list; (c) real-device testing across iOS Safari + Android Chrome + a Xiaomi/TP-Link router for mDNS quirks; (d) host tab close = game over -- seat migration or restart UX; (e) host-side runtime diagnostics badge (ICE state / candidate count) for stuck pairings.
- [ ] **[M] Phase 7b: spectator mode (?role=spectator)** — Phase 7a shipped reconnection only. Spectator mode deferred: (a) /play/[roomId]?role=spectator entry that doesn't seat; (b) engine tracks spectators: Map<PeerId,_> separately from state.players, projection ships myRole:undefined+empty knownAlignments; (c) 16-spectator cap per room (chess-web default); (d) spectator can't Chat → Error{rate_limited}; (e) UI 'Spectating' badge in PlayLayout header + vote/team buttons hidden. Pattern in references/Chinese-Chess_Xiangqi/crates/chess-net/src/server.rs::handle_room_socket.
- [ ] **[L] Persist game state across container restarts (Redis / disk)** — Phase 7a reconnection works only WHILE the same server process is alive. On ACA scale-to-zero / revision update / crash, GameRoom state is lost and reconnect tokens become invalid (the client now falls through to a fresh join, but the original game is gone). Real fix: persist GameState snapshots to Redis/Cosmos/etc. on every Outbound[] flush; on container start, restore rooms from store. Pattern in references/Chinese-Chess_Xiangqi probably doesn't cover this — it's a deploy-shape problem we punted on in Phase 7a.

## P3

Someday / nice-to-have.
- [ ] **[L] Phase 8: TUI client (Ink + Bun JSX)** — Bun + Ink for terminal client of the Net mode server. Consumes @avalon/protocol over WebSocket — server doesn't change. ink-table / ink-select-input for the per-player PlayerView. Useful as an admin/babysitter client and as a stress-test driver. → [research](backlog/phase-8-tui-client.md)
- [ ] **[S] PWA install UX: beforeinstallprompt + iOS A2HS overlay + PNG icons** — Phase 5 ships SVG-only icon + SW + update toast + offline banner. Defer: (a) capture beforeinstallprompt and render an Install banner (Android/desktop Chrome); (b) static instructional overlay on iOS Safari since beforeinstallprompt doesn't fire there; (c) generate proper 192/512 PNG icons via pwa-asset-generator from icon.svg so iOS Add-to-Home-Screen has the right thumbnail; (d) add link rel=apple-touch-icon with PNG variant.
- [ ] **[S] paraglide-js viability spike + full a11y screen-reader sweep** — Phase 6 ships an in-house dictionary i18n harness (no library). If translation surface grows (more locales, plurals, ICU formatting) revisit: (a) paraglide-js spike — per-locale tree-shaking, ICU plurals, SvelteKit integration; (b) full keyboard nav sweep through team-selection grid (currently mouse + space/enter on PlayerTile buttons); (c) ARIA radio role on team-vote buttons (paired with reduce-motion variants for crown pulse + token reveal); (d) screen-reader test pass with VoiceOver / NVDA / TalkBack. The 'paraglide-js viability spike' P? entry has been folded in here.

## P?

Needs a spike before committing to a real priority. Tag as `[?/Effort]`.

## Done

- ✅ [2026-05-16] [P2/L] Phase 7: reconnection grace and spectator mode — reconnection grace via reattach token (Phase 7a); spectator mode split to a follow-up TODO

- ✅ [2026-05-16] [P2/M] Phase 6: i18n (zh-TW + en) and accessibility — in-house i18n harness (zh-TW + en) wired across every user-visible string; LocaleSwitch chip; aria-live toasts/chat/status; role/lady reveal cards now use locale-aware copy

- ✅ [2026-05-16] [P2/M] Phase 5: PWA polish via @vite-pwa/sveltekit — @vite-pwa/sveltekit with registerType:'prompt', SW precaches 65 entries (~1 MB), navigateFallbackDenylist for /ws+/lobby+/health, update toast + offline banner

- ✅ [2026-05-16] [P1/XL] Phase 4: LAN mode via WebRTC DataChannel — HostRoomBridge + WebRtcTransport + /lan/host /lan/join routes; manual paste pairing proven by 2-context Playwright e2e

- ✅ [2026-05-16] [P1/L] Phase 3: full role set + Lady of the Lake — validateConfigForPlayerCount + Lady-of-Lake holder init + full holder UI; 33 engine tests; svelte-check + Playwright smoke green

- ✅ [2026-05-16] [P1/L] Phase 2: UI beautification with shadcn-svelte — shadcn-svelte primitives, role-card flip, quest tokens, captain pulse, vote reveal + responsive layout; engine + Playwright smoke still green

Recently shipped. When implementing an active item, in the same commit run:

```
scripts/promote-todo.sh --title "<substring>" --summary "<one-line shipped summary>"
```

This moves the entry here using the dated `Done` syntax and re-validates.

- ✅ [2026-05-16] [P1/XL] Phase 1: minimum playable Avalon PWA — Bun workspaces + game-core engine + Bun WS server + SvelteKit web client; 17 vitest + Playwright 5-context e2e all pass.

<!-- Prune older entries into CHANGELOG.md once prior-year items appear here
     or this section grows past ~20 entries. -->
