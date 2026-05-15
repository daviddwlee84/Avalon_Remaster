# Avalon PWA — Implementation Plan

## Context

我們要從零打造一個現代化的 **Avalon (The Resistance)** PWA。
- **遊戲規則**: 1:1 復刻 `references/Avalon/` 那個 Socket.io + 純 JS 的繁中版本（5-10人、8 種角色、5 輪任務、湖中女神、刺殺等）。
- **連線架構**: 借鏡 `references/Chinese-Chess_Xiangqi/` 的 **transport-agnostic Room state machine** pattern —— 同一份 `GameRoom` 程式碼可以同時跑在 Net 模式的 Bun 伺服器上（peer 是 WebSocket connection）和 LAN 模式 host 的瀏覽器裡（peer 是 WebRTC DataChannel）。
- **理由**: 原專案的 client.js / index.js 各自 1000+ 行、全域變數爆炸、Chinese-only hardcode、無 type safety、無測試。Avalon 是先天多人遊戲（沒有單機多人 share screen 的可能），所以連線層必須堅固。
- **使用者意圖**: "for fun project, 先求復現效果，再美化 UI，再加複雜功能"。我們要做出**架構乾淨但不過度設計**的版本，每個 phase 結束都必須是可以玩的狀態。

## Tech Stack (locked)

| 層 | 選擇 | 理由 |
|---|---|---|
| Frontend | SvelteKit 2 + Svelte 5 (runes) + Vite + TypeScript | 輕量、reactivity 適合 board game、PWA 友善 |
| Backend (Net mode) | Bun + Hono + `Bun.serve` 原生 WebSocket | 單一 runtime、啟動快、TS 原生 |
| Monorepo | **Bun workspaces** (Bun 從 v0.5 支援 npm 風格 workspaces，`"workspaces": ["packages/*"]`) | 全 stack 統一 toolchain |
| UI | Tailwind CSS v4 + shadcn-svelte | 現代感、copy-paste 元件、客製空間大 |
| i18n | **paraglide-js** (SvelteKit-native, tree-shakeable per-locale bundles) | zh-TW + en day 1 |
| 訊息協定 | Zod discriminated unions（單一 schema 同時給 server / client / 測試共用）| runtime 驗證 + TS 型別自動推導 |
| PWA | `@vite-pwa/sveltekit` (`registerType: "prompt"`, 避免遊戲中無感重整) | 標準方案 |
| LAN | WebRTC DataChannel + mDNS `.local` ICE candidates + **QR + 手動 paste 雙通道** | 無 signalling server，跟 chess-web 一樣 |
| 測試 | Vitest (game-core) + Playwright (多 browser context 模擬 5-10 玩家) | 已裝 playwright-cli skill |

## Workspace 結構

```
Avalon_Remaster/
├── package.json                 # workspaces: ["packages/*"]
├── tsconfig.base.json           # project refs
├── packages/
│   ├── game-core/               # @avalon/game-core — 純 TS 引擎，0 I/O
│   ├── protocol/                # @avalon/protocol — Zod schemas, 共用型別
│   ├── web/                     # @avalon/web — SvelteKit PWA
│   ├── server/                  # @avalon/server — Bun + Hono Net mode
│   └── tui/                     # @avalon/tui — Backlog 佔位（未來用 Ink）
├── references/                  # 既有 submodules，唯讀
└── docs/, backlog/, pitfalls/   # project-knowledge-harness 結構
```

**Import 方向（不可逆）**: `game-core ← protocol ← {web, server, tui}`

理由：
- `game-core` 要在瀏覽器、Bun、Vitest 都能跑，所以零外部依賴（除了選用 zod）
- `protocol` 拆出來確保 server / client 不會 wire format drift
- `web` 和 `server` 平行，不互相 import

## 核心型別（節錄）

### Roles & Phase
```ts
// @avalon/game-core/src/types.ts
export enum Role {
  Merlin, Percival, LoyalServant,
  Assassin, Morgana, Mordred, Oberon, Minion,
}
export type Alignment = "good" | "evil";
export type Phase =
  | "lobby" | "role_reveal"
  | "team_selection" | "team_vote"
  | "quest" | "quest_reveal"
  | "lady_of_lake" | "assassination" | "finished";
```

