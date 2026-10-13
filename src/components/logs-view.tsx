import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Check,
  ChevronRight,
  Copy,
  Filter,
  KeyRound,
  Layers,
  Link as LinkIcon,
  Loader2,
  LogIn,
  RotateCw,
  ScrollText,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { clearActionLogsFn, getActionLogsFn } from "@/lib/fn";
import type { ActionLogItem, StaffProfile } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatedBlock, AnimatedNumber } from "@/components/animated-number";
import { PageHeaderSkeleton, CardsSkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";

function formatLogDetail(detail: string): string {
  if (!detail) return "—";
  const trimmed = detail.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const changes: string[] = [];
      if (parsed.canActivity !== undefined) {
        changes.push(parsed.canActivity ? "выдана вкладка «Онлайн»" : "снята вкладка «Онлайн»");
      }
      if (parsed.canMods !== undefined) {
        changes.push(parsed.canMods ? "выдана вкладка «Модераторы»" : "снята вкладка «Модераторы»");
      }
      if (parsed.canStats !== undefined) {
        changes.push(parsed.canStats ? "выдана вкладка «Статистика»" : "снята вкладка «Статистика»");
      }
      if (parsed.canSuspicious !== undefined) {
        changes.push(parsed.canSuspicious ? "выдана вкладка «Игроки»" : "снята вкладка «Игроки»");
      }
      if (parsed.canLogs !== undefined) {
        changes.push(parsed.canLogs ? "выдана вкладка «Логи»" : "снята вкладка «Логи»");
      }
      if (parsed.roleRank !== undefined) {
        const r = typeof parsed.roleRank === "number" ? parsed.roleRank : null;
        changes.push(r ? `назначена роль (ранг ${r})` : "снята роль");
      }
      if (parsed.isOwner !== undefined) {
        changes.push(parsed.isOwner ? "назначен «Владелец сайта»" : "сняты права «Владелец сайта»");
      }
      if (parsed.isBotOwner !== undefined) {
        changes.push(parsed.isBotOwner ? "назначен «Владелец бота»" : "сняты права «Владелец бота»");
      }
      if (parsed.isBanned !== undefined) {
        changes.push(parsed.isBanned ? "заблокирован доступ" : "разблокирован доступ");
      }
      if (parsed.tag !== undefined) {
        changes.push(parsed.tag ? `установлен тег «${parsed.tag}»` : "снят тег");
      }
      if (parsed.steamid !== undefined) {
        changes.push(parsed.steamid ? `привязан SteamID: ${parsed.steamid}` : "снят SteamID");
      }
      if (changes.length > 0) {
        const target = typeof parsed.userId === "string" ? `пользователя #${parsed.userId.slice(-4)}` : "пользователя";
        return `${changes.join(", ")} для ${target}`;
      }
    } catch {
      return detail;
    }
  }
  return detail;
}

