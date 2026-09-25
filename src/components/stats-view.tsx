import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpDown,
  ChevronRight,
  Clock3,
  Download,
  Filter,
  Gamepad2,
  Hammer,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Unlock,
  Users,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeratorsChart } from "@/components/stats-chart";
import { DailyChart } from "@/components/daily-chart";
import { downloadCsv } from "@/lib/csv";
import { CardsSkeleton, PageHeaderSkeleton, Skeleton } from "@/components/skeletons";
import { getStatsFn, moderatorOnlineFn } from "@/lib/fn";
import { RANK_SHORT, fearProfileUrl } from "@/lib/constants";
import type { StatsPayload } from "@/lib/types";
import { cn } from "@/lib/utils";

type OnlineInfo = { server: string; nickname: string; map: string | null };

function fmtMsk(sec: number) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(sec * 1000));
}

function fmtDay(sec: number) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(sec * 1000));
}

function MetricTile({
  value,
  label,
  sub,
  className,
  valueClassName,
}: {
  value: number | string;
  label: string;
  sub?: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border px-3 py-3 text-center", className)}>
      <p className={cn("text-2xl font-bold tabular-nums leading-none", valueClassName)}>{value}</p>
      <p className="mt-1.5 text-xs font-medium leading-tight text-muted">{label}</p>
      {sub ? <p className="mt-1 text-[11px] leading-tight text-subtle">{sub}</p> : null}
    </div>
  );
}

