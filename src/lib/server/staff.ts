import { getSql } from "@/lib/db";
import { randomUUID } from "node:crypto";
import type { Caps, StaffListItem, StaffProfile } from "@/lib/types";
import { ROOT_DISCORD_ID } from "./config";
import { RANK_TITLE } from "@/lib/constants";

function flag(v: unknown): boolean {
  return v === true || v === "t" || v === "true";
}

function sanitizeTag(raw: string | null | undefined): string | null {
  const text = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.slice(0, 24);
}

function iso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return v == null ? "" : String(v);
}

export function isSundayMSK(): boolean {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Moscow",
      weekday: "short",
    });
    return formatter.format(new Date()) === "Sun";
  } catch {
    const now = new Date();
    const msk = new Date(now.getTime() + 3 * 3600 * 1000);
    return msk.getUTCDay() === 0;
  }
}

export function computeCaps(
  row: {
    is_root: unknown;
    is_owner: unknown;
    is_bot_owner: unknown;
    can_stats: unknown;
    can_activity?: unknown;
    can_suspicious?: unknown;
    can_moderation?: unknown;
    can_voice?: unknown;
    can_mods?: unknown;
    can_logs?: unknown;
    can_power?: unknown;
    is_banned?: unknown;
  },
  mySteamId?: string | null,
  rosterRank?: number | null,
): Caps {
  const isBanned = flag(row.is_banned);
  if (isBanned) {
    return {
      isRoot: false,
      isOwner: false,
      canStats: false,
      canActivity: false,
      canGeneralStats: false,
      canOwnStats: false,
      canSuspicious: false,
      canModeration: false,
      canVoice: false,
      canMods: false,
      canLogs: false,
      canPower: false,
      canConsole: false,
      canAdmin: false,
      canGrantOwner: false,
      canGrantBotOwner: false,
      waiting: false,
      isBanned: true,
      isSundayAccess: false,
      hasPermanentGeneralStats: false,
    };
  }
  const isRoot = flag(row.is_root);
  // «Владелец сайта» — полный доступ к сайту.
  const isOwner = isRoot || flag(row.is_owner);
  const canOwnStats = !isBanned;
  const isSunday = isSundayMSK();

  // Если у пользователя есть роль из ростера FearProject:
  // 1 (Мл. Модератор), 2 (Модератор): статистика (только своя) и вкладка Игроки
  // 3 (Ст. Модератор), 4 (Ст. Администратор), 5 (Стафф): доступ ко всем вкладкам, кроме админки
  const isModOrJunior = rosterRank === 1 || rosterRank === 2;
  const isSeniorOrStaff = rosterRank != null && rosterRank >= 3;

  let permanentGeneralStats = isOwner || flag(row.can_stats) || isSeniorOrStaff;
  if (isModOrJunior && !flag(row.can_stats)) {
    permanentGeneralStats = false;
  }

  // В воскресенье всем модераторам (включая Мл. Модераторов и Модераторов) открывается общая статистика до 23:59 МСК
  const hasStaffRole = canOwnStats || Boolean(rosterRank) || isModOrJunior || flag(row.can_suspicious) || flag(row.can_activity);
  const isSundayAccess = !permanentGeneralStats && hasStaffRole && isSunday;
  const canGeneralStats = permanentGeneralStats || isSundayAccess;
  const canStats = canGeneralStats || canOwnStats;

  const canActivity = isOwner || isSeniorOrStaff || flag(row.can_activity);
  const canSuspicious = isOwner || isSeniorOrStaff || isModOrJunior || flag(row.can_suspicious);
  const canMods = isOwner || isSeniorOrStaff || flag(row.can_mods);
  const canModeration = isOwner || isSeniorOrStaff || flag(row.can_moderation);
  const canVoice = isOwner || isSeniorOrStaff || flag(row.can_voice);
  const canLogs = isOwner || flag(row.can_logs);
  const canPower = isOwner || isSeniorOrStaff || flag(row.can_power);
  const canAdmin = isOwner;
  const canConsole = isRoot;

  return {
    isRoot,
    isOwner,
    canStats,
    canActivity,
    canGeneralStats,
    canOwnStats,
    isSundayAccess,
    hasPermanentGeneralStats: permanentGeneralStats,
    canSuspicious,
    canModeration,
    canVoice,
    canMods,
    canLogs,
    canPower,
    canConsole,
    canAdmin,
    canGrantOwner: isRoot,
    canGrantBotOwner: false,
    waiting: !(canStats || canActivity || canSuspicious || canModeration || canVoice || canMods || canLogs || canPower || canConsole || canAdmin),
    isBanned: false,
  };
}

export function findSteamIdInRoster(
  roster: import("@/lib/types").RosterMod[],
  discordId?: string | null,
  displayName?: string | null,
): string | null {
  const cleanId = String(discordId || "").trim();
  const cleanName = String(displayName || "").toLowerCase().trim();
  for (const m of roster) {
    if (!m.discord) continue;
    const d = String(m.discord).trim();
    if (cleanId && (d === cleanId || d.replace(/\D/g, "") === cleanId)) {
      return m.steamid;
    }
    if (cleanName && (d.toLowerCase() === cleanName || d.toLowerCase() === `@${cleanName}`)) {
      return m.steamid;
    }
  }
  return null;
}

type StaffRow = {
  user_id: string;
  display_name: string | null;
  username?: string | null;
  password_hash?: string | null;
  password_plain?: string | null;
  created_by?: string | null;
  email: string | null;
  image: string | null;
  discord_id: string | null;
  steamid?: string | null;
  is_root: unknown;
  is_owner: unknown;
  is_bot_owner: unknown;
  is_banned?: unknown;
  can_stats: unknown;
  can_activity?: unknown;
  can_suspicious: unknown;
  can_moderation: unknown;
  can_voice: unknown;
  can_mods: unknown;
  can_logs: unknown;
  can_power: unknown;
  tag: string | null;
  role_rank?: unknown;
  created_at: unknown;
  last_seen: unknown;
};

