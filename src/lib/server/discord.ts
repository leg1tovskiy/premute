import {
  DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID,
  DISCORD_LOG_CHANNEL_ID,
  DISCORD_WARN_CHANNEL_ID,
  PROTECTED_USER_IDS,
  DISCORD_VOICE_CHANNEL_ID,
  PANEL_BOT_URL,
} from "./config";
import { createHash } from "node:crypto";
import type { GuildMember, RosterMod, RosterPayload, VoiceChannel } from "@/lib/types";

const API = "https://discord.com/api/v10";

class DiscordError extends Error {
  constructor(
    message: string,
    readonly status = 500,
  ) {
    super(message);
    this.name = "DiscordError";
  }
}

async function discord<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  extra?: { form?: FormData },
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
    "User-Agent": "PremuteBOT-Panel (https://grok.com, 1.0)",
  };
  let payload: BodyInit | undefined;
  if (extra?.form) {
    payload = extra.form;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: payload,
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = `Discord ${res.status}`;
    try {
      const j = JSON.parse(text) as { message?: string };
      if (j.message) msg = j.message;
    } catch {
      if (text) msg = text.slice(0, 180);
    }
    throw new DiscordError(msg, res.status);
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

type ApiMember = {
  user?: {
    id: string;
    username: string;
    global_name?: string | null;
    avatar?: string | null;
    bot?: boolean;
  };
  nick?: string | null;
};

function mapMember(m: ApiMember): GuildMember | null {
  if (!m.user || m.user.bot) return null;
  return {
    id: m.user.id,
    username: m.user.username,
    globalName: m.user.global_name ?? null,
    nick: m.nick ?? null,
    avatar: m.user.avatar
      ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png?size=64`
      : null,
  };
}

export async function searchMembers(query: string): Promise<GuildMember[]> {
  const q = query.trim();
  if (!q) return listMembers();
  if (/^\d{17,20}$/.test(q)) {
    try {
      const m = await discord<ApiMember>(
        "GET",
        `/guilds/${DISCORD_GUILD_ID}/members/${q}`,
      );
      const mapped = mapMember(m);
      return mapped ? [mapped] : [];
    } catch {
      return [];
    }
  }
  const rows = await discord<ApiMember[]>(
    "GET",
    `/guilds/${DISCORD_GUILD_ID}/members/search?query=${encodeURIComponent(q)}&limit=15`,
  );
  return (Array.isArray(rows) ? rows : []).map(mapMember).filter((x): x is GuildMember => Boolean(x));
}

export async function listMembers(): Promise<GuildMember[]> {
  const rows = await discord<ApiMember[]>(
    "GET",
    `/guilds/${DISCORD_GUILD_ID}/members?limit=80`,
  );
  return (Array.isArray(rows) ? rows : []).map(mapMember).filter((x): x is GuildMember => Boolean(x));
}

export async function listVoiceChannels(): Promise<VoiceChannel[]> {
  const rows = await discord<{ id: string; name: string; type: number }[]>(
    "GET",
    `/guilds/${DISCORD_GUILD_ID}/channels`,
  );
  const list = (Array.isArray(rows) ? rows : [])
    .filter((c) => c.type === 2)
    .map((c): VoiceChannel => ({
      id: c.id,
      name: c.name,
      kind: "voice",
    }));
  list.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  return list;
}

export async function listTextChannels(): Promise<VoiceChannel[]> {
  const rows = await discord<{ id: string; name: string; type: number }[]>(
    "GET",
    `/guilds/${DISCORD_GUILD_ID}/channels`,
  );
  const list = (Array.isArray(rows) ? rows : [])
    .filter((c) => c.type === 0)
    .map((c): VoiceChannel => ({ id: c.id, name: c.name, kind: "text" }));
  list.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  return list;
}

function assertPunishable(targetId: string) {
  if (PROTECTED_USER_IDS.includes(targetId as (typeof PROTECTED_USER_IDS)[number])) {
    throw new DiscordError("Нельзя выдать наказание владельцу бота.", 403);
  }
}

export async function banMember(targetId: string, reason: string, actorTag: string) {
  assertPunishable(targetId);
  await discord(
    "PUT",
    `/guilds/${DISCORD_GUILD_ID}/bans/${targetId}`,
    { delete_message_seconds: 0, reason: `${reason} — ${actorTag}` },
  );
}

export async function kickMember(targetId: string, reason: string, actorTag: string) {
  assertPunishable(targetId);
  await discord(
    "DELETE",
    `/guilds/${DISCORD_GUILD_ID}/members/${targetId}?reason=${encodeURIComponent(`${reason} — ${actorTag}`)}`,
  );
}

export async function muteMember(targetId: string, ms: number, reason: string, actorTag: string) {
  assertPunishable(targetId);
  const clamped = Math.min(Math.max(ms, 60_000), 28 * 86400_000);
  const until = new Date(Date.now() + clamped).toISOString();
  await discord("PATCH", `/guilds/${DISCORD_GUILD_ID}/members/${targetId}`, {
    communication_disabled_until: until,
  });
  void actorTag;
  void reason;
}

export async function unmuteMember(targetId: string) {
  await discord("PATCH", `/guilds/${DISCORD_GUILD_ID}/members/${targetId}`, {
    communication_disabled_until: null,
  });
}

export async function sendChannelMessage(channelId: string, content: string) {
  await discord("POST", `/channels/${channelId}/messages`, { content: content.slice(0, 1900) });
}

export async function sendBotDm(targetId: string, content: string) {
  const dm = await discord<{ id: string }>("POST", "/users/@me/channels", { recipient_id: targetId });
  if (!dm?.id) throw new DiscordError("Не удалось открыть ЛС с этим пользователем", 400);
  await discord("POST", `/channels/${dm.id}/messages`, { content: content.slice(0, 1900) });
}

export async function sendWarn(targetId: string, reason: string, actorTag: string) {
  assertPunishable(targetId);
  const text =
    `⚠️ **Предупреждение** • <@${targetId}>, вы допустили нарушение` +
    `${reason ? `: **${reason}**` : ""}.\nПри повторном нарушении вы будете наказаны.`;
  await sendChannelMessage(DISCORD_WARN_CHANNEL_ID, text);
  // В логе цель показываем как в Discord: ник на сервере (username).
  const target = await fetchGuildMember(targetId);
  const targetTag = target
    ? `**${target.nick || target.globalName || target.username}** (\`${target.username}\`)`
    : `\`${targetId}\``;
  await sendLog(`⚠️ Предупреждение — ${actorTag} → ${targetTag}${reason ? ` • ${reason}` : ""}`);
}

// Дублируем лог панели в буфер бота, чтобы запись появилась во вкладке «Логи».
// Ошибки игнорируем — буфер не критичен. Await обязателен: Vercel может
// заморозить функцию сразу после ответа и fire-and-forget запрос не уйдёт.
async function pushBotLog(text: string): Promise<void> {
  try {
    await fetch(`${PANEL_BOT_URL}/panel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: panelSecret(), op: "log", text: text.slice(0, 1900) }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // буфер не критичен
  }
}

export async function sendLog(text: string) {
  try {
    await Promise.all([pushBotLog(text), sendChannelMessage(DISCORD_LOG_CHANNEL_ID, text)]);
  } catch (e) {
    console.error("[discord] log:", e instanceof Error ? e.message : e);
  }
}

export async function sendVoiceFile(channelId: string, filename: string, bytes: Uint8Array, caption: string) {
  const form = new FormData();
  form.append("payload_json", JSON.stringify({ content: caption.slice(0, 1800) }));
  const copy = Uint8Array.from(bytes);
  form.append("files[0]", new Blob([copy.buffer], { type: "audio/mpeg" }), filename);
  await discord("POST", `/channels/${channelId}/messages`, undefined, { form });
}

export async function ttsMp3(text: string): Promise<Uint8Array> {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ru&client=tw-ob&q=${encodeURIComponent(text.slice(0, 190))}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function panelSecret() {
  return createHash("sha256").update(`${DISCORD_BOT_TOKEN}panel`).digest("hex").slice(0, 32);
}

export async function syncBotOwners(ids: string[], actor: string): Promise<void> {
  const unique = [...new Set(ids.map((id) => String(id || "").replace(/\D/g, "")).filter((id) => /^\d{17,20}$/.test(id)))];
  const body = { secret: panelSecret(), op: "owners_set", ids: unique, actor: actor.slice(0, 80) };
  try {
    const res = await fetch(`${PANEL_BOT_URL}/panel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`owners HTTP ${res.status}`);
  } catch (e) {
    console.error("[owners] sync:", e instanceof Error ? e.message : e);
  }
}


export async function playInVoice(opts: {
  op: "say" | "sound";
  channelId?: string;
  actor: string;
  text?: string;
  file?: string;
}): Promise<void> {
  const body = {
    secret: panelSecret(),
    op: opts.op,
    ch: opts.channelId || "",
    actor: opts.actor.slice(0, 80),
    text: opts.text,
    file: opts.file,
  };
  try {
    const res = await fetch(`${PANEL_BOT_URL}/panel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (res.ok && json.ok) return;
    if (json.error) throw new DiscordError(json.error, res.status);
    throw new DiscordError(`Panel HTTP ${res.status}`, res.status);
  } catch (e) {
    if (e instanceof DiscordError) throw e;
    const { secret: _s, ...pub } = body;
    await sendChannelMessage(DISCORD_LOG_CHANNEL_ID, `PMCMD${JSON.stringify(pub)}`);
  }
}

export async function fetchBotStatsCache(): Promise<{
  month?: string;
  updatedAt?: number;
  totals?: {
    bans: number;
    mutes: number;
    total: number;
    removed: number;
    excluded: number;
  };
  moderators?: Array<{
    name: string;
    steamid: string;
    rank: number | null;
    norma: { week: number; month: number } | null;
    bans: number;
    mutes: number;
    total: number;
    weekTotal: number;
    removed: number;
    excluded: number;
    lastSeenName: string | null;
  }>;
} | null> {
  try {
    const res = await fetch(`${PANEL_BOT_URL}/panel/stats?s=${encodeURIComponent(panelSecret())}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; cache?: Record<string, unknown> };
    if (!json.ok || !json.cache) return null;
    return json.cache as NonNullable<Awaited<ReturnType<typeof fetchBotStatsCache>>>;
  } catch {
    return null;
  }
}

export async function fetchBotRoster(): Promise<RosterPayload | null> {
  try {
    const res = await fetch(`${PANEL_BOT_URL}/panel/mods?s=${encodeURIComponent(panelSecret())}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; moderators?: RosterMod[]; ranks?: RosterPayload["ranks"] };
    if (!json.ok || !Array.isArray(json.moderators)) return null;
    return { moderators: json.moderators, ranks: json.ranks || [] };
  } catch {
    return null;
  }
}

export async function fetchBotLogs(): Promise<{ ts: number; text: string }[] | null> {
  try {
    const res = await fetch(`${PANEL_BOT_URL}/panel/logs?s=${encodeURIComponent(panelSecret())}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; logs?: { ts?: number; text?: string }[] };
    if (!json.ok || !Array.isArray(json.logs)) return null;
    return json.logs
      .map((l) => ({ ts: Number(l.ts) || 0, text: String(l.text || "") }))
      .filter((l) => l.text);
  } catch {
    return null;
  }
}

export type OnlineInfo = { server: string; nickname: string; map: string | null };

// Кто из модеров сейчас в игре на серверах fearproject.ru (по SteamID, кэш у бота 30 сек).
export async function fetchBotOnline(ids: string[]): Promise<Record<string, OnlineInfo> | null> {
  const list = ids.map((s) => s.trim()).filter((s) => /^\d{17}$/.test(s)).slice(0, 200);
  if (!list.length) return {};
  try {
    const res = await fetch(
      `${PANEL_BOT_URL}/panel/online?s=${encodeURIComponent(panelSecret())}&ids=${encodeURIComponent(list.join(","))}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; online?: Record<string, OnlineInfo> };
    if (!json.ok || !json.online) return null;
    return json.online;
  } catch {
    return null;
  }
}

export async function botPower(
  action: "restart" | "shutdown",
  actor: string,
): Promise<void> {
  const body = { secret: panelSecret(), op: "power", action, actor: actor.slice(0, 80) };
  const res = await fetch(`${PANEL_BOT_URL}/panel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (res.ok && json.ok) return;
  if (json.error) throw new DiscordError(json.error, res.status);
  throw new DiscordError(`Panel HTTP ${res.status}`, res.status);
}

export async function mutateBotMod(opts: {
  op: "mod_add" | "mod_edit" | "mod_del";
  actor: string;
  steamid: string;
  name?: string;
  rank?: number;
  discord?: string | null;
}): Promise<RosterPayload> {
  const body = {
    secret: panelSecret(),
    op: opts.op,
    actor: opts.actor.slice(0, 80),
    steamid: opts.steamid,
    name: opts.name,
    rank: opts.rank,
    discord: opts.discord,
  };
  try {
    const res = await fetch(`${PANEL_BOT_URL}/panel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const json = (await res.json()) as RosterPayload & { ok?: boolean; error?: string; recounting?: boolean };
    if (res.ok && json.ok && Array.isArray(json.moderators)) {
      return { moderators: json.moderators, ranks: json.ranks || [], recounting: json.recounting };
    }
    if (json.error) throw new DiscordError(json.error, res.status);
    throw new DiscordError(`Panel HTTP ${res.status}`, res.status);
  } catch (e) {
    if (e instanceof DiscordError) throw e;
    const { secret: _s, ...pub } = body;
    await sendChannelMessage(DISCORD_LOG_CHANNEL_ID, `PMCMD${JSON.stringify(pub)}`);
    return { moderators: [], ranks: [], recounting: opts.op === "mod_add" };
  }
}

export async function fetchGuildMember(discordId: string): Promise<GuildMember | null> {
  try {
    const m = await discord<ApiMember>("GET", `/guilds/${DISCORD_GUILD_ID}/members/${discordId}`);
    return mapMember(m);
  } catch {
    return null;
  }
}

export async function sendClaimDm(opts: {
  discordId: string;
  token: string;
  requesterName: string;
}): Promise<{ channelId: string; messageId: string }> {
  const dm = await discord<{ id: string }>("POST", "/users/@me/channels", {
    recipient_id: opts.discordId,
  });
  const member = await fetchGuildMember(opts.discordId);
  const who = member?.nick || member?.globalName || member?.username || opts.discordId;
  const body = {
    content:
      `**PremuteBOT — подтверждение входа в панель**\n\n` +
      `Привет, **${who}**. Кто-то пытается привязать этот Discord к панели управления.\n` +
      `Запросил: **${opts.requesterName}**.\n\n` +
      `Если это вы — нажмите **Принять**. Если нет — **Отклонить**, и вход будет заблокирован.`,
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 3, custom_id: `pc:ok:${opts.token}`, label: "Принять" },
          { type: 2, style: 4, custom_id: `pc:no:${opts.token}`, label: "Отклонить" },
        ],
      },
    ],
  };
  const msg = await discord<{ id: string; channel_id: string }>(
    "POST",
    `/channels/${dm.id}/messages`,
    body,
  );
  return { channelId: msg.channel_id || dm.id, messageId: msg.id };
}

export async function readClaimMessage(
  channelId: string,
  messageId: string,
): Promise<"pending" | "accepted" | "declined" | "missing"> {
  try {
    const msg = await discord<{ content?: string }>(
      "GET",
      `/channels/${channelId}/messages/${messageId}`,
    );
    const c = String(msg.content || "");
    if (c.includes("PANEL_CLAIM ACCEPTED")) return "accepted";
    if (c.includes("PANEL_CLAIM DECLINED")) return "declined";
    return "pending";
  } catch (e) {
    if (e instanceof DiscordError && e.status === 404) return "missing";
    throw e;
  }
}

export { DiscordError };
export { DISCORD_LOG_CHANNEL_ID, DISCORD_VOICE_CHANNEL_ID };