function getActionMeta(action: string, detail?: string): { title: string; badgeClass: string; icon: typeof Activity } {
  if (action === "set_perms" || action === "default") {
    if (detail && /вкладк/i.test(detail)) {
      return {
        title: "Вкладки",
        badgeClass: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
        icon: Layers,
      };
    }
    if (detail && /(роль|ранг|владелец)/i.test(detail)) {
      return {
        title: "Смена роли",
        badgeClass: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
        icon: Shield,
      };
    }
    return {
      title: "Права доступа",
      badgeClass: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30",
      icon: ShieldCheck,
    };
  }

  switch (action) {
    case "user_login":
      return {
        title: "Вход в систему",
        badgeClass: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        icon: LogIn,
      };
    case "new_user":
      return {
        title: "Регистрация",
        badgeClass: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
        icon: UserPlus,
      };
    case "role_change":
      return {
        title: "Смена роли",
        badgeClass: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
        icon: Shield,
      };
    case "tab_change":
      return {
        title: "Вкладки",
        badgeClass: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
        icon: Layers,
      };
    case "change_password":
      return {
        title: "Смена пароля",
        badgeClass: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
        icon: KeyRound,
      };
    case "ban_change":
      return {
        title: "Блокировка",
        badgeClass: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
        icon: UserX,
      };
    case "delete_user":
      return {
        title: "Удаление",
        badgeClass: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
        icon: Trash2,
      };
    case "dismiss_suspicious":
      return {
        title: "Игрок скрыт",
        badgeClass: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
        icon: UserMinus,
      };
    case "restore_suspicious":
      return {
        title: "Игрок возвращен",
        badgeClass: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        icon: UserCheck,
      };
    case "clear_all_dismissed":
      return {
        title: "Очистка игроков",
        badgeClass: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30",
        icon: Trash2,
      };
    case "mod_add":
      return {
        title: "Добавлен модер",
        badgeClass: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        icon: UserPlus,
      };
    case "mod_edit":
      return {
        title: "Изменен модер",
        badgeClass: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
        icon: Activity,
      };
    case "mod_del":
      return {
        title: "Удален модер",
        badgeClass: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
        icon: UserMinus,
      };
    case "mod_backup":
      return {
        title: "Бэкап модера",
        badgeClass: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30",
        icon: Layers,
      };
    case "mod_backup_clear":
      return {
        title: "Сброс бэкапа",
        badgeClass: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30",
        icon: Trash2,
      };
    case "bind_steam":
    case "steam_change":
      return {
        title: "SteamID",
        badgeClass: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
        icon: LinkIcon,
      };
    case "bind_discord":
      return {
        title: "Discord",
        badgeClass: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30",
        icon: LinkIcon,
      };
    case "tag_change":
      return {
        title: "Тег",
        badgeClass: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
        icon: Activity,
      };
    case "clear_logs":
      return {
        title: "Очистка логов",
        badgeClass: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30",
        icon: Trash2,
      };
    default:
      return {
        title: "Действие",
        badgeClass: "bg-accent/15 text-accent border border-accent/30",
        icon: Activity,
      };
  }
}

function formatLogTime(iso: string): { full: string; relative: string } {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { full: "—", relative: "—" };
    const full = new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d) + " МСК";

    const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
    let relative = "только что";
    if (diffSec >= 60 && diffSec < 3600) {
      relative = `${Math.floor(diffSec / 60)} мин назад`;
    } else if (diffSec >= 3600 && diffSec < 86400) {
      relative = `${Math.floor(diffSec / 3600)} ч назад`;
    } else if (diffSec >= 86400) {
      relative = `${Math.floor(diffSec / 86400)} д назад`;
    }

    return { full, relative };
  } catch {
    return { full: "—", relative: "—" };
  }
}

type LogCategory =
  | "all"
  | "login"
  | "perms"
  | "passwords"
  | "bans"
  | "moderators"
  | "players"
  | "bindings";

const CATEGORIES: { id: LogCategory; label: string }[] = [
  { id: "all", label: "Все действия" },
  { id: "login", label: "Входы и регистрации" },
  { id: "perms", label: "Роли и права" },
  { id: "passwords", label: "Пароли" },
  { id: "bans", label: "Блокировки и удаление" },
  { id: "moderators", label: "Модераторы" },
  { id: "players", label: "Игроки" },
  { id: "bindings", label: "SteamID и теги" },
];