function toProfile(
  row: StaffRow,
  mySteamId?: string | null,
  fearName?: string | null,
  rosterRank?: number | null,
): StaffProfile {
  let effectiveSteamId: string | null = null;
  const sid = row.steamid ? String(row.steamid).trim() : null;
  if (sid === "none" || sid === "null" || sid === "") {
    effectiveSteamId = null;
  } else if (sid) {
    effectiveSteamId = sid;
  } else if (mySteamId) {
    effectiveSteamId = mySteamId;
  }
  const isBanned = flag(row.is_banned);
  const effectiveRank =
    row.role_rank != null && Number(row.role_rank) > 0
      ? Number(row.role_rank)
      : (rosterRank ?? null);
  const caps = computeCaps(row, effectiveSteamId, effectiveRank);

  const displayName = fearName ||
    (row.display_name && !/^\d{17,20}$/.test(row.display_name) ? row.display_name : null) ||
    row.display_name;

  return {
    userId: row.user_id,
    displayName,
    username: row.username ? String(row.username) : null,
    passwordPlain: row.password_plain ? String(row.password_plain) : null,
    email: row.email,
    image: row.image,
    discordId: row.discord_id,
    mySteamId: effectiveSteamId,
    tag: row.tag ? String(row.tag) : null,
    isRoot: caps.isRoot,
    isOwner: caps.isOwner,
    isBotOwner: flag(row.is_bot_owner) && !caps.isRoot,
    isBanned,
    canStats: caps.canGeneralStats,
    canActivity: caps.canActivity,
    canSuspicious: caps.canSuspicious,
    canModeration: flag(row.can_moderation) || caps.canModeration,
    canVoice: flag(row.can_voice) || caps.canVoice,
    canMods: caps.canMods,
    canLogs: flag(row.can_logs) || caps.canLogs,
    canPower: flag(row.can_power) || caps.canPower,
    createdAt: iso(row.created_at),
    lastSeen: iso(row.last_seen),
    roleRank: effectiveRank,
    roleTitle: effectiveRank ? (RANK_TITLE[effectiveRank] ?? "Модератор") : (caps.isOwner ? "Владелец" : null),
    caps,
  };
}

function toListItem(
  row: StaffRow,
  mySteamId?: string | null,
  fearName?: string | null,
  rosterRank?: number | null,
  isRootActor?: boolean,
): StaffListItem {
  const { caps: _c, ...rest } = toProfile(row, mySteamId, fearName, rosterRank);
  if (!isRootActor) {
    rest.username = null;
    rest.passwordPlain = null;
  }
  return rest;
}

function devStaffProfile(): StaffProfile {
  return {
    userId: "dev-user",
    displayName: "Администратор (Local)",
    username: "admin",
    passwordPlain: "admin123",
    email: "admin@fearproject.ru",
    image: null,
    discordId: "1234567890",
    mySteamId: "76561198805786012",
    tag: "FearAdmin",
    isRoot: true,
    isOwner: true,
    isBotOwner: true,
    isBanned: false,
    canStats: true,
    canActivity: true,
    canSuspicious: true,
    canModeration: true,
    canVoice: true,
    canMods: true,
    canLogs: true,
    canPower: true,
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    caps: computeCaps(
      {
        is_root: true,
        is_owner: true,
        is_bot_owner: true,
        can_stats: true,
        can_activity: true,
        can_suspicious: true,
        can_moderation: true,
        can_voice: true,
        can_mods: true,
        can_logs: true,
        can_power: true,
        is_banned: false,
      },
      "76561198805786012",
    ),
  };
}

export async function upsertStaff(
  userId: string,
  profile: { displayName?: string | null; email?: string | null; image?: string | null },
): Promise<StaffProfile> {
  if (userId === "dev-user") {
    return devStaffProfile();
  }
  const sql = await getSql();
  await sql.query("alter table staff add column if not exists role_rank integer");

  // If user signed in via Discord OAuth, link discord_id from account table
  let oauthDiscordId: string | null = null;
  try {
    const acc = await sql<{ accountId: string }>`
      select "accountId" from "account"
      where "userId" = ${userId} and "providerId" = 'discord'
      limit 1
    `;
    if (acc.length && acc[0]?.accountId) {
      oauthDiscordId = acc[0].accountId;
    }
  } catch {
    // account table may not exist yet
  }
  if (!oauthDiscordId && userId.startsWith("discord_")) {
    oauthDiscordId = userId.replace("discord_", "");
  }

  const isRoot = oauthDiscordId === ROOT_DISCORD_ID;
  const existing = await sql<StaffRow>`select * from staff where user_id = ${userId} limit 1`;
  if (!existing.length) {
    await sql`
      insert into staff (
        user_id, display_name, email, image, discord_id,
        is_root, is_owner, can_stats, can_activity, created_at, last_seen
      ) values (
        ${userId},
        ${profile.displayName ?? null},
        ${profile.email ?? null},
        ${profile.image ?? null},
        ${oauthDiscordId},
        ${isRoot},
        ${isRoot},
        ${isRoot},
        ${isRoot},
        now(),
        now()
      )
    `;
    const name = profile.displayName || profile.email || userId;
    await writeLog(userId, "new_user", `Новая регистрация на сайте: ${name}`);
  } else {
    const prevSeen = existing[0]?.last_seen ? new Date(existing[0].last_seen as string).getTime() : 0;
    if (Date.now() - prevSeen > 20 * 60 * 1000) {
      const name = profile.displayName || existing[0]?.display_name || profile.email || userId;
      await writeLog(userId, "user_login", `Авторизация на сайте: ${name}`);
    }

    await sql`
      update staff set
        display_name = coalesce(${profile.displayName ?? null}, display_name),
        email = coalesce(${profile.email ?? null}, email),
        image = coalesce(${profile.image ?? null}, image),
        discord_id = coalesce(discord_id, ${oauthDiscordId}),
        is_root = case when ${isRoot} then true else is_root end,
        is_owner = case when ${isRoot} then true else is_owner end,
        can_stats = case when ${isRoot} then true else can_stats end,
        can_activity = case when ${isRoot} then true else can_activity end,
        last_seen = now()
      where user_id = ${userId}
    `;
  }
  const rows = await sql<StaffRow>`select * from staff where user_id = ${userId} limit 1`;
  if (!rows[0]) return devStaffProfile();

  const isExplicitlyCleared = rows[0].steamid === "none" || rows[0].steamid === "null";
  const { readRoster } = await import("./roster");
  const roster = await readRoster();
  const mySteamId = isExplicitlyCleared ? null : (rows[0].steamid || findSteamIdInRoster(roster, rows[0].discord_id, rows[0].display_name));
  if (mySteamId && !rows[0].steamid && !isExplicitlyCleared) {
    try {
      await sql`update staff set steamid = ${mySteamId} where user_id = ${userId}`;
    } catch {}
  }
  const rMod = mySteamId ? roster.find((m) => m.steamid === mySteamId) : null;
  const prof = toProfile(rows[0], mySteamId, rMod?.name, rMod?.rank);
  if (!prof.caps.isRoot) prof.passwordPlain = null;
  return prof;
}

