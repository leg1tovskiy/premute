import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpDown,
  CheckCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Flame,
  Gamepad2,
  Gavel,
  Loader2,
  LogOut,
  MessageSquareWarning,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Timer,
  Trash2,
  TriangleAlert,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeaderSkeleton, RowsSkeleton } from "@/components/skeletons";
import {
  clearDismissedPlayersFn,
  dismissSuspiciousPlayerFn,
  getSuspiciousFn,
  restoreSuspiciousPlayerFn,
} from "@/lib/fn";
import { fearProfileUrl } from "@/lib/constants";
import type { DismissedPlayer, SuspiciousPayload, SuspiciousPlayer, SuspiciousSource } from "@/lib/types";
import { AnimatedBlock, AnimatedNumber } from "@/components/animated-number";
import { cn } from "@/lib/utils";

const SOURCE_BADGES: Record<SuspiciousSource, { label: string; tone: "muted" | "warn" | "danger" }> = {
  online: { label: "Онлайн на сервере", tone: "muted" },
  ticket: { label: "Тикет", tone: "warn" },
  report: { label: "Жалоба в игре", tone: "danger" },
};

export type DismissReason = "Наказан" | "Нарушений не обнаружено" | "Покинул сервер";

export const DISMISS_REASONS: Array<{
  id: DismissReason;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Gavel;
  colorClass: string;
  borderClass: string;
}> = [
  {
    id: "Наказан",
    title: "Наказан",
    subtitle: "Бан или мут за нарушение",
    description: "Игрок понёс наказание на сервере (заблокирован чат/микрофон или выдан бан).",
    icon: Gavel,
    colorClass: "text-red-400 bg-red-500/15 border-red-500/35",
    borderClass: "hover:border-red-500/70 hover:bg-red-500/10 focus:ring-red-500/40",
  },
  {
    id: "Нарушений не обнаружено",
    title: "Нарушений не обнаружено",
    subtitle: "Игрок чист / ложная жалоба",
    description: "Подозрения проверены и не подтвердились, игрок не нарушает правила проекта.",
    icon: ShieldCheck,
    colorClass: "text-sky-400 bg-sky-500/15 border-sky-500/35",
    borderClass: "hover:border-sky-500/70 hover:bg-sky-500/10 focus:ring-sky-500/40",
  },
  {
    id: "Покинул сервер",
    title: "Покинул сервер",
    subtitle: "Отключился от сервера",
    description: "Игрок вышел из игры, дальнейший надзор на данный момент не требуется.",
    icon: LogOut,
    colorClass: "text-amber-400 bg-amber-500/15 border-amber-500/35",
    borderClass: "hover:border-amber-500/70 hover:bg-amber-500/10 focus:ring-amber-500/40",
  },
];

function isToxicityOrSpam(reason?: string | null, reasons?: string[]): boolean {
  const parts: string[] = [];
  if (reason) parts.push(reason);
  if (Array.isArray(reasons)) parts.push(...reasons);
  if (parts.length === 0) return false;
  const str = parts.join(" ").toLowerCase();
  return /(токсич|токсик|спам|spam|flood|флуд|оскорб|оск\b|неадекват|провокац|мат\b|ненорматив|1\.1|1\.5|mic\s*spam|voice\s*spam)/i.test(str);
}

function isCsgoServer(server?: string | null): boolean {
  if (!server) return false;
  return /(?:cs:?go|cs\s*go)/i.test(server);
}

function isHighKd(kd?: number | null): boolean {
  return typeof kd === "number" && kd > 4;
}

function fmtPlaytime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  return `${Math.max(1, m)}м`;
}

function fmtTime(sec: number) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(sec * 1000));
  } catch {
    return "";
  }
}

