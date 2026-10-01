import { getSql } from "@/lib/db";
import { MSK_OFFSET_SEC } from "./config";
import type { AllTimeRecord, StatsPayload } from "@/lib/types";

const TOP_RANKS = new Set([1, 2]);

export const BASELINE_MONTHLY_RECORD: AllTimeRecord = {
  name: "minilyyy",
  rank: 2,
  total: 846,
  steamid: "76561199886218120",
  month: "Сентябрь 2026 г.",
};

export function monthKeyMsk(now = new Date()): string {
  const msk = new Date(now.getTime() + MSK_OFFSET_SEC * 1000);
  return `${msk.getUTCFullYear()}-${String(msk.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function prevMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function isFirstDayMsk(now = new Date()): boolean {
  const msk = new Date(now.getTime() + MSK_OFFSET_SEC * 1000);
  return msk.getUTCDate() === 1;
}

function currentChampion(payload: StatsPayload) {
  return payload.moderators
    .filter((m) => TOP_RANKS.has(Number(m.rank ?? 0)))
    .slice()
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "ru"))[0] ?? null;
}

export async function attachLastMonthTop(payload: StatsPayload): Promise<StatsPayload> {
  let record: AllTimeRecord = { ...BASELINE_MONTHLY_RECORD };
  let lastTop: { name: string; rank: number | null; total: number; steamid: string | null } | null = null;

  try {
    const sql = await getSql();
    await sql.query(`
      create table if not exists tops_champions (
        month_key text primary key,
        name text not null,
        rank int,
        total int not null,
        steamid text,
        saved_at timestamptz not null default now()
      )
    `);

    // Гарантируем регистрацию базового рекорда minilyyy за сентябрь 2026
    await sql.query(`
      insert into tops_champions (month_key, name, rank, total, steamid)
      values ('2026-09', 'minilyyy', 2, 846, '76561199886218120')
      on conflict (month_key) do nothing
    `);

    const key = monthKeyMsk();
    const cur = currentChampion(payload);
    if (cur) {
      await sql.query(
        `insert into tops_champions (month_key, name, rank, total, steamid)
         values ($1, $2, $3, $4, $5)
         on conflict (month_key) do update set
           name = excluded.name,
           rank = excluded.rank,
           total = excluded.total,
           steamid = excluded.steamid,
           saved_at = now()`,
        [key, cur.name, cur.rank, cur.total, cur.steamid],
      );
    }

    const prev = prevMonthKey(key);
    const rows = await sql.query<{ name: string; rank: number | null; total: number; steamid: string | null }>(
      "select name, rank, total, steamid from tops_champions where month_key = $1",
      [prev],
    );
    if (rows[0]) {
      lastTop = {
        name: rows[0].name,
        rank: rows[0].rank,
        total: Number(rows[0].total),
        steamid: rows[0].steamid,
      };
    }

    // 1. Проверяем рекорд среди всех архивных месяцев в БД
    const allHistorical = await sql.query<{
      name: string;
      rank: number | null;
      total: number;
      steamid: string | null;
      month_key: string;
    }>("select name, rank, total, steamid, month_key from tops_champions order by total desc limit 1");
    if (allHistorical[0] && Number(allHistorical[0].total) > record.total) {
      record = {
        name: allHistorical[0].name,
        rank: allHistorical[0].rank,
        total: Number(allHistorical[0].total),
        steamid: allHistorical[0].steamid,
        month: allHistorical[0].month_key,
      };
    }
  } catch (e) {
    console.error("[tops] champion:", e instanceof Error ? e.message : e);
  }

  // 2. Проверяем активных модераторов текущего месяца: если кто-то обгоняет в реальном времени!
  for (const m of payload.moderators || []) {
    if (TOP_RANKS.has(Number(m.rank ?? 0)) && m.total > record.total) {
      record = {
        name: m.name,
        rank: m.rank,
        total: m.total,
        steamid: m.steamid,
        month: payload.month || "Текущий месяц",
      };
    }
  }

  return {
    ...payload,
    isMonthFirst: isFirstDayMsk(),
    lastMonthTop: lastTop ?? payload.lastMonthTop ?? null,
    allTimeRecord: record,
  };
}