export async function getStaff(userId: string): Promise<StaffProfile | null> {
  if (userId === "dev-user") {
    return devStaffProfile();
  }
  const sql = await getSql();
  const rows = await sql<StaffRow>`select * from staff where user_id = ${userId} limit 1`;
  if (!rows[0]) return null;

  const isExplicitlyCleared = rows[0].steamid === "none" || rows[0].steamid === "null";
  const { readRoster } = await import("./roster");
  const roster = await readRoster();
  const mySteamId = isExplicitlyCleared ? null : (rows[0].steamid || findSteamIdInRoster(roster, rows[0].discord_id, rows[0].display_name));
  const rMod = mySteamId ? roster.find((m) => m.steamid === mySteamId) : null;
  const targetProf = toProfile(rows[0], mySteamId, rMod?.name, rMod?.rank);
  if (!targetProf.caps.isRoot) targetProf.passwordPlain = null;
  return targetProf;
}

export async function listStaff(actor?: StaffProfile): Promise<StaffListItem[]> {
  await ensureStaffCredentialsSchema();
  const sql = await getSql();
  await sql.query("alter table staff add column if not exists is_banned boolean not null default false");
  await sql.query("alter table staff add column if not exists steamid text");
  await sql.query("alter table staff add column if not exists can_activity boolean not null default false");
  await sql.query("alter table staff add column if not exists role_rank integer");
  const rows = await sql<StaffRow>`select * from staff order by is_root desc, is_owner desc, last_seen desc`;
  const { readRoster } = await import("./roster");
  const roster = await readRoster();
  const isRootActor = Boolean(actor?.isRoot);
  return rows.map((row) => {
    const isExplicitlyCleared = row.steamid === "none" || row.steamid === "null";
    const mySteamId = isExplicitlyCleared ? null : (row.steamid || findSteamIdInRoster(roster, row.discord_id, row.display_name));
    const rMod = mySteamId ? roster.find((m) => m.steamid === mySteamId) : null;
    return toListItem(row, mySteamId, rMod?.name, rMod?.rank, isRootActor);
  });
}

export async function claimDiscordId(userId: string, discordId: string): Promise<StaffProfile> {
  const sql = await getSql();
  const id = discordId.replace(/\D/g, "");
  if (!/^\d{17,20}$/.test(id)) {
    throw new Error("Укажите Discord ID — 17–20 цифр (режим разработчика → копировать ID).");
  }

  const taken = await sql<{ user_id: string }>`
    select user_id from staff where discord_id = ${id} and user_id <> ${userId} limit 1
  `;
  if (taken.length) {
    throw new Error("Этот Discord ID уже привязан к другому аккаунту.");
  }

  await sql`update staff set discord_id = ${id}, last_seen = now() where user_id = ${userId}`;

  if (id === ROOT_DISCORD_ID) {
    const roots = await sql<{ user_id: string }>`select user_id from staff where is_root = true`;
    const occupied = roots.find((r) => r.user_id !== userId);
    if (!occupied) {
      await sql`
        update staff set
          is_root = true,
          is_owner = true,
          can_stats = true,
          can_activity = true,
          can_suspicious = true,
          can_moderation = true,
          can_voice = true,
          can_mods = true,
          can_logs = true,
          can_power = true
        where user_id = ${userId}
      `;
    }
  }

  const rows = await sql<StaffRow>`select * from staff where user_id = ${userId} limit 1`;
  const { readRoster } = await import("./roster");
  const roster = await readRoster();
  const mySteamId = findSteamIdInRoster(roster, rows[0]?.discord_id, rows[0]?.display_name);
  const rMod = mySteamId ? roster.find((m) => m.steamid === mySteamId) : null;
  return toProfile(rows[0], mySteamId, rMod?.name, rMod?.rank);
}

