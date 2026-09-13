/** Server-only Discord + FEAR config. Never import from client modules. */

export const ROOT_DISCORD_ID = "652399540384694292";

export const PROTECTED_USER_IDS = [
  "652399540384694292",
  "1493912952485445814",
] as const;

export const DISCORD_BOT_TOKEN =
  process.env.DISCORD_TOKEN ||
  process.env.DISCORD_BOT_TOKEN ||
  "";

export const DISCORD_GUILD_ID = "1347288871855198339";
export const DISCORD_LOG_CHANNEL_ID = "1540314834640437358";
export const DISCORD_WARN_CHANNEL_ID = "1530668931927244850";
export const DISCORD_VOICE_CHANNEL_ID = "1354480785411014926";

export const FEAR_API = "https://fearproject.ru/api/punishments";
export const MSK_OFFSET_SEC = 3 * 3600;

/** Live Discord bot on the VPS — voice playback + panel ops. */
export const PANEL_BOT_URL = "http://64.188.66.194:3847";

/** Отдельный воркер статистики на VPS: считает статы/онлайн с fearproject.ru
 * независимо от бота и отдаёт сайту по HTTP (порт 3848). */
export const STATS_WORKER_URL = "http://64.188.66.194:3848";