export function LogsView({ me }: { me: StaffProfile }) {
  const [logs, setLogs] = useState<ActionLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<LogCategory>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const canClearLogs = me.isOwner || me.isBotOwner || me.isRoot;

  async function fetchLogs(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await getActionLogsFn({ data: { limit: 500 } });
      setLogs(data);
      setLastUpdated(new Date());
    } catch (e) {
      if (!silent) {
        toast.error(e instanceof Error ? e.message : "Не удалось загрузить логи");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void fetchLogs();
  }, []);

  // Слушатель событий и обновление при фокусе
  useEffect(() => {
    function handleUpdate() {
      void fetchLogs(true);
    }
    function handleFocus() {
      if (document.visibilityState === "visible") {
        void fetchLogs(true);
      }
    }
    window.addEventListener("action-log-updated", handleUpdate);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    return () => {
      window.removeEventListener("action-log-updated", handleUpdate);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  // Автоматический периодический опрос каждые 5 сек
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchLogs(true);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  async function handleClear() {
    if (!window.confirm("Вы уверены, что хотите полностью очистить весь журнал действий? Это действие необратимо.")) {
      return;
    }
    setClearing(true);
    try {
      await clearActionLogsFn();
      toast.success("Журнал действий успешно очищен");
      await fetchLogs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось очистить логи");
    } finally {
      setClearing(false);
    }
  }

  // Фильтрация записей
  const filtered = useMemo(() => {
    let result = logs;

    if (category !== "all") {
      result = result.filter((item) => {
        const act = item.action;
        switch (category) {
          case "login":
            return act === "user_login" || act === "new_user";
          case "perms":
            return act === "role_change" || act === "set_perms" || act === "tab_change";
          case "passwords":
            return act === "change_password";
          case "bans":
            return act === "ban_change" || act === "delete_user";
          case "moderators":
            return (
              act === "mod_add" ||
              act === "mod_edit" ||
              act === "mod_del" ||
              act === "mod_backup" ||
              act === "mod_backup_clear"
            );
          case "players":
            return (
              act === "dismiss_suspicious" ||
              act === "restore_suspicious" ||
              act === "clear_all_dismissed"
            );
          case "bindings":
            return (
              act === "bind_steam" ||
              act === "steam_change" ||
              act === "bind_discord" ||
              act === "tag_change"
            );
          default:
            return true;
        }
      });
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((item) => {
        const name = (item.userName || "").toLowerCase();
        const detail = (item.detail || "").toLowerCase();
        const action = item.action.toLowerCase();
        return name.includes(q) || detail.includes(q) || action.includes(q);
      });
    }

    return result;
  }, [logs, category, search]);

  // Статистика
  const stats = useMemo(() => {
    let logins = 0;
    let perms = 0;
    let bans = 0;
    for (const l of logs) {
      if (l.action === "user_login" || l.action === "new_user") logins++;
      else if (l.action === "role_change" || l.action === "tab_change" || l.action === "set_perms") perms++;
      else if (l.action === "ban_change" || l.action === "delete_user") bans++;
    }
    return { total: logs.length, logins, perms, bans };
  }, [logs]);

  if (loading && logs.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-8 space-y-6">
        <PageHeaderSkeleton />
        <CardsSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-8 space-y-6">
      {/* ── Header Banner ────────────────────────────────────────── */}
      <AnimatedBlock delay={0}>
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-r from-surface via-surface/95 to-elevated/70 p-6 sm:p-7 shadow-2xl glass-panel cyber-border-glow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-accent/20 border border-accent/40 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-accent">
                  АУДИТ &middot; ЖУРНАЛ ДЕЙСТВИЙ
                </span>
                {lastUpdated ? (
                  <span className="text-[11px] text-subtle font-mono">
                    Обновлено: {lastUpdated.toLocaleTimeString("ru-RU")}
                  </span>
                ) : null}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-fg flex items-center gap-2.5">
                Логи действий
                <ScrollText className="size-6 text-accent" />
              </h1>
              <p className="max-w-3xl text-xs sm:text-sm text-muted leading-relaxed">
                Полная история входов в систему, изменений прав, назначений ролей, смены паролей и действий
                администраторов в панели FearProject.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchLogs()}
                disabled={loading}
                className="h-9 rounded-xl border-border bg-elevated/70 px-3.5 text-xs font-bold text-fg hover:border-accent shadow-sm"
              >
                <RotateCw className={cn("size-3.5 mr-1.5", loading ? "animate-spin text-accent" : "")} />
                Обновить
              </Button>

              {canClearLogs ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => void handleClear()}
                  disabled={clearing || logs.length === 0}
                  className="h-9 rounded-xl px-3.5 text-xs font-bold shadow-sm"
                >
                  {clearing ? (
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5 mr-1.5" />
                  )}
                  Очистить логи
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </AnimatedBlock>

      {/* ── KPI Stats Cards ────────────────────────────────────────── */}
      <AnimatedBlock delay={40}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-border/80 bg-surface/90 glass-panel p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Всего записей</span>
            <p className="mt-1 text-2xl font-black text-fg">
              <AnimatedNumber value={stats.total} />
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-surface/90 glass-panel p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Авторизаций</span>
            <p className="mt-1 text-2xl font-black text-emerald-400">
              <AnimatedNumber value={stats.logins} />
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-surface/90 glass-panel p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Роли и права</span>
            <p className="mt-1 text-2xl font-black text-purple-400">
              <AnimatedNumber value={stats.perms} />
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-surface/90 glass-panel p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Блокировок</span>
            <p className="mt-1 text-2xl font-black text-rose-400">
              <AnimatedNumber value={stats.bans} />
            </p>
          </div>
        </div>
      </AnimatedBlock>

      {/* ── Filter & Search Toolbar ────────────────────────────────── */}
      <AnimatedBlock delay={80}>
        <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-surface/90 glass-panel p-3.5 sm:p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
              <Input
                type="text"
                placeholder="Поиск по имени, действию или деталям..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-10 pr-9 rounded-xl bg-elevated/70 text-xs focus:border-accent"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>

            <div className="text-xs text-muted flex items-center gap-1.5 shrink-0">
              <Filter className="size-3.5 text-accent" />
              <span>Найдено: </span>
              <span className="font-bold text-fg">{filtered.length}</span>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                    active
                      ? "bg-accent text-accent-fg shadow-sm"
                      : "border border-border/70 bg-elevated/40 text-muted hover:text-fg hover:border-accent/40",
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </AnimatedBlock>

      {/* ── Logs Feed ──────────────────────────────────────────────── */}
      <AnimatedBlock delay={120}>
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-border/80 bg-surface/90 glass-panel p-12 text-center shadow-sm">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-elevated text-muted">
              <ScrollText className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-fg">Записей не найдено</h3>
            <p className="mt-1 text-xs text-muted">
              {search || category !== "all"
                ? "Попробуйте изменить параметры поиска или категорию фильтра."
                : "В журнале пока нет сохранённых событий."}
            </p>
            {search || category !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                }}
                className="mt-4 rounded-xl text-xs font-bold"
              >
                Сбросить фильтры
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-border/80 bg-surface/90 glass-panel shadow-lg divide-y divide-border/50">
            {filtered.map((item) => {
              const meta = getActionMeta(item.action, item.detail);
              const Icon = meta.icon;
              const formattedDetail = formatLogDetail(item.detail);
              const time = formatLogTime(item.createdAt);
              const initial = (item.userName || "U").trim().charAt(0).toUpperCase();

              return (
                <article
                  key={item.id}
                  className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors hover:bg-elevated/30"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    {/* User Avatar */}
                    <div className="relative shrink-0">
                      {item.userAvatar ? (
                        <img
                          src={item.userAvatar}
                          alt=""
                          loading="lazy"
                          className="size-10 rounded-xl object-cover border border-border/80 shadow-xs"
                        />
                      ) : (
                        <div className="grid size-10 place-items-center rounded-xl border border-border/80 bg-gradient-to-tr from-surface to-elevated text-sm font-bold text-fg shadow-xs">
                          {initial}
                        </div>
                      )}
                    </div>

                    {/* Information */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-fg truncate">
                          {item.userName || "Пользователь"}
                        </span>

                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold",
                            meta.badgeClass,
                          )}
                        >
                          <Icon className="size-3" />
                          {meta.title}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-muted leading-relaxed break-words font-mono">
                        {formattedDetail}
                      </p>
                    </div>
                  </div>

                  {/* Timestamp & Meta */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 text-right pl-13 sm:pl-0">
                    <span className="font-mono text-xs font-semibold text-fg" title={time.full}>
                      {time.relative}
                    </span>
                    <span className="font-mono text-[11px] text-subtle">
                      {time.full}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </AnimatedBlock>
    </div>
  );
}