export async function updateStaffPermissions(
  actor: StaffProfile,
  targetUserId: string,
  patch: {
    canStats?: boolean;
    canActivity?: boolean;
    canSuspicious?: boolean;
    canMods?: boolean;
    canLogs?: boolean;
    isOwner?: boolean;
    isBotOwner?: boolean;
    isBanned?: boolean;
    setRoot?: boolean;
    tag?: string | null;
    steamid?: string | null;
    roleRank?: number | null;
  },
): Promise<StaffListItem> {
  if (!actor.caps.canAdmin) throw new Error("Недостаточно прав.");
  const sql = await getSql();
  await sql.query("alter table staff add column if not exists is_banned boolean not null default false");
  await sql.query("alter table staff add column if not exists steamid text");
  await sql.query("alter table staff add column if not exists tag text");
  await sql.query("alter table staff add column if not exists is_bot_owner boolean not null default false");
  await sql.query("alter table staff add column if not exists can_logs boolean not null default false");
  await sql.query("alter table staff add column if not exists can_power boolean not null default false");
  await sql.query("alter table staff add column if not exists can_suspicious boolean not null default false");
  await sql.query("alter table staff add column if not exists can_activity boolean not null default false");
  await sql.query("alter table staff add column if not exists role_rank integer");

  const targetRows = await sql<StaffRow>`select * from staff where user_id = ${targetUserId} limit 1`;
  if (!targetRows.length) throw new Error("Пользователь не найден.");
  const target = toProfile(targetRows[0]);

  const isMainOwner = target.userId === ROOT_DISCORD_ID || target.discordId === ROOT_DISCORD_ID;
  const actorIsMainOwner = actor.userId === ROOT_DISCORD_ID || actor.discordId === ROOT_DISCORD_ID;

  if (patch.isBanned !== undefined) {
    if (isMainOwner || target.isRoot) {
      throw new Error("Нельзя забанить владельца.");
    }
    if (targetUserId === actor.userId) {
      throw new Error("Нельзя забанить самого себя.");
    }
    await sql`update staff set is_banned = ${patch.isBanned} where user_id = ${targetUserId}`;
    if (patch.isBanned) {
      try {
        await sql`delete from "session" where "userId" = ${targetUserId}`;
      } catch {}
    }
  }

  if (patch.isBotOwner === true || patch.setRoot !== undefined) {
    throw new Error("Назначение владельцев бота через сайт отключено.");
  }

  if (target.isRoot) {
    if (patch.roleRank !== undefined || patch.isOwner === false || patch.isBanned === true) {
      throw new Error("Нельзя изменять роль или статус корневого владельца (ROOT).");
    }
    if (
      patch.canStats === false ||
      patch.canActivity === false ||
      patch.canSuspicious === false ||
      patch.canMods === false ||
      patch.canLogs === false
    ) {
      throw new Error("Нельзя ограничивать права корневого владельца (ROOT).");
    }
  }
  if (patch.isOwner !== undefined && !actor.caps.canGrantOwner) {
    throw new Error("Назначать владельцев сайта может только корневой владелец.");
  }

  let isRoot = target.isRoot;
  let isBotOwner = target.isBotOwner;
  const isOwner = patch.isOwner ?? target.isOwner;

  let canStats = patch.canStats !== undefined ? Boolean(patch.canStats) : flag(targetRows[0]?.can_stats);
  let canActivity = patch.canActivity !== undefined ? Boolean(patch.canActivity) : flag(targetRows[0]?.can_activity);
  let canSuspicious = patch.canSuspicious !== undefined ? Boolean(patch.canSuspicious) : flag(targetRows[0]?.can_suspicious);
  let canMods = patch.canMods !== undefined ? Boolean(patch.canMods) : flag(targetRows[0]?.can_mods);
  let canLogs = patch.canLogs !== undefined ? Boolean(patch.canLogs) : flag(targetRows[0]?.can_logs);

  const currentRank = patch.roleRank !== undefined ? patch.roleRank : target.roleRank;

  if (patch.roleRank !== undefined && patch.roleRank !== null) {
    if (patch.roleRank === 1 || patch.roleRank === 2) {
      if (patch.canStats === undefined) canStats = false;
      if (patch.canActivity === undefined) canActivity = false;
      canSuspicious = true;
      if (patch.canMods === undefined) canMods = false;
    } else if (patch.roleRank >= 3) {
      canStats = true;
      canActivity = true;
      canSuspicious = true;
      canMods = true;
    }
  }

  // Защита: вкладки, полученные через роль, нельзя забрать:
  if (currentRank === 1 || currentRank === 2) {
    canSuspicious = true;
  } else if (currentRank != null && currentRank >= 3) {
    canStats = true;
    canActivity = true;
    canSuspicious = true;
    canMods = true;
  }

  if (patch.tag !== undefined && !actor.caps.isOwner) {
    throw new Error("Теги могут назначать только владельцы.");
  }
  const tag = patch.tag !== undefined ? sanitizeTag(patch.tag) : target.tag;

  let steamidUpdate = targetRows[0]?.steamid ?? null;
  if (patch.steamid !== undefined) {
    if (patch.steamid === null || patch.steamid === "" || patch.steamid === "none") {
      steamidUpdate = "none";
      if (target.discordId) {
        try {
          await sql`update mod_roster set discord = null where discord = ${target.discordId}`;
        } catch {}
      }
    } else {
      const rawSid = String(patch.steamid).trim().replace(/\D/g, "");
      steamidUpdate = rawSid.length >= 16 ? rawSid : "none";
    }
  }

  const rankUpdate =
    patch.roleRank !== undefined
      ? patch.roleRank
      : (targetRows[0]?.role_rank != null ? Number(targetRows[0].role_rank) : null);

  await sql`
    update staff set
      can_stats = ${canStats},
      can_activity = ${canActivity},
      can_suspicious = ${canSuspicious},
      can_mods = ${canMods},
      can_logs = ${canLogs},
      is_root = ${isRoot},
      is_owner = ${isOwner},
      is_bot_owner = ${isBotOwner},
      tag = ${tag},
      steamid = ${steamidUpdate},
      role_rank = ${rankUpdate}
    where user_id = ${targetUserId}
  `;
  const rows = await sql<StaffRow>`select * from staff where user_id = ${targetUserId} limit 1`;

  if (patch.roleRank !== undefined && patch.roleRank !== null && patch.roleRank >= 1 && patch.roleRank <= 5) {
    const effectiveSid = steamidUpdate !== "none" ? (steamidUpdate || target.mySteamId) : null;
    if (effectiveSid) {
      try {
        const { upsertRosterMod } = await import("./roster");
        await upsertRosterMod({
          steamid: effectiveSid,
          name: target.displayName || effectiveSid,
          rank: patch.roleRank,
          discord: target.discordId,
        });
      } catch (err) {
        console.error("[staff] upsert roster mod:", err);
      }
    }
  }

  if (steamidUpdate && steamidUpdate !== "none" && (target.discordId || targetRows[0]?.discord_id)) {
    const disc = target.discordId || targetRows[0]?.discord_id;
    try {
      await sql`
        insert into mod_roster (steamid, name, rank, discord)
        values (${steamidUpdate}, ${target.displayName || target.email || steamidUpdate}, 1, ${disc})
        on conflict (steamid) do update set discord = excluded.discord
      `;
    } catch {
      /* игнорируем */
    }
  }

  const targetName = target.displayName || target.email || targetUserId;

  // Логирование изменений ролей
  if (patch.roleRank !== undefined && patch.roleRank !== target.roleRank) {
    if (patch.roleRank === null) {
      await writeLog(actor.userId, "role_change", `Снята роль у пользователя ${targetName}`);
    } else {
      const newRole = RANK_TITLE[patch.roleRank] || `Ранг ${patch.roleRank}`;
      const oldRole = target.roleRank ? (RANK_TITLE[target.roleRank] || `Ранг ${target.roleRank}`) : "без роли";
      await writeLog(actor.userId, "role_change", `Назначена роль «${newRole}» для ${targetName} (было: «${oldRole}»)`);
    }
  }

  // Логирование владельца
  if (patch.isOwner !== undefined && patch.isOwner !== target.isOwner) {
    if (patch.isOwner) {
      await writeLog(actor.userId, "role_change", `Назначен «Владелец сайта» для ${targetName}`);
    } else {
      await writeLog(actor.userId, "role_change", `Сняты права «Владелец сайта» у ${targetName}`);
    }
  }

  // Логирование владельца бота
  if (patch.isBotOwner !== undefined && patch.isBotOwner !== target.isBotOwner) {
    await writeLog(actor.userId, "role_change", `${patch.isBotOwner ? "Выдана" : "Снята"} роль «Владелец бота» для ${targetName}`);
  }

  // Логирование изменения доп. вкладок
  const tabChanges: string[] = [];
  if (patch.canStats !== undefined && Boolean(patch.canStats) !== Boolean(target.canStats)) {
    tabChanges.push(`Статистика: ${patch.canStats ? "выдана" : "снята"}`);
  }
  if (patch.canActivity !== undefined && Boolean(patch.canActivity) !== Boolean(target.canActivity)) {
    tabChanges.push(`Онлайн: ${patch.canActivity ? "выдана" : "снята"}`);
  }
  if (patch.canSuspicious !== undefined && Boolean(patch.canSuspicious) !== Boolean(target.canSuspicious)) {
    tabChanges.push(`Игроки: ${patch.canSuspicious ? "выдана" : "снята"}`);
  }
  if (patch.canMods !== undefined && Boolean(patch.canMods) !== Boolean(target.canMods)) {
    tabChanges.push(`Модераторы: ${patch.canMods ? "выдана" : "снята"}`);
  }
  if (patch.canLogs !== undefined && Boolean(patch.canLogs) !== Boolean(target.canLogs)) {
    tabChanges.push(`Логи: ${patch.canLogs ? "выданы" : "сняты"}`);
  }
  if (tabChanges.length > 0) {
    await writeLog(actor.userId, "tab_change", `Изменение вкладок для ${targetName}: ${tabChanges.join(", ")}`);
  }

  // Логирование бана
  if (patch.isBanned !== undefined && patch.isBanned !== target.isBanned) {
    await writeLog(actor.userId, "ban_change", `${patch.isBanned ? "Заблокирован доступ" : "Разблокирован доступ"} для ${targetName}`);
  }

  // Логирование тега
  if (patch.tag !== undefined && patch.tag !== target.tag) {
    await writeLog(actor.userId, "tag_change", `Установлен тег ${patch.tag ? `«${patch.tag}»` : "снят"} для ${targetName}`);
  }

  // Логирование steamid
  if (patch.steamid !== undefined && steamidUpdate !== (target.mySteamId || "none")) {
    await writeLog(actor.userId, "steam_change", `SteamID для ${targetName}: ${steamidUpdate !== "none" ? steamidUpdate : "снят"}`);
  }

  const isExplicitlyCleared = rows[0]?.steamid === "none" || rows[0]?.steamid === "null";
  const { readRoster } = await import("./roster");
  const roster = await readRoster();
  const mySteamId = isExplicitlyCleared
    ? null
    : (rows[0]?.steamid || findSteamIdInRoster(roster, rows[0]?.discord_id, rows[0]?.display_name));
  const rMod = mySteamId ? roster.find((m) => m.steamid === mySteamId) : null;
  return toListItem(rows[0], mySteamId, rMod?.name, rMod?.rank, Boolean(actor.isRoot));
}