### GameState（伺服器權威）
完整、可序列化、含 `rngSeed` 以便測試 determinism。包含 `players`, `currentRound`, `captainSeat`, `consecutiveRejections`, `proposedTeam`, `pendingApproveVotes`, `pendingQuestVotes`, `questHistory`, `winner`, `winReason`。

### PlayerView（per-player 投影）
**最關鍵的安全機制** —— 跟 chess-net 的 `PlayerView::project()` 一模一樣的角色：每個 `ServerMsg` 帶的不是 `GameState`，而是一個 per-recipient 的 `PlayerView`，過濾掉這個玩家不該看到的資訊（其他人的角色、任務票誰投了什麼）。

```ts
export function projectView(state: GameState, viewer: PlayerId): PlayerView;
```

**強制 Vitest property test**: 對任意可達的 `GameState`，`JSON.stringify(projectView(state, p))` 不得包含其他玩家的角色名稱字串。對應 chess-net 的 `tests/view_projection.rs` no-leak proptest。

### 訊息協定（Zod）
```ts
// @avalon/protocol
ClientMsg = Hello | CreateRoom | JoinRoom | LeaveRoom | StartGame
          | ProposeTeam | VoteTeam | VoteQuest
          | UseLadyOfLake | NominateAssassinTarget | Chat | Ping

ServerMsg = Welcome | RoomList | RoomJoined
          | GameStateUpdate { state: PlayerView }
          | RoleReveal { state: PlayerView }
          | QuestResult | ChatLine | ChatHistory | Error | Pong
```

## GameRoom API（transport-agnostic）

直接對應 chess-net 的 `Room::apply`：

```ts
// @avalon/game-core/src/room.ts
export interface Outbound { peer: PeerId; msg: ServerMsg; }

export class GameRoom {
  constructor(roomId: string, config: RoomConfig, rng: () => number);
  addPeer(peerId: PeerId, displayName: string): Outbound[];
  removePeer(peerId: PeerId): Outbound[];
  apply(peerId: PeerId, msg: ClientMsg): Outbound[];   // 單一進入點
  summary(): RoomSummary;
}
```

**關鍵不變式**: 所有帶狀態的 `ServerMsg` 都在 `GameRoom` 內部就先 project 完才跨過 transport 邊界。Bun server 和 LAN host 只負責把 `Outbound[]` 的 bytes 送出去，**不會**碰投影邏輯。

## Transport 層

```ts
// @avalon/web/src/lib/transport/types.ts
export interface Session {
  transport: { send(msg: ClientMsg): boolean; close(): void };
  incoming: { subscribe: (h: (msg: ServerMsg) => void) => () => void };
  state: Readable<ConnState>;
}
```

三種實作：
- **`WsTransport`** (Net mode) — 包 browser WebSocket
- **`WebRtcTransport`** (LAN joiner) — 包 `RTCDataChannel`
- **`HostRoomBridge`** (LAN host) — 內含 `GameRoom` + peer 路由表 (`Map<PeerId, PeerSink>` 其中 sink 可能是 local queue / RTCDataChannel / mock)；對自己的 UI 也提供同樣的 `Session` 介面

**`/play/[roomId]` 路由完全不知道底下是 WS 還是 DC** —— 只透過 Svelte context 拿到 `Session`。

### LAN signalling (QR + 手動 paste 都支援)
SDP 用 JSON envelope 包裹（避免聊天 app 把 CRLF 弄壞），envelope 內含 `RoomConfig` 預覽。
- **QR**: `qrcode` 套件產生 / BarcodeDetector API + `jsqr` fallback 掃描
- **手動 paste**: `<textarea>` 對拷 + Copy 按鈕

## SvelteKit 路由

| Route | 用途 |
|---|---|
| `/` | 模式選擇器（Net / LAN host / LAN join / Tutorial / Settings） |
| `/lobby` | Net mode 房間列表 |
| `/play/[roomId]` | **遊戲主畫面，mode-agnostic**（從 context 拿 Session） |
| `/lan/host` | 產生 offer QR、收 answer、累積 joiner |
| `/lan/join` | 掃 QR 或貼 offer、回 answer |
| `/tutorial` | 規則 + 角色卡 |
| `/settings` | 語言、音效、reduce-motion、顯示名稱 |

