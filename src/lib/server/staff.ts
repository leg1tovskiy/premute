import { getSql } from "@/lib/db";
import { randomUUID } from "node:crypto";
import type { Caps, StaffListItem, StaffProfile } from "@/lib/types";
import { ROOT_DISCORD_ID } from "./config";

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

export function computeCaps(row: {
  is_root: unknown;
  is_owner: unknown;
  is_bot_owner: unknown;
  can_stats: unknown;
  can_moderation: unknown;
  can_voice: unknown;
  can_mods: unknown;
  can_logs: unknown;
  can_power: unknown;
}): Caps {
  const isRoot = flag(row.is_root);
  // «Владелец сайта» — полный доступ к сайту. «Владелец бота» (красный) — команды Discord.
  const isOwner = isRoot || flag(row.is_owner);
  const canStats = isOwner || flag(row.can_stats);
  const canModeration = isOwner || flag(row.can_moderation);
  const canVoice = isOwner || flag(row.can_voice);
  const canMods = isOwner || flag(row.can_mods);
  const canLogs = isOwner || flag(row.can_logs);
  const canPower = isOwner || flag(row.can_power);
  const canAdmin = isOwner;
  // Консоль сервера — только корневые владельцы бота. Отдельного тумблера нет.
  const canConsole = isRoot;
  return {
    isRoot,
    isOwner,
    canStats,
    canModeration,
    canVoice,
    canMods,
    canLogs,
    canPower,
    canConsole,
    canAdmin,
    // Новых «владельцев сайта» может назначать только корневой владелец.
    canGrantOwner: isRoot,
    // Назначать/снимать «владельцев бота» может только корневой владелец.
    canGrantBotOwner: isRoot,
    waiting: !(canStats || canModeration || canVoice || canMods || canLogs || canPower || canConsole || canAdmin),
  };
}

type StaffRow = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  image: string | null;
  discord_id: string | null;
  is_root: unknown;
  is_owner: unknown;
  is_bot_owner: unknown;
  can_stats: unknown;
  can_moderation: unknown;
  can_voice: unknown;
  can_mods: unknown;
  can_logs: unknown;
  can_power: unknown;
  tag: string | null;
  created_at: unknown;
  last_seen: unknown;
};

function toProfile(row: StaffRow): StaffProfile {
  const caps = computeCaps(row);
  return {
    userId: row.user_id,
    displayName: row.display_name,
    email: row.email,
    image: row.image,
    discordId: row.discord_id,
    tag: row.tag ? String(row.tag) : null,
    isRoot: caps.isRoot,
    isOwner: caps.isOwner,
    isBotOwner: flag(row.is_bot_owner) && !caps.isRoot,
    canStats: flag(row.can_stats),
    canModeration: flag(row.can_moderation),
    canVoice: flag(row.can_voice),
    canMods: flag(row.can_mods),
    canLogs: flag(row.can_logs),
    canPower: flag(row.can_power),
    createdAt: iso(row.created_at),
    lastSeen: iso(row.last_seen),
    caps,
  };
}

function toListItem(row: StaffRow): StaffListItem {
  const { caps: _c, ...rest } = toProfile(row);
  return rest;
}

export async function upsertStaff(
  userId: string,
  profile: { displayName?: string | null; email?: string | null; image?: string | null },
): Promise<StaffProfile> {
  const sql = await getSql();
  const existing = await sql<StaffRow>`select * from staff where user_id = ${userId} limit 1`;
  if (!existing.length) {
    await sql`
      insert into staff (user_id, display_name, email, image)
      values (
        ${userId},
        ${profile.displayName ?? null},
        ${profile.email ?? null},
        ${profile.image ?? null}
      )
    `;
  } else {
    await sql`
      update staff set
        display_name = coalesce(${profile.displayName ?? null}, display_name),
        email = coalesce(${profile.email ?? null}, email),
        image = coalesce(${profile.image ?? null}, image),
        last_seen = now()
      where user_id = ${userId}
    `;
  }
  const rows = await sql<StaffRow>`select * from staff where user_id = ${userId} limit 1`;
  return toProfile(rows[0]);
}

export async function getStaff(userId: string): Promise<StaffProfile | null> {
  const sql = await getSql();
  const rows = await sql<StaffRow>`select * from staff where user_id = ${userId} limit 1`;
  return rows[0] ? toProfile(rows[0]) : null;
}

export async function listStaff(): Promise<StaffListItem[]> {
  const sql = await getSql();
  const rows = await sql<StaffRow>`select * from staff order by is_root desc, is_owner desc, last_seen desc`;
  return rows.map(toListItem);
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
  return toProfile(rows[0]);
}

