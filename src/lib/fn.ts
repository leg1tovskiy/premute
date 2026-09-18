import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type {
  BackupsPayload,
  DailyPoint,
  DiscordClaim,
  ModDetails,
  PlayerRecord,
  RosterPayload,
  StaffListItem,
  StaffProfile,
  StatsPayload,
  SuspiciousPayload,
  SystemStatus,
} from "@/lib/types";

export const getMe = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { displayName?: string | null; email?: string | null; image?: string | null }) => d)
  .handler(async ({ context, data }): Promise<StaffProfile> => {
    const { upsertStaff } = await import("./server/staff");
    return upsertStaff(context.userId, data ?? {});
  });

export const bindDiscord = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { discordId: string }) => d)
  .handler(async ({ context, data }): Promise<DiscordClaim> => {
    const { requestDiscordClaim, getStaff } = await import("./server/staff");
    const me = await getStaff(context.userId);
    const name = me?.displayName || me?.email || "пользователь панели";
    return requestDiscordClaim(context.userId, data.discordId, name);
  });

export const pollDiscordClaim = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { claimId: string }) => d)
  .handler(async ({ context, data }): Promise<{ claim: DiscordClaim; profile?: StaffProfile }> => {
    const { pollDiscordClaim: poll } = await import("./server/staff");
    return poll(context.userId, data.claimId);
  });

export const listStaffFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<StaffListItem[]> => {
    const { getStaff, listStaff } = await import("./server/staff");
    const me = await getStaff(context.userId);
    if (!me?.caps.canAdmin) throw new Error("Недостаточно прав.");
    return listStaff();
  });

export const setStaffPerms = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      userId: string;
      canStats?: boolean;
      canMods?: boolean;
      isOwner?: boolean;
      isBotOwner?: boolean;
      setRoot?: boolean;
      tag?: string | null;
    }) => d,
  )
  .handler(async ({ context, data }): Promise<StaffListItem> => {
    const { getStaff, updateStaffPermissions, writeLog } = await import("./server/staff");
    const me = await getStaff(context.userId);
    if (!me) throw new Error("Профиль не найден.");
    const updated = await updateStaffPermissions(me, data.userId, {
      canStats: data.canStats,
      canMods: data.canMods,
      isOwner: data.isOwner,
      isBotOwner: data.isBotOwner,
      setRoot: data.setRoot,
      tag: data.tag,
    });
    await writeLog(context.userId, "set_perms", JSON.stringify(data));
    return updated;
  });

export const getStatsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { refresh?: boolean } | undefined) => d ?? {})
  .handler(async ({ context, data }): Promise<StatsPayload> => {
    const { getStaff } = await import("./server/staff");
    const me = await getStaff(context.userId);
    if (!me?.caps.canStats) throw new Error("Нет доступа к статистике.");
    const { loadStats } = await import("./server/stats");
    const { attachLastMonthTop } = await import("./server/tops");
    const { withSlugs } = await import("./server/mod-slugs");
    const stats = await loadStats({ refresh: Boolean(data?.refresh) });
    stats.moderators = await withSlugs(stats.moderators);
    const withTop = await attachLastMonthTop(stats);
    const { snapshotStats, applyComparison } = await import("./server/archive");
    try {
      await snapshotStats(withTop);
      return await applyComparison(withTop);
    } catch {
      // архив ещё не создан (миграция не применена) — отдаём как есть
      return withTop;
    }
  });

export const getModDetailsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { slug: string }) => d)
  .handler(async ({ context, data }): Promise<ModDetails | null> => {
    const { getStaff } = await import("./server/staff");
    const me = await getStaff(context.userId);
    if (!me?.caps.canStats) throw new Error("Нет доступа к статистике.");
    const slug = String(data.slug || "").slice(0, 64);
    if (!slug) return null;
    const { loadStats } = await import("./server/stats");
    const { withSlugs, findBySlug, normalizeSlug } = await import("./server/mod-slugs");
    const { fetchWorkerPunishments } = await import("./server/discord");
    const stats = await loadStats({});
    const mods = await withSlugs(stats.moderators);
    const needle = normalizeSlug(slug);
    let mod = mods.find((m) => m.slug === needle);
    if (!mod) {
      const steamid = await findBySlug(needle);
      if (steamid) mod = mods.find((m) => m.steamid === steamid);
    }
    if (!mod) return null;
    const worker = await fetchWorkerPunishments(mod.steamid);
    return {
      month: stats.month,
      updatedAt: stats.updatedAt,
      monthStart: worker?.monthStart ?? null,
      monthEnd: worker?.monthEnd ?? null,
      moderator: mod,
      records: worker?.records ?? [],
    };
  });

export const getDailyStatsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DailyPoint[]> => {
    const { getStaff } = await import("./server/staff");
    const me = await getStaff(context.userId);
    if (!me?.caps.canStats) throw new Error("Нет доступа к статистике.");
    const { fetchWorkerDaily } = await import("./server/discord");
    const data = await fetchWorkerDaily();
    return data?.days ?? [];
  });

