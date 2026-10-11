import { useEffect, useState } from "react";
import {
  Activity,
  ChevronDown,
  Layers,
  Link as LinkIcon,
  Loader2,
  LogIn,
  RotateCw,
  ScrollText,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { clearActionLogsFn, getActionLogsFn } from "@/lib/fn";
import { usePanel } from "@/lib/panel";
import type { ActionLogItem } from "@/lib/types";
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
  // Автоопределение из содержимого лога, если действие generic или set_perms
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
        title: "Вход",
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
        title: "Игрок убран",
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
        title: "Очистка",
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

function formatLogTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d) + " МСК";
  } catch {
    return "—";
  }
}

export function SidebarActionLogs({ className }: { className?: string }) {
  const { profile } = usePanel();
  const [expanded, setExpanded] = useState(false);
  const [logs, setLogs] = useState<ActionLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Доступ только для Владельца сайта, Владельца бота и Главного владельца
  const canViewLogs = profile.isOwner || profile.isBotOwner || profile.isRoot;

  async function fetchLogs(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await getActionLogsFn({ data: { limit: 100 } });
      setLogs(data);
      setHasLoaded(true);
    } catch (e) {
      if (!silent) {
        toast.error(e instanceof Error ? e.message : "Не удалось загрузить логи");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // При первом открытии загружаем логи
  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && !hasLoaded) {
      void fetchLogs();
    }
  }

  // Автообновление логов каждые 20 секунд пока блок развернут
  useEffect(() => {
    if (!canViewLogs || !expanded) return;
    const interval = setInterval(() => {
      void fetchLogs(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [canViewLogs, expanded]);

  async function handleClear() {
    if (!window.confirm("Вы действительно хотите полностью очистить журнал логов?")) {
      return;
    }
    setClearing(true);
    try {
      await clearActionLogsFn();
      toast.success("Журнал логов очищен");
      await fetchLogs(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка при очистке логов");
    } finally {
      setClearing(false);
    }
  }

  if (!canViewLogs) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-surface/90 glass-panel shadow-sm transition-all overflow-hidden",
        className,
      )}
    >
      {/* Кнопка-шапка (сворачивание / разворачивание) */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between gap-2.5 p-3.5 text-left cursor-pointer group hover:bg-elevated/40 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent border border-accent/25 group-hover:scale-105 transition-transform shadow-xs">
            <ScrollText className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-fg group-hover:text-accent transition-colors">
                Логи сайта
              </span>
              <span
                className="size-1.5 rounded-full bg-success animate-pulse"
                title="Система аудита активна"
              />
            </div>
            <p className="truncate text-[10px] text-muted">
              Взаимодействия и изменения
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {logs.length > 0 && !expanded ? (
            <span className="rounded-full bg-elevated/80 border border-border/60 px-2 py-0.5 text-[10px] font-mono font-semibold text-muted">
              {logs.length}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "size-4 text-muted transition-transform duration-300",
              expanded && "rotate-180 text-fg",
            )}
          />
        </div>
      </button>

      {/* Плавно раскрывающийся контент */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          expanded
            ? "grid-rows-[1fr] opacity-100 border-t border-border/60"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="p-3 space-y-2.5">
            {/* Тулбар над списком логов */}
            <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-muted">
              <span className="font-medium">
                Всего записей: <strong className="text-fg">{logs.length}</strong>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void fetchLogs()}
                  disabled={loading}
                  className="grid size-6 place-items-center rounded-lg border border-border/60 bg-elevated/50 text-muted hover:text-fg hover:border-accent/40 transition-colors cursor-pointer disabled:opacity-50"
                  title="Обновить журнал логов"
                >
                  <RotateCw className={cn("size-3", loading && "animate-spin text-accent")} />
                </button>
                {logs.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => void handleClear()}
                    disabled={clearing}
                    className="grid size-6 place-items-center rounded-lg border border-border/60 bg-elevated/50 text-muted hover:text-danger hover:border-danger/40 transition-colors cursor-pointer disabled:opacity-50"
                    title="Очистить все логи"
                  >
                    <Trash2 className="size-3" />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Скроллируемый список логов */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs">
              {loading && !logs.length ? (
                <div className="py-8 text-center text-xs text-muted flex flex-col items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-accent" />
                  <span>Загрузка журнала логов...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted flex flex-col items-center gap-1.5">
                  <ScrollText className="size-5 text-muted/40" />
                  <span>Журнал логов пока пуст</span>
                </div>
              ) : (
                logs.map((log) => {
                  const displayDetail = formatLogDetail(log.detail);
                  const meta = getActionMeta(log.action, displayDetail);
                  const Icon = meta.icon;
                  return (
                    <div
                      key={log.id}
                      className="rounded-xl border border-border/60 bg-elevated/40 p-2.5 space-y-1.5 transition-colors hover:border-accent/30 hover:bg-elevated/60"
                    >
                      {/* Строка 1: Бейдж действия + Время */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                            meta.badgeClass,
                          )}
                        >
                          <Icon className="size-2.5" />
                          <span>{meta.title}</span>
                        </span>
                        <span className="text-[10px] text-subtle font-mono">
                          {formatLogTime(log.createdAt)}
                        </span>
                      </div>

                      {/* Строка 2: Описание действия */}
                      <p className="text-xs text-fg/95 leading-snug break-words">
                        {displayDetail}
                      </p>

                      {/* Строка 3: Автор действия */}
                      <div className="flex items-center gap-1.5 text-[10px] text-muted pt-0.5 border-t border-border/30">
                        <span>Автор:</span>
                        <div className="flex items-center gap-1 min-w-0">
                          {log.userAvatar ? (
                            <img
                              src={log.userAvatar}
                              alt=""
                              className="size-3.5 rounded-full object-cover shrink-0"
                            />
                          ) : null}
                          <span className="font-semibold text-fg/80 truncate max-w-[150px]">
                            {log.userName || log.userId}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
