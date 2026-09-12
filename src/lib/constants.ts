/** Hardcoded root owner — only this Discord ID can grant owner rights. */
export const ROOT_DISCORD_ID = "652399540384694292";

export const RANK_SHORT: Record<number, string> = {
  1: "мл. мод",
  2: "мод",
  3: "ст. мод",
  4: "админ",
  5: "стафф",
};

export const RANK_TITLE: Record<number, string> = {
  1: "Мл. Модератор",
  2: "Модератор",
  3: "Ст. Модератор",
  4: "Ст. Администратор",
  5: "Стафф",
};

export function fearProfileUrl(steamid: string): string {
  return `https://fearproject.ru/profile/${steamid}`;
}

export const SOUNDS = [
  { id: "eye", file: "eye.mp3", label: "Eye" },
  { id: "koza1", file: "koza1.mp3", label: "Koza 1" },
  { id: "koza2", file: "koza2.mp3", label: "Koza 2" },
  { id: "svin", file: "svin.mp3", label: "Svin" },
] as const;

export const MUTE_PRESETS = [
  { label: "10 мин", ms: 10 * 60 * 1000 },
  { label: "1 час", ms: 60 * 60 * 1000 },
  { label: "6 часов", ms: 6 * 60 * 60 * 1000 },
  { label: "24 часа", ms: 24 * 60 * 60 * 1000 },
  { label: "7 дней", ms: 7 * 24 * 60 * 60 * 1000 },
] as const;

const MUTE_UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** `1s` `10m` `2h` `1d` or stacked `1d2h30m`. Discord timeout max = 28d. */
export function parseMuteDuration(raw: string): { ms: number } | { error: string } {
  const text = raw.trim().toLowerCase();
  if (!text) return { error: "Укажите срок, например 10m или 1h30m" };
  const tokens = [...text.matchAll(/(\d+)\s*([smhd])/g)];
  if (!tokens.length) return { error: "Формат: 1s, 1m, 1h, 1d (можно вместе: 1h30m)" };
  const consumed = tokens.map((m) => m[0].replace(/\s+/g, "")).join("");
  const compact = text.replace(/\s+/g, "");
  if (consumed !== compact) return { error: "Формат: 1s, 1m, 1h, 1d (можно вместе: 1h30m)" };
  let ms = 0;
  for (const m of tokens) ms += Number(m[1]) * MUTE_UNIT_MS[m[2]];
  if (ms <= 0) return { error: "Срок должен быть больше нуля" };
  const max = 28 * 24 * 60 * 60 * 1000;
  if (ms > max) return { error: "Максимум 28 дней (лимит Discord)" };
  return { ms };
}