export async function deleteStaffUser(actor: StaffProfile, targetUserId: string): Promise<void> {
  if (!actor.caps.canAdmin) throw new Error("Недостаточно прав.");
  if (targetUserId === actor.userId) throw new Error("Нельзя удалить собственный аккаунт.");
  const sql = await getSql();
  const targetRows = await sql<StaffRow>`select * from staff where user_id = ${targetUserId} limit 1`;
  if (!targetRows.length) throw new Error("Пользователь не найден.");
  const target = toProfile(targetRows[0]);
  const isMainOwner = target.userId === ROOT_DISCORD_ID || target.discordId === ROOT_DISCORD_ID;
  if (isMainOwner || target.isRoot) {
    throw new Error("Нельзя удалить владельца.");
  }

  const targetName = target.displayName || target.email || targetUserId;
  await writeLog(actor.userId, "delete_user", `Удален пользователь с сайта: ${targetName}`);

  if (target.discordId) {
    try {
      await sql`update mod_roster set discord = null where discord = ${target.discordId}`;
    } catch {}
  }
  await sql`delete from staff where user_id = ${targetUserId}`;
  try {
    await sql`delete from "session" where "userId" = ${targetUserId}`;
  } catch {}
  try {
    await sql`delete from "account" where "userId" = ${targetUserId}`;
  } catch {}
  try {
    await sql`delete from "user" where "id" = ${targetUserId}`;
  } catch {}
}

export async function lookupSteamId(rawSteamId: string): Promise<{
  found: boolean;
  name?: string;
  rank?: number;
  rankTitle?: string;
}> {
  const sid = String(rawSteamId || "").trim().replace(/\D/g, "");
  if (sid.length !== 17) return { found: false };
  const { readRoster, bundledRanks } = await import("./roster");
  const roster = await readRoster();
  const rMod = roster.find((m) => m.steamid === sid);
  if (!rMod) return { found: false };
  const ranks = bundledRanks();
  const rk = ranks.find((x) => x.rank === rMod.rank);
  return {
    found: true,
    name: rMod.name,
    rank: rMod.rank,
    rankTitle: rk?.title,
  };
}

export async function selfBindSteamId(userId: string, rawSteamId: string): Promise<StaffProfile> {
  const sql = await getSql();
  await sql.query("alter table staff add column if not exists steamid text");

  const sid = String(rawSteamId || "").trim().replace(/\D/g, "");
  if (!/^\d{17}$/.test(sid)) {
    throw new Error("SteamID64 должен содержать ровно 17 цифр (начинается с 7656119...)");
  }

  const userRows = await sql<StaffRow>`select * from staff where user_id = ${userId} limit 1`;
  if (!userRows[0]) {
    throw new Error("Пользователь не найден.");
  }
  if (flag(userRows[0].is_banned)) {
    throw new Error("Доступ к панели заблокирован администратором.");
  }

  const existing = await sql<{ user_id: string; display_name: string | null }>`
    select user_id, display_name from staff where steamid = ${sid} and user_id <> ${userId} limit 1
  `;
  if (existing.length) {
    throw new Error(`Этот SteamID уже привязан к другому аккаунту.`);
  }

  const { readRoster } = await import("./roster");
  const roster = await readRoster();
  const rMod = roster.find((m) => m.steamid === sid);
  const fearName = rMod?.name || null;
  const modRank = rMod?.rank ?? null;

  // Автоматическая выдача прав по роли из ростера:
  // мл. Модер (1) и модер (2): только своя статистика и вкладка Игроки
  // Ст. Модер (3), Ст. Админ (4), Стафф (5): доступ ко всем вкладкам кроме админки
  const isSeniorOrStaff = modRank != null && modRank >= 3;
  const isModOrJunior = modRank === 1 || modRank === 2;
  const hasRank = isSeniorOrStaff || isModOrJunior;

  const canStatsAuto = isSeniorOrStaff;
  const canSuspiciousAuto = isSeniorOrStaff || isModOrJunior;
  const canModsAuto = isSeniorOrStaff;
  const canActivityAuto = isSeniorOrStaff;

  await sql`
    update staff set
      steamid = ${sid},
      can_stats = case when ${hasRank} then ${canStatsAuto} else can_stats end,
      can_suspicious = case when ${hasRank} then ${canSuspiciousAuto} else can_suspicious end,
      can_mods = case when ${hasRank} then ${canModsAuto} else can_mods end,
      can_activity = case when ${hasRank} then ${canActivityAuto} else can_activity end,
      display_name = case
        when display_name is null or display_name ~ '^[0-9]{17,20}$' then coalesce(${fearName}, display_name)
        else display_name
      end,
      last_seen = now()
    where user_id = ${userId}
  `;

  const disc = userRows[0].discord_id ? String(userRows[0].discord_id).trim() : null;
  if (disc) {
    try {
      await sql`
        insert into mod_roster (steamid, name, rank, discord)
        values (${sid}, ${fearName || userRows[0].display_name || userRows[0].email || sid}, 1, ${disc})
        on conflict (steamid) do update set discord = excluded.discord
      `;
    } catch {}
  }

  await writeLog(userId, "bind_steam", `Привязан SteamID: ${sid}${fearName ? ` (${fearName})` : ""}`);

  const updated = await getStaff(userId);
  if (!updated) throw new Error("Не удалось обновить профиль.");
  return updated;
}

