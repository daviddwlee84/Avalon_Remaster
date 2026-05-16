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
- [ ] **[M] Phase 5: PWA polish via @vite-pwa/sveltekit** — registerType:'prompt' so mid-game players don't get reloaded silently. Precache app shell + role cards + audio sprite. navigateFallbackDenylist /ws and /api. iOS Add-to-Home-Screen instructions overlay. Offline detector with LAN-mode suggestion banner. → [research](backlog/phase-5-pwa-polish.md)
- [ ] **[M] Phase 6: i18n (zh-TW + en) and accessibility** — paraglide-js (validate first — see P? item). All visible strings keyed; zh-TW sourced from references/Avalon/. Keyboard navigation through team-selection grid; ARIA roles on vote/quest buttons; reduce-motion variant of role-card flip. → [research](backlog/phase-6-i18n-a11y.md)
- [ ] **[L] Phase 7: reconnection grace and spectator mode** — Server holds seat 60s on close; reconnect via localStorage playerId token re-attaches and resends GameStateUpdate. Spectator role (?role=spectator) read-only, no knownAlignments, sees public game state only. → [research](backlog/phase-7-reconnect-spectators.md)
- [ ] **[M] Expand Playwright e2e to full game flows** — Current smoke test stops after role-reveal. Add: complete 3-quest win → assassination → miss/hit Merlin; 5 consecutive rejections → evil wins; 3 failed quests → evil wins. Drive deterministically via X-Avalon-Seed header so outcomes are reproducible.
- [ ] **[S] 30-minute Bun.serve WebSocket soak test** — Phase 1 risk item: Bun.serve close-frame handling has had subtle bugs. Run 5 players in reconnect loops for 30 minutes, watch for resource leaks or stuck rooms. Fallback if unstable: swap to hono/node-server + ws (same code outside src/index.ts entry).
- [ ] **[M] Audio cues + Settings (sound on/off)** — Short SFX clips on vote-cast / quest-resolved / game-over. Gate behind a Settings drawer (shadcn-svelte Sheet + Tabs). Source CC0 audio (Freesound), credit in SOUNDS.md. Deferred from Phase 2 UI beautification because asset sourcing + a Settings surface is a separable mini-phase.
- [ ] **[M] Phase 4 follow-ups: QR pairing + STUN fallback + mobile testing** — Phase 4 shipped manual SDP paste only on LAN-only ICE. Defer: (a) QR encoding/scanning via BarcodeDetector + jsqr fallback for Firefox/Safari; (b) WebRtcConfig.iceMode='with-stun' UI toggle with CN-friendly server list; (c) real-device testing across iOS Safari + Android Chrome + a Xiaomi/TP-Link router for mDNS quirks; (d) host tab close = game over -- seat migration or restart UX; (e) host-side runtime diagnostics badge (ICE state / candidate count) for stuck pairings.

## P3

Someday / nice-to-have.
- [ ] **[L] Phase 8: TUI client (Ink + Bun JSX)** — Bun + Ink for terminal client of the Net mode server. Consumes @avalon/protocol over WebSocket — server doesn't change. ink-table / ink-select-input for the per-player PlayerView. Useful as an admin/babysitter client and as a stress-test driver. → [research](backlog/phase-8-tui-client.md)
- [ ] **[S] Validate RoomConfig at room creation, not at start** — Today rolePool() throws if a special-role combo over-consumes Minion slots (e.g. 6p + Mordred + Oberon). GameRoom.handleStartGame doesn't catch this; it bubbles as an unhandled exception. Either add canApplyConfig predicate in rules.ts and validate at CreateRoom, or catch in handleStartGame and return Error{code:invalid_team}.

## P?

Needs a spike before committing to a real priority. Tag as `[?/Effort]`.
- [ ] **[?/S] paraglide-js viability spike before Phase 6** — Stand up a 'hello'/'你好' two-locale hello world. Verify per-locale tree-shaking, runtime cost, SvelteKit integration smoothness. Fallback if rough: i18next + JSON bundles. Decision artifact: ADR in docs/.

## Done

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