export async function updateStaffPermissions(
  actor: StaffProfile,
  targetUserId: string,
  patch: {
    canStats?: boolean;
    canMods?: boolean;
    isOwner?: boolean;
    isBotOwner?: boolean;
    setRoot?: boolean;
    tag?: string | null;
  },
): Promise<StaffListItem> {
  if (!actor.caps.canAdmin) throw new Error("Недостаточно прав.");
  const sql = await getSql();
  const targetRows = await sql<StaffRow>`select * from staff where user_id = ${targetUserId} limit 1`;
  if (!targetRows.length) throw new Error("Пользователь не найден.");
  const target = toProfile(targetRows[0]);

  const isMainOwner = target.userId === ROOT_DISCORD_ID || target.discordId === ROOT_DISCORD_ID;
  const actorIsMainOwner = actor.userId === ROOT_DISCORD_ID || actor.discordId === ROOT_DISCORD_ID;

  // Тумблер «красный Владелец» ↔ «Корневой владелец» — только для главного владельца 652...
  const togglingOwnership = patch.setRoot !== undefined;
  if (togglingOwnership && !actorIsMainOwner) {
    throw new Error("Переключать между «Владельцем» и «Корневым владельцем» может только главный владелец 652399540384694292.");
  }
  if (patch.setRoot === true && !target.discordId) {
    throw new Error("Сначала привяжите Discord ID этого пользователя.");
  }
  if (isMainOwner && patch.setRoot === false) {
    throw new Error("Главного владельца 652399540384694292 нельзя понизить.");
  }

  // Обычные изменения прав нельзя вносить в чужого корневого владельца,
  // зато главный владелец может понизить другого корневого через тумблер.
  if (!togglingOwnership && target.isRoot && target.userId !== actor.userId) {
    throw new Error("Нельзя менять права корневого владельца.");
  }
  if (!togglingOwnership && target.isRoot && (patch.isOwner === false || patch.isBotOwner === false)) {
    throw new Error("Корневого владельца нельзя снять.");
  }
  if (patch.isOwner !== undefined && !actor.caps.canGrantOwner) {
    throw new Error("Назначать владельцев сайта может только корневой владелец.");
  }
  if (patch.isBotOwner !== undefined && !actor.caps.canGrantBotOwner) {
    throw new Error("Назначать владельцев бота может только корневой владелец.");
  }
  if (patch.isBotOwner === true && !target.discordId) {
    throw new Error("Сначала привяжите Discord ID этого пользователя.");
  }

  let isRoot = target.isRoot;
  let isBotOwner = patch.isBotOwner ?? target.isBotOwner;
  if (togglingOwnership) {
    // Здесь patch.setRoot гарантированно задан (см. togglingOwnership выше).
    isRoot = patch.setRoot === true;
    // При повышении «Владелец» → «Корневой» снимаем флаг владельца бота,
    // при понижении — возвращаем красного «Владельца».
    isBotOwner = !isRoot;
  }
  const isOwner = patch.isOwner ?? target.isOwner;

  const canStats = patch.canStats ?? target.canStats;
  const canMods = patch.canMods ?? target.canMods;
  if (patch.tag !== undefined && !actor.caps.isOwner) {
    throw new Error("Теги могут назначать только владельцы.");
  }
  const tag = patch.tag !== undefined ? sanitizeTag(patch.tag) : target.tag;

  await sql.query("alter table staff add column if not exists tag text");
  await sql.query("alter table staff add column if not exists is_bot_owner boolean not null default false");
  await sql.query("alter table staff add column if not exists can_logs boolean not null default false");
  await sql.query("alter table staff add column if not exists can_power boolean not null default false");
  await sql`
    update staff set
      can_stats = ${canStats},
      can_mods = ${canMods},
      is_root = ${isRoot},
      is_owner = ${isOwner},
      is_bot_owner = ${isBotOwner},
      tag = ${tag}
    where user_id = ${targetUserId}
  `;
  const rows = await sql<StaffRow>`select * from staff where user_id = ${targetUserId} limit 1`;
  if (patch.isBotOwner !== undefined || patch.setRoot !== undefined) {
    const owners = await sql<{ discord_id: string | null }>`
      select discord_id from staff
      where (is_root = true or is_bot_owner = true) and discord_id is not null
    `;
    const ids = owners.map((r) => String(r.discord_id || "")).filter(Boolean);
    ids.push(ROOT_DISCORD_ID);
    try {
      const { syncBotOwners } = await import("./discord");
      await syncBotOwners(ids, actor.displayName || actor.email || actor.userId);
    } catch (e) {
      console.error("[staff] sync owners:", e instanceof Error ? e.message : e);
    }
  }
  return toListItem(rows[0]);
}

export async function writeLog(userId: string, action: string, detail: string) {
  const sql = await getSql();
  await sql`
    insert into action_log (user_id, action, detail)
    values (${userId}, ${action}, ${detail.slice(0, 1800)})
  `;
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