## 分階段交付（每 phase 結束都可玩）

### Phase 1 — 最小可玩版（Net mode only, 1-2 週)
- Workspace skeleton 建好
- `@avalon/game-core`: `Role` enum + 5-player 最小設定（Merlin + 2 Loyal + Assassin + Minion）+ 完整 happy path 規則引擎 + `projectView()` 含 no-leak proptest
- `@avalon/protocol`: Zod schemas
- `@avalon/server`: Bun + Hono + `Bun.serve` WebSocket, 單一預設房
- `@avalon/web`: SvelteKit shell, 三個路由可動但 UI 極簡（黑字白底原生 button）
- 直接 copy `references/Avalon/image/*` 到 `static/`（fun project, 不擔 copyright）
- Vitest unit tests + Playwright 5-browser-context smoke test
- `bun run dev` 一條龍

**明確不在範圍**: LAN、Lady of the Lake、Mordred/Morgana/Oberon/Percival、i18n、音效、PWA polish、reconnection

### Phase 2 — UI 美化（1-2 週）
- shadcn-svelte 元件接好（Button/Card/Dialog/Sheet/Tabs/Tooltip/Toast）
- Tailwind v4 主題：parchment-and-gold Avalon 風
- 角色卡翻牌動畫（純 CSS `transform-style: preserve-3d`）
- Quest token 條 + 任務結果動畫
- Captain 皇冠 + 脈動
- 投票揭曉序列動畫
- 音效（vote/quest-result/game-end，受 settings 開關控制）
- 響應式：320px → 1440px

### Phase 3 — 全角色 + 湖中女神（1 週）
- 8 種角色全進 distribution dialog
- `projectView()` 處理 Mordred / Morgana / Oberon 的可見性（重 property test 區）
- 湖中女神：rounds 3-5 with 7+ players 時的 `phase: "lady_of_lake"` 硬中斷
- 8-10p 第 4 輪 `twoFailsRequired` 規則

### Phase 4 — LAN 模式（WebRTC + QR）（2 週，**最高風險**)
- WebRTC + mDNS `.local` (host browser 即 server)
- QR generation + scanning (BarcodeDetector + `jsqr` fallback)
- 手動 paste fallback
- Host 逐個加入 joiner、達到人數 N 後 Start Game
- 真實 LAN 測試（2 手機 + 1 筆電）
- 把 router AP-isolation 等 gotcha 寫進 `pitfalls/`

### Phase 5 — PWA 完整化（1 週）
`@vite-pwa/sveltekit` 配置：
- `registerType: "prompt"` （絕對不能讓 SW 把遊戲中的玩家無聲重整）
- Precache: app shell + role cards + audio sprite + 預設 locale
- Runtime cache: 其他 locale bundle、字型
- `navigateFallbackDenylist: [/^\/ws/, /^\/api/]` 不攔截 WebSocket
- iOS Safari "Add to Home Screen" 指示圖層
- Offline 偵測 + LAN 模式提示

### Phase 6 — i18n + 無障礙（1 週）
- paraglide-js（建議優於 typesafe-i18n —— 詳見 Risks）
- zh-TW + en 完整翻譯（zh-TW 直接從 `references/Avalon/` 抓現成繁中）
- 鍵盤導航、ARIA、reduce-motion

### Phase 7 — 重連 + 觀戰者（1-2 週）
- Server: WebSocket close 後保留座位 60s grace，憑 localStorage `playerId` token 重連
- Spectator 模式：read-only, 看公開狀態, `knownAlignments` 一律空

### Backlog — Phase 8: TUI client
不在這個 plan scope 內。等到要做時建議用 **Ink (React-for-CLI)** + Bun JSX，因為 Ink 的元件模型可以直接套用我們現有的 view-projection pattern。

## 關鍵檔案（執行時優先參考）