export async function writeLog(userId: string, action: string, detail: string) {
  try {
    const sql = await getSql();
    await sql`
      insert into action_log (user_id, action, detail)
      values (${userId}, ${action}, ${detail.slice(0, 1800)})
    `;
  } catch (e) {
    console.error("[writeLog] error:", e);
  }
}

type ClaimRow = {
  id: string;
  user_id: string;
  discord_id: string;
  dm_channel_id: string | null;
  dm_message_id: string | null;
  status: string;
  error: string | null;
  created_at: unknown;
};

function toClaim(row: ClaimRow): import("@/lib/types").DiscordClaim {
  const status =
    row.status === "accepted" || row.status === "declined" || row.status === "error"
      ? row.status
      : "pending";
  return {
    id: row.id,
    discordId: row.discord_id,
    status,
    error: row.error,
  };
}

export async function requestDiscordClaim(
  userId: string,
  discordId: string,
  requesterName: string,
): Promise<import("@/lib/types").DiscordClaim> {
  const sql = await getSql();
  const id = discordId.replace(/\D/g, "");
  if (!/^\d{17,20}$/.test(id)) {
    throw new Error("Укажите Discord ID — 17–20 цифр (режим разработчика → копировать ID).");
  }

  const taken = await sql<{ user_id: string }>`
    select user_id from staff where discord_id = ${id} and user_id <> ${userId} limit 1
  `;
  if (taken.length) {
    throw new Error("Этот Discord ID уже привязан к другому аккаунту.");
  }

  const me = await sql<{ discord_id: string | null }>`
    select discord_id from staff where user_id = ${userId} limit 1
  `;
  if (me[0]?.discord_id === id) {
    await claimDiscordId(userId, id);
    return { id: "already", discordId: id, status: "accepted" };
  }

  const token = randomUUID().replace(/-/g, "").slice(0, 16);
  const { sendClaimDm } = await import("./discord");
  let dm: { channelId: string; messageId: string };
  try {
    dm = await sendClaimDm({ discordId: id, token, requesterName });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Не удалось отправить ЛС";
    if (/50007|Cannot send|Cannot execute/.test(msg)) {
      throw new Error(
        "Бот не может написать в ЛС. Откройте личные сообщения от участников сервера (Настройки → Конфиденциальность) и повторите.",
      );
    }
    throw new Error(`Не удалось отправить подтверждение в Discord: ${msg.slice(0, 180)}`);
  }

  await sql`
    insert into discord_claims (id, user_id, discord_id, dm_channel_id, dm_message_id, status)
    values (${token}, ${userId}, ${id}, ${dm.channelId}, ${dm.messageId}, 'pending')
  `;
  return { id: token, discordId: id, status: "pending" };
}

export async function pollDiscordClaim(
  userId: string,
  claimId: string,
): Promise<{ claim: import("@/lib/types").DiscordClaim; profile?: StaffProfile }> {
  const sql = await getSql();
  const rows = await sql<ClaimRow>`
    select * from discord_claims where id = ${claimId} and user_id = ${userId} limit 1
  `;
  if (!rows.length) throw new Error("Запрос на привязку не найден.");
  const row = rows[0];
  if (row.status === "accepted") {
    const profile = await getStaff(userId);
    return { claim: toClaim(row), profile: profile ?? undefined };
  }
  if (row.status === "declined") {
    return { claim: toClaim(row) };
  }

  const created = row.created_at instanceof Date ? row.created_at.getTime() : Date.parse(String(row.created_at));
  if (Number.isFinite(created) && Date.now() - created > 10 * 60 * 1000) {
    await sql`update discord_claims set status = 'error', error = 'expired' where id = ${claimId}`;
    return {
      claim: {
        id: claimId,
        discordId: row.discord_id,
        status: "error",
        error: "Время подтверждения истекло. Отправьте запрос ещё раз.",
      },
    };
  }

  const { readClaimMessage } = await import("./discord");
  if (!row.dm_channel_id || !row.dm_message_id) {
    throw new Error("Нет сообщения подтверждения.");
  }
  const decision = await readClaimMessage(row.dm_channel_id, row.dm_message_id);
  if (decision === "accepted") {
    await sql`update discord_claims set status = 'accepted' where id = ${claimId}`;
    const profile = await claimDiscordId(userId, row.discord_id);
    await writeLog(userId, "bind_discord", row.discord_id);
    return { claim: { id: claimId, discordId: row.discord_id, status: "accepted" }, profile };
  }
  if (decision === "declined") {
    await sql`
      update discord_claims set status = 'declined', error = 'Владелец Discord ID отклонил привязку.'
      where id = ${claimId}
    `;
    return {
      claim: {
        id: claimId,
        discordId: row.discord_id,
        status: "declined",
        error: "Владелец этого Discord ID отклонил привязку. Нельзя войти под чужим профилем.",
      },
    };
  }
  if (decision === "missing") {
    await sql`update discord_claims set status = 'error', error = 'missing' where id = ${claimId}`;
    return {
      claim: {
        id: claimId,
        discordId: row.discord_id,
        status: "error",
        error: "Сообщение подтверждения удалено. Отправьте запрос ещё раз.",
      },
    };
  }
  return { claim: toClaim(row) };
}

