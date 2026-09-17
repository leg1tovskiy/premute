import { getSql } from "@/lib/db";

/** Транслитерация, чтобы ссылки на модераторов с кириллическими никами были латиницей. */
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  і: "i", ї: "i", є: "e", ґ: "g", ў: "u",
};

export function slugify(value: string): string {
  const lower = value.trim().toLowerCase().replace(/^@+/, "");
  let translit = "";
  for (const ch of lower) translit += TRANSLIT[ch] ?? ch;
  return translit
    .replace(/['’`]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Слаг из URL: декодируем проценты и приводим к той же форме, что хранится в БД. */
export function normalizeSlug(raw: string): string {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    /* оставляем как есть */
  }
  return slugify(decoded);
}

type SlugRow = { steamid: string; slug: string };

/**
 * Привязывает каждому модератору постоянный слаг. Первый слаг сохраняется в БД
 * и больше не меняется даже при смене ника — старая ссылка продолжает работать.
 * Коллизии (одинаковые ники) разрешаются суффиксом -2, -3, …
 */
export async function withSlugs<
  T extends { steamid: string; name: string; discord?: string | null },
>(mods: T[]): Promise<Array<T & { slug: string }>> {
  const sql = await getSql();
  const rows = await sql<SlugRow>`select steamid, slug from mod_slugs`;
  const bySteam = new Map(rows.map((r) => [r.steamid, r.slug] as const));
  const taken = new Map(rows.map((r) => [r.slug, r.steamid] as const));
  const out: Array<T & { slug: string }> = [];

  for (const m of mods) {
    const known = bySteam.get(m.steamid);
    if (known) {
      out.push({ ...m, slug: known });
      continue;
    }
    const base = slugify(m.discord || m.name) || `mod-${m.steamid.slice(-6)}`;
    let candidate = base;
    for (let attempt = 2; attempt <= 50; attempt += 1) {
      const owner = taken.get(candidate);
      if (owner && owner !== m.steamid) {
        candidate = `${base}-${attempt}`;
        continue;
      }
      try {
        await sql`insert into mod_slugs (steamid, slug) values (${m.steamid}, ${candidate}) on conflict (steamid) do nothing`;
        break;
      } catch {
        candidate = `${base}-${attempt}`;
      }
    }
    const saved = await sql<SlugRow>`select slug from mod_slugs where steamid = ${m.steamid}`;
    const slug = saved[0]?.slug ?? candidate;
    bySteam.set(m.steamid, slug);
    taken.set(slug, m.steamid);
    out.push({ ...m, slug });
  }
  return out;
}

/** steamid по слагу — для ссылок, оставшихся от старого ника. */
export async function findBySlug(slug: string): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql<{ steamid: string }>`select steamid from mod_slugs where slug = ${slug}`;
  return rows[0]?.steamid ?? null;
}
