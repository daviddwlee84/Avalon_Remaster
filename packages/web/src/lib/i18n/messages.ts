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
export const LOCALES = ['zh-TW', 'zh-CN', 'en'] as const;
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
  'home.locale.zhCn': '简中',
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

  // Help page
  'help.title': '規則速查',
  'help.button': '📖 規則',
  'help.back': '← 返回',
  'help.overview.title': '遊戲概述',
  'help.overview.body':
    '5–10 位玩家分為好人與壞人兩個陣營，進行 5 場任務。好人想完成 3 場任務，壞人則想讓 3 場任務失敗（或讓隊伍連續 5 次被否決，或在最後找出梅林）。每場任務需要 2–5 位玩家組隊執行；任務本身只有出隊的人能祕密投票，未出隊只能投票同意/拒絕該隊伍出戰。',
  'help.win.title': '勝利條件',
  'help.win.good.title': '好人勝利',
  'help.win.good.body':
    '完成 3 場任務 → 進入「暗殺階段」→ 如果刺客沒射中梅林，好人勝利。',
  'help.win.evil.title': '壞人勝利',
  'help.win.evil.body':
    '達成以下任一條件：（a）3 場任務失敗；（b）同一輪內 5 次提案隊伍都被否決；（c）暗殺階段刺客射中梅林。',
  'help.roles.title': '角色一覽',
  'help.roles.good': '好人陣營',
  'help.roles.evil': '壞人陣營',
  'help.role.merlin': '看得到「除了莫德雷德以外」的所有壞人。最大威脅但身份不能暴露 — 否則最後刺客會盯上你。',
  'help.role.percival': '看得到梅林與莫甘娜，但分不出哪個是哪個（兩者都顯示為「梅林或莫甘娜」）。',
  'help.role.loyalServant': '什麼都看不到。靠投票與行為推理找出壞人。',
  'help.role.assassin': '看得到其他壞人（奧伯倫除外）。任務結束後若好人贏了 3 場，由你嘗試暗殺梅林 — 射中則邪惡逆轉勝。',
  'help.role.morgana': '看得到其他壞人（奧伯倫除外）。對派西維爾偽裝成梅林。',
  'help.role.mordred': '看得到其他壞人（奧伯倫除外）。對梅林隱形 — 梅林看不到你。',
  'help.role.oberon': '看不到其他壞人，其他壞人也看不到你。但梅林看得到你。獨來獨往的破壞者。',
  'help.role.minion': '看得到其他壞人（奧伯倫除外）。沒有特殊能力的普通爪牙。',
  'help.teamSizes.title': '任務隊伍人數',
  'help.teamSizes.note': '括號內為玩家數。⚠ 為第 4 輪 7+ 人遊戲：該輪需要 2 張失敗票才會失敗。',
  'help.flow.title': '遊戲流程',
  'help.flow.body':
    '1. 大廳 → 房主開始遊戲\n2. 角色揭示 → 看自己的牌，記住看到的人\n3. 隊長選隊 → 提名 N 位玩家出任務\n4. 全體投票 → 同意則出任務；否決則隊長換下一位（連續 5 次否決 = 壞人勝）\n5. 任務 → 出隊玩家祕密投成功 / 失敗（好人不能投失敗）\n6. 結算 → 任意一張失敗 = 任務失敗（除第 4 輪 7+ 人需 2 張）\n7. 重複至 3 勝或 3 敗。若好人 3 勝 → 進入暗殺階段。',
  'help.lady.title': '湖中仙女',
  'help.lady.body':
    '7 人以上的遊戲可開啟。第 2/3/4 輪結束後進入硬中斷階段：持有人選擇一位玩家私下檢視陣營，被檢視者拿走湖中仙女，但「曾被檢視過」的人不能再被選。是好人陣營反向情報的關鍵。',
  'help.tips.title': '新手提示',
  'help.tips.body':
    '• 第一輪提名往往是觀察的窗口 — 看誰猶豫、誰急著加入。\n• 梅林說話太多會被刺客標記；說話太少又會被壞人輕鬆失敗任務。\n• 隊伍被否決的次數越多，壞人越接近勝利 — 不要為小事消耗。\n• 派西維爾看到的兩個「梅林或莫甘娜」中一個一定是真梅林 — 但要分辨需要長期觀察其行為。',

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
  'home.locale.zhCn': '简中',
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

  // Help
  'help.title': 'Rules & roles',
  'help.button': '📖 Rules',
  'help.back': '← Back',
  'help.overview.title': 'Overview',
  'help.overview.body':
    '5–10 players split into Good and Evil for 5 quests. Good wants 3 successful quests; Evil wants 3 failures (or 5 rejected team proposals in a row, or to find Merlin at the end). Each quest needs a team of 2–5 players; only team members vote secretly on the quest outcome — everyone else votes yes/no on whether the team gets to go.',
  'help.win.title': 'Win conditions',
  'help.win.good.title': 'Good wins',
  'help.win.good.body':
    '3 successful quests → Assassination phase → if the Assassin misses Merlin, Good wins.',
  'help.win.evil.title': 'Evil wins',
  'help.win.evil.body':
    'Any of: (a) 3 failed quests; (b) 5 consecutive team rejections in a single round; (c) Assassin hits Merlin in the Assassination phase.',
  'help.roles.title': 'Roles',
  'help.roles.good': 'Good faction',
  'help.roles.evil': 'Evil faction',
  'help.role.merlin': 'Sees every Evil player EXCEPT Mordred. Biggest threat but must stay hidden — the Assassin will hunt you down at the end.',
  'help.role.percival': 'Sees Merlin and Morgana, but cannot tell them apart (both show as "Merlin or Morgana").',
  'help.role.loyalServant': 'No special info. Reason from votes and behavior to find Evil.',
  'help.role.assassin': 'Sees other Evil (except Oberon). At the end, if Good has 3 successes, you try to identify Merlin — a hit flips the win to Evil.',
  'help.role.morgana': 'Sees other Evil (except Oberon). Appears as Merlin to Percival.',
  'help.role.mordred': 'Sees other Evil (except Oberon). Invisible to Merlin — Merlin cannot see you.',
  'help.role.oberon': 'Cannot see other Evil and they cannot see you. But Merlin sees you. A lone wolf saboteur.',
  'help.role.minion': 'Sees other Evil (except Oberon). A regular Evil player with no special ability.',
  'help.teamSizes.title': 'Quest team sizes',
  'help.teamSizes.note': 'Top row = player count. ⚠ Round 4 with 7+ players needs TWO fail votes to fail the quest.',
  'help.flow.title': 'Phase flow',
  'help.flow.body':
    '1. Lobby → host clicks Start\n2. Role reveal → look at your card and remember whom you see\n3. Team selection → captain proposes N players\n4. Team vote → majority approves means they go; rejection rotates the captain (5 rejections in a row = Evil wins)\n5. Quest → team members secretly vote success / fail (Good cannot fail)\n6. Resolve → any single fail = quest fails (except round 4 with 7+ where 2 are needed)\n7. Repeat until 3 wins or 3 losses. If Good hits 3 → Assassination.',
  'help.lady.title': 'Lady of the Lake',
  'help.lady.body':
    'Optional for 7+ player games. Hard-interrupt phase after rounds 2/3/4: holder picks one player to privately learn their alignment, then the Lady token transfers to the inspected player — but you cannot pick someone already inspected. Critical reverse-information piece for Good.',
  'help.tips.title': 'Beginner tips',
  'help.tips.body':
    '• Watch round 1 closely — who hesitates, who pushes to be on the team.\n• Merlin talking too much gets the Assassin\'s attention; too little lets Evil fail quests unchallenged.\n• Every rejection brings Evil closer to a 5-rejection win — do not burn proposals on petty disagreements.\n• Of the two "Merlin or Morgana" players Percival sees, exactly one is real Merlin — but distinguishing them takes patient observation of behavior.',

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

