import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

/**
 * Query-параметры читаем как строки: дефолтный JSON-парсинг роутера превращает
 * 17-значные SteamID в числа и теряет точность (а `?target=…` исчезает при
 * канонизации). Строковый парсер сохраняет значения как есть.
 */
function parseSearch(searchStr: string): Record<string, unknown> {
  const params = new URLSearchParams(searchStr.startsWith("?") ? searchStr.slice(1) : searchStr);
  const out: Record<string, unknown> = {};
  for (const [key, value] of params) out[key] = value;
  return out;
}

function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, typeof value === "string" ? value : JSON.stringify(value));
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    parseSearch,
    stringifySearch,
  });
}
