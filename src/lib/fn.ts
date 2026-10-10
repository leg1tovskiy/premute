import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type {
  BackupsPayload,
  DailyPoint,
  DiscordClaim,
  GameServersPayload,
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

export const bindSteamFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { steamid: string }) => d)
  .handler(async ({ context, data }): Promise<StaffProfile> => {
    const { selfBindSteamId } = await import("./server/staff");
    return selfBindSteamId(context.userId, data.steamid);
  });

export const lookupSteamFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { steamid: string }) => d)
  .handler(async ({ data }): Promise<{ found: boolean; name?: string; rank?: number; rankTitle?: string }> => {
    const { lookupSteamId } = await import("./server/staff");
    return lookupSteamId(data.steamid);
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
    if (!me?.caps.canAdmin || me.isBanned) throw new Error("Недостаточно прав.");
    return listStaff();
  });

export const deleteStaffFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { userId: string }) => d)
  .handler(async ({ context, data }): Promise<{ success: boolean }> => {
    const { getStaff, deleteStaffUser, writeLog } = await import("./server/staff");
    const me = await getStaff(context.userId);
    if (!me?.caps.canAdmin || me.isBanned) throw new Error("Недостаточно прав.");
    await deleteStaffUser(me, data.userId);
    await writeLog(context.userId, "delete_user", data.userId);
    return { success: true };
  });

