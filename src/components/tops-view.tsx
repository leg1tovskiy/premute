import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  ExternalLink,
  Flame,
  Gamepad2,
  Hammer,
  HelpCircle,
  History,
  Info,
  Loader2,
  Medal,
  Percent,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Unlock,
  Users,
  VolumeX,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeaderSkeleton, RowsSkeleton, Skeleton } from "@/components/skeletons";
import { getStatsFn, moderatorOnlineFn } from "@/lib/fn";
import { RANK_SHORT, fearProfileUrl } from "@/lib/constants";
import type { ModRow, StatsPayload } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TOP_RANKS = new Set([1, 2]);

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

function rankOf(m: ModRow) {
  return Number(m.rank ?? 0);
}

function getMonthProgress() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const currentDay = now.getDate();
  const remainingDays = Math.max(0, totalDays - currentDay);
  const percent = Math.min(100, Math.round((currentDay / totalDays) * 100));
  return { currentDay, totalDays, remainingDays, percent };
}

function ModAvatar({
  avatar,
  name,
  size = "md",
  className,
  avatarClassName,
  info,
}: {
  avatar?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  avatarClassName?: string;
  info?: OnlineInfo;
}) {
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  const sizeClasses = {
    sm: "size-9 text-xs",
    md: "size-12 text-sm",
    lg: "size-16 text-lg",
    xl: "size-24 text-3xl",
  }[size];

  const rounding = size === "xl" ? "rounded-3xl" : size === "lg" ? "rounded-2xl" : "rounded-xl";

  return (
    <div className={cn("relative inline-block shrink-0", rounding, className)}>
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          loading="lazy"
          className={cn(
            sizeClasses,
            rounding,
            "object-cover shadow-md transition-all block",
            avatarClassName,
          )}
        />
      ) : (
        <span
          className={cn(
            sizeClasses,
            rounding,
            "grid place-items-center font-black shadow-md bg-gradient-to-tr from-surface to-elevated text-fg border border-border/80",
            avatarClassName,
          )}
        >
          {initial}
        </span>
      )}
      {info ? (
        <span
          title={`В игре: ${info.server}${info.map ? ` (${info.map})` : ""}`}
          className={cn(
            "absolute -bottom-1 -right-1 rounded-full border-2 border-surface bg-success shadow-[0_0_8px_var(--color-success)] z-10",
            size === "xl" ? "size-5" : size === "lg" ? "size-4" : "size-3",
          )}
        />
      ) : null}
    </div>
  );
}