設計層面：
- `references/Chinese-Chess_Xiangqi/crates/chess-net/src/room.rs` — `Room::apply` pattern 的 ground truth
- `references/Chinese-Chess_Xiangqi/crates/chess-net/src/protocol.rs` — tagged enum 訊息協定
- `references/Chinese-Chess_Xiangqi/clients/chess-web/src/transport/mod.rs` — `Session` 抽象
- `references/Chinese-Chess_Xiangqi/clients/chess-web/src/transport/webrtc.rs` — WebRTC 設定 + ICE timeout
- `references/Chinese-Chess_Xiangqi/clients/chess-web/src/host_room.rs` — LAN host-as-server pattern

規則層面：
- `references/Avalon/index.js` — 5-10p 角色配置表、quest team size 表、特殊規則（在 line 526-580 一帶）
- `references/Avalon/client.js` — 既有 UI 流程順序
- `references/Avalon/image/*` — 角色卡 / 棋盤 / token 美術直接拿來用

## 驗證計畫（Verification）

每個 phase 結束跑：

1. **Vitest** (`bun test`)
   - `game-core` 單元測試（每個 `ClientMsg` variant 一檔，加 driver-style 完整對局）
   - Property tests with `fast-check`:
     - role-leak（任意 state 的任意 projection 不含其他人角色字串）
     - Merlin 看不到 Mordred
     - 5 連否決一定 evil 贏
   - 目標 200+ tests, <1s 總時間

2. **Playwright** (`bun playwright test`)
   - 用 `globalSetup` 起 `@avalon/server`，多 browser context 模擬 5-10 玩家
   - Happy path（rigged seed 確保結果可預測）
   - 5 連否決 → evil 贏
   - 刺殺 Merlin → evil 贏
   - LAN handshake e2e（兩個 context 互相手動 paste SDP）

3. **手動測試**（每個 phase）
   - `bun run dev` 開五個 tab 自己對打
   - Phase 4+: 真實 LAN，至少 2 手機 + 1 筆電
   - Phase 5: Chrome / Safari / Firefox 都裝得起來、離線狀態下 LAN 模式還能用

## 風險 / 待確認

1. **paraglide-js 成熟度** — 推薦但要在 Phase 1 先用 hello-world 試試；萬一有 critical bug 改回 i18next + JSON
2. **WebRTC SDP QR 可靠性** — 純 LAN mDNS SDP ~1KB 沒問題，但加上 STUN 可能 >2KB 讓 QR 失敗。Phase 4 要在 iOS Safari / Android Chrome / Android Firefox 三平台實測
3. **Bun WebSocket 生產成熟度** — `Bun.serve` 比 Node `ws` 快但 close-frame 處理有過 subtle bug。Phase 1 末做 30 分鐘 soak test。Fallback 是 `hono/node-server` + `ws`
4. **湖中女神 phase 模型** —— 我推薦做**硬中斷** phase（簡單、貼近實體遊戲）。Phase 3 開工前再跟使用者確認
5. **Reconnect 身份驗證** — 純 localStorage token 對 friend-only fun project OK，跟 chess-net 的「password is plain-text friend-lock」一樣立場。如果之後公開部署需要再加真正 session token

## Phase 1 啟動清單（按順序）

1. 在 root 寫 `package.json` (`"workspaces": ["packages/*"]`, `"private": true`) + `tsconfig.base.json` + `.gitignore` + `.editorconfig`
2. `mkdir -p packages/{game-core,protocol,web,server,tui}` 各放 `package.json`
3. `@avalon/game-core`: types.ts, rules.ts (distribution / quest-size tables), room.ts (`GameRoom` 最小 happy path), view.ts (`projectView`)
4. Vitest 設好，先寫 role-leak property test 當北極星
5. `@avalon/protocol`: Zod schemas
6. `@avalon/server`: Bun + Hono + `Bun.serve` WebSocket; 單一預設房；只接 Hello/Join/Start/ProposeTeam/VoteTeam/VoteQuest
7. `@avalon/web`: SvelteKit + Tailwind 安裝；`/`, `/lobby`, `/play/[roomId]` 三條最小路由；Svelte 5 runes 寫一個 `connectionStore.svelte.ts`
8. 把 `references/Avalon/image/*` 複製進 `packages/web/static/images/`
9. Playwright 多 context smoke test：5 個 tab 跑完一局
10. README + `docs/architecture.md` 記錄當下狀態

最終狀態：`bun run dev` 一條命令、開 5 個 browser tab、可以跑完一局 5 人 Avalon。