export const setStaffPerms = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      userId: string;
      canStats?: boolean;
      canSuspicious?: boolean;
      canMods?: boolean;
      isOwner?: boolean;
      isBotOwner?: boolean;
      isBanned?: boolean;
      setRoot?: boolean;
      tag?: string | null;
      steamid?: string | null;
    }) => d,
  )
  .handler(async ({ context, data }): Promise<StaffListItem> => {
    const { getStaff, updateStaffPermissions, writeLog } = await import("./server/staff");
    const me = await getStaff(context.userId);
    if (!me) throw new Error("Профиль не найден.");
    if (me.isBanned) throw new Error("Аккаунт заблокирован.");
    const updated = await updateStaffPermissions(me, data.userId, {
      canStats: data.canStats,
      canSuspicious: data.canSuspicious,
      canMods: data.canMods,
      isOwner: data.isOwner,
      isBotOwner: data.isBotOwner,
      isBanned: data.isBanned,
      setRoot: data.setRoot,
      tag: data.tag,
      steamid: data.steamid,
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
    if (!me?.caps.canStats || me.isBanned) throw new Error("Нет доступа к статистике.");
    const { loadStats } = await import("./server/stats");
    const { attachLastMonthTop } = await import("./server/tops");
    const { withSlugs } = await import("./server/mod-slugs");
    const stats = await loadStats({ refresh: Boolean(data?.refresh) });
    stats.moderators = await withSlugs(stats.moderators);
    const withTop = await attachLastMonthTop(stats);
    const { snapshotStats, applyComparison } = await import("./server/archive");
    let payload = withTop;
    try {
      await snapshotStats(withTop);
      payload = await applyComparison(withTop);
    } catch {
      payload = withTop;
    }

    if (!me.caps.canGeneralStats) {
      const mySteamId = me.mySteamId;
      if (!mySteamId) {
        throw new Error("Ваш аккаунт не привязан ни к одному модератору в списке. Обратитесь к администратору.");
      }
      payload = {
        ...payload,
        moderators: payload.moderators.filter((m) => m.steamid === mySteamId),
      };
      let mine = payload.moderators[0];
      if (!mine) {
        const { fetchWorkerPunishments } = await import("./server/discord");
        const { readRoster, bundledRanks } = await import("./server/roster");
        const roster = await readRoster();
        const rMod = roster.find((m) => m.steamid === mySteamId);
        const worker = await fetchWorkerPunishments(mySteamId);
        const wMod = worker?.moderator as Partial<ModRow> | undefined;
        const recs = worker?.records ?? [];
        const computedBans = recs.filter((r) => r.kind === "ban" && r.counted !== false).length;
        const computedMutes = recs.filter((r) => r.kind === "mute" && r.counted !== false).length;
        const computedTotal = computedBans + computedMutes;
        const computedRemoved = recs.filter((r) => r.unpunishAdmin || r.status === 2).length;

        const fearName =
          (wMod?.name && !/^\d{17,20}$/.test(wMod.name) ? wMod.name : null) ||
          (rMod?.name && !/^\d{17,20}$/.test(rMod.name) ? rMod.name : null) ||
          (wMod?.lastSeenName && !/^\d{17,20}$/.test(wMod.lastSeenName) ? wMod.lastSeenName : null) ||
          me.displayName ||
          mySteamId;

        const finalRank = rMod?.rank ?? (wMod?.rank as number | null) ?? null;
        let finalNorma = (wMod?.norma as { week: number; month: number } | null) ?? null;
        if (!finalNorma && finalRank != null) {
          const ranks = bundledRanks();
          const rk = ranks.find((x) => x.rank === finalRank);
          if (rk && (rk.week > 0 || rk.month > 0)) finalNorma = { week: rk.week, month: rk.month };
        }

        const bans = (wMod?.bans != null && Number(wMod.bans) > 0) ? Number(wMod.bans) : computedBans;
        const mutes = (wMod?.mutes != null && Number(wMod.mutes) > 0) ? Number(wMod.mutes) : computedMutes;
        const total = (wMod?.total != null && Number(wMod.total) > 0) ? Number(wMod.total) : computedTotal;
        const removed = (wMod?.removed != null && Number(wMod.removed) > 0) ? Number(wMod.removed) : computedRemoved;

        mine = {
          steamid: mySteamId,
          name: fearName,
          discord: me.discordId || (wMod?.discord as string) || null,
          avatar: (wMod?.avatar as string) || me.image || null,
          rank: finalRank,
          norma: finalNorma,
          bans,
          mutes,
          total,
          weekTotal: Number(wMod?.weekTotal ?? 0),
          removed,
          excluded: Number(wMod?.excluded ?? 0),
          lastSeenName: (wMod?.lastSeenName as string) || fearName,
          lastOnline: (wMod?.lastOnline as any) ?? null,
          pct: finalNorma?.month ? Math.round((total / finalNorma.month) * 100) : null,
          done: finalNorma?.month ? total >= finalNorma.month : false,
          slug: mySteamId,
        };
        payload.moderators = [mine];
      }
      payload.totals = {
        bans: mine.bans ?? 0,
        mutes: mine.mutes ?? 0,
        total: mine.total,
        removed: mine.removed,
        excluded: mine.excluded,
      };
      payload.prevTotals = undefined;
    }
    return payload;
  });

export const getModDetailsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { slug: string }) => d)
  .handler(async ({ context, data }): Promise<ModDetails | null> => {
    const { getStaff } = await import("./server/staff");
    const me = await getStaff(context.userId);
    if (!me?.caps.canStats || me.isBanned) throw new Error("Нет доступа к статистике.");
    const slug = String(data.slug || "").slice(0, 64);
    if (!slug) return null;
    const { loadStats } = await import("./server/stats");
    const { withSlugs, findBySlug, normalizeSlug } = await import("./server/mod-slugs");
    const { fetchWorkerPunishments } = await import("./server/discord");
    const stats = await loadStats({});
    const mods = await withSlugs(stats.moderators);
    const needle = normalizeSlug(slug);

    let mod = mods.find(
      (m) =>
        m.steamid === slug ||
        m.steamid === needle ||
        m.slug === needle ||
        (m.slug && m.slug.toLowerCase() === needle.toLowerCase())
    );

    if (!mod) {
      const steamid = await findBySlug(needle);
      if (steamid) mod = mods.find((m) => m.steamid === steamid);
    }

    if (!mod) {
      const { readRoster, bundledRanks } = await import("./server/roster");
      const roster = await readRoster();
      const r = roster.find(
        (m) =>
          m.steamid === slug ||
          m.steamid === needle ||
          (m.name && m.name.toLowerCase() === needle.toLowerCase())
      );
      if (r) {
        const ranks = bundledRanks();
        const rk = ranks.find((x) => x.rank === r.rank);
        const norma = rk && (rk.week > 0 || rk.month > 0) ? { week: rk.week, month: rk.month } : null;
        mod = {
          steamid: r.steamid,
          name: r.name,
          discord: r.discord || null,
          avatar: null,
          rank: r.rank ?? null,
          norma,
          bans: 0,
          mutes: 0,
          total: 0,
          weekTotal: 0,
          removed: 0,
          excluded: 0,
          lastSeenName: r.name,
          lastOnline: null,
          pct: null,
          done: false,
          slug: r.steamid,
        };
      }
    }

    if (!mod && !me.caps.canGeneralStats && (needle === me.mySteamId || slug === me.mySteamId)) {
      mod = {
        steamid: me.mySteamId!,
        name: me.displayName || me.email || me.mySteamId!,
        discord: me.discordId || null,
        avatar: me.image || null,
        rank: null,
        norma: null,
        bans: 0,
        mutes: 0,
        total: 0,
        weekTotal: 0,
        removed: 0,
        excluded: 0,
        lastSeenName: null,
        lastOnline: null,
        pct: null,
        done: false,
        slug: me.mySteamId!,
      };
    }
    if (!mod) return null;

    if (!me.caps.canGeneralStats && me.mySteamId !== mod.steamid) {
      throw new Error("У вас нет прав на просмотр статистики других модераторов.");
    }

    const worker = await fetchWorkerPunishments(mod.steamid);
    const recs = worker?.records ?? [];
    const computedBans = recs.filter((r) => r.kind === "ban" && r.counted !== false).length;
    const computedMutes = recs.filter((r) => r.kind === "mute" && r.counted !== false).length;
    const computedTotal = computedBans + computedMutes;
    const computedRemoved = recs.filter((r) => r.unpunishAdmin || r.status === 2).length;

    const wMod = worker?.moderator as Partial<ModRow> | undefined;

    const fearName =
      (wMod?.name && !/^\d{17,20}$/.test(wMod.name) ? wMod.name : null) ||
      (mod.name && !/^\d{17,20}$/.test(mod.name) ? mod.name : null) ||
      (wMod?.lastSeenName && !/^\d{17,20}$/.test(wMod.lastSeenName) ? wMod.lastSeenName : null) ||
      mod.name ||
      "Модератор";

    const finalRank = mod.rank ?? (wMod?.rank as number | null) ?? null;
    let finalNorma = mod.norma ?? (wMod?.norma as { week: number; month: number } | null) ?? null;
    if (!finalNorma && finalRank != null) {
      const { bundledRanks } = await import("./server/roster");
      const ranks = bundledRanks();
      const rk = ranks.find((x) => x.rank === finalRank);
      if (rk && (rk.week > 0 || rk.month > 0)) {
        finalNorma = { week: rk.week, month: rk.month };
      }
    }

    const bans = (wMod?.bans != null && Number(wMod.bans) > 0) ? Number(wMod.bans) : computedBans;
    const mutes = (wMod?.mutes != null && Number(wMod.mutes) > 0) ? Number(wMod.mutes) : computedMutes;
    const total = (wMod?.total != null && Number(wMod.total) > 0) ? Number(wMod.total) : computedTotal;
    const removed = (wMod?.removed != null && Number(wMod.removed) > 0) ? Number(wMod.removed) : computedRemoved;

    let avatar = mod.avatar || (wMod?.avatar as string) || null;
    if (!avatar && /^\d{17}$/.test(mod.steamid)) {
      try {
        const res = await fetch(`https://steamcommunity.com/profiles/${mod.steamid}/?xml=1`, {
          headers: { "User-Agent": "premute/1.0 (stats avatars)", Accept: "application/xml" },
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const xml = await res.text();
          const found =
            xml.match(/<avatarFull><!\[CDATA\[([^\]]+)\]\]><\/avatarFull>/) ||
            xml.match(/<avatarMedium><!\[CDATA\[([^\]]+)\]\]><\/avatarMedium>/);
          if (found?.[1]) avatar = found[1].trim();
        }
      } catch {
        /* ignore */
      }
    }

    const finalMod: ModRow = {
      steamid: mod.steamid,
      name: fearName,
      discord: mod.discord || (wMod?.discord as string) || null,
      avatar,
      rank: finalRank,
      norma: finalNorma,
      bans,
      mutes,
      total,
      weekTotal: Number(wMod?.weekTotal ?? 0),
      removed,
      excluded: Number(wMod?.excluded ?? 0),
      lastSeenName: (wMod?.lastSeenName as string) || fearName,
      lastOnline: (wMod?.lastOnline as any) ?? null,
      pct: finalNorma?.month ? Math.round((total / finalNorma.month) * 100) : null,
      done: finalNorma?.month ? total >= finalNorma.month : false,
      slug: mod.slug || slug,
    };

    return {
      month: worker?.month || stats.month,
      updatedAt: worker?.updatedAt || stats.updatedAt,
      monthStart: worker?.monthStart ?? null,
      monthEnd: worker?.monthEnd ?? null,
      moderator: finalMod,
      records: recs,
    };
  });