function getRankBadgeProps(rank: number | null) {
  if (rank === 3) {
    return {
      label: RANK_SHORT[3] ?? "СТ. МОД",
      className: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    };
  }
  if (rank === 2) {
    return {
      label: RANK_SHORT[2] ?? "МОД",
      className: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    };
  }
  if (rank === 1) {
    return {
      label: RANK_SHORT[1] ?? "МЛ. МОД",
      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    };
  }
  return {
    label: (rank && RANK_SHORT[rank]) || "СТАФФ",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
}

function ModeratorCard({
  m,
  info,
}: {
  m: StatsPayload["moderators"][number];
  info?: OnlineInfo;
}) {
  const handle = m.discord && m.discord !== m.name ? m.discord : m.name;
  const initial = (handle.trim().charAt(0) || "?").toUpperCase();
  const monthTarget = m.norma?.month ?? null;
  const monthDone = monthTarget != null && monthTarget > 0 && m.total >= monthTarget;
  const progressPercent = monthTarget ? Math.min(Math.round((m.total / monthTarget) * 100), 100) : 0;
  const actualRatio = monthTarget ? Math.round((m.total / monthTarget) * 100) : null;
  const rankProps = m.rank ? getRankBadgeProps(m.rank) : null;

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border/80 bg-surface/90 glass-panel p-5 shadow-lg transition-all hover:scale-[1.015] hover:border-accent/50 hover:shadow-2xl hover:shadow-accent/10">
      {/* Subtle top ambient glow */}
      {monthDone ? (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 size-36 rounded-full bg-accent/15 blur-2xl pointer-events-none" />
      ) : null}

      {/* Top Header of Card */}
      <div className="relative z-10 flex items-center gap-3.5">
        <div className="relative">
          {m.avatar ? (
            <img
              src={m.avatar}
              alt=""
              loading="lazy"
              className="size-12 shrink-0 rounded-2xl object-cover border-2 border-border/80 ring-2 ring-transparent group-hover:ring-accent/40 transition-all shadow-md"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-surface to-elevated text-base font-black text-fg border-2 border-border/80 shadow-md"
            >
              {initial}
            </span>
          )}
          {info ? (
            <span className="absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-surface bg-success shadow-[0_0_8px_var(--color-success)] z-10" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <a
              href={fearProfileUrl(m.steamid)}
              target="_blank"
              rel="noreferrer"
              className="truncate text-base font-extrabold text-fg hover:text-accent transition-colors"
            >
              {handle}
            </a>
            {rankProps ? (
              <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-black uppercase border", rankProps.className)}>
                {rankProps.label}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-subtle flex items-center gap-1.5">
            <span className="truncate">{m.steamid}</span>
          </p>
          {info ? (
            <div className="mt-1 flex items-center gap-1 rounded-md border border-success/20 bg-success/10 px-2 py-0.5 text-[10px] font-mono text-success truncate max-w-[200px]">
              <Gamepad2 className="size-3 shrink-0 animate-pulse" />
              <span className="truncate">{info.server}</span>
            </div>
          ) : null}
        </div>

        <PresenceBadge info={info} lastOnline={m.lastOnline} />
      </div>

      {/* 4 Cyber Stat Chips */}
      <div className="relative z-10 mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Баны */}
        <div className="rounded-2xl border border-danger/25 bg-danger/10 p-3 text-center transition-all hover:bg-danger/15">
          <p className="text-2xl font-black tabular-nums text-danger">{m.bans ?? 0}</p>
          <p className="mt-1 text-[11px] font-medium text-danger/80 flex items-center justify-center gap-1">
            <Hammer className="size-3" /> Баны
          </p>
        </div>

        {/* Муты */}
        <div className="rounded-2xl border border-warn/25 bg-warn/10 p-3 text-center transition-all hover:bg-warn/15">
          <p className="text-2xl font-black tabular-nums text-warn">{m.mutes ?? 0}</p>
          <p className="mt-1 text-[11px] font-medium text-warn/80 flex items-center justify-center gap-1">
            <VolumeX className="size-3" /> Муты
          </p>
        </div>

        {/* Всего за месяц */}
        <div className="rounded-2xl border border-accent/30 bg-accent/15 p-3 text-center shadow-inner transition-all hover:bg-accent/20">
          <p className="text-2xl font-black tabular-nums text-accent">{m.total}</p>
          <p className="mt-1 text-[11px] font-semibold text-accent/90">Всего мес.</p>
        </div>

        {/* Снято */}
        <div className="rounded-2xl border border-success/25 bg-success/10 p-3 text-center transition-all hover:bg-success/15">
          <p className="text-2xl font-black tabular-nums text-success">{m.removed ?? 0}</p>
          <p className="mt-1 text-[11px] font-medium text-success/80 flex items-center justify-center gap-1">
            <Unlock className="size-3" /> Снято
          </p>
        </div>
      </div>

      {/* High-Tech Norma Progress Bar */}
      <div className="relative z-10 mt-3.5 rounded-2xl border border-border/70 bg-elevated/50 p-3.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            Норма месяца
          </span>
          <span className="font-mono tabular-nums text-xs">
            <span className={cn("font-extrabold", monthDone ? "text-success" : "text-fg")}>
              {m.total}
            </span>{" "}
            <span className="text-subtle">/ {monthTarget ?? "—"}</span>
            {actualRatio != null ? (
              <span className={cn("ml-1.5 font-bold", monthDone ? "text-success" : "text-subtle")}>
                ({actualRatio}%)
              </span>
            ) : null}
          </span>
        </div>

        {/* Track */}
        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-surface border border-border/50">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              monthDone
                ? "bg-gradient-to-r from-accent to-success shadow-[0_0_8px_var(--color-success)]"
                : "bg-accent/70",
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Records & History info */}
      {m.prevTotal != null || m.best ? (
        <div className="relative z-10 mt-2.5 flex items-center justify-between px-1 text-[11px] text-subtle">
          <span>{m.prevTotal != null ? `Прошлый: ${m.prevTotal}` : ""}</span>
          <span>{m.best ? `Рекорд: ${m.best.total} (${m.best.month})` : ""}</span>
        </div>
      ) : null}

      {/* Button to Details */}
      {m.slug ? (
        <Link
          to="/$slug"
          params={{ slug: m.slug }}
          className="relative z-10 mt-3 inline-flex h-9.5 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-elevated/70 text-xs font-bold text-muted transition-all hover:border-accent/40 hover:bg-accent hover:text-accent-fg shadow-sm active:scale-98"
        >
          Подробная статистика
          <ChevronRight className="size-3.5" />
        </Link>
      ) : null}
    </article>
  );
}

export function StatsView() {
  const [data, setData] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState<Record<string, OnlineInfo>>({});

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [rankFilter, setRankFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"total" | "bans" | "mutes" | "norma">("total");

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const next = await getStatsFn({ data: { refresh } });
      setData(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить статистику");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Live online status check
  useEffect(() => {
    let alive = true;
    async function pull(ids: string[]) {
      if (!ids.length) return;
      try {
        const res = await moderatorOnlineFn({ data: { ids } });
        if (alive) setOnline(res);
      } catch {
        /* тихо */
      }
    }
    if (data?.moderators?.length) {
      const ids = data.moderators.map((m) => m.steamid);
      void pull(ids);
      const t = setInterval(() => void pull(ids), 60_000);
      return () => {
        alive = false;
        clearInterval(t);
      };
    }
    return () => {
      alive = false;
    };
  }, [data?.moderators]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await load(false);
      if (!cancelled) await load(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => void load(true), 5 * 60_000);
    return () => clearInterval(t);
  }, []);

  // Filtered and sorted moderators
  const filteredMods = useMemo(() => {
    if (!data?.moderators) return [];
    let list = [...data.moderators];

    // Search query
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.steamid.includes(q) ||
          (m.discord || "").toLowerCase().includes(q),
      );
    }

    // Rank filter
    if (rankFilter !== "all") {
      const r = Number(rankFilter);
      list = list.filter((m) => m.rank === r);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === "bans") return (b.bans ?? 0) - (a.bans ?? 0);
      if (sortBy === "mutes") return (b.mutes ?? 0) - (a.mutes ?? 0);
      if (sortBy === "norma") {
        const aNorma = a.norma?.month ? a.total / a.norma.month : 0;
        const bNorma = b.norma?.month ? b.total / b.norma.month : 0;
        return bNorma - aNorma;
      }
      return b.total - a.total;
    });

    return list;
  }, [data?.moderators, search, rankFilter, sortBy]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-8 space-y-6">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
        <CardsSkeleton count={6} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-danger font-medium">{error}</p>
        <Button className="mt-4 rounded-xl" onClick={() => void load(true)}>
          Повторить попытку
        </Button>
      </div>
    );
  }

  if (!data) return null;
  const payload = data;
  const prevTotals = data.prevTotals ?? null;

  const kpis = [
    {
      key: "total",
      label: "Всего действий",
      value: data.totals.total,
      icon: Sparkles,
      color: "from-accent/20 to-accent/5",
      border: "border-accent/30",
      accent: "text-accent",
      badge: "Все серверы",
    },
    {
      key: "bans",
      label: "Банов выдано",
      value: data.totals.bans,
      icon: Hammer,
      color: "from-danger/20 to-danger/5",
      border: "border-danger/30",
      accent: "text-danger",
      badge: `${data.totals.total ? Math.round((data.totals.bans / data.totals.total) * 100) : 0}% от общего`,
    },
    {
      key: "mutes",
      label: "Мутов выдано",
      value: data.totals.mutes,
      icon: VolumeX,
      color: "from-warn/20 to-warn/5",
      border: "border-warn/30",
      accent: "text-warn",
      badge: `${data.totals.total ? Math.round((data.totals.mutes / data.totals.total) * 100) : 0}% от общего`,
    },
    {
      key: "removed",
      label: "Снято наказаний",
      value: data.totals.removed,
      icon: Unlock,
      color: "from-success/20 to-success/5",
      border: "border-success/30",
      accent: "text-success",
      badge: "Разбаны / размуты",
    },
  ] as const;

  function exportCsv() {
    downloadCsv(`stats-${payload.month}.csv`, [
      ["Ник", "SteamID", "Ранг", "Баны", "Муты", "Всего", "Снято", "Норма месяц", "Прошлый месяц", "Лучший месяц", "Лучший итог"],
      ...payload.moderators.map((m) => [
        m.name,
        m.steamid,
        m.rank ?? "",
        m.bans ?? "",
        m.mutes ?? "",
        m.total,
        m.removed,
        m.norma?.month ?? "",
        m.prevTotal ?? "",
        m.best?.month ?? "",
        m.best?.total ?? "",
      ]),
    ]);
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-8 sm:py-8 space-y-6">
      {/* ── Top Header Banner ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              FearProject CS2
            </span>
            <span className="text-xs text-muted font-mono">
              {data.month} {data.stale ? "· (кэш)" : ""}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-fg sm:text-3xl">
            Статистика наказаний
          </h1>
          <p className="mt-1 text-xs text-muted">
            Данные синхронизированы {fmtMsk(data.updatedAt)} МСК · Статистика за {fmtDay(data.updatedAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            className="rounded-xl border-border/80 bg-elevated/70 text-xs font-semibold shadow-sm transition-all hover:bg-elevated hover:border-accent/40"
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Обновить
          </Button>
          <Button
            variant="secondary"
            className="rounded-xl border-border/80 bg-elevated/70 text-xs font-semibold shadow-sm transition-all hover:bg-elevated hover:border-accent/40"
            onClick={exportCsv}
            title="Экспорт в CSV файл"
          >
            <Download className="size-3.5" />
            Экспорт CSV
          </Button>
        </div>
      </div>

      {/* ── 4 High-Tech KPI Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {kpis.map((c) => {
          const prev = prevTotals ? prevTotals[c.key as keyof typeof prevTotals] : null;
          const delta = typeof prev === "number" ? Number(c.value) - prev : null;
          const Icon = c.icon;

          return (
            <div
              key={c.label}
              className={cn(
                "group relative overflow-hidden rounded-3xl border bg-gradient-to-br p-5 shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl",
                c.color,
                c.border,
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted">{c.label}</span>
                <span className="grid size-9 place-items-center rounded-xl border border-border/60 bg-elevated/70 text-fg shadow-sm transition-transform group-hover:scale-110">
                  <Icon className={cn("size-4.5", c.accent)} />
                </span>
              </div>

              <p className="mt-3 text-3xl font-black tabular-nums tracking-tight text-fg lg:text-4xl">
                {c.value}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {delta != null ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                      delta > 0
                        ? "bg-success/20 text-success border border-success/30"
                        : delta < 0
                          ? "bg-danger/20 text-danger border border-danger/30"
                          : "bg-elevated text-muted border border-border",
                    )}
                  >
                    {delta > 0 ? <TrendingUp className="size-3" /> : delta < 0 ? <TrendingDown className="size-3" /> : null}
                    {delta > 0 ? `+${delta}` : delta < 0 ? `−${Math.abs(delta)}` : "±0"}
                  </span>
                ) : null}
                <span className="text-[11px] text-muted">{c.badge}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Daily Punishment Chart ──────────────────────────────────── */}
      <DailyChart />

      {/* ── Top-10 Moderators Chart ─────────────────────────────────── */}
      <ModeratorsChart mods={data.moderators} />

      {/* ── Moderators Section Toolbar & Grid ────────────────────────── */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <Users className="size-5 text-accent" />
            <div>
              <h2 className="text-base font-bold text-fg">Список модераторов</h2>
              <p className="text-xs text-muted">
                Показано {filteredMods.length} из {data.moderators.length} сотрудников
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[14rem] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск ника или SteamID..."
                className="h-9 w-full rounded-xl border border-border/80 bg-surface/90 pl-8.5 pr-8 text-xs text-fg placeholder:text-subtle transition-all focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle hover:text-fg"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>

            {/* Rank Filter */}
            <div className="flex items-center rounded-xl border border-border/80 bg-surface/90 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setRankFilter("all")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-medium transition-all",
                  rankFilter === "all" ? "bg-accent/20 text-accent font-bold" : "text-muted hover:text-fg",
                )}
              >
                Все
              </button>
              <button
                type="button"
                onClick={() => setRankFilter("2")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-medium transition-all",
                  rankFilter === "2" ? "bg-accent/20 text-accent font-bold" : "text-muted hover:text-fg",
                )}
              >
                Мод
              </button>
              <button
                type="button"
                onClick={() => setRankFilter("1")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-medium transition-all",
                  rankFilter === "1" ? "bg-accent/20 text-accent font-bold" : "text-muted hover:text-fg",
                )}
              >
                Мл. Мод
              </button>
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center rounded-xl border border-border/80 bg-surface/90 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setSortBy("total")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-medium transition-all",
                  sortBy === "total" ? "bg-accent/20 text-accent font-bold" : "text-muted hover:text-fg",
                )}
              >
                Всего
              </button>
              <button
                type="button"
                onClick={() => setSortBy("bans")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-medium transition-all",
                  sortBy === "bans" ? "bg-accent/20 text-accent font-bold" : "text-muted hover:text-fg",
                )}
              >
                Баны
              </button>
              <button
                type="button"
                onClick={() => setSortBy("mutes")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-medium transition-all",
                  sortBy === "mutes" ? "bg-accent/20 text-accent font-bold" : "text-muted hover:text-fg",
                )}
              >
                Муты
              </button>
              <button
                type="button"
                onClick={() => setSortBy("norma")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-medium transition-all",
                  sortBy === "norma" ? "bg-accent/20 text-accent font-bold" : "text-muted hover:text-fg",
                )}
              >
                Норма
              </button>
            </div>
          </div>
        </div>

        {/* ── Cards Grid (ModeratorCard preserved untouched) ───────── */}
        {filteredMods.length === 0 ? (
          <div className="rounded-3xl border border-border/80 bg-surface/90 glass-panel px-6 py-16 text-center">
            <Users className="mx-auto size-10 text-subtle mb-3" />
            <p className="text-sm font-semibold text-fg">Модераторы не найдены</p>
            <p className="mt-1 text-xs text-muted">Попробуйте изменить поисковый запрос или фильтр</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredMods.map((m) => (
              <ModeratorCard
                key={m.steamid}
                m={m}
                info={online[m.steamid]}
              />
            ))}
          </div>
        )}

        {/* ── Monthly Summary Footer ───────────────────────────────── */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-border/80 bg-surface/90 glass-panel shadow-sm">
          <div className="border-b border-border/60 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-subtle">Общие итоги за месяц</p>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {kpis.map((t) => (
                <div key={t.label} className="rounded-2xl border border-border/50 bg-elevated/40 p-3.5">
                  <dt className="text-xs text-subtle">{t.label}</dt>
                  <dd className={cn("mt-1 text-2xl font-black tabular-nums", t.accent)}>{t.value}</dd>
                </div>
              ))}
            </dl>
            {data.totals.excluded ? (
              <p className="mt-3 text-xs text-subtle">
                Исключено (тикет / поддержка): <span className="font-semibold text-fg">{data.totals.excluded}</span>
              </p>
            ) : null}
          </div>
          <p className="px-6 py-3.5 text-center text-xs text-subtle">
            Статистика взята с официального портала FearProject.ru · Обновлено {fmtMsk(data.updatedAt)} МСК
          </p>
        </div>
      </section>
    </div>
  );
}

function PresenceBadge({
  info,
  lastOnline,
}: {
  info?: OnlineInfo;
  lastOnline: StatsPayload["moderators"][number]["lastOnline"];
}) {
  if (info) {
    return (
      <span className="ml-auto mr-2 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success shadow-sm">
        <Gamepad2 className="size-3.5 animate-pulse" />
        <span className="max-w-44 truncate" title={info.map ? `${info.server} · ${info.map}` : info.server}>
          {info.server}
        </span>
      </span>
    );
  }
  if (!lastOnline?.ts) return null;
  const d = new Date(lastOnline.ts * 1000);
  const time = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  const date = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
  }).format(d);
  return (
    <span
      className="ml-auto mr-2 inline-flex max-w-[11rem] shrink-0 items-center gap-1.5 truncate rounded-full border border-border bg-elevated px-2.5 py-0.5 text-xs font-medium text-muted"
      title={`${date} ${time} МСК`}
    >
      <Clock3 className="size-3.5 shrink-0 text-subtle" />
      <span className="truncate">
        {date} {time}
      </span>
    </span>
  );
}
