import seedJson from "@/data/stats-seed.json";
import { getSql } from "@/lib/db";
import type { ModRow, RosterMod, StatsPayload } from "@/lib/types";
import { FEAR_API, MSK_OFFSET_SEC } from "./config";
import { bundledRanks, readRoster } from "./roster";

type Seed = {
  month?: string;
  updatedAt?: number;
  monthStart?: number;
  monthEnd?: number;
  weekStart?: number;
  totals?: StatsPayload["totals"];
  moderators?: Array<Partial<ModRow> & { steamid: string }>;
  lastSeen?: { 1?: number; 2?: number };
};

function loadSeed(): Seed {
  try {
    return seedJson as Seed;
  } catch {
    return {};
  }
}

type Mod = {
  steamid: string;
  name: string;
  rank: number | null;
  norma: { week: number; month: number } | null;
};

function loadModsFrom(roster: RosterMod[]): Mod[] {
  const ranks = bundledRanks();
  const byRank = new Map(ranks.map((r) => [r.rank, r]));
  return roster.map((m) => {
    const r = byRank.get(m.rank ?? -1);
    const norma = r && (r.week > 0 || r.month > 0) ? { week: r.week, month: r.month } : null;
    return { steamid: m.steamid, name: m.name, rank: m.rank ?? null, norma };
  });
}

async function loadMods(): Promise<Mod[]> {
  try {
    return loadModsFrom(await readRoster());
  } catch {
    return [];
  }
}

function currentMonthRange(now = new Date()) {
  const msk = new Date(now.getTime() + MSK_OFFSET_SEC * 1000);
  const y = msk.getUTCFullYear();
  const m = msk.getUTCMonth();
  const start = Date.UTC(y, m, 1) / 1000 - MSK_OFFSET_SEC;
  const end = Date.UTC(y, m + 1, 1) / 1000 - MSK_OFFSET_SEC;
  return { start, end };
}

function currentWeekStart(now = new Date()) {
  const msk = new Date(now.getTime() + MSK_OFFSET_SEC * 1000);
  const day = (msk.getUTCDay() + 6) % 7;
  return Date.UTC(msk.getUTCFullYear(), msk.getUTCMonth(), msk.getUTCDate() - day) / 1000 - MSK_OFFSET_SEC;
}

