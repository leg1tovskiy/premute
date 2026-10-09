import { randomBytes, randomUUID } from "node:crypto";
import { getSql } from "../db";
import { ROOT_DISCORD_ID } from "./config";
import { getStaff } from "./staff";
import type { StaffProfile } from "../types";

export type BotLoginResult = {
  ok: boolean;
  sessionToken: string;
  userId: string;
  profile: StaffProfile | null;
  mySteamId: string | null;
};

const BOT_API_HOST = process.env.BOT_API_URL || "http://64.188.66.194:3847";

export async function verifyDiscordBotCode(code: string): Promise<BotLoginResult> {
  const cleanCode = String(code || "").trim();
  if (!cleanCode || cleanCode.length < 4) {
    throw new Error("Введите 6-значный код авторизации.");
  }

  const botUrl = `${BOT_API_HOST}/panel/auth-verify`;
  let botRes: any;
  try {
    const resp = await fetch(botUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: cleanCode }),
    });
    botRes = await resp.json();
  } catch (err) {
    console.error("[bot-auth] Failed to connect to bot :3847:", err);
    throw new Error("Бот авторизации временно недоступен. Попробуйте через минуту.");
  }

  if (!botRes || !botRes.ok || !botRes.user) {
    throw new Error(botRes?.error || "Неверный или просроченный код. Напишите боту !login в Discord, чтобы получить новый код.");
  }

  const { discordId, username, globalName, avatar, steamid } = botRes.user;
  const sql = await getSql();
  const userId = `discord_${discordId}`;
  const displayName = globalName || username || discordId;
  const email = `${userId}@discord.bot`;
  const image = avatar ?? null;
  const isRoot = discordId === ROOT_DISCORD_ID;

  // 1. Upsert Better-Auth user
  await sql`
    insert into "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
    values (${userId}, ${displayName}, ${email}, true, ${image}, now(), now())
    on conflict ("id") do update set
      "name" = excluded."name",
      "image" = coalesce(excluded."image", "user"."image"),
      "updatedAt" = now()
  `;

  // 2. Create session in database (valid for 30 days)
  const sessionToken = randomBytes(32).toString("hex");
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await sql`
    insert into "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "userId")
    values (${sessionId}, ${expiresAt}, ${sessionToken}, now(), now(), ${userId})
  `;

  // 3. Upsert staff table
  const existingStaff = await sql<{ user_id: string }>`select user_id from staff where user_id = ${userId} limit 1`;
  if (!existingStaff.length) {
    await sql`
      insert into staff (
        user_id, display_name, email, image, discord_id,
        is_root, is_owner, can_stats, created_at, last_seen
      ) values (
        ${userId}, ${displayName}, ${email}, ${image}, ${discordId},
        ${isRoot}, ${isRoot}, ${isRoot}, now(), now()
      )
    `;
  } else {
    await sql`
      update staff set
        display_name = ${displayName},
        image = coalesce(${image}, image),
        discord_id = ${discordId},
        is_root = case when ${isRoot} then true else is_root end,
        is_owner = case when ${isRoot} then true else is_owner end,
        can_stats = case when ${isRoot} then true else can_stats end,
        last_seen = now()
      where user_id = ${userId}
    `;
  }

  const profile = await getStaff(userId);
  return {
    ok: true,
    sessionToken,
    userId,
    profile,
    mySteamId: steamid || profile?.mySteamId || null,
  };
}

export async function requestDiscordBotCode(discordIdOrTag: string): Promise<{ ok: boolean; message: string }> {
  const query = String(discordIdOrTag || "").trim();
  if (!query) throw new Error("Укажите Discord ID или имя пользователя.");

  const botUrl = `${BOT_API_HOST}/panel/auth-request`;
  let botRes: any;
  try {
    const resp = await fetch(botUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordIdOrTag: query }),
    });
    botRes = await resp.json();
  } catch (err) {
    console.error("[bot-auth] request code error:", err);
    throw new Error("Не удалось связаться с ботом. Попробуйте написать !login боту напрямую в Discord.");
  }

  if (!botRes || !botRes.ok) {
    throw new Error(botRes?.error || "Пользователь не найден или бот не смог отправить ЛС.");
  }

  return { ok: true, message: botRes.message || "Код отправлен в личные сообщения Discord." };
}