export function TopsView() {
  const [data, setData] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState<Record<string, OnlineInfo>>({});
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "eligible">("eligible");
  const [chartMounted, setChartMounted] = useState(false);

  useEffect(() => {
    setChartMounted(true);
  }, []);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const next = await getStatsFn({ data: { refresh } });
      setData(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить топ");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Live online status
  useEffect(() => {
    let alive = true;
    async function pull(ids: string[]) {
      if (!ids.length) return;
      try {
        const res = await moderatorOnlineFn({ data: { ids } });
        if (alive) setOnline(res);
      } catch {
        /* ignore */
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

  // Top 3 for podium
  const rows = useMemo(() => {
    if (!data) return [];
    return data.moderators
      .filter((m) => TOP_RANKS.has(rankOf(m)))
      .slice()
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "ru"))
      .slice(0, 3);
  }, [data]);

  // Overall competition stats
  const kpiStats = useMemo(() => {
    if (!data?.moderators) return null;
    const mods = data.moderators;
    const eligible = mods.filter((m) => TOP_RANKS.has(rankOf(m)));
    const totalActions = mods.reduce((acc, m) => acc + m.total, 0);
    const totalBans = mods.reduce((acc, m) => acc + (m.bans ?? 0), 0);
    const totalMutes = mods.reduce((acc, m) => acc + (m.mutes ?? 0), 0);
    const totalRemoved = mods.reduce((acc, m) => acc + (m.removed ?? 0), 0);
    const accuracy = totalActions > 0 ? (((totalActions - totalRemoved) / totalActions) * 100).toFixed(1) : "100";
    const avgActions = eligible.length > 0 ? Math.round(totalActions / eligible.length) : 0;
    const leaderLead = rows.length >= 2 ? rows[0].total - rows[1].total : 0;

    return {
      totalActions,
      totalBans,
      totalMutes,
      totalRemoved,
      accuracy,
      avgActions,
      eligibleCount: eligible.length,
      leaderLead,
    };
  }, [data?.moderators, rows]);

  // Monthly Nominations
  const nominations = useMemo(() => {
    if (!data?.moderators || data.moderators.length === 0) return null;
    const mods = data.moderators;

    // Most bans
    const topBan = [...mods].sort((a, b) => (b.bans ?? 0) - (a.bans ?? 0))[0];
    // Most mutes
    const topMute = [...mods].sort((a, b) => (b.mutes ?? 0) - (a.mutes ?? 0))[0];
    // Best Norma ratio
    const topNorma = [...mods]
      .filter((m) => m.norma?.month && m.norma.month > 0)
      .sort((a, b) => {
        const aR = a.total / (a.norma?.month || 1);
        const bR = b.total / (b.norma?.month || 1);
        return bR - aR;
      })[0];
    // Clean work (high total, low removed)
    const topClean = [...mods]
      .filter((m) => m.total >= 30)
      .sort((a, b) => {
        const aErr = (a.removed ?? 0) / (a.total || 1);
        const bErr = (b.removed ?? 0) / (b.total || 1);
        return aErr - bErr || b.total - a.total;
      })[0];

    return { topBan, topMute, topNorma, topClean };
  }, [data?.moderators]);

  // Full Leaderboard list (filtered and sorted)
  const fullLeaderboard = useMemo(() => {
    if (!data?.moderators) return [];
    let list = [...data.moderators];

    if (filterMode === "eligible") {
      list = list.filter((m) => TOP_RANKS.has(rankOf(m)));
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.steamid.includes(q) ||
          (m.discord || "").toLowerCase().includes(q),
      );
    }

    return list.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "ru"));
  }, [data?.moderators, filterMode, search]);

  // Chart data for top contenders comparison
  const topContendersChart = useMemo(() => {
    if (!rows.length) return [];
    return rows.map((m) => {
      const handle = m.discord && m.discord !== m.name ? m.discord : m.name;
      return {
        name: handle.length > 12 ? `${handle.slice(0, 11)}…` : handle,
        fullName: handle,
        Баны: m.bans ?? 0,
        Муты: m.mutes ?? 0,
        Снято: m.removed ?? 0,
        Всего: m.total,
      };
    });
  }, [rows]);

  const monthProgress = useMemo(() => getMonthProgress(), []);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-8 space-y-6">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-3xl" />
          ))}
        </div>
        <RowsSkeleton rows={4} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-danger font-bold text-lg">{error}</p>
        <Button className="mt-4 rounded-xl" onClick={() => void load(true)}>
          Повторить попытку
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const first = rows[0] ?? null;
  const second = rows[1] ?? null;
  const third = rows[2] ?? null;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-8 sm:py-8 space-y-8 animate-in fade-in duration-300">
      {/* ── Top Hero Banner ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-r from-surface via-surface/95 to-elevated/70 p-6 sm:p-8 shadow-2xl cyber-border-glow">
        <div className="absolute right-0 top-0 size-96 bg-gold/15 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 size-64 bg-accent/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 border border-gold/40 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-gold shadow-[0_0_15px_rgba(212,176,106,0.35)]">
                <Trophy className="size-3.5 text-gold animate-pulse" />
                ЗАЛ СЛАВЫ &middot; ТОП МЕСЯЦА
              </span>
              <span className="rounded-full bg-elevated/90 border border-border px-3 py-1 font-mono text-xs text-muted">
                {data.month}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-fg flex items-center gap-3">
              Рейтинг модераторов FEAR
            </h1>
            <p className="text-xs sm:text-sm text-muted max-w-2xl leading-relaxed">
              Официальный лидерборд состава модерации CS2 проекта FearProject. Соревнование за звание Чемпиона
              Месяца и признание игроков.
            </p>
          </div>

          {/* Season Progress & Refresh Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="rounded-2xl border border-border/70 bg-surface/80 p-4 shadow-sm min-w-[270px] sm:min-w-[290px]">
              <div className="flex items-center justify-between gap-4 text-xs font-semibold">
                <span className="text-muted flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  <Calendar className="size-3.5 text-accent" />
                  Сезонный цикл
                </span>
                <span className="text-accent font-mono font-bold shrink-0 whitespace-nowrap">
                  {monthProgress.remainingDays} дн. осталось
                </span>
              </div>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-elevated border border-border/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-gold transition-all duration-500 shadow-[0_0_8px_rgba(212,176,106,0.4)]"
                  style={{ width: `${monthProgress.percent}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-subtle text-right font-mono">
                День {monthProgress.currentDay} из {monthProgress.totalDays} ({monthProgress.percent}%)
              </p>
            </div>

            <Button
              variant="secondary"
              className="h-12 rounded-2xl border-border/80 bg-elevated/80 px-5 text-xs font-bold text-fg shadow-md transition-all hover:bg-elevated hover:border-gold/50 hover:shadow-gold/10"
              onClick={() => void load(true)}
              disabled={refreshing}
            >
              {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4 text-gold" />}
              Обновить
            </Button>
          </div>
        </div>
      </div>

      {/* ── Key Metrics Ribbon (4 Cards) ───────────────────────────── */}
      {kpiStats ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {/* Card 1: Leader Lead */}
          <div className="rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/15 to-surface/90 glass-panel p-4.5 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gold">Лидер гонки</span>
              <Crown className="size-4 text-gold" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-fg truncate">
              {first ? first.name : "—"}
            </p>
            <p className="mt-1 text-xs text-muted">
              {kpiStats.leaderLead > 0 ? (
                <span className="font-bold text-gold">+{kpiStats.leaderLead}</span>
              ) : (
                "0"
              )}{" "}
              отрыв от 2 места
            </p>
          </div>

          {/* Card 2: Total Actions */}
          <div className="rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/10 to-surface/90 glass-panel p-4.5 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent">Импакт состава</span>
              <Zap className="size-4 text-accent" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-accent tabular-nums">
              {kpiStats.totalActions}
            </p>
            <p className="mt-1 text-xs text-muted flex items-center gap-1.5">
              <span>{kpiStats.totalBans} банов</span> &middot; <span>{kpiStats.totalMutes} мутов</span>
            </p>
          </div>

          {/* Card 3: Average Activity */}
          <div className="rounded-3xl border border-border/80 bg-surface/90 glass-panel p-4.5 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Средний темп</span>
              <Target className="size-4 text-muted" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-fg tabular-nums">
              {kpiStats.avgActions}
            </p>
            <p className="mt-1 text-xs text-muted">наказаний на модератора</p>
          </div>

          {/* Card 4: Quality & Accuracy */}
          <div className="rounded-3xl border border-success/30 bg-gradient-to-br from-success/10 to-surface/90 glass-panel p-4.5 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-success">Точность решений</span>
              <ShieldCheck className="size-4 text-success" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-success tabular-nums">
              {kpiStats.accuracy}%
            </p>
            <p className="mt-1 text-xs text-muted">
              {kpiStats.totalRemoved} снятых из {kpiStats.totalActions}
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Last Month Champion Banner ─────────────────────────────── */}
      {data.isMonthFirst && data.lastMonthTop ? (
        <div className="relative overflow-hidden rounded-3xl border border-gold/60 bg-gradient-to-r from-gold/20 via-surface/95 to-gold/10 p-5 sm:p-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="grid size-14 place-items-center rounded-2xl bg-gold/20 border border-gold/40 text-gold shadow-lg shadow-gold/20">
              <Crown className="size-7 animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-gold">
                🏆 Победитель прошлого месяца
              </p>
              <p className="mt-1 text-lg font-black text-fg sm:text-xl">
                {data.lastMonthTop.steamid ? (
                  <a
                    href={fearProfileUrl(data.lastMonthTop.steamid)}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline hover:text-gold transition-colors"
                  >
                    {data.lastMonthTop.name}
                  </a>
                ) : (
                  data.lastMonthTop.name
                )}
                <span className="ml-2 text-xs font-semibold text-muted">
                  ({RANK_SHORT[Number(data.lastMonthTop.rank ?? 0)] ?? "мод"})
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Итоговое количество наказаний: <span className="font-bold text-fg">{data.lastMonthTop.total}</span>
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── 3D Esports Podium with Real Avatars ─────────────────────── */}
      {rows.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-end pt-4">
          {/* ── 2nd Place (Silver) ── */}
          {second ? (
            <div className="order-2 md:order-1 relative overflow-hidden rounded-3xl border border-silver/50 bg-gradient-to-b from-silver/15 via-surface/90 to-elevated/70 glass-panel p-6 text-center shadow-xl transition-all hover:scale-[1.02] hover:border-silver">
              <div className="relative mx-auto mb-4 inline-block">
                <ModAvatar
                  avatar={second.avatar}
                  name={second.name}
                  size="xl"
                  info={online[second.steamid]}
                  avatarClassName="border-3 border-silver ring-4 ring-silver/30 shadow-lg shadow-silver/15"
                />
                <span className="absolute -bottom-2 -right-2 grid size-8.5 place-items-center rounded-2xl bg-silver text-surface text-xs font-black shadow-lg shadow-silver/30 border border-white/40 z-10">
                  2
                </span>
              </div>

              <div className="inline-block rounded-full bg-silver/20 border border-silver/40 px-3 py-0.5 text-[11px] font-black text-silver">
                2 МЕСТО &middot; СЕРЕБРО
              </div>

              <h3 className="mt-3 text-xl font-bold text-fg truncate">
                <a
                  href={fearProfileUrl(second.steamid)}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline hover:text-silver transition-colors"
                >
                  {second.name}
                </a>
              </h3>
              <p className="text-xs text-muted font-mono mt-0.5">
                {second.steamid} &middot; {RANK_SHORT[rankOf(second)] ?? "мод"}
              </p>

              <div className="mt-4 rounded-2xl border border-border/60 bg-elevated/60 py-3.5 shadow-inner">
                <p className="text-3xl font-black tabular-nums text-silver">{second.total}</p>
                <p className="text-xs text-muted">наказаний за месяц</p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-bold border-t border-border/60 pt-3">
                <div className="text-center">
                  <p className="text-danger">{second.bans ?? 0}</p>
                  <p className="text-[10px] text-muted">Банов</p>
                </div>
                <div className="text-center">
                  <p className="text-warn">{second.mutes ?? 0}</p>
                  <p className="text-[10px] text-muted">Мутов</p>
                </div>
                <div className="text-center">
                  <p className="text-success">{second.removed ?? 0}</p>
                  <p className="text-[10px] text-muted">Снято</p>
                </div>
              </div>

              {second.slug ? (
                <Link
                  to="/$slug"
                  params={{ slug: second.slug }}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-elevated/70 py-2 text-xs font-bold text-muted hover:border-silver hover:text-silver transition-all"
                >
                  Детальная статистика
                  <ChevronRight className="size-3.5" />
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="order-2 md:order-1 rounded-3xl border border-border/40 p-8 text-center text-muted">
              Нет претендента на 2 место
            </div>
          )}

          {/* ── 1st Place (Gold Champion, Center & Taller) ── */}
          {first ? (
            <div className="order-1 md:order-2 relative overflow-hidden rounded-3xl border-2 border-gold bg-gradient-to-b from-gold/25 via-surface/95 to-elevated/80 glass-panel p-8 text-center shadow-2xl shadow-gold/20 transition-all hover:scale-[1.03] md:-translate-y-6">
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 size-48 bg-gold/25 blur-3xl pointer-events-none" />

              <div className="relative mx-auto mb-4 inline-block">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-gold animate-bounce z-10 pointer-events-none">
                  <Crown className="size-9 drop-shadow-[0_0_12px_rgba(212,176,106,0.9)]" />
                </div>
                <ModAvatar
                  avatar={first.avatar}
                  name={first.name}
                  size="xl"
                  info={online[first.steamid]}
                  avatarClassName="border-3 border-gold ring-4 ring-gold/40 shadow-xl shadow-gold/25"
                />
                <span className="absolute -bottom-2.5 -right-2.5 grid size-9 place-items-center rounded-2xl bg-gold text-surface text-sm font-black shadow-lg shadow-gold/40 border border-gold-light/40 z-10">
                  1
                </span>
              </div>

              <div className="inline-block rounded-full bg-gold/25 border border-gold/50 px-4 py-1 text-xs font-black text-gold shadow-[0_0_15px_rgba(212,176,106,0.4)]">
                🏆 ЧЕМПИОН МЕСЯЦА
              </div>

              <h3 className="mt-3.5 text-2xl font-black text-fg truncate">
                <a
                  href={fearProfileUrl(first.steamid)}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline hover:text-gold transition-colors"
                >
                  {first.name}
                </a>
              </h3>
              <p className="text-xs text-muted font-mono mt-0.5">
                {first.steamid} &middot; {RANK_SHORT[rankOf(first)] ?? "мод"}
              </p>

              <div className="mt-5 rounded-2xl border border-gold/40 bg-elevated/80 py-4 shadow-inner">
                <p className="text-4xl font-black tabular-nums text-gold">{first.total}</p>
                <p className="text-xs font-medium text-muted mt-0.5">всего наказаний за месяц</p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-bold border-t border-border/60 pt-3">
                <div className="text-center">
                  <p className="text-danger text-sm font-black">{first.bans ?? 0}</p>
                  <p className="text-[10px] text-muted">Банов</p>
                </div>
                <div className="text-center">
                  <p className="text-warn text-sm font-black">{first.mutes ?? 0}</p>
                  <p className="text-[10px] text-muted">Мутов</p>
                </div>
                <div className="text-center">
                  <p className="text-success text-sm font-black">{first.removed ?? 0}</p>
                  <p className="text-[10px] text-muted">Снято</p>
                </div>
              </div>

              {first.slug ? (
                <Link
                  to="/$slug"
                  params={{ slug: first.slug }}
                  className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-gold/50 bg-gold/15 py-2.5 text-xs font-black text-gold hover:bg-gold hover:text-surface transition-all shadow-md shadow-gold/20"
                >
                  Детальная статистика чемпиона
                  <ChevronRight className="size-3.5" />
                </Link>
              ) : null}
            </div>
          ) : null}

          {/* ── 3rd Place (Bronze) ── */}
          {third ? (
            <div className="order-3 relative overflow-hidden rounded-3xl border border-bronze/50 bg-gradient-to-b from-bronze/15 via-surface/90 to-elevated/70 glass-panel p-6 text-center shadow-xl transition-all hover:scale-[1.02] hover:border-bronze">
              <div className="relative mx-auto mb-4 inline-block">
                <ModAvatar
                  avatar={third.avatar}
                  name={third.name}
                  size="xl"
                  info={online[third.steamid]}
                  avatarClassName="border-3 border-bronze ring-4 ring-bronze/30 shadow-lg shadow-bronze/15"
                />
                <span className="absolute -bottom-2 -right-2 grid size-8.5 place-items-center rounded-2xl bg-bronze text-surface text-xs font-black shadow-lg shadow-bronze/30 border border-bronze-light/40 z-10">
                  3
                </span>
              </div>

              <div className="inline-block rounded-full bg-bronze/20 border border-bronze/40 px-3 py-0.5 text-[11px] font-black text-bronze">
                3 МЕСТО &middot; БРОНЗА
              </div>

              <h3 className="mt-3 text-xl font-bold text-fg truncate">
                <a
                  href={fearProfileUrl(third.steamid)}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline hover:text-bronze transition-colors"
                >
                  {third.name}
                </a>
              </h3>
              <p className="text-xs text-muted font-mono mt-0.5">
                {third.steamid} &middot; {RANK_SHORT[rankOf(third)] ?? "мод"}
              </p>

              <div className="mt-4 rounded-2xl border border-border/60 bg-elevated/60 py-3.5 shadow-inner">
                <p className="text-3xl font-black tabular-nums text-bronze">{third.total}</p>
                <p className="text-xs text-muted">наказаний за месяц</p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-bold border-t border-border/60 pt-3">
                <div className="text-center">
                  <p className="text-danger">{third.bans ?? 0}</p>
                  <p className="text-[10px] text-muted">Банов</p>
                </div>
                <div className="text-center">
                  <p className="text-warn">{third.mutes ?? 0}</p>
                  <p className="text-[10px] text-muted">Мутов</p>
                </div>
                <div className="text-center">
                  <p className="text-success">{third.removed ?? 0}</p>
                  <p className="text-[10px] text-muted">Снято</p>
                </div>
              </div>

              {third.slug ? (
                <Link
                  to="/$slug"
                  params={{ slug: third.slug }}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-elevated/70 py-2 text-xs font-bold text-muted hover:border-bronze hover:text-bronze transition-all"
                >
                  Детальная статистика
                  <ChevronRight className="size-3.5" />
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="order-3 rounded-3xl border border-border/40 p-8 text-center text-muted">
              Нет претендента на 3 место
            </div>
          )}
        </div>
      ) : null}

      {/* ── Contenders Comparison Chart ────────────────────────────── */}
      {topContendersChart.length > 0 ? (
        <section className="rounded-3xl border border-border/80 bg-surface/90 glass-panel p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted flex items-center gap-2">
                <Flame className="size-4 text-gold" />
                Сравнение активности лидеров пьедестала
              </h2>
              <p className="text-xs text-subtle mt-0.5">
                Распределение банов и мутов среди основных претендентов на победу в сезоне
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: "var(--color-chart-bans)" }} />
                Баны
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: "var(--color-chart-mutes)" }} />
                Муты
              </span>
            </div>
          </div>

          <div className="mt-5 h-64 w-full">
            {chartMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topContendersChart} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--color-muted)", fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--color-elevated)" }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const bans = payload.find((p) => p.dataKey === "Баны")?.value ?? 0;
                      const mutes = payload.find((p) => p.dataKey === "Муты")?.value ?? 0;
                      return (
                        <div className="rounded-xl border border-border bg-surface p-3 text-xs shadow-xl min-w-[140px]">
                          <p className="font-bold text-fg mb-1.5">{label}</p>
                          <p className="text-danger flex items-center justify-between">
                            <span>Баны:</span> <span className="font-black">{bans}</span>
                          </p>
                          <p className="text-warn flex items-center justify-between mt-0.5">
                            <span>Муты:</span> <span className="font-black">{mutes}</span>
                          </p>
                          <p className="border-t border-border mt-2 pt-1 font-bold text-fg flex items-center justify-between">
                            <span>Всего:</span> <span className="font-black text-accent">{Number(bans) + Number(mutes)}</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="Баны" fill="var(--color-chart-bans)" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  <Bar dataKey="Муты" fill="var(--color-chart-mutes)" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full rounded-2xl" />
            )}
          </div>
        </section>
      ) : null}

      {/* ── Monthly Nominations (4 Особые номинации месяца) ─────────── */}
      {nominations ? (
        <section className="space-y-3.5">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-subtle px-1 flex items-center gap-2">
            <Zap className="size-4 text-accent" />
            Особые номинации и достижения сезона
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Most bans */}
            {nominations.topBan ? (
              <div className="flex items-center gap-3.5 rounded-2xl border border-danger/30 bg-gradient-to-br from-danger/10 to-surface/90 glass-panel p-4 shadow-sm transition-all hover:scale-[1.01]">
                <ModAvatar
                  avatar={nominations.topBan.avatar}
                  name={nominations.topBan.name}
                  size="md"
                  info={online[nominations.topBan.steamid]}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-danger flex items-center gap-1">
                    <Hammer className="size-3.5" /> Гроза нарушителей
                  </p>
                  <p className="font-bold text-fg truncate text-sm mt-0.5">{nominations.topBan.name}</p>
                  <p className="text-xs text-muted">
                    <span className="font-black text-danger">{nominations.topBan.bans}</span> банов выдано
                  </p>
                </div>
              </div>
            ) : null}

            {/* Most mutes */}
            {nominations.topMute ? (
              <div className="flex items-center gap-3.5 rounded-2xl border border-warn/30 bg-gradient-to-br from-warn/10 to-surface/90 glass-panel p-4 shadow-sm transition-all hover:scale-[1.01]">
                <ModAvatar
                  avatar={nominations.topMute.avatar}
                  name={nominations.topMute.name}
                  size="md"
                  info={online[nominations.topMute.steamid]}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-warn flex items-center gap-1">
                    <VolumeX className="size-3.5" /> Страж порядка
                  </p>
                  <p className="font-bold text-fg truncate text-sm mt-0.5">{nominations.topMute.name}</p>
                  <p className="text-xs text-muted">
                    <span className="font-black text-warn">{nominations.topMute.mutes}</span> мутов выдано
                  </p>
                </div>
              </div>
            ) : null}

            {/* Top norma */}
            {nominations.topNorma ? (
              <div className="flex items-center gap-3.5 rounded-2xl border border-success/30 bg-gradient-to-br from-success/10 to-surface/90 glass-panel p-4 shadow-sm transition-all hover:scale-[1.01]">
                <ModAvatar
                  avatar={nominations.topNorma.avatar}
                  name={nominations.topNorma.name}
                  size="md"
                  info={online[nominations.topNorma.steamid]}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" /> Снайпер нормы
                  </p>
                  <p className="font-bold text-fg truncate text-sm mt-0.5">{nominations.topNorma.name}</p>
                  <p className="text-xs text-muted">
                    <span className="font-black text-success">
                      {Math.round((nominations.topNorma.total / (nominations.topNorma.norma?.month || 1)) * 100)}%
                    </span>{" "}
                    от нормы
                  </p>
                </div>
              </div>
            ) : null}

            {/* Clean work */}
            {nominations.topClean ? (
              <div className="flex items-center gap-3.5 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-surface/90 glass-panel p-4 shadow-sm transition-all hover:scale-[1.01]">
                <ModAvatar
                  avatar={nominations.topClean.avatar}
                  name={nominations.topClean.name}
                  size="md"
                  info={online[nominations.topClean.steamid]}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-accent flex items-center gap-1">
                    <ShieldCheck className="size-3.5" /> Чистая работа
                  </p>
                  <p className="font-bold text-fg truncate text-sm mt-0.5">{nominations.topClean.name}</p>
                  <p className="text-xs text-muted">
                    <span className="font-black text-accent">{nominations.topClean.removed ?? 0}</span> снятых из {nominations.topClean.total}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ── Full Leaderboard Table (Рейтинговая таблица состава) ────── */}
      <section className="rounded-3xl border border-border/80 bg-surface/90 glass-panel overflow-hidden shadow-sm">
        {/* Table Toolbar */}
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-border/60">
          <div className="flex items-center gap-3">
            <Users className="size-5 text-accent" />
            <div>
              <h2 className="text-base font-extrabold text-fg">Полная рейтинговая таблица соревнований</h2>
              <p className="text-xs text-muted">
                {fullLeaderboard.length} модераторов в активном зачёте
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Toggle */}
            <div className="flex rounded-xl border border-border/80 bg-elevated/60 p-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode("eligible")}
                className={cn(
                  "rounded-lg px-3 py-1 font-bold transition-all",
                  filterMode === "eligible" ? "bg-accent text-accent-fg shadow-sm" : "text-muted hover:text-fg",
                )}
              >
                Только топы
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={cn(
                  "rounded-lg px-3 py-1 font-bold transition-all",
                  filterMode === "all" ? "bg-accent text-accent-fg shadow-sm" : "text-muted hover:text-fg",
                )}
              >
                Весь состав
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по имени или SteamID..."
                className="h-8.5 rounded-xl border-border/80 bg-elevated/70 pl-8.5 text-xs text-fg focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="no-scrollbar overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-elevated/40 text-[11px] font-bold uppercase tracking-wider text-subtle">
                <th className="px-5 py-3.5 w-16">Ранг</th>
                <th className="px-5 py-3.5">Модератор</th>
                <th className="px-5 py-3.5">Должность</th>
                <th className="px-5 py-3.5">Норма мес.</th>
                <th className="px-5 py-3.5 text-center">Баны</th>
                <th className="px-5 py-3.5 text-center">Муты</th>
                <th className="px-5 py-3.5 text-center">Снято</th>
                <th className="px-5 py-3.5 text-right font-black">Всего</th>
                <th className="px-5 py-3.5 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {fullLeaderboard.map((m, idx) => {
                const isTop1 = idx === 0 && filterMode === "eligible";
                const isTop2 = idx === 1 && filterMode === "eligible";
                const isTop3 = idx === 2 && filterMode === "eligible";
                const monthTarget = m.norma?.month ?? null;
                const monthDone = monthTarget != null && monthTarget > 0 && m.total >= monthTarget;
                const progressPct = monthTarget ? Math.min(Math.round((m.total / monthTarget) * 100), 100) : 0;

                return (
                  <tr
                    key={m.steamid}
                    className={cn(
                      "transition-colors hover:bg-elevated/60",
                      isTop1 && "bg-gold/5",
                      isTop2 && "bg-silver/5",
                      isTop3 && "bg-bronze/5",
                    )}
                  >
                    <td className="px-5 py-3.5 font-bold">
                      {isTop1 ? (
                        <span className="grid size-6.5 place-items-center rounded-lg bg-gold text-surface font-black text-xs shadow-md shadow-gold/30">
                          1
                        </span>
                      ) : isTop2 ? (
                        <span className="grid size-6.5 place-items-center rounded-lg bg-silver text-surface font-black text-xs shadow-md">
                          2
                        </span>
                      ) : isTop3 ? (
                        <span className="grid size-6.5 place-items-center rounded-lg bg-bronze text-surface font-black text-xs shadow-md">
                          3
                        </span>
                      ) : (
                        <span className="text-muted font-mono pl-1">#{idx + 1}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <ModAvatar
                          avatar={m.avatar}
                          name={m.name}
                          size="sm"
                          info={online[m.steamid]}
                        />
                        <div>
                          <a
                            href={fearProfileUrl(m.steamid)}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-fg hover:underline hover:text-accent transition-colors block leading-tight"
                          >
                            {m.name}
                          </a>
                          <p className="text-[10px] text-subtle font-mono mt-0.5">{m.steamid}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      <span className="rounded-md bg-elevated px-2 py-0.5 text-[10px] font-bold text-muted border border-border/80">
                        {RANK_SHORT[rankOf(m)] ?? "мод"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="w-28 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className={cn(monthDone ? "text-success font-bold" : "text-muted")}>
                            {m.total}/{monthTarget ?? "—"}
                          </span>
                          {monthTarget ? <span className="text-subtle">{progressPct}%</span> : null}
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-elevated overflow-hidden border border-border/40">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              monthDone ? "bg-success" : "bg-accent/70",
                            )}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-danger tabular-nums">
                      {m.bans ?? 0}
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-warn tabular-nums">
                      {m.mutes ?? 0}
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-success tabular-nums">
                      {m.removed ?? 0}
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-sm text-fg tabular-nums">
                      {m.total}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {m.slug ? (
                        <Link
                          to="/$slug"
                          params={{ slug: m.slug }}
                          className="inline-flex items-center gap-1 rounded-xl border border-border bg-elevated px-2.5 py-1 text-[11px] font-bold text-muted hover:border-accent hover:text-accent-fg hover:bg-accent transition-all shadow-sm"
                        >
                          Детали
                          <ChevronRight className="size-3" />
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Hall of Fame Archive ────────────────────────────────────── */}
      {data.history && data.history.length ? (
        <section className="rounded-3xl border border-border/80 bg-surface/90 glass-panel overflow-hidden shadow-sm">
          <div className="flex items-center gap-2.5 px-6 py-4.5 border-b border-border/60">
            <History className="size-4.5 text-accent" />
            <div>
              <h2 className="text-sm font-extrabold text-fg uppercase tracking-wider">
                Зал чемпионов прошлых месяцев
              </h2>
              <p className="text-xs text-subtle">
                История победителей рейтинговых сезонов проекта FearProject
              </p>
            </div>
          </div>
          <div className="divide-y divide-border/60">
            {data.history.map((h) => (
              <div
                key={h.month}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-elevated/40"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="size-4 text-subtle" />
                  <span className="font-mono text-xs font-black text-accent">{h.month}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {h.top.map((t, idx) => (
                    <span
                      key={`${t.name}-${idx}`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-elevated/70 px-3 py-1.5 shadow-sm"
                    >
                      <span
                        className={cn(
                          "grid size-5 place-items-center rounded-lg text-[10px] font-black",
                          idx === 0
                            ? "bg-gold text-surface"
                            : idx === 1
                              ? "bg-silver text-surface"
                              : "bg-bronze text-surface",
                        )}
                      >
                        {idx + 1}
                      </span>
                      <span className="font-bold text-fg">{t.name}</span>
                      <span className="font-black text-accent tabular-nums">{t.total}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Tournament Rules & Information Callout ─────────────────── */}
      <div className="rounded-3xl border border-border/70 bg-elevated/40 p-5 sm:p-6 text-xs text-muted space-y-2">
        <div className="flex items-center gap-2 font-bold text-fg uppercase tracking-wider text-[11px]">
          <Info className="size-4 text-accent" />
          Регламент и правила ежемесячного рейтинга
        </div>
        <p className="leading-relaxed">
          &bull; В рейтинговом пьедестале участвуют только действующие Младшие модераторы и Модераторы проекта. Старшие
          модераторы, Администраторы и руководство проекта выполняют контрольную функцию и не претендуют на призовые места.
        </p>
        <p className="leading-relaxed">
          &bull; Подведение итогов сезона осуществляется в последний день календарного месяца в 23:59:59 по Московскому времени (МСК).
          Наказания, снятые по ошибке или пересмотру жалобы, вычитаются из зачёта.
        </p>
      </div>
    </div>
  );
}
