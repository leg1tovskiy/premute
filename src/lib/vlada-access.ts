import type { StaffProfile } from "@/lib/types";

/**
 * Пользователи, которым вкладка и страница «Для Влады» видны ВСЕГДА:
 * - 652399540384694292 (Root Owner / Главный владелец)
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
 * Проверка, содержит ли профиль указанный ID в любом из полей
 */
function profileMatchesId(profile: StaffProfile, id: string): boolean {
  const target = String(id).trim();
  if (!target) return false;
  const fields = [
    profile.discordId,
    profile.userId,
    profile.tag,
    profile.displayName,
    profile.email,
  ];
  return fields.some((f) => {
    if (!f) return false;
    const str = String(f).trim();
    return str === target || str.includes(target);
  });
}

/**
 * Проверка прав доступа к вкладке и странице «Для Влады»:
 * 1. Пользователи 652399540384694292 и 948819481734545469 имеют доступ ВСЕГДА.
 *    (включая Главного владельца / Корневого администратора / Dev-режим).
 * 2. Пользователь 1409222587673874555 имеет доступ строго в окне 14 октября 21:59 МСК - 15 октября 22:00 МСК.
 * 3. Все остальные пользователи (и вне временного окна) не видят вкладку и не могут перейти по прямой ссылке.
 */
export function canAccessVlada(profile?: StaffProfile | null, now = Date.now()): boolean {
  if (!profile) return false;

  // Локальная разработка / тестовый профиль
  if (
    profile.userId === "dev-user" ||
    profile.discordId === "1234567890" ||
    (typeof window !== "undefined" && window.location.hostname === "localhost")
  ) {
    return true;
  }

  // Главный / корневой владелец сайта (652399540384694292)
  if (
    profile.isRoot ||
    profile.caps?.isRoot ||
    profile.isOwner ||
    profile.caps?.isOwner ||
    profile.caps?.canAdmin
  ) {
    return true;
  }

  // 1. Всегда разрешённые ID (652399540384694292 и 948819481734545469)
  const isAlwaysAllowed = VLADA_ALWAYS_ALLOWED_IDS.some((id) =>
    profileMatchesId(profile, id),
  );
  if (isAlwaysAllowed) {
    return true;
  }

  // 2. Временный доступ для Влады (1409222587673874555)
  const isVladaUser = profileMatchesId(profile, VLADA_TEMPORARY_USER_ID);
  if (isVladaUser) {
    return now >= VLADA_ACCESS_START_MSK && now <= VLADA_ACCESS_END_MSK;
  }

  return false;
}