export const getPlayerRecordsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { steamid: string }) => d)
  .handler(async ({ context, data }): Promise<{ month: string | null; records: PlayerRecord[] }> => {
    const { getStaff } = await import("./server/staff");
    const me = await getStaff(context.userId);
    if (!me?.caps.canStats) throw new Error("Нет доступа к статистике.");
    const steamid = String(data.steamid || "").trim();
    if (!/^\d{17}$/.test(steamid)) throw new Error("SteamID64 — 17 цифр.");
    const { fetchWorkerPlayer } = await import("./server/discord");
    const res = await fetchWorkerPlayer(steamid);
    return { month: res?.month ?? null, records: res?.records ?? [] };
  });

export const getSuspiciousFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<SuspiciousPayload> => {
    const { getStaff } = await import("./server/staff");
    const me = await getStaff(context.userId);
    if (!me?.caps.canStats) throw new Error("Нет доступа к статистике.");
    const { fetchWorkerSuspicious } = await import("./server/discord");
    const data = await fetchWorkerSuspicious();
    if (!data) throw new Error("Воркер статистики недоступен.");
    return {
      updatedAt: data.updatedAt ?? null,
      tickets: data.tickets ?? null,
      players: data.players ?? [],
    };
  });

export const getSystemStatusFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<SystemStatus> => {
    const { fetchWorkerHealth, fetchBotAlive } = await import("./server/discord");
    const [worker, bot] = await Promise.all([fetchWorkerHealth(), fetchBotAlive()]);
    return {
      worker: worker.ok,
      bot,
      workerUpdatedAt: worker.updatedAt,
      checkedAt: Math.floor(Date.now() / 1000),
    };
  });

export const exportBackupFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ generatedAt: number; json: string }> => {
    const { getStaff } = await import("./server/staff");
    const me = await getStaff(context.userId);
    if (!me?.caps.isOwner) throw new Error("Резервная копия — только для владельцев сайта.");
    const { getSql } = await import("./db");
    const sql = await getSql();
    const tables: Record<string, unknown[]> = {};
    const dump = async (name: string, query: Promise<unknown[]>) => {
      try {
        tables[name] = await query;
      } catch {
        tables[name] = [];
      }
    };
    await dump("staff", sql`select * from staff order by created_at`);
    await dump("mod_slugs", sql`select * from mod_slugs order by created_at`);
    await dump("mod_roster", sql`select * from mod_roster`);
    await dump("stats_archive", sql`select * from stats_archive order by month_key`);
    await dump("stats_cache", sql`select * from stats_cache`);
    await dump("action_log", sql`select * from action_log order by created_at desc limit 5000`);
    await dump("discord_claims", sql`select * from discord_claims order by created_at desc limit 2000`);
    await dump("users", sql`select "id", "name", "email", "image", "createdAt" from "user" order by "createdAt"`);
    const generatedAt = Math.floor(Date.now() / 1000);
    return { generatedAt, json: JSON.stringify({ generatedAt, tables }, null, 2) };
  });

export const moderatorOnlineFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { ids: string[] }) => d)
  .handler(
    async ({ context, data }): Promise<Record<string, { server: string; nickname: string; map: string | null }>> => {
      const { getStaff } = await import("./server/staff");
      const me = await getStaff(context.userId);
      if (!me?.caps.canStats) throw new Error("Нет доступа к статистике.");
      const { fetchWorkerOnline } = await import("./server/discord");
      const ids = (data.ids || []).map((s) => String(s || "").trim()).filter((s) => /^\d{17}$/.test(s)).slice(0, 200);
      const res = await fetchWorkerOnline(ids);
      return res || {};
    },
  );

const STEAMID_RE = /^\d{17}$/;

export const listModsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<RosterPayload> => {
    const { getStaff } = await import("./server/staff");
    const me = await getStaff(context.userId);
    if (!me?.caps.canMods) throw new Error("Нет доступа к списку модераторов.");
    const { fetchBotRoster } = await import("./server/discord");
    const { readRoster, writeRoster, bundledRanks } = await import("./server/roster");
    const live = await fetchBotRoster();
    if (live?.moderators?.length) {
      await writeRoster(live.moderators);
      return {
        moderators: live.moderators,
        ranks: live.ranks.length ? live.ranks : bundledRanks(),
      };
    }
    return { moderators: await readRoster(), ranks: bundledRanks() };
  });

