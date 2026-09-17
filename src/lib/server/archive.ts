import { getSql } from "@/lib/db";
import { MSK_OFFSET_SEC } from "./config";
import type { ModRow, StatsPayload } from "@/lib/types";

type ArchiveMod = {
  steamid: string;
  name: string;
  rank: number | null;
  total: number;
  bans: number | null;
  mutes: number | null;
  removed: number;
  excluded: number;
};

export type ArchiveMonth = {
  key: string;
  label: string;
  totals: StatsPayload["totals"];
  moderators: ArchiveMod[];
};

/** Месяц в МСК как YYYY-MM. */
export function monthKeyOfSec(sec: number): string {
  const d = new Date((sec + MSK_OFFSET_SEC) * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Сохраняет снимок текущего месяца в архив. Пишем не чаще раза в 30 минут:
 * когда месяц закончится, последний снимок останется итогом месяца.
 */
export async function snapshotStats(payload: StatsPayload): Promise<void> {
  const sql = await getSql();
  const key = monthKeyOfSec(payload.updatedAt);
  const rows = await sql<{ archived_at: Date | string }>`
    select archived_at from stats_archive where month_key = ${key}
  `;
  const age = rows.length ? Date.now() - new Date(rows[0].archived_at).getTime() : Infinity;
  if (age < 30 * 60 * 1000) return;
  const slim = {
    totals: payload.totals,
    moderators: payload.moderators.map((m) => ({
      steamid: m.steamid,
      name: m.name,
      rank: m.rank,
      total: m.total,
      bans: m.bans,
      mutes: m.mutes,
      removed: m.removed,
      excluded: m.excluded,
    })),
  };
  await sql`
    insert into stats_archive (month_key, month_label, payload, archived_at)
    values (${key}, ${payload.month}, ${JSON.stringify(slim)}, now())
    on conflict (month_key) do update set
      month_label = excluded.month_label,
      payload = excluded.payload,
      archived_at = now()
  `;
}

export async function loadArchive(limit = 24): Promise<ArchiveMonth[]> {
  const sql = await getSql();
  const rows = await sql<{
    month_key: string;
    month_label: string;
    payload: string;
    archived_at: Date | string;
  }>`
    select month_key, month_label, payload, archived_at
    from stats_archive
    order by month_key desc
    limit ${limit}
  `;
  const out: ArchiveMonth[] = [];
  for (const r of rows) {
    try {
      const p = JSON.parse(r.payload) as {
        totals: StatsPayload["totals"];
        moderators?: ArchiveMod[];
      };
      out.push({
        key: r.month_key,
        label: r.month_label,
        totals: p.totals,
        moderators: p.moderators ?? [],
      });
    } catch {
      /* битую запись пропускаем */
    }
  }
  return out;
}

/**
 * Дополняет свежую статистику сравнением с прошлым месяцем и лучшим месяцем
 * каждого модератора по архиву, плюс история топов для страницы «Топы».
 */
export async function applyComparison(payload: StatsPayload): Promise<StatsPayload> {
  const archive = await loadArchive();
  const currentKey = monthKeyOfSec(payload.updatedAt);
  const past = archive.filter((a) => a.key < currentKey);
  const prev = past[0] ?? null;

  const prevBySteam = new Map((prev?.moderators ?? []).map((m) => [m.steamid, m.total] as const));
  const bestBySteam = new Map<string, { month: string; total: number }>();
  for (const a of past) {
    for (const m of a.moderators) {
      const cur = bestBySteam.get(m.steamid);
      if (!cur || m.total > cur.total) bestBySteam.set(m.steamid, { month: a.label, total: m.total });
    }
  }

  const moderators: ModRow[] = payload.moderators.map((m) => ({
    ...m,
    prevTotal: prev ? (prevBySteam.get(m.steamid) ?? 0) : null,
    best: bestBySteam.get(m.steamid) ?? null,
  }));

  const history = past.slice(0, 6).map((a) => ({
    month: a.label,
    top: a.moderators
      .filter((m) => (m.rank ?? 0) <= 2)
      .sort((x, y) => y.total - x.total || x.name.localeCompare(y.name, "ru"))
      .slice(0, 3)
      .map((m) => ({ name: m.name, total: m.total, rank: m.rank })),
  }));

  return {
    ...payload,
    moderators,
    prevTotals: prev ? { month: prev.label, ...prev.totals } : null,
    history,
  };
}
