import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpDown,
  Copy,
  ExternalLink,
  Loader2,
  MessageSquareWarning,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Timer,
  TriangleAlert,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeaderSkeleton, RowsSkeleton } from "@/components/skeletons";
import { getSuspiciousFn } from "@/lib/fn";
import { fearProfileUrl } from "@/lib/constants";
import type { SuspiciousPayload, SuspiciousPlayer, SuspiciousSource } from "@/lib/types";
import { AnimatedBlock, AnimatedNumber } from "@/components/animated-number";
import { cn } from "@/lib/utils";

const SOURCE_BADGES: Record<SuspiciousSource, { label: string; tone: "muted" | "warn" | "danger" }> = {
  online: { label: "Онлайн на сервере", tone: "muted" },
  ticket: { label: "Тикет", tone: "warn" },
  report: { label: "Жалоба в игре", tone: "danger" },
};

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

type SubTab = "suspicious" | "newcomers";
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
          <div className="flex items-center gap-1.5">
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
              : "border-accent/30 bg-gradient-to-r from-accent/10 via-surface/95 to-elevated/80",
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
                      : "bg-accent/20 border-accent/40 text-accent",
                  )}
                >
                  {activeSubTab === "suspicious" ? "СИСТЕМА МОНИТОРИНГА" : "ОНЛАЙН НОВОРЕГИ"}
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
                ) : (
                  <>
                    Новые игроки онлайн
                    <Sparkles className="size-6 text-accent animate-pulse" />
                  </>
                )}
              </h1>

              <p className="mt-1 text-xs text-muted max-w-2xl leading-relaxed">
                {activeSubTab === "suspicious"
                  ? "В радаре отображаются исключительно игроки, находящиеся онлайн на серверах. Как только игрок выходит с сервера (даже если на него есть жалоба или тикет), он автоматически снимается со списка."
                  : "Игроки, которые прямо сейчас играют на серверах проекта FEAR, с общим наигранным временем менее 10 часов. Список синхронизируется в реальном времени."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-2xl border border-border/80 bg-surface/90 px-4 py-2.5 text-right glass-panel shadow-sm">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted">
                  {activeSubTab === "suspicious" ? "Подозрительных в игре" : "Новорегов в игре"}
                </p>
                <p
                  className={cn(
                    "text-2xl font-black font-mono leading-none mt-0.5",
                    activeSubTab === "suspicious" ? "text-danger" : "text-accent",
                  )}
                >
                  <AnimatedNumber
                    value={activeSubTab === "suspicious" ? players.length : rawNewcomers.length}
                  />
                </p>
              </div>
            </div>
          </div>
        </div>
      </AnimatedBlock>

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
                  return (
                    <li
                      key={p.steamid}
                      className="flex flex-col gap-3.5 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between sm:px-6 transition-colors hover:bg-elevated/40"
                    >
                      {/* Left: Avatar + Details */}
                      <div className="flex min-w-0 flex-1 items-center gap-3.5">
                        <div className="relative shrink-0">
                          {p.avatar ? (
                            <img
                              src={p.avatar}
                              alt=""
                              className="size-11 shrink-0 rounded-2xl object-cover border-2 border-border/80 shadow-md"
                            />
                          ) : (
                            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-surface to-elevated text-sm font-black text-fg border-2 border-border/80 shadow-md">
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

                            <Badge tone={SOURCE_BADGES[p.source ?? "online"].tone} className="font-bold text-[10px] px-2 py-0.5">
                              {SOURCE_BADGES[p.source ?? "online"].label}
                            </Badge>

                            {p.reason ? (
                              <Badge tone="danger" className="font-bold text-[10px] px-2 py-0.5 flex items-center gap-1">
                                <MessageSquareWarning className="size-3 shrink-0" />
                                <span>{p.reason}</span>
                              </Badge>
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
                              <span className="text-muted inline-flex items-center gap-1">
                                <span className="text-subtle/50">&middot;</span>
                                <span className="text-fg/80">{p.server}</span>
                              </span>
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
                          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-elevated/60 px-2.5 py-1 text-xs shrink-0">
                            <span className="font-black text-danger font-mono">KD {p.kd.toFixed(2)}</span>
                            <span className="text-muted flex items-center gap-1">
                              <Timer className="size-3 shrink-0" />
                              {fmtPlaytime(p.playtime)}
                            </span>
                            <span className="font-mono text-subtle">
                              ({p.kills}/{p.deaths})
                            </span>
                          </div>
                        ) : null}

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
                <select
                  value={newcomersSort}
                  onChange={(e) => setNewcomersSort(e.target.value as NewcomersSort)}
                  className="h-9.5 rounded-xl border border-border/80 bg-elevated/80 px-3 text-xs font-bold text-fg focus:outline-none focus:border-accent transition-all"
                >
                  <option value="time_asc">Меньше времени (сначала новые)</option>
                  <option value="time_desc">Больше времени (&lt; 10ч)</option>
                  <option value="kd_desc">По K/D (выше)</option>
                  <option value="kills_desc">По убийствам</option>
                </select>
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
                    return (
                      <li
                        key={p.steamid}
                        className="flex flex-col gap-3.5 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between sm:px-6 transition-colors hover:bg-elevated/40"
                      >
                        {/* Left: Avatar & Player Info */}
                        <div className="flex min-w-0 flex-1 items-center gap-3.5">
                          <div className="relative shrink-0">
                            {p.avatar ? (
                              <img
                                src={p.avatar}
                                alt=""
                                className="size-11 shrink-0 rounded-2xl object-cover border-2 border-border/80 shadow-md"
                              />
                            ) : (
                              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-surface to-elevated text-sm font-black text-fg border-2 border-border/80 shadow-md">
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
                                <span className="text-muted inline-flex items-center gap-1">
                                  <span className="text-subtle/50">&middot;</span>
                                  <span className="text-fg/80">{p.server}</span>
                                </span>
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
                          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-elevated/60 px-2.5 py-1 text-xs shrink-0">
                            <span
                              className={cn(
                                "font-black font-mono",
                                p.kd >= 2 ? "text-danger" : p.kd >= 1 ? "text-fg" : "text-subtle",
                              )}
                            >
                              KD {p.kd.toFixed(2)}
                            </span>
                            <span className="font-mono text-subtle">
                              ({p.kills}/{p.deaths})
                            </span>
                          </div>

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

      {/* ── Footer Info ─────────────────────────────────────────────── */}
      <AnimatedBlock delay={150}>
        <p className="flex items-start gap-2 text-xs text-subtle px-1">
          <TicketCheck className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>
            {activeSubTab === "suspicious"
              ? "KD и игровое время вычисляются по данным профиля FearProject. Администрация и модераторы серверов исключены из проверки."
              : "Данные об онлайне и времени игры получаются напрямую с серверов fearproject.ru. В списке отображаются только игроки с общим наигранным временем менее 10 часов."}
          </span>
        </p>
      </AnimatedBlock>
    </div>
  );
}
