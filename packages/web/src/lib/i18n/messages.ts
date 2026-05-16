/**
 * In-house i18n harness. zh-TW is the default; en is the fallback.
 *
 * Why no library: paraglide-js' tree-shaking benefit is marginal at this
 * codebase size (~3000 LoC UI). A 200-line dictionary keeps the diff
 * reviewable and removes a build-step dependency. If we outgrow it, the
 * key/value shape here is what paraglide-js wants anyway — see the P3
 * TODO "paraglide-js viability spike".
 *
 * Translations canonicalised from references/Avalon/index.js + client.js.
 * Role names follow the audience-familiar 好人 / 壞人 / 梅林 set instead of
 * the more literal 忠臣 / 叛徒 etc.
 */
export const LOCALES = ['zh-TW', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export type Messages = Record<string, string>;

const zhTW: Messages = {
  // Home page
  'home.tagline': 'The Resistance · 現代 PWA',
  'home.displayName': '玩家名稱',
  'home.displayName.placeholder': '亞瑟',
  'home.roomName': '房間名稱',
  'home.roomName.placeholder': 'main',
  'home.joinRoom': '加入房間',
  'home.createRoom': '建立房間',
  'home.lan.section': 'LAN 模式',
  'home.lan.description': '免伺服器。同一個 WiFi 下兩個瀏覽器交換一次 SDP 就能對局。',
  'home.lan.host': '主機 LAN 對局',
  'home.lan.join': '加入 LAN 對局',
  'home.viewRooms': '查看房間列表',
  'home.locale.switch': '語言',
  'home.locale.zh': '繁中',
  'home.locale.en': 'English',

  // Lobby route
  'lobby.title': '房間列表',
  'lobby.connection.label': '連線',
  'lobby.empty': '目前沒有開啟中的房間。',
  'lobby.back': '← 返回',
  'lobby.join': '加入',
  'lobby.playerCount.one': '{n} 位玩家',
  'lobby.playerCount.many': '{n} 位玩家',

  // CreateRoomForm
  'create.title': '建立房間',
  'create.roomName': '房間名稱',
  'create.roomName.placeholder': 'cliff',
  'create.specials.legend': '特殊角色',
  'create.specials.mordred.label': '莫德雷德',
  'create.specials.mordred.desc': '邪惡。對梅林隱形。',
  'create.specials.morgana.label': '莫甘娜 + 派西維爾',
  'create.specials.morgana.desc': '加入派西維爾（好）與莫甘娜（壞）。派西維爾無法區分兩者。',
  'create.specials.oberon.label': '奧伯倫',
  'create.specials.oberon.desc': '邪惡。對其他壞人隱形，但梅林看得到他。',
  'create.specials.lady.label': '湖中仙女',
  'create.specials.lady.desc': '第 2/3/4 輪結束後的硬中斷階段；持有人私下檢視一位玩家的陣營。需要 7+ 人。',
  'create.minPlayers.impossible': '組合不可行 — 任何支援的人數都塞不下這些特殊角色。',
  'create.minPlayers.fivePlus': '可在 5+ 人遊玩；預設組合對所有人數都成立。',
  'create.minPlayers.needAtLeast': '至少需要 {n} 位玩家才能開始。',
  'create.submit': '建立並加入',
  'create.cancel': '取消',

  // PlayLayout: status line
  'play.leave': '← 離開',
  'play.connecting': '連線到',
  'play.connection.label': '連線',
  'play.you': '你',
  'play.phase': '階段',
  'play.players.heading': '玩家',
  'play.back': '返回',

  // Phase headers
  'phase.lobby': '等待開始',
  'phase.role_reveal': '角色揭示',
  'phase.team_selection': '隊伍選擇',
  'phase.team_vote': '隊伍投票',
  'phase.quest': '任務進行',
  'phase.quest_reveal': '任務揭示',
  'phase.lady_of_lake': '湖中仙女',
  'phase.assassination': '暗殺',
  'phase.finished': '遊戲結束',

  // Lobby phase
  'play.lobby.seated.one': '{n} 位玩家已就座。',
  'play.lobby.seated.many': '{n} 位玩家已就座。',
  'play.lobby.youAreHost': '你是房主。',
  'play.lobby.waiting': '等待房主開始…',
  'play.lobby.startGame': '開始遊戲',

  // Team selection
  'play.team_selection.captain': '隊長 {name} 提名隊伍',
  'play.team_selection.captain.instruction': '請選擇 {n} 位玩家加入隊伍。已選：',
  'play.team_selection.waiting': '等待隊長 {name} 提名 {n} 位的隊伍…',
  'play.team_selection.propose': '提名隊伍',

  // Team vote
  'play.team_vote.heading': '對隊伍投票',
  'play.team_vote.proposedTeam': '提名隊伍：',
  'play.team_vote.approve': '✓ 同意',
  'play.team_vote.reject': '✗ 拒絕',
  'play.team_vote.youVoted': '你投了：',
  'play.team_vote.approved': '同意',
  'play.team_vote.rejected': '拒絕',
  'play.team_vote.waiting': '等待其他人投票…',
  'play.team_vote.votesIn': '已投票',

  // Quest
  'play.quest.heading': '任務進行中',
  'play.quest.youAreOnTeam': '你在這次任務隊伍上。請祕密投票：',
  'play.quest.success': '✓ 成功',
  'play.quest.fail': '✗ 失敗',
  'play.quest.youVoted': '你投了',
  'play.quest.waiting.team': '等待其他隊員投票…',
  'play.quest.waiting.outsider': '任務隊伍正在投票。',
  'play.quest.submitted': '已投票',
  'play.quest.twoFailsBanner.title': '⚠ 第 4 輪特殊規則',
  'play.quest.twoFailsBanner.body': '需要 {bold} 才能讓任務失敗。',
  'play.quest.twoFailsBanner.boldText': '2 張失敗票',
  'play.quest.twoFailsBadge': '⚠ 本輪需 2 張失敗票才會失敗',

  // Assassination
  'play.assassination.heading': '暗殺',
  'play.assassination.instruction': '好人贏了 3 次任務。選擇目標 — 射中梅林則邪惡逆轉勝。',
  'play.assassination.waiting': '等待刺客選擇目標…',

  // Finished
  'play.finished.heading': '遊戲結束',
  'play.win.good': '好人勝利',
  'play.win.evil': '邪惡勝利',
  'play.winReason.three_quests_good': '三次任務成功',
  'play.winReason.three_quests_evil': '三次任務失敗',
  'play.winReason.five_rejections': '五次隊伍被拒',
  'play.winReason.assassin_hit_merlin': '刺客找到梅林',
  'play.winReason.assassin_missed': '刺客失手',

  // Lady of the Lake
  'play.lady.heading': '🌊 湖中仙女',
  'play.lady.instruction': '你持有湖中仙女。選擇一位玩家私下檢視其陣營。',
  'play.lady.alreadyInspected': '已檢視過：',
  'play.lady.waiting': '等待 {name} 檢視玩家…',

  // Role card reveal
  'role.yourRole': '你的角色',
  'role.button': '我準備好了',
  'role.alignment.good': '亞瑟的忠臣',
  'role.alignment.evil': '莫德雷德的爪牙',
  'role.youSee': '你看見',
  'role.name.Merlin': '梅林',
  'role.name.Percival': '派西維爾',
  'role.name.LoyalServant': '好人',
  'role.name.Assassin': '刺客',
  'role.name.Morgana': '莫甘娜',
  'role.name.Mordred': '莫德雷德',
  'role.name.Oberon': '奧伯倫',
  'role.name.Minion': '壞人',
  'role.tag.evil': '邪惡',
  'role.tag.good': '善良',
  'role.tag.merlinLike': '梅林或莫甘娜',

  // Lady result
  'lady.heading': '湖中仙女',
  'lady.inspecting': '檢視 {name}',
  'lady.alignment.good': 'GOOD',
  'lady.alignment.evil': 'EVIL',
  'lady.alignment.good.sub': '亞瑟的忠臣',
  'lady.alignment.evil.sub': '莫德雷德的爪牙',
  'lady.button': '保守祕密',

  // Quest panel sidebar
  'sidebar.quests': '任務',
  'sidebar.round': '回合',
  'sidebar.teamSize': '隊伍人數',
  'sidebar.rejections': '拒絕',
  'sidebar.chat.label': '聊天',
  'sidebar.chat.empty': '尚無訊息。',
  'sidebar.chat.placeholder': '輸入訊息…',
  'sidebar.chat.send': '送出',

  // Toasts
  'toast.questResult.success': '第 {round} 輪：成功（{n} 張失敗票）',
  'toast.questResult.fail': '第 {round} 輪：失敗（{n} 張失敗票）',

  // LAN host page
  'lan.host.title': '主機 LAN 對局',
  'lan.host.back': '← 返回',
  'lan.host.inviting.title': '邀請玩家',
  'lan.host.seated.heading': '已就座',
  'lan.host.seated.count': '{n}/5–10 位玩家已就座。',
  'lan.host.invite.button': '邀請下一位玩家',
  'lan.host.enterGame.button': '進入遊戲',
  'lan.host.tip':
    '提示：每次邀請是一次性的 offer/answer 交換。在加入者裝置打開 /lan/join，貼上 offer，把 answer 貼回來。',
  'lan.host.step1': '1 · 把這串 offer 傳給加入者',
  'lan.host.copyOffer': '複製 offer',
  'lan.host.step2': '2 · 貼上加入者回傳的 answer',
  'lan.host.joinerName': '加入者名稱',
  'lan.host.answer.placeholder': '{"type":"answer","sdp":"..."}',
  'lan.host.accept': '接受 answer',
  'lan.host.cancel': '取消',
  'lan.host.offerError': '產生 offer 失敗：{msg}',
  'lan.host.nameRequired': '請先輸入加入者的名稱。',
  'lan.host.dcTimeout': 'DataChannel 未在 10 秒內開啟。兩台裝置是否都在同一個 LAN，且沒有開啟 VPN？',
  'lan.qr.scan': '掃描 QR Code',
  'lan.qr.scanOffer': '掃描主機 offer',
  'lan.qr.scanAnswer': '掃描加入者 answer',
  'lan.qr.offerLabel': 'Offer · 給加入者掃描',
  'lan.qr.answerLabel': 'Answer · 給主機掃描',
  'lan.qr.alignHint': '把鏡頭對準對方螢幕上的 QR Code。',
  'lan.qr.close': '關閉',
  'lan.qr.cameraUnavailable': '此瀏覽器無法存取相機。請手動貼上文字。',

  // LAN join page
  'lan.join.title': '加入 LAN 對局',
  'lan.join.pasteOffer': '貼上主機的 offer',
  'lan.join.offer.placeholder': '{"type":"offer","sdp":"..."}',
  'lan.join.generate': '產生 answer',
  'lan.join.generating': '產生中…',
  'lan.join.nameRequired': '請先輸入名稱。',
  'lan.join.sendAnswer.title': '把這串 answer 傳給主機',
  'lan.join.copyAnswer': '複製 answer',
  'lan.join.answerNote': '主機收到並接受後，連線會自動開啟，你就會看到遊戲畫面。',
  'lan.join.iSentIt': '我已傳送 — 進入遊戲',
  'lan.join.displayName': '玩家名稱',

  // PWA + offline
  'pwa.update.title': '新版本可用',
  'pwa.update.body': '已下載新版本。立刻重新整理或繼續玩 — 由你決定。',
  'pwa.update.reload': '立刻重整',
  'pwa.update.later': '稍後',
  'pwa.offlineReady': '可離線遊玩',
  'pwa.dismiss': '關閉',
  'offline.title': '⚠ 你目前離線',
  'offline.netPlay': 'Net 模式需要網路。試試 ',
  'offline.netPlay.link': 'LAN 模式',
  'offline.netPlay.tail': ' — 同一個 WiFi 就能玩，不需要伺服器。',
  'offline.lan': '完成 SDP 交換後，LAN 模式不需要網路也能玩。',
  'offline.generic': '網路恢復前 Net 模式不可用；LAN 模式仍正常運作。',
};

const en: Messages = {
  // Home
  'home.tagline': 'The Resistance · Modern PWA',
  'home.displayName': 'Display name',
  'home.displayName.placeholder': 'Arthur',
  'home.roomName': 'Room name',
  'home.roomName.placeholder': 'main',
  'home.joinRoom': 'Join room',
  'home.createRoom': 'Create room',
  'home.lan.section': 'LAN mode',
  'home.lan.description': 'No server. Two browsers on the same WiFi exchange SDP once and play.',
  'home.lan.host': 'Host LAN game',
  'home.lan.join': 'Join LAN game',
  'home.viewRooms': 'View room list',
  'home.locale.switch': 'Language',
  'home.locale.zh': '繁中',
  'home.locale.en': 'English',

  // Lobby
  'lobby.title': 'Rooms',
  'lobby.connection.label': 'Connection',
  'lobby.empty': 'No active rooms yet.',
  'lobby.back': '← Back',
  'lobby.join': 'Join',
  'lobby.playerCount.one': '{n} player',
  'lobby.playerCount.many': '{n} players',

  // CreateRoomForm
  'create.title': 'Create a room',
  'create.roomName': 'Room name',
  'create.roomName.placeholder': 'cliff',
  'create.specials.legend': 'Special roles',
  'create.specials.mordred.label': 'Mordred',
  'create.specials.mordred.desc': 'Evil. Hidden from Merlin.',
  'create.specials.morgana.label': 'Morgana + Percival',
  'create.specials.morgana.desc':
    'Adds Percival (good) and Morgana (evil). Percival sees both as Merlin-like.',
  'create.specials.oberon.label': 'Oberon',
  'create.specials.oberon.desc': 'Evil. Hidden from other evil. Merlin sees him.',
  'create.specials.lady.label': 'Lady of the Lake',
  'create.specials.lady.desc':
    'Hard-interrupt phase after rounds 2/3/4: holder learns one target\'s alignment privately. Requires 7+ players.',
  'create.minPlayers.impossible':
    'This combination is impossible — too many special roles for any supported player count.',
  'create.minPlayers.fivePlus':
    'Playable from 5+ players · default settings work for any group.',
  'create.minPlayers.needAtLeast': 'Needs at least {n} players to start.',
  'create.submit': 'Create & join',
  'create.cancel': 'Cancel',

  // PlayLayout
  'play.leave': '← Leave',
  'play.connecting': 'Connecting to',
  'play.connection.label': 'Connection',
  'play.you': 'You',
  'play.phase': 'Phase',
  'play.players.heading': 'Players',
  'play.back': 'Back',

  // Phase headers
  'phase.lobby': 'Lobby',
  'phase.role_reveal': 'Role reveal',
  'phase.team_selection': 'Team selection',
  'phase.team_vote': 'Team vote',
  'phase.quest': 'Quest',
  'phase.quest_reveal': 'Quest reveal',
  'phase.lady_of_lake': 'Lady of the Lake',
  'phase.assassination': 'Assassination',
  'phase.finished': 'Finished',

  // Lobby phase
  'play.lobby.seated.one': '{n} player seated.',
  'play.lobby.seated.many': '{n} players seated.',
  'play.lobby.youAreHost': 'You are the host.',
  'play.lobby.waiting': 'Waiting for host to start…',
  'play.lobby.startGame': 'Start game',

  // Team selection
  'play.team_selection.captain': 'Captain {name} proposes',
  'play.team_selection.captain.instruction': 'Pick exactly {n} players. Selected:',
  'play.team_selection.waiting': 'Waiting for captain {name} to pick a team of {n}…',
  'play.team_selection.propose': 'Propose team',

  // Team vote
  'play.team_vote.heading': 'Vote on the proposal',
  'play.team_vote.proposedTeam': 'Proposed team:',
  'play.team_vote.approve': '✓ Approve',
  'play.team_vote.reject': '✗ Reject',
  'play.team_vote.youVoted': 'You voted:',
  'play.team_vote.approved': 'Approve',
  'play.team_vote.rejected': 'Reject',
  'play.team_vote.waiting': 'Waiting for others…',
  'play.team_vote.votesIn': 'Votes in',

  // Quest
  'play.quest.heading': 'Quest underway',
  'play.quest.youAreOnTeam': 'You are on this quest. Vote secretly:',
  'play.quest.success': '✓ Success',
  'play.quest.fail': '✗ Fail',
  'play.quest.youVoted': 'You voted',
  'play.quest.waiting.team': 'Waiting for the rest of the team…',
  'play.quest.waiting.outsider': 'Quest team is voting.',
  'play.quest.submitted': 'Submitted',
  'play.quest.twoFailsBanner.title': '⚠ Round 4 special',
  'play.quest.twoFailsBanner.body': '{bold} are required to fail this quest.',
  'play.quest.twoFailsBanner.boldText': '2 fail votes',
  'play.quest.twoFailsBadge': '⚠ 2 fails required to fail this round',

  // Assassination
  'play.assassination.heading': 'Assassination',
  'play.assassination.instruction':
    'Good has won 3 quests. Choose your target — strike Merlin and evil still wins.',
  'play.assassination.waiting': 'Waiting for the Assassin to pick their target…',

  // Finished
  'play.finished.heading': 'Game over',
  'play.win.good': 'Good wins',
  'play.win.evil': 'Evil wins',
  'play.winReason.three_quests_good': 'three quests succeeded',
  'play.winReason.three_quests_evil': 'three quests failed',
  'play.winReason.five_rejections': 'five team rejections',
  'play.winReason.assassin_hit_merlin': 'Assassin found Merlin',
  'play.winReason.assassin_missed': 'Assassin missed Merlin',

  // Lady
  'play.lady.heading': '🌊 Lady of the Lake',
  'play.lady.instruction':
    'You hold the Lady. Choose a player to learn their true allegiance — privately.',
  'play.lady.alreadyInspected': 'Already inspected:',
  'play.lady.waiting': 'Waiting for {name} to inspect a player…',

  // Role card reveal
  'role.yourRole': 'Your role',
  'role.button': 'I am ready',
  'role.alignment.good': 'Loyal Servant of Arthur',
  'role.alignment.evil': 'Servant of Mordred',
  'role.youSee': 'You see',
  'role.name.Merlin': 'Merlin',
  'role.name.Percival': 'Percival',
  'role.name.LoyalServant': 'Loyal Servant',
  'role.name.Assassin': 'Assassin',
  'role.name.Morgana': 'Morgana',
  'role.name.Mordred': 'Mordred',
  'role.name.Oberon': 'Oberon',
  'role.name.Minion': 'Minion',
  'role.tag.evil': 'Evil',
  'role.tag.good': 'Good',
  'role.tag.merlinLike': 'Merlin or Morgana',

  // Lady result
  'lady.heading': 'Lady of the Lake',
  'lady.inspecting': 'Inspecting {name}',
  'lady.alignment.good': 'GOOD',
  'lady.alignment.evil': 'EVIL',
  'lady.alignment.good.sub': 'Loyal to Arthur',
  'lady.alignment.evil.sub': 'Servant of Mordred',
  'lady.button': 'Keep it secret',

  // Sidebar
  'sidebar.quests': 'Quests',
  'sidebar.round': 'Round',
  'sidebar.teamSize': 'Team size',
  'sidebar.rejections': 'Rejections',
  'sidebar.chat.label': 'Chat',
  'sidebar.chat.empty': 'No messages yet.',
  'sidebar.chat.placeholder': 'Type a message…',
  'sidebar.chat.send': 'Send',

  // Toasts
  'toast.questResult.success': 'Round {round}: SUCCESS ({n} fail{s})',
  'toast.questResult.fail': 'Round {round}: FAIL ({n} fail{s})',

  // LAN
  'lan.host.title': 'Host a LAN game',
  'lan.host.back': '← Back',
  'lan.host.inviting.title': 'Inviting players',
  'lan.host.seated.heading': 'Seated',
  'lan.host.seated.count': '{n}/5–10 players seated.',
  'lan.host.invite.button': 'Invite next player',
  'lan.host.enterGame.button': 'Enter game',
  'lan.host.tip':
    'Tip: each invite is a one-shot offer/answer dance. Open /lan/join on the joiner\'s device, paste the offer, paste the answer back.',
  'lan.host.step1': '1 · Send this offer to the joiner',
  'lan.host.copyOffer': 'Copy offer',
  'lan.host.step2': '2 · Paste the joiner\'s answer',
  'lan.host.joinerName': 'Joiner display name',
  'lan.host.answer.placeholder': '{"type":"answer","sdp":"..."}',
  'lan.host.accept': 'Accept answer',
  'lan.host.cancel': 'Cancel',
  'lan.host.offerError': 'Failed to generate offer: {msg}',
  'lan.host.nameRequired': 'Enter the joiner\'s display name first.',
  'lan.host.dcTimeout':
    'DataChannel did not open within 10 s. Are both devices on the same LAN with no VPN active?',
  'lan.qr.scan': 'Scan QR code',
  'lan.qr.scanOffer': "Scan host's offer",
  'lan.qr.scanAnswer': "Scan joiner's answer",
  'lan.qr.offerLabel': 'Offer · scan from joiner',
  'lan.qr.answerLabel': 'Answer · scan from host',
  'lan.qr.alignHint': 'Point the camera at the QR code on the other screen.',
  'lan.qr.close': 'Close',
  'lan.qr.cameraUnavailable':
    'This browser cannot access the camera. Paste the text manually instead.',

  'lan.join.title': 'Join a LAN game',
  'lan.join.pasteOffer': 'Paste the host\'s offer',
  'lan.join.offer.placeholder': '{"type":"offer","sdp":"..."}',
  'lan.join.generate': 'Generate answer',
  'lan.join.generating': 'Generating…',
  'lan.join.nameRequired': 'Enter a display name first.',
  'lan.join.sendAnswer.title': 'Send this answer to the host',
  'lan.join.copyAnswer': 'Copy answer',
  'lan.join.answerNote':
    'After the host pastes this into their tab and accepts, the connection opens automatically and you\'ll see the game.',
  'lan.join.iSentIt': 'I\'ve sent the answer — enter game',
  'lan.join.displayName': 'Display name',

  // PWA + offline
  'pwa.update.title': 'Update available',
  'pwa.update.body':
    'A new version has been downloaded. Reload now or keep playing on the old one — your choice.',
  'pwa.update.reload': 'Reload now',
  'pwa.update.later': 'Later',
  'pwa.offlineReady': 'Ready for offline play',
  'pwa.dismiss': 'dismiss',
  'offline.title': '⚠ You are offline',
  'offline.netPlay': 'Net mode needs internet. Try ',
  'offline.netPlay.link': 'LAN mode',
  'offline.netPlay.tail': ' — works on the same WiFi with no server.',
  'offline.lan': 'LAN mode works without internet once the SDP exchange is done.',
  'offline.generic': 'Net play is unavailable until you reconnect; LAN mode still works.',
};

const dictionaries: Record<Locale, Messages> = { 'zh-TW': zhTW, en };

/** Translate a key in the active locale. Falls back to en, then to the key itself. */
export function lookup(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  let raw = dictionaries[locale]?.[key];
  if (raw === undefined) raw = dictionaries.en[key];
  if (raw === undefined) return key;
  if (!vars) return raw;
  return raw.replaceAll(/\{(\w+)\}/g, (_, name) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

export function detectInitialLocale(): Locale {
  if (typeof navigator === 'undefined') return 'zh-TW';
  const langs = navigator.languages?.length
    ? navigator.languages
    : [navigator.language || 'zh-TW'];
  for (const lang of langs) {
    if (/^zh(-(TW|HK|Hant))?$/i.test(lang) || /^zh-Hant/i.test(lang)) return 'zh-TW';
    if (/^en\b/i.test(lang)) return 'en';
  }
  return 'zh-TW';
}