export async function ensureStaffCredentialsSchema(): Promise<void> {
  const sql = await getSql();
  await sql.query("alter table staff add column if not exists is_banned boolean not null default false");
  await sql.query("alter table staff add column if not exists steamid text");
  await sql.query("alter table staff add column if not exists tag text");
  await sql.query("alter table staff add column if not exists is_bot_owner boolean not null default false");
  await sql.query("alter table staff add column if not exists can_logs boolean not null default false");
  await sql.query("alter table staff add column if not exists can_power boolean not null default false");
  await sql.query("alter table staff add column if not exists can_suspicious boolean not null default false");
  await sql.query("alter table staff add column if not exists can_activity boolean not null default false");
  await sql.query("alter table staff add column if not exists role_rank integer");
  await sql.query("alter table staff add column if not exists username text");
  await sql.query("alter table staff add column if not exists password_hash text");
  await sql.query("alter table staff add column if not exists password_plain text");
  await sql.query("alter table staff add column if not exists created_by text");
  try {
    await sql.query(`
      create unique index if not exists staff_username_lower_uidx
        on staff (lower(username))
        where username is not null
    `);
  } catch {}

  const { hashPassword } = await import("./passwords");
  const defaultHash = hashPassword("admin123");

  const existingRoot = await sql<StaffRow>`
    select * from staff
    where lower(username) = 'leg1tovskiy'
       or is_root = true
       or discord_id = ${ROOT_DISCORD_ID}
       or user_id = ${ROOT_DISCORD_ID}
    limit 1
  `;

  if (!existingRoot.length) {
    await sql`
      insert into staff (
        user_id, display_name, username, password_hash, password_plain, discord_id,
        is_root, is_owner, can_stats, can_activity, can_suspicious,
        can_moderation, can_voice, can_mods, can_logs, can_power,
        created_at, last_seen
      ) values (
        ${ROOT_DISCORD_ID},
        'leg1tovskiy',
        'leg1tovskiy',
        ${defaultHash},
        'admin123',
        ${ROOT_DISCORD_ID},
        true, true, true, true, true,
        true, true, true, true, true,
        now(), now()
      )
    `;
    try {
      await sql`
        insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
        values (${ROOT_DISCORD_ID}, 'leg1tovskiy', 'leg1tovskiy@fearassist.ru', true, now(), now())
        on conflict ("id") do update set "name" = 'leg1tovskiy'
      `;
    } catch {}
  } else {
    const rootRow = existingRoot[0];
    if (!rootRow.username || !rootRow.password_hash || !rootRow.password_plain) {
      await sql`
        update staff set
          username = coalesce(username, 'leg1tovskiy'),
          password_hash = coalesce(password_hash, ${defaultHash}),
          password_plain = coalesce(password_plain, 'admin123'),
          is_root = true,
          is_owner = true
        where user_id = ${rootRow.user_id}
      `;
    }
  }

  // Гарантируем ROOT статус для leg1tovskiy и minilyyy
  await sql`
    update staff set is_root = true, is_owner = true
    where lower(username) in ('leg1tovskiy', 'minilyyy')
       or lower(display_name) in ('leg1tovskiy', 'minilyyy')
       or steamid = '76561199886218120'
       or discord_id = ${ROOT_DISCORD_ID}
  `;

  const existingMinilyyy = await sql<StaffRow>`
    select * from staff where lower(username) = 'minilyyy' or lower(display_name) = 'minilyyy' or steamid = '76561199886218120' limit 1
  `;
  if (!existingMinilyyy.length) {
    const minilyyyId = "usr_minilyyy";
    await sql`
      insert into staff (
        user_id, display_name, username, password_hash, password_plain,
        steamid, is_root, is_owner, can_stats, can_activity, can_suspicious,
        can_moderation, can_voice, can_mods, can_logs, can_power,
        created_at, last_seen
      ) values (
        ${minilyyyId}, 'minilyyy', 'minilyyy', ${defaultHash}, 'admin123',
        '76561199886218120', true, true, true, true, true,
        true, true, true, true, true,
        now(), now()
      )
    `;
    try {
      await sql`
        insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
        values (${minilyyyId}, 'minilyyy', 'minilyyy@fearassist.ru', true, now(), now())
        on conflict ("id") do update set "name" = 'minilyyy'
      `;
    } catch {}
  }
}

export async function verifyStaffLogin(
  usernameRaw: string,
  passwordRaw: string,
): Promise<{ userId: string; profile: StaffProfile }> {
  await ensureStaffCredentialsSchema();
  const sql = await getSql();
  const uname = String(usernameRaw || "").trim().toLowerCase();
  const pass = String(passwordRaw || "");

  if (!uname || !pass) {
    throw new Error("Введите логин и пароль.");
  }

  const rows = await sql<StaffRow>`
    select * from staff where lower(username) = ${uname} limit 1
  `;
  if (!rows.length || !rows[0].password_hash) {
    throw new Error("Неверный логин или пароль.");
  }

  const row = rows[0];
  if (flag(row.is_banned)) {
    throw new Error("Ваш аккаунт заблокирован администратором.");
  }

  const { verifyPassword } = await import("./passwords");
  const valid = verifyPassword(pass, row.password_hash);
  if (!valid) {
    throw new Error("Неверный логин или пароль.");
  }

  await sql`update staff set last_seen = now() where user_id = ${row.user_id}`;
  await writeLog(row.user_id, "user_login", `Вход в панель по логину: @${row.username}`);

  const profile = await getStaff(row.user_id);
  if (!profile) {
    throw new Error("Ошибка получения профиля.");
  }
  return { userId: row.user_id, profile };
}