export const getDailyStatsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DailyPoint[]> => {
    const { getStaff } = await import("./server/staff");
    const me = await getStaff(context.userId);
    if (!me?.caps.canStats) throw new Error("Нет доступа к статистике.");
    if (!me?.caps.canGeneralStats) return [];
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
    if (!me?.caps.canSuspicious) throw new Error("Нет доступа к подозрительным аккаунтам.");
    const { fetchWorkerSuspicious, fetchWorkerOnline } = await import("./server/discord");
    const data = await fetchWorkerSuspicious();
    if (!data) throw new Error("Воркер статистики недоступен.");

    let players = data.players ?? [];

    if (players.length > 0) {
      const ids = players
        .map((p) => String(p.steamid || "").trim().replace(/\D/g, ""))
        .filter((s) => /^\d{17}$/.test(s));

      if (ids.length > 0) {
        let onlineMap = await fetchWorkerOnline(ids);
        if (!onlineMap) {
          // Retry once in case of temporary network latency
          await new Promise((resolve) => setTimeout(resolve, 350));
          onlineMap = await fetchWorkerOnline(ids);
        }

        if (onlineMap) {
          // Оставляем в списке подозрительных ТОЛЬКО тех игроков, которые прямо сейчас онлайн на сервере.
          // Если игрок вышел с сервера (даже если на него есть жалоба или тикет), он перестаёт отображаться.
          players = players
            .filter((p) => {
              const sid = String(p.steamid || "").trim().replace(/\D/g, "");
              return Boolean(onlineMap[sid] || onlineMap[p.steamid]);
            })
            .map((p) => {
              const sid = String(p.steamid || "").trim().replace(/\D/g, "");
              const live = onlineMap[sid] || onlineMap[p.steamid];
              return {
                ...p,
                server: live?.server || p.server,
                map: live?.map || p.map,
              };
            });
        }
      }
    }

    let newcomers = data.newcomers ?? [];
    if (newcomers.length === 0 && players.length > 0) {
      newcomers = players.filter((p) => p.playtime > 0 && p.playtime < 10 * 3600);
    }

    return {
      updatedAt: data.updatedAt ?? null,
      tickets: data.tickets ?? null,
      players,
      newcomers,
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

/**
 * Реальные серверы и онлайн fearproject.ru (через воркер статистики).
 * Из браузера этот фид недоступен: fearproject.ru не отдаёт CORS-заголовки.
 */
export const getServersFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<GameServersPayload> => {
    const { fetchWorkerServers } = await import("./server/discord");
    const data = await fetchWorkerServers();
    if (!data) throw new Error("Воркер статистики недоступен.");
    return data;
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

export type LivePunishmentItem = {
  id: number;
  kind: "ban" | "mute";
  adminSteamid: string;
  adminName: string;
  adminRank: number | null;
  adminAvatar: string | null;
  adminSlug?: string;
  player: string;
  playerSteamid: string;
  reason: string | null;
  created: number;
  durationLabel: string | null;
  status: number;
  unpunishAdmin: string | null;
};

export const getRecentPunishmentsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<LivePunishmentItem[]> => {
    try {
      const { getStaff } = await import("./server/staff");
      const me = await getStaff(context.userId);
      if (!me?.caps.canStats) return [];
      const { loadStats } = await import("./server/stats");
      const stats = await loadStats({ refresh: false });
      const { fetchWorkerPunishments } = await import("./server/discord");

      let activeMods = (stats.moderators || [])
        .filter((m) => (m.rank ?? 0) <= 3 && m.total > 0)
        .sort((a, b) => b.total - a.total);

      if (!me.caps.canGeneralStats) {
        activeMods = activeMods.filter((m) => m.steamid === me.mySteamId);
      } else {
        activeMods = activeMods.slice(0, 5);
      }

      const results = await Promise.allSettled(
        activeMods.map((m) => fetchWorkerPunishments(m.steamid)),
      );

      const items: LivePunishmentItem[] = [];
      results.forEach((res, idx) => {
        if (res.status === "fulfilled" && res.value?.records?.length) {
          const mod = activeMods[idx];
          if (!mod) return;
          for (const r of res.value.records) {
            items.push({
              id: r.id,
              kind: r.kind,
              adminSteamid: r.adminSteamid || mod.steamid,
              adminName: mod.name,
              adminRank: mod.rank,
              adminAvatar: mod.avatar,
              adminSlug: mod.slug,
              player: r.player || "Игрок",
              playerSteamid: r.playerSteamid,
              reason: r.reason,
              created: r.created,
              durationLabel: r.durationLabel,
              status: r.status,
              unpunishAdmin: r.unpunishAdmin,
            });
          }
        }
      });

      items.sort((a, b) => b.created - a.created);
      return items.slice(0, 25);
    } catch {
      return [];
    }
  });

export const botLoginFn = createServerFn({ method: "POST" })
  .validator((d: { code: string }) => d)
  .handler(async ({ data }) => {
    const { verifyDiscordBotCode } = await import("./server/bot-auth");
    const result = await verifyDiscordBotCode(data.code);
    const { setCookie } = await import("@tanstack/react-start/server");
    const { SESSION_TOKEN_COOKIE } = await import("./auth/server");

    // Set cookie on response
    setCookie(SESSION_TOKEN_COOKIE, result.sessionToken, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });
    setCookie("better-auth.session_token", result.sessionToken, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });

    return result;
  });

export const requestBotCodeFn = createServerFn({ method: "POST" })
  .validator((d: { discordIdOrTag: string }) => d)
  .handler(async ({ data }) => {
    const { requestDiscordBotCode } = await import("./server/bot-auth");
    return requestDiscordBotCode(data.discordIdOrTag);
  });

