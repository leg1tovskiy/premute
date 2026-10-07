import type { StaffProfile } from "@/lib/types";

/**
 * Пользователи, которым вкладка и страница «Для Влады» видны ВСЕГДА:
 * - 652399540384694292 (Root Owner)
 * - 948819481734545469
 */
export const VLADA_ALWAYS_ALLOWED_IDS = [
  "652399540384694292",
  "948819481734545469",
] as const;

/**
 * Пользователь Влада, которой вкладка открывается строго во временном окне:
 * с 14 октября 21:59 МСК до 15 октября 22:00 МСК
 */
export const VLADA_TEMPORARY_USER_ID = "1409222587673874555";

/** 14 октября 2026 в 21:59:00 МСК (UTC+3) */
export const VLADA_ACCESS_START_MSK = new Date("2026-10-14T21:59:00+03:00").getTime();

/** 15 октября 2026 в 22:00:00 МСК (UTC+3) */
export const VLADA_ACCESS_END_MSK = new Date("2026-10-15T22:00:00+03:00").getTime();

/**
 * Проверка прав доступа к вкладке и странице «Для Влады»:
 * 1. Пользователи 652399540384694292 и 948819481734545469 имеют доступ ВСЕГДА.
 * 2. Пользователь 1409222587673874555 имеет доступ строго в окне 14 октября 21:59 МСК - 15 октября 22:00 МСК.
 * 3. Все остальные пользователи (и вне временного окна) не видят вкладку и не могут перейти по прямой ссылке.
 */
export function canAccessVlada(profile?: StaffProfile | null, now = Date.now()): boolean {
  if (!profile) return false;

  const discordId = profile.discordId ? String(profile.discordId).trim() : null;
  const userId = profile.userId ? String(profile.userId).trim() : null;

  // 1. Всегда разрешённые пользователи
  const isAlwaysAllowed =
    (discordId && VLADA_ALWAYS_ALLOWED_IDS.includes(discordId as any)) ||
    (userId && VLADA_ALWAYS_ALLOWED_IDS.includes(userId as any));

  if (isAlwaysAllowed) {
    return true;
  }

  // 2. Временный доступ для Влады (1409222587673874555)
  const isVladaUser =
    discordId === VLADA_TEMPORARY_USER_ID ||
    userId === VLADA_TEMPORARY_USER_ID;

  if (isVladaUser) {
    return now >= VLADA_ACCESS_START_MSK && now <= VLADA_ACCESS_END_MSK;
  }

  return false;
}