// Simplified Chinese — mirrors zh-TW key-for-key. Differences from zh-TW are
// mostly char conversion (繁→简) plus a handful of mainland-vs-Taiwan
// vocabulary picks (預設→默认, 設定→设置, 視訊→视频, 伺服器→服务器,
// 網路→网络, 連線→连接, 程式→程序, 顯示→显示, 訊息→消息).
const zhCN: Messages = {
  'home.tagline': 'The Resistance · 现代 PWA',
  'home.displayName': '玩家名称',
  'home.displayName.placeholder': '亚瑟',
  'home.roomName': '房间名称',
  'home.roomName.placeholder': 'main',
  'home.joinRoom': '加入房间',
  'home.createRoom': '创建房间',
  'home.lan.section': 'LAN 模式',
  'home.lan.description': '无需服务器。同一 WiFi 下两个浏览器交换一次 SDP 即可开局。',
  'home.lan.host': '主机 LAN 对局',
  'home.lan.join': '加入 LAN 对局',
  'home.viewRooms': '查看房间列表',
  'home.locale.switch': '语言',
  'home.locale.zh': '繁中',
  'home.locale.zhCn': '简中',
  'home.locale.en': 'English',

  'lobby.title': '房间列表',
  'lobby.connection.label': '连接',
  'lobby.empty': '当前没有进行中的房间。',
  'lobby.back': '← 返回',
  'lobby.join': '加入',
  'lobby.playerCount.one': '{n} 位玩家',
  'lobby.playerCount.many': '{n} 位玩家',

  'create.title': '创建房间',
  'create.roomName': '房间名称',
  'create.roomName.placeholder': 'cliff',
  'create.specials.legend': '特殊角色',
  'create.specials.mordred.label': '莫德雷德',
  'create.specials.mordred.desc': '邪恶。对梅林隐形。',
  'create.specials.morgana.label': '莫甘娜 + 派西维尔',
  'create.specials.morgana.desc': '加入派西维尔（好）与莫甘娜（坏）。派西维尔无法分辨两者。',
  'create.specials.oberon.label': '奥伯伦',
  'create.specials.oberon.desc': '邪恶。对其他坏人隐形，但梅林能看到他。',
  'create.specials.lady.label': '湖中仙女',
  'create.specials.lady.desc':
    '第 2/3/4 轮结束后的硬中断阶段；持有人私下查看一位玩家的阵营。需要 7+ 人。',
  'create.minPlayers.impossible': '组合不可行 — 所有支持的人数都装不下这些特殊角色。',
  'create.minPlayers.fivePlus': '5+ 人即可游玩；默认设置适用于任何人数。',
  'create.minPlayers.needAtLeast': '至少需要 {n} 位玩家才能开始。',
  'create.submit': '创建并加入',
  'create.cancel': '取消',

  'play.leave': '← 离开',
  'play.connecting': '正在连接到',
  'play.connection.label': '连接',
  'play.you': '你',
  'play.phase': '阶段',
  'play.players.heading': '玩家',
  'play.back': '返回',

  'phase.lobby': '等待开始',
  'phase.role_reveal': '角色揭示',
  'phase.team_selection': '队伍选择',
  'phase.team_vote': '队伍投票',
  'phase.quest': '任务进行',
  'phase.quest_reveal': '任务揭示',
  'phase.lady_of_lake': '湖中仙女',
  'phase.assassination': '暗杀',
  'phase.finished': '游戏结束',

  'play.lobby.seated.one': '{n} 位玩家已就座。',
  'play.lobby.seated.many': '{n} 位玩家已就座。',
  'play.lobby.youAreHost': '你是房主。',
  'play.lobby.waiting': '等待房主开始…',
  'play.lobby.startGame': '开始游戏',

  'play.team_selection.captain': '队长 {name} 提名队伍',
  'play.team_selection.captain.instruction': '请选择 {n} 位玩家加入队伍。已选：',
  'play.team_selection.waiting': '等待队长 {name} 提名 {n} 位的队伍…',
  'play.team_selection.propose': '提名队伍',

  'play.team_vote.heading': '对队伍投票',
  'play.team_vote.proposedTeam': '提名队伍：',
  'play.team_vote.approve': '✓ 同意',
  'play.team_vote.reject': '✗ 拒绝',
  'play.team_vote.youVoted': '你投了：',
  'play.team_vote.approved': '同意',
  'play.team_vote.rejected': '拒绝',
  'play.team_vote.waiting': '等待其他人投票…',
  'play.team_vote.votesIn': '已投票',

  'play.quest.heading': '任务进行中',
  'play.quest.youAreOnTeam': '你在本次任务队伍中。请秘密投票：',
  'play.quest.success': '✓ 成功',
  'play.quest.fail': '✗ 失败',
  'play.quest.youVoted': '你投了',
  'play.quest.waiting.team': '等待其他队员投票…',
  'play.quest.waiting.outsider': '任务队伍正在投票。',
  'play.quest.submitted': '已投票',
  'play.quest.twoFailsBanner.title': '⚠ 第 4 轮特殊规则',
  'play.quest.twoFailsBanner.body': '需要 {bold} 才能让任务失败。',
  'play.quest.twoFailsBanner.boldText': '2 张失败票',
  'play.quest.twoFailsBadge': '⚠ 本轮需 2 张失败票才会失败',

  'play.assassination.heading': '暗杀',
  'play.assassination.instruction': '好人赢了 3 场任务。选择目标 — 射中梅林则邪恶逆转胜。',
  'play.assassination.waiting': '等待刺客选择目标…',

  'play.finished.heading': '游戏结束',
  'play.win.good': '好人胜利',
  'play.win.evil': '邪恶胜利',
  'play.winReason.three_quests_good': '三场任务成功',
  'play.winReason.three_quests_evil': '三场任务失败',
  'play.winReason.five_rejections': '五次队伍被拒',
  'play.winReason.assassin_hit_merlin': '刺客找到梅林',
  'play.winReason.assassin_missed': '刺客失手',

  'play.lady.heading': '🌊 湖中仙女',
  'play.lady.instruction': '你持有湖中仙女。选择一位玩家私下查看其阵营。',
  'play.lady.alreadyInspected': '已查看过：',
  'play.lady.waiting': '等待 {name} 查看玩家…',

  'role.yourRole': '你的角色',
  'role.button': '我准备好了',
  'role.alignment.good': '亚瑟的忠臣',
  'role.alignment.evil': '莫德雷德的爪牙',
  'role.youSee': '你看见',
  'role.name.Merlin': '梅林',
  'role.name.Percival': '派西维尔',
  'role.name.LoyalServant': '好人',
  'role.name.Assassin': '刺客',
  'role.name.Morgana': '莫甘娜',
  'role.name.Mordred': '莫德雷德',
  'role.name.Oberon': '奥伯伦',
  'role.name.Minion': '坏人',
  'role.tag.evil': '邪恶',
  'role.tag.good': '善良',
  'role.tag.merlinLike': '梅林或莫甘娜',

  'lady.heading': '湖中仙女',
  'lady.inspecting': '查看 {name}',
  'lady.alignment.good': 'GOOD',
  'lady.alignment.evil': 'EVIL',
  'lady.alignment.good.sub': '亚瑟的忠臣',
  'lady.alignment.evil.sub': '莫德雷德的爪牙',
  'lady.button': '保守秘密',

  'sidebar.quests': '任务',
  'sidebar.round': '回合',
  'sidebar.teamSize': '队伍人数',
  'sidebar.rejections': '拒绝',
  'sidebar.chat.label': '聊天',
  'sidebar.chat.empty': '暂无消息。',
  'sidebar.chat.placeholder': '输入消息…',
  'sidebar.chat.send': '发送',

  'toast.questResult.success': '第 {round} 轮：成功（{n} 张失败票）',
  'toast.questResult.fail': '第 {round} 轮：失败（{n} 张失败票）',

  'lan.host.title': '主机 LAN 对局',
  'lan.host.back': '← 返回',
  'lan.host.inviting.title': '邀请玩家',
  'lan.host.seated.heading': '已就座',
  'lan.host.seated.count': '{n}/5–10 位玩家已就座。',
  'lan.host.invite.button': '邀请下一位玩家',
  'lan.host.enterGame.button': '进入游戏',
  'lan.host.tip':
    '提示：每次邀请是一次性的 offer/answer 交换。在加入者设备打开 /lan/join，粘贴 offer，把 answer 贴回来。',
  'lan.host.step1': '1 · 把这串 offer 传给加入者',
  'lan.host.copyOffer': '复制 offer',
  'lan.host.step2': '2 · 粘贴加入者回传的 answer',
  'lan.host.joinerName': '加入者名称',
  'lan.host.answer.placeholder': '{"type":"answer","sdp":"..."}',
  'lan.host.accept': '接受 answer',
  'lan.host.cancel': '取消',
  'lan.host.offerError': '生成 offer 失败：{msg}',
  'lan.host.nameRequired': '请先输入加入者的名称。',
  'lan.host.dcTimeout':
    'DataChannel 未在 10 秒内打开。两台设备是否都在同一 LAN，且未开启 VPN？',
  'lan.qr.scan': '扫描 QR 码',
  'lan.qr.scanOffer': '扫描主机 offer',
  'lan.qr.scanAnswer': '扫描加入者 answer',
  'lan.qr.offerLabel': 'Offer · 给加入者扫描',
  'lan.qr.answerLabel': 'Answer · 给主机扫描',
  'lan.qr.alignHint': '把镜头对准对方屏幕上的 QR 码。',
  'lan.qr.close': '关闭',
  'lan.qr.cameraUnavailable': '此浏览器无法访问摄像头。请手动粘贴文字。',

  'help.title': '规则速查',
  'help.button': '📖 规则',
  'help.back': '← 返回',
  'help.overview.title': '游戏概述',
  'help.overview.body':
    '5–10 位玩家分为好人与坏人两大阵营，进行 5 场任务。好人想完成 3 场任务，坏人则想让 3 场任务失败（或让队伍连续 5 次被否决，或在最后找出梅林）。每场任务需要 2–5 位玩家组队执行；任务本身只有出队的人能秘密投票，未出队只能投票同意/拒绝该队伍出战。',
  'help.win.title': '胜利条件',
  'help.win.good.title': '好人胜利',
  'help.win.good.body':
    '完成 3 场任务 → 进入「暗杀阶段」→ 如果刺客没射中梅林，好人胜利。',
  'help.win.evil.title': '坏人胜利',
  'help.win.evil.body':
    '达成以下任一条件：（a）3 场任务失败；（b）同一轮内 5 次提案队伍都被否决；（c）暗杀阶段刺客射中梅林。',
  'help.roles.title': '角色一览',
  'help.roles.good': '好人阵营',
  'help.roles.evil': '坏人阵营',
  'help.role.merlin': '能看到「除了莫德雷德之外」的所有坏人。是最大威胁但身份不能暴露 — 否则最后刺客会盯上你。',
  'help.role.percival': '能看到梅林与莫甘娜，但分不清哪个是哪个（两者都显示为「梅林或莫甘娜」）。',
  'help.role.loyalServant': '什么都看不到。靠投票与行为推理找出坏人。',
  'help.role.assassin': '能看到其他坏人（奥伯伦除外）。任务结束后若好人赢了 3 场，由你尝试暗杀梅林 — 射中则邪恶逆转胜。',
  'help.role.morgana': '能看到其他坏人（奥伯伦除外）。对派西维尔伪装成梅林。',
  'help.role.mordred': '能看到其他坏人（奥伯伦除外）。对梅林隐形 — 梅林看不到你。',
  'help.role.oberon': '看不到其他坏人，其他坏人也看不到你。但梅林能看到你。独来独往的破坏者。',
  'help.role.minion': '能看到其他坏人（奥伯伦除外）。没有特殊能力的普通爪牙。',
  'help.teamSizes.title': '任务队伍人数',
  'help.teamSizes.note': '括号内为玩家数。⚠ 为第 4 轮 7+ 人游戏：该轮需要 2 张失败票才会失败。',
  'help.flow.title': '游戏流程',
  'help.flow.body':
    '1. 大厅 → 房主开始游戏\n2. 角色揭示 → 看自己的牌，记住看到的人\n3. 队长选队 → 提名 N 位玩家出任务\n4. 全体投票 → 同意则出任务；否决则队长换下一位（连续 5 次否决 = 坏人胜）\n5. 任务 → 出队玩家秘密投成功 / 失败（好人不能投失败）\n6. 结算 → 任意一张失败 = 任务失败（第 4 轮 7+ 人需 2 张）\n7. 重复至 3 胜或 3 败。若好人 3 胜 → 进入暗杀阶段。',
  'help.lady.title': '湖中仙女',
  'help.lady.body':
    '7 人以上的游戏可启用。第 2/3/4 轮结束后进入硬中断阶段：持有人选择一位玩家私下查看阵营，被查看者获得湖中仙女，但「曾被查看过」的人不能再被选。是好人阵营反向情报的关键。',
  'help.tips.title': '新手提示',
  'help.tips.body':
    '• 第一轮提名往往是观察的窗口 — 看谁犹豫、谁急着加入。\n• 梅林说话太多会被刺客标记；说话太少又会被坏人轻松失败任务。\n• 队伍被否决的次数越多，坏人越接近胜利 — 不要为小事消耗。\n• 派西维尔看到的两个「梅林或莫甘娜」中一个一定是真梅林 — 但要分辨需要长期观察其行为。',

  'lan.join.title': '加入 LAN 对局',
  'lan.join.pasteOffer': '粘贴主机的 offer',
  'lan.join.offer.placeholder': '{"type":"offer","sdp":"..."}',
  'lan.join.generate': '生成 answer',
  'lan.join.generating': '生成中…',
  'lan.join.nameRequired': '请先输入名称。',
  'lan.join.sendAnswer.title': '把这串 answer 传给主机',
  'lan.join.copyAnswer': '复制 answer',
  'lan.join.answerNote': '主机收到并接受后，连接会自动开启，你就会看到游戏画面。',
  'lan.join.iSentIt': '我已发送 — 进入游戏',
  'lan.join.displayName': '玩家名称',

  'pwa.update.title': '新版本可用',
  'pwa.update.body': '已下载新版本。立即刷新或继续游玩 — 由你决定。',
  'pwa.update.reload': '立即刷新',
  'pwa.update.later': '稍后',
  'pwa.offlineReady': '可离线游玩',
  'pwa.dismiss': '关闭',
  'offline.title': '⚠ 你目前离线',
  'offline.netPlay': 'Net 模式需要网络。试试 ',
  'offline.netPlay.link': 'LAN 模式',
  'offline.netPlay.tail': ' — 同一 WiFi 就能玩，无需服务器。',
  'offline.lan': '完成 SDP 交换后，LAN 模式无需网络也能玩。',
  'offline.generic': '网络恢复前 Net 模式不可用；LAN 模式仍可正常使用。',
};

const dictionaries: Record<Locale, Messages> = { 'zh-TW': zhTW, 'zh-CN': zhCN, en };

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
    // Mainland / Singapore / Hans → 简中
    if (/^zh-(CN|SG|Hans)/i.test(lang)) return 'zh-CN';
    // Taiwan / Hong Kong / Macau / Hant → 繁中
    if (/^zh(-(TW|HK|MO|Hant))?$/i.test(lang)) return 'zh-TW';
    if (/^en\b/i.test(lang)) return 'en';
  }
  return 'zh-TW';
}
