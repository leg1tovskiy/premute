import modsJson from "@/data/mods.json";
import ranksJson from "@/data/ranks.json";
import { getSql } from "@/lib/db";
import type { RosterMod, RosterRank } from "@/lib/types";

const seedMods = (modsJson as { moderators: RosterMod[] }).moderators;
const seedRanks = (ranksJson as { ranks: RosterRank[] }).ranks;

export function bundledRanks(): RosterRank[] {
  return seedRanks;
}

export function bundledMods(): RosterMod[] {
  return seedMods.map((m) => ({
    steamid: m.steamid,
    name: m.name,
    rank: m.rank ?? 1,
    discord: m.discord ?? null,
  }));
}

export async function readRoster(): Promise<RosterMod[]> {
  const sql = await getSql();
  const rows = await sql<{ steamid: string; name: string; rank: number; discord: string | null }>`
    select steamid, name, rank, discord from mod_roster
  `;
  if (rows.length) {
    return rows.map((m) => ({
      steamid: m.steamid,
      name: m.name,
      rank: Number(m.rank) || 1,
      discord: m.discord ?? null,
    }));
  }
  await writeRoster(bundledMods());
  return bundledMods();
}

export async function writeRoster(mods: RosterMod[]): Promise<void> {
  const sql = await getSql();
  await sql`delete from mod_roster`;
  for (const m of mods) {
    await sql`
      insert into mod_roster (steamid, name, rank, discord)
      values (${m.steamid}, ${m.name}, ${m.rank}, ${m.discord ?? null})
    `;
  }
}

export async function upsertRosterMod(mod: RosterMod): Promise<RosterMod[]> {
  const sql = await getSql();
  await sql`
    insert into mod_roster (steamid, name, rank, discord)
    values (${mod.steamid}, ${mod.name}, ${mod.rank}, ${mod.discord ?? null})
    on conflict (steamid) do update set
      name = coalesce(excluded.name, mod_roster.name),
      rank = excluded.rank,
      discord = coalesce(excluded.discord, mod_roster.discord)
  `;
  return readRoster();
}

export async function deleteRosterMod(steamid: string): Promise<RosterMod[]> {
  const sql = await getSql();
  await sql`delete from mod_roster where steamid = ${steamid}`;
  return readRoster();
}