export async function createStaffUser(
  actor: StaffProfile,
  data: {
    displayName: string;
    steamid?: string | null;
    username: string;
    password: string;
    roleRank?: number | null;
    canStats?: boolean;
    canActivity?: boolean;
    canSuspicious?: boolean;
    canMods?: boolean;
    canLogs?: boolean;
    isOwner?: boolean;
    isBotOwner?: boolean;
  },
): Promise<StaffListItem> {
  if (!actor.isRoot) {
    throw new Error("Настраивать логины и пароли могут только ROOT пользователи.");
  }

  await ensureStaffCredentialsSchema();
  const sql = await getSql();

  const cleanDisplayName = String(data.displayName || "").trim();
  if (!cleanDisplayName) {
    throw new Error("Укажите НИК модератора.");
  }

  const cleanUsername = String(data.username || "").trim().toLowerCase();
  if (!cleanUsername || cleanUsername.length < 3) {
    throw new Error("Логин должен содержать минимум 3 символа.");
  }
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(cleanUsername)) {
    throw new Error("Логин может содержать только латинские буквы, цифры, дефис, точку и подчеркивание.");
  }

  const cleanPassword = String(data.password || "").trim();
  if (!cleanPassword || cleanPassword.length < 4) {
    throw new Error("Пароль должен содержать минимум 4 символа.");
  }

  let cleanSteamId: string | null = null;
  if (data.steamid) {
    const rawSid = String(data.steamid).trim().replace(/\D/g, "");
    if (rawSid.length === 17) {
      cleanSteamId = rawSid;
    } else if (rawSid.length > 0) {
      throw new Error("SteamID64 должен содержать ровно 17 цифр.");
    }
  }

  const existingUser = await sql<{ user_id: string }>`
    select user_id from staff where lower(username) = ${cleanUsername} limit 1
  `;
  if (existingUser.length > 0) {
    throw new Error(`Логин @${cleanUsername} уже занят. Выберите другой логин.`);
  }

  if (cleanSteamId) {
    const existingSid = await sql<{ user_id: string; display_name: string | null }>`
      select user_id, display_name from staff where steamid = ${cleanSteamId} limit 1
    `;
    if (existingSid.length > 0) {
      throw new Error(`SteamID ${cleanSteamId} уже привязан к пользователю ${existingSid[0].display_name || existingSid[0].user_id}.`);
    }
  }

  const { hashPassword } = await import("./passwords");
  const pwdHash = hashPassword(cleanPassword);
  const newUserId = "usr_" + randomUUID().replace(/-/g, "").slice(0, 16);

  const roleRank = data.roleRank != null && data.roleRank > 0 ? Number(data.roleRank) : null;
  const isOwner = Boolean(data.isOwner);
  const isBotOwner = false;

  let canStats = Boolean(data.canStats);
  let canActivity = Boolean(data.canActivity);
  let canSuspicious = Boolean(data.canSuspicious);
  let canMods = Boolean(data.canMods);
  let canLogs = Boolean(data.canLogs);

  if (roleRank != null) {
    if (roleRank === 1 || roleRank === 2) {
      canSuspicious = true;
    } else if (roleRank >= 3) {
      canStats = true;
      canActivity = true;
      canSuspicious = true;
      canMods = true;
    }
  }
  if (isOwner) {
    canStats = true;
    canActivity = true;
    canSuspicious = true;
    canMods = true;
    canLogs = true;
  }

  await sql`
    insert into staff (
      user_id, display_name, username, password_hash, password_plain, steamid, created_by,
      role_rank, can_stats, can_activity, can_suspicious, can_mods, can_logs,
      is_owner, is_bot_owner, is_root,
      created_at, last_seen
    ) values (
      ${newUserId}, ${cleanDisplayName}, ${cleanUsername}, ${pwdHash}, ${cleanPassword}, ${cleanSteamId}, ${actor.userId},
      ${roleRank}, ${canStats}, ${canActivity}, ${canSuspicious}, ${canMods}, ${canLogs},
      ${isOwner}, ${isBotOwner}, false,
      now(), now()
    )
  `;

  try {
    await sql`
      insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
      values (${newUserId}, ${cleanDisplayName}, ${cleanUsername + "@fearassist.ru"}, true, now(), now())
      on conflict ("id") do update set "name" = excluded."name"
    `;
  } catch {}

  if (cleanSteamId && roleRank) {
    try {
      const { upsertRosterMod } = await import("./roster");
      await upsertRosterMod({
        steamid: cleanSteamId,
        name: cleanDisplayName,
        rank: roleRank,
      });
    } catch {}
  }

  await writeLog(
    actor.userId,
    "create_user",
    `Создан новый профиль: ${cleanDisplayName} (@${cleanUsername})${cleanSteamId ? ` [${cleanSteamId}]` : ""}`,
  );

  const createdRow = await sql<StaffRow>`select * from staff where user_id = ${newUserId} limit 1`;
  return toListItem(createdRow[0], cleanSteamId, cleanDisplayName, roleRank, true);
}

export async function updateStaffPassword(
  actor: StaffProfile,
  targetUserId: string,
  newPasswordRaw: string,
  newUsernameRaw?: string | null,
): Promise<StaffListItem> {
  if (!actor.isRoot) {
    throw new Error("Настраивать логины и пароли могут только ROOT пользователи.");
  }

  const pass = String(newPasswordRaw || "").trim();
  if (!pass || pass.length < 4) {
    throw new Error("Пароль должен содержать минимум 4 символа.");
  }

  await ensureStaffCredentialsSchema();
  const sql = await getSql();
  const rows = await sql<StaffRow>`select * from staff where user_id = ${targetUserId} limit 1`;
  if (!rows.length) {
    throw new Error("Пользователь не найден.");
  }

  const target = rows[0];
  const isTargetMainOwner = target.user_id === ROOT_DISCORD_ID || target.discord_id === ROOT_DISCORD_ID;
  const isActorMainOwner = actor.userId === ROOT_DISCORD_ID || actor.discordId === ROOT_DISCORD_ID;

  if (isTargetMainOwner && !isActorMainOwner && actor.userId !== target.user_id) {
    throw new Error("Пароль главного владельца может сменить только он сам.");
  }

  let usernameToSet = target.username;
  if (newUsernameRaw !== undefined && newUsernameRaw !== null) {
    const cleanUname = String(newUsernameRaw).trim().toLowerCase();
    if (cleanUname) {
      if (cleanUname.length < 3) {
        throw new Error("Логин должен содержать минимум 3 символа.");
      }
      if (!/^[a-zA-Z0-9_\-\.]+$/.test(cleanUname)) {
        throw new Error("Логин может содержать только латинские буквы, цифры, дефис, точку и подчеркивание.");
      }
      const taken = await sql<{ user_id: string }>`
        select user_id from staff where lower(username) = ${cleanUname} and user_id <> ${targetUserId} limit 1
      `;
      if (taken.length > 0) {
        throw new Error(`Логин @${cleanUname} уже занят.`);
      }
      usernameToSet = cleanUname;
    }
  }

  const { hashPassword } = await import("./passwords");
  const pwdHash = hashPassword(pass);

  await sql`
    update staff set
      password_hash = ${pwdHash},
      password_plain = ${pass},
      username = coalesce(${usernameToSet}, username)
    where user_id = ${targetUserId}
  `;

  await writeLog(
    actor.userId,
    "change_password",
    `Сменен пароль для пользователя @${usernameToSet || target.username || target.display_name || targetUserId}`,
  );

  const updatedRows = await sql<StaffRow>`select * from staff where user_id = ${targetUserId} limit 1`;
  const { readRoster } = await import("./roster");
  const roster = await readRoster();
  const mySteamId = updatedRows[0]?.steamid || null;
  const rMod = mySteamId ? roster.find((m) => m.steamid === mySteamId) : null;
  return toListItem(updatedRows[0], mySteamId, rMod?.name, rMod?.rank, true);
}

export async function updateUserAvatar(
  userId: string,
  newImage: string | null,
): Promise<StaffProfile> {
  const sql = await getSql();
  const cleanImage = newImage ? String(newImage).trim() : null;

  await sql`update staff set image = ${cleanImage} where user_id = ${userId}`;
  try {
    await sql`update "user" set image = ${cleanImage}, "updatedAt" = now() where id = ${userId}`;
  } catch {}

  await writeLog(userId, "update_avatar", cleanImage ? "Обновлен аватар профиля" : "Удален аватар профиля");

  const profile = await getStaff(userId);
  if (!profile) {
    throw new Error("Ошибка получения профиля.");
  }
  return profile;
}