export const upsertModFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: { steamid: string; name?: string; rank?: number; discord?: string | null; create?: boolean }) => d,
  )
  .handler(async ({ context, data }): Promise<RosterPayload> => {
    const { getStaff, writeLog } = await import("./server/staff");
    const me = await getStaff(context.userId);
    if (!me?.caps.canMods) throw new Error("Нет доступа к управлению модераторами.");
    const steamid = String(data.steamid || "").trim();
    if (!STEAMID_RE.test(steamid)) throw new Error("SteamID64 — 17 цифр.");
    const rank = Number(data.rank ?? 1);
    if (!Number.isInteger(rank) || rank < 1 || rank > 5) throw new Error("Ранг должен быть от 1 до 5.");
    const name = (data.name || "").trim() || steamid;
    const discord = data.discord == null ? null : String(data.discord).replace(/^@/, "").trim();
    const actor = me.displayName || me.email || context.userId;
    const { mutateBotMod } = await import("./server/discord");
    const { upsertRosterMod, readRoster, bundledRanks } = await import("./server/roster");
    const op = data.create ? "mod_add" : "mod_edit";
    let live: RosterPayload;
    try {
      live = await mutateBotMod({ op, actor, steamid, name, rank, discord });
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Бот не принял изменение.");
    }
    if (live.moderators.length) {
      const { writeRoster } = await import("./server/roster");
      await writeRoster(live.moderators);
      await writeLog(context.userId, op, `${steamid} ${name}`);
      return live;
    }
    await upsertRosterMod({ steamid, name, rank, discord });
    await writeLog(context.userId, op, `${steamid} ${name}`);
    return {
      moderators: await readRoster(),
      ranks: bundledRanks(),
      recounting: Boolean(data.create),
    };
  });

export const deleteModFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { steamid: string }) => d)
  .handler(async ({ context, data }): Promise<RosterPayload> => {
    const { getStaff, writeLog } = await import("./server/staff");
    const me = await getStaff(context.userId);
    if (!me?.caps.canMods) throw new Error("Нет доступа к управлению модераторами.");
    const steamid = String(data.steamid || "").trim();
    if (!STEAMID_RE.test(steamid)) throw new Error("SteamID64 — 17 цифр.");
    const actor = me.displayName || me.email || context.userId;
    const { mutateBotMod } = await import("./server/discord");
    const { deleteRosterMod, bundledRanks } = await import("./server/roster");
    let live: RosterPayload;
    try {
      live = await mutateBotMod({ op: "mod_del", actor, steamid });
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Бот не принял удаление.");
    }
    if (live.moderators.length) {
      const { writeRoster } = await import("./server/roster");
      await writeRoster(live.moderators);
      await writeLog(context.userId, "mod_del", steamid);
      return live;
    }
    const remaining = await deleteRosterMod(steamid);
    await writeLog(context.userId, "mod_del", steamid);
    return { moderators: remaining, ranks: bundledRanks() };
  });

export const getBackupsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<BackupsPayload> => {
    const { getStaff } = await import("./server/staff");
    const me = await getStaff(context.userId);
    if (!me?.caps.canMods) throw new Error("Нет доступа к составу модераторов.");
    const { fetchWorkerBackups } = await import("./server/discord");
    const backups = await fetchWorkerBackups();
    if (!backups) throw new Error("Воркер статистики недоступен.");
    return { backups };
  });

export const setBackupFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: { steamid: string; bans?: number | null; mutes?: number | null; total?: number | null }) => d,
  )
  .handler(async ({ context, data }): Promise<BackupsPayload> => {
    const { getStaff, writeLog } = await import("./server/staff");
    const me = await getStaff(context.userId);
    if (!me?.caps.isOwner) throw new Error("Ручное восстановление — только для владельцев сайта.");
    const steamid = String(data.steamid || "").trim();
    if (!STEAMID_RE.test(steamid)) throw new Error("SteamID64 — 17 цифр.");
    const clean = (v: number | null | undefined): number | null => {
      if (v == null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? Math.abs(Math.trunc(n)) : null;
    };
    const bans = clean(data.bans);
    const mutes = clean(data.mutes);
    const total = clean(data.total);
    if (bans != null || mutes != null) {
      if (bans == null || mutes == null) throw new Error("Баны и муты задаются вместе (общее = их сумма).");
    } else if (total == null) {
      throw new Error("Заполните баны и муты или только общее.");
    }
    const { sendWorkerBackup } = await import("./server/discord");
    const payload: { steamid: string; bans: number; mutes: number } | { steamid: string; total: number } =
      bans != null && mutes != null
        ? { steamid, bans, mutes }
        : { steamid, total: (total ?? 0) as number };
    const backups = await sendWorkerBackup(payload);
    const logLine = bans != null && mutes != null ? `${bans}/${mutes}` : `total=${total}`;
    await writeLog(context.userId, "mod_backup", `${steamid} ${logLine}`);
    return { backups };
  });

export const unsetBackupFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { steamid: string }) => d)
  .handler(async ({ context, data }): Promise<BackupsPayload> => {
    const { getStaff, writeLog } = await import("./server/staff");
    const me = await getStaff(context.userId);
    if (!me?.caps.isOwner) throw new Error("Ручное восстановление — только для владельцев сайта.");
    const steamid = String(data.steamid || "").trim();
    if (!STEAMID_RE.test(steamid)) throw new Error("SteamID64 — 17 цифр.");
    const { clearWorkerBackup } = await import("./server/discord");
    const backups = await clearWorkerBackup(steamid);
    await writeLog(context.userId, "mod_backup_clear", steamid);
    return { backups };
  });