function monthLabel(now = new Date()) {
  const s = now.toLocaleString("ru-RU", { month: "long", year: "numeric", timeZone: "Europe/Moscow" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function completion(m: { total: number; weekTotal: number; norma: { week: number; month: number } | null }): {
  pct: number | null;
  done: boolean;
} {
  if (!m.norma) return { pct: null, done: false };
  if (m.norma.month > 0) {
    const pct = Math.round((m.total / m.norma.month) * 100);
    return { pct, done: m.total >= m.norma.month };
  }
  if (m.norma.week > 0) {
    const pct = Math.round((m.weekTotal / m.norma.week) * 100);
    return { pct, done: m.weekTotal >= m.norma.week };
  }
  return { pct: null, done: false };
}

function toPayload(args: {
  month: string;
  updatedAt: number;
  totals: StatsPayload["totals"];
  moderators: Array<Omit<ModRow, "pct" | "done"> & { pct?: number | null; done?: boolean }>;
  stale: boolean;
}): StatsPayload {
  const moderators: ModRow[] = args.moderators.map((m) => {
    const c = completion(m);
    return { ...m, pct: c.pct, done: c.done };
  });
  moderators.sort((a, b) => b.total - a.total || (b.bans ?? 0) - (a.bans ?? 0) || a.name.localeCompare(b.name, "ru"));
  return { month: args.month, updatedAt: args.updatedAt, totals: args.totals, moderators, stale: args.stale };
}

const EXCLUDED = [/тикет/i, /обрат\w*\s+в\s+поддержк/i];

type Punishment = {
  id: number;
  admin_steamid?: string;
  admin?: string;
  created: number;
  status: number;
  reason?: string;
  unpunish_admin?: string | null;
};

async function fetchPage(type: number, page: number): Promise<Punishment[]> {
  const url = `${FEAR_API}?page=${page}&limit=20&type=${type}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "premute/1.0 (local stats)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`FEAR HTTP ${res.status}`);
  const json = (await res.json()) as { punishments?: Punishment[] };
  return Array.isArray(json.punishments) ? json.punishments : [];
}

async function fetchRecent(type: number, sinceSec: number, maxPages = 12): Promise<Punishment[]> {
  const out: Punishment[] = [];
  const seen = new Set<number>();
  for (let page = 1; page <= maxPages; page++) {
    let items: Punishment[] = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        items = await fetchPage(type, page);
        break;
      } catch (e) {
        if (attempt === 3) throw e;
        await new Promise((r) => setTimeout(r, attempt * 1500));
      }
    }
    if (!items.length) break;
    let oldest = Infinity;
    for (const p of items) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      if (p.created < oldest) oldest = p.created;
      if (p.created >= sinceSec) out.push(p);
    }
    if (oldest < sinceSec) break;
    await new Promise((r) => setTimeout(r, 80));
  }
  return out;
}

function isCounted(p: Punishment) {
  return !p.unpunish_admin && p.status !== 2 && !EXCLUDED.some((re) => re.test(String(p.reason || "")));
}

async function readDbCache(): Promise<StatsPayload | null> {
  const sql = await getSql();
  const rows = await sql<{ payload: string; updated_at: unknown }>`select payload, updated_at from stats_cache where id = 1`;
  if (!rows.length) return null;
  try {
    const data = JSON.parse(rows[0].payload) as StatsPayload;
    return data;
  } catch {
    return null;
  }
}

async function writeDbCache(payload: StatsPayload) {
  const sql = await getSql();
  const text = JSON.stringify(payload);
  await sql`
    insert into stats_cache (id, payload, updated_at)
    values (1, ${text}, now())
    on conflict (id) do update set payload = excluded.payload, updated_at = now()
  `;
}

async function fromSeed(): Promise<StatsPayload> {
  const seed = loadSeed();
  const roster = await loadMods();
  const byId = new Map((seed.moderators || []).map((m) => [m.steamid, m]));
  const moderators = roster.map((m) => {
    const s = byId.get(m.steamid);
    return {
      name: (s?.name && s.name !== m.steamid ? s.name : m.name) || m.steamid,
      steamid: m.steamid,
      rank: m.rank,
      norma: m.norma,
      bans: Number(s?.bans || 0),
      mutes: Number(s?.mutes || 0),
      total: Number(s?.total || 0),
      weekTotal: Number(s?.weekTotal || 0),
      removed: Number(s?.removed || 0),
      excluded: Number(s?.excluded || 0),
      lastSeenName: s?.lastSeenName ?? null,
    };
  });
  const totals = seed.totals || {
    bans: moderators.reduce((a, m) => a + m.bans, 0),
    mutes: moderators.reduce((a, m) => a + m.mutes, 0),
    total: moderators.reduce((a, m) => a + m.total, 0),
    removed: moderators.reduce((a, m) => a + m.removed, 0),
    excluded: moderators.reduce((a, m) => a + m.excluded, 0),
  };
  return toPayload({
    month: seed.month || monthLabel(),
    updatedAt: seed.updatedAt || Math.floor(Date.now() / 1000),
    totals,
    moderators,
    stale: true,
  });
}

export async function loadStats(opts: { refresh?: boolean } = {}): Promise<StatsPayload> {
  const cached = await readDbCache();
  const age = cached ? Date.now() / 1000 - cached.updatedAt : Infinity;
  // воркер на VPS обновляет статистику каждые 10 минут — сверяемся с ним на том же интервале
  if (cached && !opts.refresh && age < 10 * 60) return { ...cached, stale: false };

  const fromWorker = async (): Promise<StatsPayload | null> => {
    try {
      const { fetchWorkerStats } = await import("./discord");
      const bot = await fetchWorkerStats();
      if (!bot?.moderators?.length) return null;
      const roster = await loadMods();
      const source = bot.moderators?.length ? bot.moderators : roster;
      const byId = new Map(bot.moderators.map((m) => [m.steamid, m]));
      const moderators = source.map((m) => {
        const s = byId.get(m.steamid);
        return {
          name: (s?.name && s.name !== m.steamid ? s.name : m.name) || m.steamid,
          steamid: m.steamid,
          rank: m.rank ?? s?.rank ?? null,
          norma: m.norma ?? s?.norma ?? null,
          bans: s?.bans ?? null,
          mutes: s?.mutes ?? null,
          total: Number(s?.total || 0),
          weekTotal: Number(s?.weekTotal || 0),
          removed: Number(s?.removed || 0),
          excluded: Number(s?.excluded || 0),
          lastSeenName: s?.lastSeenName ?? null,
        };
      });
      const totals = bot.totals || {
        bans: moderators.reduce((a, m) => a + (m.bans ?? 0), 0),
        mutes: moderators.reduce((a, m) => a + (m.mutes ?? 0), 0),
        total: moderators.reduce((a, m) => a + m.total, 0),
        removed: moderators.reduce((a, m) => a + m.removed, 0),
        excluded: moderators.reduce((a, m) => a + m.excluded, 0),
      };
      return toPayload({
        month: bot.month || monthLabel(),
        updatedAt: bot.updatedAt || Math.floor(Date.now() / 1000),
        totals,
        moderators,
        stale: false,
      });
    } catch {
      return null;
    }
  };

  if (!opts.refresh) {
    const worker = await fromWorker();
    const fallback = cached ?? worker ?? (await fromSeed());
    if (!cached) {
      try {
        await writeDbCache({ ...fallback, stale: true });
      } catch {
        /* ignore */
      }
    }
    return { ...fallback, stale: !worker };
  }

  const workerFresh = await fromWorker();
  if (workerFresh) {
    await writeDbCache(workerFresh);
    return workerFresh;
  }

  try {
    const { start: monthStart, end: monthEnd } = currentMonthRange();
    const weekStart = currentWeekStart();
    const roster = await loadMods();
    const bySteam = new Map(
      roster.map((m) => [
        m.steamid,
        {
          ...m,
          bans: 0,
          mutes: 0,
          total: 0,
          weekTotal: 0,
          removed: 0,
          excluded: 0,
          lastSeenName: null as string | null,
        },
      ]),
    );

    for (const type of [1, 2] as const) {
      const kind = type === 1 ? "ban" : "mute";
      const items = await fetchRecent(type, Math.min(monthStart, weekStart), 25);
      for (const p of items) {
        const sid = String(p.admin_steamid || "");
        const mod = bySteam.get(sid);
        if (!mod) continue;
        if (p.admin) mod.lastSeenName = p.admin;
        if (p.created < monthStart || p.created >= monthEnd) {
          if (p.created >= weekStart && p.created < monthStart && isCounted(p)) mod.weekTotal++;
          continue;
        }
        if (isCounted(p)) {
          if (kind === "ban") mod.bans++;
          else mod.mutes++;
          mod.total++;
          if (p.created >= weekStart) mod.weekTotal++;
        } else if (p.unpunish_admin || p.status === 2) {
          mod.removed++;
        } else {
          mod.excluded++;
        }
      }
    }

    const moderators = [...bySteam.values()].map((m) => ({
      ...m,
      name: m.name === m.steamid && m.lastSeenName ? m.lastSeenName : m.name,
    }));
    const totals = {
      bans: moderators.reduce((a, m) => a + m.bans, 0),
      mutes: moderators.reduce((a, m) => a + m.mutes, 0),
      total: moderators.reduce((a, m) => a + m.total, 0),
      removed: moderators.reduce((a, m) => a + m.removed, 0),
      excluded: moderators.reduce((a, m) => a + m.excluded, 0),
    };
    const payload = toPayload({
      month: monthLabel(),
      updatedAt: Math.floor(Date.now() / 1000),
      totals,
      moderators,
      stale: false,
    });
    await writeDbCache(payload);
    return payload;
  } catch (e) {
    console.error("[stats] refresh failed:", e instanceof Error ? e.message : e);
    if (cached) return { ...cached, stale: true };
    return await fromSeed();
  }
}
