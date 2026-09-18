export type Caps = {
  isRoot: boolean;
  isOwner: boolean;
  canStats: boolean;
  canModeration: boolean;
  canVoice: boolean;
  canMods: boolean;
  canLogs: boolean;
  canPower: boolean;
  canConsole: boolean;
  canAdmin: boolean;
  canGrantOwner: boolean;
  canGrantBotOwner: boolean;
  waiting: boolean;
};

export type StaffProfile = {
  userId: string;
  displayName: string | null;
  email: string | null;
  image: string | null;
  discordId: string | null;
  tag: string | null;
  isRoot: boolean;
  isOwner: boolean;
  isBotOwner: boolean;
  canStats: boolean;
  canModeration: boolean;
  canVoice: boolean;
  canMods: boolean;
  canLogs: boolean;
  canPower: boolean;
  createdAt: string;
  lastSeen: string;
  caps: Caps;
};

export type StaffListItem = Omit<StaffProfile, "caps">;

export type RosterMod = {
  steamid: string;
  name: string;
  rank: number;
  discord?: string | null;
};

export type RosterRank = {
  rank: number;
  title: string;
  week: number;
  month: number;
};

export type RosterPayload = {
  moderators: RosterMod[];
  ranks: RosterRank[];
  recounting?: boolean;
};

export type LastOnlineInfo = {
  ts: number;
  server: string | null;
  nickname: string | null;
  map: string | null;
};

export type ModRow = {
  name: string;
  steamid: string;
  discord: string | null;
  avatar: string | null;
  rank: number | null;
  norma: { week: number; month: number } | null;
  bans: number | null;
  mutes: number | null;
  total: number;
  weekTotal: number;
  removed: number;
  excluded: number;
  lastSeenName: string | null;
  lastOnline: LastOnlineInfo | null;
  pct: number | null;
  done: boolean;
  backup?: BackupEntry | null;
  /** Постоянный слаг для ссылки /<slug> (появляется после withSlugs). */
  slug?: string;
  /** Итог модератора за прошлый месяц (из архива). */
  prevTotal?: number | null;
  /** Лучший месяц модератора по итогам архива. */
  best?: { month: string; total: number } | null;
};

export type PunishmentRecord = {
  id: number;
  kind: "ban" | "mute";
  adminSteamid: string;
  player: string;
  playerSteamid: string;
  reason: string | null;
  created: number;
  expires: number;
  durationLabel: string | null;
  status: number;
  counted: boolean;
  excluded: boolean;
  unpunishAdmin: string | null;
};

export type ModDetails = {
  month: string;
  updatedAt: number;
  monthStart: number | null;
  monthEnd: number | null;
  moderator: ModRow & { slug: string };
  records: PunishmentRecord[];
};

export type BackupEntry = {
  setAt: number;
  bans: number | null;
  mutes: number | null;
  total: number | null;
};

export type BackupsPayload = {
  backups: {
    month: string;
    entries: Record<string, BackupEntry>;
  };
};

export type LastMonthTop = {
  name: string;
  rank: number | null;
  total: number;
  steamid: string | null;
};

export type StatsPayload = {
  month: string;
  updatedAt: number;
  totals: {
    bans: number;
    mutes: number;
    total: number;
    removed: number;
    excluded: number;
  };
  moderators: ModRow[];
  stale: boolean;
  isMonthFirst?: boolean;
  lastMonthTop?: LastMonthTop | null;
  /** Итоги прошлого месяца из архива (если есть). */
  prevTotals?: {
    month: string;
    bans: number;
    mutes: number;
    total: number;
    removed: number;
    excluded: number;
  } | null;
  /** Топ-3 модераторов по месяцам из архива (для истории топов). */
  history?: Array<{
    month: string;
    top: Array<{ name: string; total: number; rank: number | null }>;
  }>;
};

export type DailyPoint = {
  date: string;
  bans: number;
  mutes: number;
  total: number;
};

export type PlayerRecord = PunishmentRecord & {
  adminName: string;
  adminRank: number | null;
};

export type SystemStatus = {
  worker: boolean;
  bot: boolean;
  workerUpdatedAt: number | null;
  checkedAt: number;
};

/** Откуда игрок попал во вкладку «Подозрительные». */
export type SuspiciousSource = "online" | "ticket" | "report";

export type SuspiciousPlayer = {
  steamid: string;
  nickname: string;
  server: string;
  map: string | null;
  avatar: string | null;
  playtime: number;
  kills: number;
  deaths: number;
  kd: number;
  rank: number | null;
  value: number;
  /** online — фильтр по онлайну, ticket — тикет с KD/часами, report — жалоба по причине. */
  source?: SuspiciousSource;
  /** Причина жалобы, по которой игрок попал в список (для source === "report"). */
  reason?: string | null;
  /** Все подходящие причины жалоб игрока. */
  reasons?: string[];
  /** Сколько жалоб (тикетов) на игрока в текущей выборке. */
  reports?: number;
};

/** Диагностика источника тикетов fearproject.ru (cookie задаётся в .env воркера). */
export type SuspiciousTicketsInfo = {
  configured: boolean;
  error: string | null;
  count: number;
};

/** Ответ воркера на /suspicious: список подозрительных + диагностика тикетов. */
export type SuspiciousPayload = {
  updatedAt: number | null;
  tickets: SuspiciousTicketsInfo | null;
  players: SuspiciousPlayer[];
};

export type GuildMember = {
  id: string;
  username: string;
  globalName: string | null;
  nick: string | null;
  avatar: string | null;
};

export type VoiceChannel = {
  id: string;
  name: string;
  kind: "voice" | "text";
};

export type DiscordClaim = {
  id: string;
  discordId: string;
  status: "pending" | "accepted" | "declined" | "error";
  error?: string | null;
};

export type LogEntry = {
  ts: number;
  text: string;
};