function cleanNickname(nickname: string | undefined | null): string {
  if (!nickname) return "";
  return nickname
    .replace(/[\u200B-\u200D\uFEFF\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, "")
    .trim();
}

function getPlayerDisplayName(nickname: string | undefined | null, steamid: string): string {
  const cleaned = cleanNickname(nickname);
  if (cleaned) return cleaned;
  return `Игрок #${steamid.slice(-4)}`;
}

function getPlayerInitial(nickname: string | undefined | null): string {
  const cleaned = cleanNickname(nickname);
  if (cleaned) {
    const first = cleaned.charAt(0);
    if (first) return first.toUpperCase();
  }
  return "?";
}

function fmtDate(isoStr?: string) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

type SubTab = "suspicious" | "newcomers" | "dismissed";
type NewcomersSort = "time_asc" | "time_desc" | "kd_desc" | "kills_desc";

export function SuspiciousView() {
  const [data, setData] = useState<SuspiciousPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("suspicious");

  // Фильтры и поиск для новорегов
  const [newcomersSearch, setNewcomersSearch] = useState("");
  const [newcomersSort, setNewcomersSort] = useState<NewcomersSort>("time_asc");
  const [visibleCount, setVisibleCount] = useState(50);

  // Модалка подтверждения с выбором причины
  const [dismissTarget, setDismissTarget] = useState<SuspiciousPlayer | null>(null);
  const [dismissing, setDismissing] = useState(false);

  async function load(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setData(await getSuspiciousFn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось получить список");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(true), 30_000);
    return () => clearInterval(t);
  }, []);

  function copySteamId(steamid: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(steamid);
      toast.success(`SteamID скопирован: ${steamid}`);
    }
  }

  const players = data?.players ?? [];
  const rawNewcomers = data?.newcomers ?? [];
  const dismissed = data?.dismissed ?? [];

  async function handleDismiss(player: SuspiciousPlayer, reason: DismissReason) {
    const sid = player.steamid;
    const name = getPlayerDisplayName(player.nickname, sid);
    setDismissing(true);

    // Optimistic UI update
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.filter((p) => p.steamid !== sid),
        newcomers: prev.newcomers?.filter((p) => p.steamid !== sid),
        dismissed: [
          {
            steamid: sid,
            nickname: player.nickname,
            dismissedByName: "Вы",
            dismissedAt: new Date().toISOString(),
            reason,
          },
          ...(prev.dismissed ?? []).filter((d) => d.steamid !== sid),
        ],
      };
    });

    try {
      await dismissSuspiciousPlayerFn({
        data: {
          steamid: sid,
          nickname: player.nickname,
          reason,
        },
      });
      toast.success(`Игрок ${name} убран (${reason})`, {
        description: `Причина: ${reason}. Игрок перемещён в раздел «Рассмотренные».`,
        action: {
          label: "Вернуть",
          onClick: () => void handleRestore(sid),
        },
      });
    } catch {
      toast.error("Не удалось убрать игрока на сервере");
      void load(true);
    } finally {
      setDismissing(false);
      setDismissTarget(null);
    }
  }

  async function handleRestore(steamid: string) {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        dismissed: (prev.dismissed ?? []).filter((d) => d.steamid !== steamid),
      };
    });

    try {
      await restoreSuspiciousPlayerFn({ data: { steamid } });
      toast.success("Игрок возвращен в активный радар");
      void load(true);
    } catch {
      toast.error("Не удалось вернуть игрока");
      void load(true);
    }
  }

  async function handleClearAllDismissed() {
    if (!confirm("Вы действительно хотите полностью очистить список рассмотренных игроков?")) return;
    setData((prev) => (prev ? { ...prev, dismissed: [] } : prev));
    try {
      await clearDismissedPlayersFn();
      toast.success("Список рассмотренных игроков очищен");
    } catch {
      toast.error("Не удалось очистить список");
      void load(true);
    }
  }

  // Фильтрация и сортировка новорегов
  const filteredNewcomers = useMemo(() => {
    let list = [...rawNewcomers];

    if (newcomersSearch.trim()) {
      const q = newcomersSearch.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.nickname ? p.nickname.toLowerCase() : "").includes(q) ||
          p.steamid.includes(q) ||
          (p.server && p.server.toLowerCase().includes(q)) ||
          (p.map && p.map.toLowerCase().includes(q)),
      );
    }

    list.sort((a, b) => {
      if (newcomersSort === "time_asc") return a.playtime - b.playtime;
      if (newcomersSort === "time_desc") return b.playtime - a.playtime;
      if (newcomersSort === "kd_desc") return b.kd - a.kd;
      if (newcomersSort === "kills_desc") return b.kills - a.kills;
      return 0;
    });

    return list;
  }, [rawNewcomers, newcomersSearch, newcomersSort]);

  const displayedNewcomers = useMemo(() => {
    return filteredNewcomers.slice(0, visibleCount);
  }, [filteredNewcomers, visibleCount]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 space-y-6">
        <PageHeaderSkeleton />
        <RowsSkeleton rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-danger font-bold text-lg">{error}</p>
        <Button className="mt-4 rounded-xl" onClick={() => void load()}>
          Повторить попытку
        </Button>
      </div>
    );
  }

  const tickets = data?.tickets ?? null;
  const ticketsWarning = tickets && (!tickets.configured || tickets.error) ? tickets : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
      {/* ── Subtabs Switcher Bar ────────────────────────────────────────── */}
      <AnimatedBlock delay={0}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 rounded-2xl border border-border/80 bg-surface/90 glass-panel shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveSubTab("suspicious")}
              className={cn(
                "relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all",
                activeSubTab === "suspicious"
                  ? "bg-danger text-white shadow-md shadow-danger/25"
                  : "text-muted hover:bg-elevated/80 hover:text-fg",
              )}
            >
              <ShieldAlert className="size-4 shrink-0" />
              <span>Подозрительные</span>
              <span
                className={cn(
                  "ml-1 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-mono font-black",
                  activeSubTab === "suspicious"
                    ? "bg-white/20 text-white"
                    : "bg-danger/15 text-danger border border-danger/30",
                )}
              >
                <AnimatedNumber value={players.length} />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("newcomers")}
              className={cn(
                "relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all",
                activeSubTab === "newcomers"
                  ? "bg-accent text-accent-fg shadow-md shadow-accent/25"
                  : "text-muted hover:bg-elevated/80 hover:text-fg",
              )}
            >
              <Sparkles className="size-4 shrink-0" />
              <span>Новореги (&lt; 10ч)</span>
              <span
                className={cn(
                  "ml-1 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-mono font-black",
                  activeSubTab === "newcomers"
                    ? "bg-white/20 text-white"
                    : "bg-accent/15 text-accent border border-accent/30",
                )}
              >
                <AnimatedNumber value={rawNewcomers.length} />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("dismissed")}
              className={cn(
                "relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all",
                activeSubTab === "dismissed"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                  : "text-muted hover:bg-elevated/80 hover:text-fg",
              )}
            >
              <CheckCheck className="size-4 shrink-0" />
              <span>Рассмотренные</span>
              <span
                className={cn(
                  "ml-1 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-mono font-black",
                  activeSubTab === "dismissed"
                    ? "bg-white/20 text-white"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
                )}
              >
                <AnimatedNumber value={dismissed.length} />
              </span>
            </button>
          </div>

          <Button
            variant="secondary"
            className="h-9 rounded-xl border-border/80 bg-elevated/80 px-3.5 text-xs font-bold text-fg hover:border-accent/40 shadow-sm"
            disabled={refreshing}
            onClick={() => void load(true)}
          >
            {refreshing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Обновить
          </Button>
        </div>
      </AnimatedBlock>

      {/* ── Top Header Banner ──────────────────────────────────────── */}
      <AnimatedBlock delay={50}>
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl border p-6 sm:p-7 shadow-xl glass-panel cyber-border-glow transition-all",
            activeSubTab === "suspicious"
              ? "border-danger/30 bg-gradient-to-r from-danger/10 via-surface/95 to-elevated/80"
              : activeSubTab === "newcomers"
                ? "border-accent/30 bg-gradient-to-r from-accent/10 via-surface/95 to-elevated/80"
                : "border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-surface/95 to-elevated/80",
          )}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-3 py-0.5 text-xs font-black uppercase tracking-wider",
                    activeSubTab === "suspicious"
                      ? "bg-danger/20 border-danger/40 text-danger"
                      : activeSubTab === "newcomers"
                        ? "bg-accent/20 border-accent/40 text-accent"
                        : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400",
                  )}
                >
                  {activeSubTab === "suspicious"
                    ? "СИСТЕМА МОНИТОРИНГА"
                    : activeSubTab === "newcomers"
                      ? "ОНЛАЙН НОВОРЕГИ"
                      : "ОТРАБОТАННЫЕ ИГРОКИ"}
                </span>
                {data?.updatedAt ? (
                  <span className="font-mono text-xs text-subtle">
                    обновлено {fmtTime(data.updatedAt)} МСК
                  </span>
                ) : null}
              </div>

              <h1 className="mt-2 text-2xl sm:text-3xl font-black text-fg flex items-center gap-2.5">
                {activeSubTab === "suspicious" ? (
                  <>
                    Подозрительные аккаунты
                    <ShieldAlert className="size-6 text-danger animate-pulse" />
                  </>
                ) : activeSubTab === "newcomers" ? (
                  <>
                    Новые игроки онлайн
                    <Sparkles className="size-6 text-accent animate-pulse" />
                  </>
                ) : (
                  <>
                    Рассмотренные нарушения
                    <CheckCheck className="size-6 text-emerald-400 animate-pulse" />
                  </>
                )}
              </h1>

              <p className="mt-1 text-xs text-muted max-w-2xl leading-relaxed">
                {activeSubTab === "suspicious"
                  ? "В радаре отображаются исключительно игроки, находящиеся онлайн на серверах. Как только игрок выходит с сервера (даже если на него есть жалоба или тикет), он автоматически снимается со списка."
                  : activeSubTab === "newcomers"
                    ? "Игроки, которые прямо сейчас играют на серверах проекта FEAR, с общим наигранным временем менее 10 часов. Список синхронизируется в реальном времени."
                    : "Игроки, нарушения которых уже были рассмотрены модератором и наказаны. Вы можете в любой момент вернуть игрока обратно в активный радар."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-2xl border border-border/80 bg-surface/90 px-4 py-2.5 text-right glass-panel shadow-sm">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted">
                  {activeSubTab === "suspicious"
                    ? "Подозрительных в игре"
                    : activeSubTab === "newcomers"
                      ? "Новорегов в игре"
                      : "Рассмотрено"}
                </p>
                <p
                  className={cn(
                    "text-2xl font-black font-mono leading-none mt-0.5",
                    activeSubTab === "suspicious"
                      ? "text-danger"
                      : activeSubTab === "newcomers"
                        ? "text-accent"
                        : "text-emerald-400",
                  )}
                >
                  <AnimatedNumber
                    value={
                      activeSubTab === "suspicious"
                        ? players.length
                        : activeSubTab === "newcomers"
                          ? rawNewcomers.length
                          : dismissed.length
                    }
                  />
                </p>
              </div>
            </div>
          </div>
        </div>
      </AnimatedBlock>

      {/* ── Visual Legend for Badges & Outlines ──────────────────────── */}
      {activeSubTab !== "dismissed" && (
        <AnimatedBlock delay={60}>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/80 bg-surface/90 px-3.5 py-2.5 text-xs glass-panel shadow-sm">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider mr-1">
              Маркеры нарушений:
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-emerald-500 bg-emerald-500/15 px-2.5 py-0.5 font-bold text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)] text-[11px]">
              <Gamepad2 className="size-3 text-emerald-400" />
              <span>Сервер CS:GO (Зеленый)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-amber-400 bg-amber-400/20 px-2.5 py-0.5 font-bold text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.25)] text-[11px]">
              <MessageSquareWarning className="size-3 text-amber-400" />
              <span>Токсичность / Спам (Желтый)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-red-500 bg-red-500/25 px-2.5 py-0.5 font-bold text-red-300 animate-pulse-red shadow-[0_0_10px_rgba(239,68,68,0.3)] text-[11px]">
              <Flame className="size-3 text-red-400" />
              <span>K/D &gt; 4.0 (Красная пульсация)</span>
            </span>
          </div>
        </AnimatedBlock>
      )}

      {/* ── Subtab 1: Suspicious Players ─────────────────────────────── */}
      {activeSubTab === "suspicious" && (
        <>
          {ticketsWarning ? (
            <AnimatedBlock delay={80}>
              <div className="flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn/10 p-4 text-xs">
                <TriangleAlert className="mt-0.5 size-4.5 shrink-0 text-warn" />
                <div className="min-w-0">
                  <p className="font-bold text-warn">Интеграция тикетов fearproject.ru не активна</p>
                  <p className="mt-0.5 text-muted leading-relaxed">
                    {!ticketsWarning.configured
                       ? "В воркере статистики не задан FEAR_ADMIN_COOKIE — игроки из тикетов и жалобы временно не синхронизируются."
                      : `Ошибка синхронизации тикетов: ${ticketsWarning.error}`}
                  </p>
                </div>
              </div>
            </AnimatedBlock>
          ) : null}

          <AnimatedBlock delay={100}>
            {players.length === 0 ? (
              <div className="rounded-3xl border border-border/80 bg-surface/90 glass-panel px-6 py-16 text-center shadow-sm">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-success/15 border border-success/30 text-success shadow-lg shadow-success/10">
                  <ShieldCheck className="size-8" />
                </div>
                <p className="mt-4 text-base font-extrabold text-fg">Подозрительных игроков онлайн не обнаружено</p>
                <p className="mt-1 text-xs text-muted">
                  На серверах проекта сейчас нет активных игроков с жалобами или аномальной статистикой.
                </p>
                <p className="mt-3 font-mono text-[11px] text-subtle">
                  Радар проверяет серверы каждые 30 секунд. Игроки не в сети в списке не отображаются.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60 overflow-hidden rounded-3xl border border-border/80 bg-surface/90 glass-panel shadow-sm">
                {players.map((p) => {
                  const displayName = getPlayerDisplayName(p.nickname, p.steamid);
                  const initial = getPlayerInitial(p.nickname);
                  const csgo = isCsgoServer(p.server);
                  const tox = isToxicityOrSpam(p.reason, p.reasons);
                  const highKd = isHighKd(p.kd);

                  return (
                    <li
                      key={p.steamid}
                      className={cn(
                        "flex flex-col gap-3.5 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between sm:px-6 transition-all hover:bg-elevated/40",
                        highKd
                          ? "border-l-4 border-l-red-500 bg-red-500/[0.04]"
                          : tox
                            ? "border-l-4 border-l-amber-400 bg-amber-400/[0.03]"
                            : csgo
                              ? "border-l-4 border-l-emerald-500 bg-emerald-500/[0.03]"
                              : "border-l-4 border-l-transparent",
                      )}
                    >
                      {/* Left: Avatar + Details */}
                      <div className="flex min-w-0 flex-1 items-center gap-3.5">
                        <div className="relative shrink-0">
                          {p.avatar ? (
                            <img
                              src={p.avatar}
                              alt=""
                              className={cn(
                                "size-11 shrink-0 rounded-2xl object-cover shadow-md transition-all",
                                highKd
                                  ? "border-2 border-red-500 animate-pulse-red"
                                  : tox
                                    ? "border-2 border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                                    : csgo
                                      ? "border-2 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                      : "border-2 border-border/80",
                              )}
                            />
                          ) : (
                            <span
                              className={cn(
                                "grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-surface to-elevated text-sm font-black text-fg shadow-md transition-all",
                                highKd
                                  ? "border-2 border-red-500 animate-pulse-red"
                                  : tox
                                    ? "border-2 border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                                    : csgo
                                      ? "border-2 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                      : "border-2 border-border/80",
                              )}
                            >
                              {initial}
                            </span>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface bg-success shadow-[0_0_8px_var(--color-success)]" />
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          {/* Line 1: Nickname + Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span
                              className="text-sm font-extrabold text-fg truncate max-w-[200px] sm:max-w-[280px]"
                              title={displayName}
                            >
                              {displayName}
                            </span>

                            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-success/15 border border-success/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-success">
                              <span className="size-1.5 rounded-full bg-success animate-pulse" />
                              В ИГРЕ
                            </span>

                            {csgo ? (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-md border-2 border-emerald-500 bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-black text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                <Gamepad2 className="size-3 text-emerald-400" />
                                CS:GO
                              </span>
                            ) : null}

                            <Badge tone={SOURCE_BADGES[p.source ?? "online"].tone} className="font-bold text-[10px] px-2 py-0.5">
                              {SOURCE_BADGES[p.source ?? "online"].label}
                            </Badge>

                            {p.reason ? (
                              tox ? (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-md border-2 border-amber-400 bg-amber-400/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.3)]">
                                  <MessageSquareWarning className="size-3 shrink-0 text-amber-400" />
                                  <span>{p.reason}</span>
                                </span>
                              ) : (
                                <Badge tone="danger" className="font-bold text-[10px] px-2 py-0.5 flex items-center gap-1 border-2 border-danger/60">
                                  <MessageSquareWarning className="size-3 shrink-0" />
                                  <span>{p.reason}</span>
                                </Badge>
                              )
                            ) : null}

                            {p.reports != null && p.reports > 1 ? (
                              <Badge tone="muted" className="font-mono text-[10px] px-2 py-0.5">
                                репортов: <AnimatedNumber value={p.reports} />
                              </Badge>
                            ) : null}
                          </div>

                          {/* Line 2: SteamID + Server + Map */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-subtle">
                            <button
                              type="button"
                              onClick={() => copySteamId(p.steamid)}
                              className="hover:text-fg hover:underline inline-flex items-center gap-1 shrink-0 font-mono"
                              title="Нажмите, чтобы скопировать SteamID"
                            >
                              <span>{p.steamid}</span>
                              <Copy className="size-2.5 opacity-60" />
                            </button>
                            {p.server ? (
                              csgo ? (
                                <span className="inline-flex items-center gap-1 rounded-md border-2 border-emerald-500 bg-emerald-500/15 px-1.5 py-0.5 font-bold text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)]">
                                  <Gamepad2 className="size-3 text-emerald-400 shrink-0" />
                                  <span>{p.server}</span>
                                </span>
                              ) : (
                                <span className="text-muted inline-flex items-center gap-1">
                                  <span className="text-subtle/50">&middot;</span>
                                  <span className="text-fg/80">{p.server}</span>
                                </span>
                              )
                            ) : null}
                            {p.map ? (
                              <span className="text-accent font-semibold inline-flex items-center gap-1">
                                <span className="text-subtle/50">&middot;</span>
                                <span>({p.map})</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Right: Stats & Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-start lg:self-center pt-1 lg:pt-0">
                        {p.playtime > 0 ? (
                          <div
                            className={cn(
                              "flex items-center gap-2 rounded-xl px-2.5 py-1 text-xs shrink-0 transition-all",
                              highKd
                                ? "border-2 border-red-500 bg-red-500/25 animate-pulse-red text-red-200 shadow-[0_0_14px_rgba(239,68,68,0.4)]"
                                : "border border-border/60 bg-elevated/60",
                            )}
                          >
                            <span
                              className={cn(
                                "font-black font-mono flex items-center gap-1",
                                highKd ? "text-red-300" : "text-danger",
                              )}
                            >
                              {highKd ? <Flame className="size-3 text-red-400 animate-pulse" /> : null}
                              KD {p.kd.toFixed(2)}
                            </span>
                            <span className={cn("flex items-center gap-1", highKd ? "text-red-200/80" : "text-muted")}>
                              <Timer className="size-3 shrink-0" />
                              {fmtPlaytime(p.playtime)}
                            </span>
                            <span className={cn("font-mono", highKd ? "text-red-300/70" : "text-subtle")}>
                              ({p.kills}/{p.deaths})
                            </span>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => setDismissTarget(p)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/25 hover:border-emerald-500 transition-all shadow-sm shrink-0"
                          title="Убрать игрока из радара с выбором причины"
                        >
                          <CheckCircle2 className="size-3.5" />
                          <span>Убрать</span>
                        </button>

                        <Link
                          to="/player/$steamid"
                          params={{ steamid: p.steamid }}
                          className="inline-flex h-8 items-center rounded-xl border border-border/80 bg-elevated px-3 text-xs font-bold text-muted hover:border-accent hover:text-fg hover:bg-elevated/80 transition-all shadow-sm shrink-0"
                        >
                          История
                        </Link>

                        <a
                          href={fearProfileUrl(p.steamid)}
                          target="_blank"
                          rel="noreferrer"
                          title="Профиль на FearProject"
                          className="inline-flex size-8 items-center justify-center rounded-xl border border-border/80 bg-elevated text-muted hover:border-accent hover:text-fg hover:bg-elevated/80 transition-all shadow-sm shrink-0"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </AnimatedBlock>
        </>
      )}

      {/* ── Subtab 2: Newcomers (< 10h) ───────────────────────────────── */}
      {activeSubTab === "newcomers" && (
        <>
          {/* Controls bar: Search + Sort */}
          <AnimatedBlock delay={80}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border border-border/80 bg-surface/90 glass-panel shadow-sm">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={newcomersSearch}
                  onChange={(e) => {
                    setNewcomersSearch(e.target.value);
                    setVisibleCount(50);
                  }}
                  placeholder="Поиск по нику, SteamID или серверу..."
                  className="w-full h-9.5 pl-9 pr-3 rounded-xl border border-border/80 bg-elevated/80 text-xs text-fg placeholder:text-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted font-bold flex items-center gap-1.5 hidden md:flex">
                  <ArrowUpDown className="size-3.5 text-accent" />
                  Сортировка:
                </span>
                <Select
                  value={newcomersSort}
                  onValueChange={(val) => setNewcomersSort(val as NewcomersSort)}
                >
                  <SelectTrigger className="w-[230px] font-bold">
                    <SelectValue placeholder="Сортировка" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time_asc">Меньше времени (сначала новые)</SelectItem>
                    <SelectItem value="time_desc">Больше времени (&lt; 10ч)</SelectItem>
                    <SelectItem value="kd_desc">По K/D (выше)</SelectItem>
                    <SelectItem value="kills_desc">По убийствам</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AnimatedBlock>

          <AnimatedBlock delay={100}>
            {filteredNewcomers.length === 0 ? (
              <div className="rounded-3xl border border-border/80 bg-surface/90 glass-panel px-6 py-16 text-center shadow-sm">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/15 border border-accent/30 text-accent shadow-lg shadow-accent/10">
                  <UserCheck className="size-8" />
                </div>
                <p className="mt-4 text-base font-extrabold text-fg">
                  {newcomersSearch ? "Ничего не найдено по вашему запросу" : "Новых игроков онлайн не найдено"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {newcomersSearch
                    ? "Попробуйте изменить поисковый запрос."
                    : "На серверах проекта сейчас нет игроков со временем игры менее 10 часов."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-muted px-1">
                  <span>
                    Показано <strong>{displayedNewcomers.length}</strong> из{" "}
                    <strong>{filteredNewcomers.length}</strong> игроков
                  </span>
                  <span className="font-mono text-[11px] text-subtle">
                    Время на проекте &lt; 10 часов (онлайн)
                  </span>
                </div>

                <ul className="divide-y divide-border/60 overflow-hidden rounded-3xl border border-border/80 bg-surface/90 glass-panel shadow-sm">
                  {displayedNewcomers.map((p) => {
                    const hours = p.playtime / 3600;
                    const displayName = getPlayerDisplayName(p.nickname, p.steamid);
                    const initial = getPlayerInitial(p.nickname);
                    const csgo = isCsgoServer(p.server);
                    const highKd = isHighKd(p.kd);

                    return (
                      <li
                        key={p.steamid}
                        className={cn(
                          "flex flex-col gap-3.5 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between sm:px-6 transition-all hover:bg-elevated/40",
                          highKd
                            ? "border-l-4 border-l-red-500 bg-red-500/[0.04]"
                            : csgo
                              ? "border-l-4 border-l-emerald-500 bg-emerald-500/[0.03]"
                              : "border-l-4 border-l-transparent",
                        )}
                      >
                        {/* Left: Avatar & Player Info */}
                        <div className="flex min-w-0 flex-1 items-center gap-3.5">
                          <div className="relative shrink-0">
                            {p.avatar ? (
                              <img
                                src={p.avatar}
                                alt=""
                                className={cn(
                                  "size-11 shrink-0 rounded-2xl object-cover shadow-md transition-all",
                                  highKd
                                    ? "border-2 border-red-500 animate-pulse-red"
                                    : csgo
                                      ? "border-2 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                      : "border-2 border-border/80",
                                )}
                              />
                            ) : (
                              <span
                                className={cn(
                                  "grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-surface to-elevated text-sm font-black text-fg shadow-md transition-all",
                                  highKd
                                    ? "border-2 border-red-500 animate-pulse-red"
                                    : csgo
                                      ? "border-2 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                      : "border-2 border-border/80",
                                )}
                              >
                                {initial}
                              </span>
                            )}
                            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface bg-success shadow-[0_0_8px_var(--color-success)]" />
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            {/* Line 1: Nickname + Badges */}
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <span
                                className="text-sm font-extrabold text-fg truncate max-w-[200px] sm:max-w-[280px]"
                                title={displayName}
                              >
                                {displayName}
                              </span>

                              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-success/15 border border-success/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-success">
                                <span className="size-1.5 rounded-full bg-success animate-pulse" />
                                В ИГРЕ
                              </span>

                              {csgo ? (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-md border-2 border-emerald-500 bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-black text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                  <Gamepad2 className="size-3 text-emerald-400" />
                                  CS:GO
                                </span>
                              ) : null}

                              {/* Playtime badge */}
                              <div
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold shadow-sm font-mono",
                                  hours < 1
                                    ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-400"
                                    : hours < 5
                                      ? "bg-sky-500/15 border-sky-500/35 text-sky-400"
                                      : "bg-amber-500/15 border-amber-500/35 text-amber-400",
                                )}
                              >
                                <Timer className="size-3 shrink-0" />
                                <span>{fmtPlaytime(p.playtime)}</span>
                              </div>

                              {p.rank != null && p.rank > 0 ? (
                                <Badge tone="muted" className="font-mono text-[10px] px-2 py-0.5">
                                  Ранг {p.rank}
                                </Badge>
                              ) : null}
                            </div>

                            {/* Line 2: SteamID + Server + Map */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-subtle">
                              <button
                                type="button"
                                onClick={() => copySteamId(p.steamid)}
                                className="hover:text-fg hover:underline inline-flex items-center gap-1 shrink-0 font-mono"
                                title="Нажмите, чтобы скопировать SteamID"
                              >
                                <span>{p.steamid}</span>
                                <Copy className="size-2.5 opacity-60" />
                              </button>
                              {p.server ? (
                                csgo ? (
                                  <span className="inline-flex items-center gap-1 rounded-md border-2 border-emerald-500 bg-emerald-500/15 px-1.5 py-0.5 font-bold text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)]">
                                    <Gamepad2 className="size-3 text-emerald-400 shrink-0" />
                                    <span>{p.server}</span>
                                  </span>
                                ) : (
                                  <span className="text-muted inline-flex items-center gap-1">
                                    <span className="text-subtle/50">&middot;</span>
                                    <span className="text-fg/80">{p.server}</span>
                                  </span>
                                )
                              ) : null}
                              {p.map ? (
                                <span className="text-accent font-semibold inline-flex items-center gap-1">
                                  <span className="text-subtle/50">&middot;</span>
                                  <span>({p.map})</span>
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Right: Badges & Stats */}
                        <div className="flex items-center gap-2 shrink-0 self-start lg:self-center pt-1 lg:pt-0">
                          {/* KD & Kills */}
                          <div
                            className={cn(
                              "flex items-center gap-2 rounded-xl px-2.5 py-1 text-xs shrink-0 transition-all",
                              highKd
                                ? "border-2 border-red-500 bg-red-500/25 animate-pulse-red text-red-200 shadow-[0_0_14px_rgba(239,68,68,0.4)]"
                                : "border border-border/60 bg-elevated/60",
                            )}
                          >
                            <span
                              className={cn(
                                "font-black font-mono flex items-center gap-1",
                                highKd
                                  ? "text-red-300"
                                  : p.kd >= 2
                                    ? "text-danger"
                                    : p.kd >= 1
                                      ? "text-fg"
                                      : "text-subtle",
                              )}
                            >
                              {highKd ? <Flame className="size-3 text-red-400 animate-pulse" /> : null}
                              KD {p.kd.toFixed(2)}
                            </span>
                            <span className={cn("font-mono", highKd ? "text-red-300/70" : "text-subtle")}>
                              ({p.kills}/{p.deaths})
                            </span>
                          </div>

                          {/* Action: Dismiss */}
                          <button
                            type="button"
                            onClick={() => setDismissTarget(p)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/25 hover:border-emerald-500 transition-all shadow-sm shrink-0"
                            title="Убрать игрока из радара с выбором причины"
                          >
                            <CheckCircle2 className="size-3.5" />
                            <span>Убрать</span>
                          </button>

                          {/* Profile Link */}
                          <Link
                            to="/player/$steamid"
                            params={{ steamid: p.steamid }}
                            className="inline-flex h-8 items-center rounded-xl border border-border/80 bg-elevated px-3 text-xs font-bold text-muted hover:border-accent hover:text-fg hover:bg-elevated/80 transition-all shadow-sm shrink-0"
                          >
                            История
                          </Link>

                          {/* FearProject Link */}
                          <a
                            href={fearProfileUrl(p.steamid)}
                            target="_blank"
                            rel="noreferrer"
                            title="Профиль на FearProject"
                            className="inline-flex size-8 items-center justify-center rounded-xl border border-border/80 bg-elevated text-muted hover:border-accent hover:text-fg hover:bg-elevated/80 transition-all shadow-sm shrink-0"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>

                          {/* Steam Community Link */}
                          <a
                            href={`https://steamcommunity.com/profiles/${p.steamid}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Профиль в Steam"
                            className="inline-flex h-8 items-center gap-1 rounded-xl border border-border/80 bg-elevated px-2.5 text-xs font-bold text-muted hover:border-accent hover:text-fg hover:bg-elevated/80 transition-all shadow-sm shrink-0"
                          >
                            <span className="text-[11px]">Steam</span>
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Show more button if there are more players than visibleCount */}
                {filteredNewcomers.length > visibleCount && (
                  <div className="text-center pt-2">
                    <Button
                      variant="secondary"
                      className="rounded-2xl border-border/80 bg-elevated px-6 text-xs font-bold hover:border-accent"
                      onClick={() => setVisibleCount((prev) => prev + 50)}
                    >
                      Показать ещё (+50)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </AnimatedBlock>
        </>
      )}

      {/* ── Subtab 3: Dismissed Players ─────────────────────────────── */}
      {activeSubTab === "dismissed" && (
        <AnimatedBlock delay={100}>
          {dismissed.length === 0 ? (
            <div className="rounded-3xl border border-border/80 bg-surface/90 glass-panel px-6 py-16 text-center shadow-sm">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10">
                <CheckCheck className="size-8" />
              </div>
              <p className="mt-4 text-base font-extrabold text-fg">Список рассмотренных пуст</p>
              <p className="mt-1 text-xs text-muted">
                Когда вы наказываете игрока и нажимаете кнопку «Убрать», он перемещается сюда.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted px-1">
                <span>
                  Всего рассмотрено <strong>{dismissed.length}</strong> игроков
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleClearAllDismissed()}
                  className="h-8 gap-1.5 text-xs text-subtle hover:text-danger hover:bg-danger/10 rounded-xl"
                >
                  <Trash2 className="size-3.5" />
                  <span>Очистить историю</span>
                </Button>
              </div>

              <ul className="divide-y divide-border/60 overflow-hidden rounded-3xl border border-border/80 bg-surface/90 glass-panel shadow-sm">
                {dismissed.map((d) => (
                  <li
                    key={d.steamid}
                    className="flex flex-col gap-3.5 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between sm:px-6 transition-all hover:bg-elevated/40"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3.5">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-surface to-elevated text-sm font-black text-fg border-2 border-emerald-500/40 shadow-md">
                        {getPlayerInitial(d.nickname)}
                      </span>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="text-sm font-extrabold text-fg truncate max-w-[200px] sm:max-w-[280px]">
                            {getPlayerDisplayName(d.nickname, d.steamid)}
                          </span>

                          {d.reason === "Наказан" ? (
                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-red-500/15 border border-red-500/35 px-2.5 py-0.5 font-mono text-[10px] font-black text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.2)]">
                              <Gavel className="size-3" />
                              НАКАЗАН
                            </span>
                          ) : d.reason === "Нарушений не обнаружено" ? (
                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-sky-500/15 border border-sky-500/35 px-2.5 py-0.5 font-mono text-[10px] font-black text-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.2)]">
                              <ShieldCheck className="size-3" />
                              НАРУШЕНИЙ НЕ ОБНАРУЖЕНО
                            </span>
                          ) : d.reason === "Покинул сервер" ? (
                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-amber-500/15 border border-amber-500/35 px-2.5 py-0.5 font-mono text-[10px] font-black text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                              <LogOut className="size-3" />
                              ПОКИНУЛ СЕРВЕР
                            </span>
                          ) : (
                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                              <CheckCircle2 className="size-3" />
                              {d.reason ? d.reason : "РАССМОТРЕН"}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-subtle">
                          <button
                            type="button"
                            onClick={() => copySteamId(d.steamid)}
                            className="hover:text-fg hover:underline inline-flex items-center gap-1 shrink-0 font-mono"
                            title="Скопировать SteamID"
                          >
                            <span>{d.steamid}</span>
                            <Copy className="size-2.5 opacity-60" />
                          </button>
                          {d.dismissedByName ? (
                            <span className="text-muted inline-flex items-center gap-1">
                              <span className="text-subtle/50">&middot;</span>
                              <span>Убрал: <strong>{d.dismissedByName}</strong></span>
                            </span>
                          ) : null}
                          {d.dismissedAt ? (
                            <span className="text-subtle inline-flex items-center gap-1">
                              <span className="text-subtle/50">&middot;</span>
                              <span>{fmtDate(d.dismissedAt)} МСК</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start lg:self-center pt-1 lg:pt-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleRestore(d.steamid)}
                        className="h-8 gap-1.5 text-xs font-bold rounded-xl border border-border/80 bg-elevated hover:border-accent hover:text-fg shadow-sm"
                      >
                        <RotateCcw className="size-3.5 text-accent" />
                        <span>Вернуть в радар</span>
                      </Button>

                      <Link
                        to="/player/$steamid"
                        params={{ steamid: d.steamid }}
                        className="inline-flex h-8 items-center rounded-xl border border-border/80 bg-elevated px-3 text-xs font-bold text-muted hover:border-accent hover:text-fg hover:bg-elevated/80 transition-all shadow-sm shrink-0"
                      >
                        История
                      </Link>

                      <a
                        href={fearProfileUrl(d.steamid)}
                        target="_blank"
                        rel="noreferrer"
                        title="Профиль на FearProject"
                        className="inline-flex size-8 items-center justify-center rounded-xl border border-border/80 bg-elevated text-muted hover:border-accent hover:text-fg hover:bg-elevated/80 transition-all shadow-sm shrink-0"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </AnimatedBlock>
      )}

      {/* ── Footer Info ─────────────────────────────────────────────── */}
      <AnimatedBlock delay={150}>
        <p className="flex items-start gap-2 text-xs text-subtle px-1">
          <TicketCheck className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>
            {activeSubTab === "suspicious"
              ? "KD и игровое время вычисляются по данным профиля FearProject. Администрация и модераторы серверов исключены из проверки."
              : activeSubTab === "newcomers"
                ? "Данные об онлайне и времени игры получаются напрямую с серверов fearproject.ru. В списке отображаются только игроки с общим наигранным временем менее 10 часов."
                : "В этом списке хранятся игроки, которых модераторы убрали из радара после выдачи наказания или разбора ситуации. Любого игрока можно вернуть назад."}
          </span>
        </p>
      </AnimatedBlock>

      {/* ── Dialog Modal: Reason Selection for Dismissing Player ──── */}
      <AlertDialog
        open={Boolean(dismissTarget)}
        onOpenChange={(open) => {
          if (!open && !dismissing) setDismissTarget(null);
        }}
      >
        <AlertDialogContent className="w-[min(94vw,32rem)] max-w-lg rounded-3xl border border-border/90 bg-surface/95 p-5 sm:p-6 glass-panel shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="grid size-10 place-items-center rounded-2xl bg-danger/15 border border-danger/30 text-danger shadow-md shadow-danger/10">
                <UserMinus className="size-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base sm:text-lg font-black text-fg">
                  Убрать игрока из списка
                </AlertDialogTitle>
                <p className="text-xs font-mono text-muted">
                  {dismissTarget ? getPlayerDisplayName(dismissTarget.nickname, dismissTarget.steamid) : ""}
                  {dismissTarget?.steamid ? ` · ${dismissTarget.steamid}` : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDismissTarget(null)}
              disabled={dismissing}
              className="rounded-xl p-1.5 text-muted hover:bg-elevated hover:text-fg transition-all"
              title="Закрыть"
            >
              <X className="size-4.5" />
            </button>
          </div>

          <AlertDialogDescription className="mt-3 text-xs text-muted leading-relaxed">
            Укажите причину, по которой данный аккаунт убирается из активного мониторинга:
          </AlertDialogDescription>

          <div className="mt-4 grid gap-2.5">
            {DISMISS_REASONS.map((r) => {
              const Icon = r.icon;
              return (
                <button
                  key={r.id}
                  type="button"
                  disabled={dismissing}
                  onClick={() => {
                    if (dismissTarget) void handleDismiss(dismissTarget, r.id);
                  }}
                  className={cn(
                    "group relative flex items-start gap-3.5 rounded-2xl border border-border/80 bg-elevated/50 p-3.5 text-left transition-all hover:scale-[1.01] hover:bg-elevated hover:shadow-lg focus:outline-none focus:ring-2 disabled:opacity-50",
                    r.borderClass,
                  )}
                >
                  <div className={cn("grid size-9 shrink-0 place-items-center rounded-xl border shadow-sm", r.colorClass)}>
                    <Icon className="size-4.5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-fg group-hover:text-accent transition-colors">
                        {r.title}
                      </span>
                      <span className="inline-flex items-center text-[10px] font-mono font-bold text-muted group-hover:text-accent transition-colors uppercase">
                        Выбрать &rarr;
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-fg/75 mt-0.5">
                      {r.subtitle}
                    </p>
                    <p className="text-[11px] text-muted leading-snug mt-0.5">
                      {r.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between pt-2 border-t border-border/60">
            <span className="text-[11px] font-mono text-subtle">
              Игрок будет перемещён в раздел «Рассмотренные»
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={dismissing}
              onClick={() => setDismissTarget(null)}
              className="rounded-xl px-4 text-xs font-bold"
            >
              Отмена
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
