import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpDown,
  Clock,
  Compass,
  Copy,
  ExternalLink,
  Eye,
  Filter,
  Gamepad2,
  Loader2,
  Play,
  Radio,
  RefreshCw,
  Search,
  Server,
  Shield,
  Sparkles,
  Swords,
  Target,
  User,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getActivityFn } from "@/lib/fn";
import { RANK_SHORT, fearProfileUrl } from "@/lib/constants";
import type { ActivityPayload, OnlineModerator } from "@/lib/types";
import { AnimatedBlock, AnimatedNumber } from "@/components/animated-number";
import { cn } from "@/lib/utils";

function fmtDuration(seconds: number): string {
  if (seconds < 60) return "< 1 мин.";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} мин.`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}ч ${remMins}м` : `${hours}ч`;
}

function getTeamBadge(team: "T" | "CT" | "Spec") {
  if (team === "T") {
    return {
      label: "Террористы",
      short: "T",
      className: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      pillClass: "bg-rose-500/20 text-rose-300 border-rose-500/40",
      ambientGlow: "bg-rose-500/15",
      accentBorder: "group-hover:border-rose-500/50",
      dot: "bg-rose-500",
    };
  }
  if (team === "CT") {
    return {
      label: "Спецназ",
      short: "CT",
      className: "bg-sky-500/15 text-sky-400 border-sky-500/30",
      pillClass: "bg-sky-500/20 text-sky-300 border-sky-500/40",
      ambientGlow: "bg-sky-500/15",
      accentBorder: "group-hover:border-sky-500/50",
      dot: "bg-sky-500",
    };
  }
  return {
    label: "Наблюдатель",
    short: "Spec",
    className: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    pillClass: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    ambientGlow: "bg-purple-500/15",
    accentBorder: "group-hover:border-purple-500/50",
    dot: "bg-purple-500",
  };
}

function getRankBadgeProps(rank: number | null, adminRole?: string) {
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
  if (adminRole) {
    return {
      label: adminRole.toUpperCase(),
      className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    };
  }
  return {
    label: "СТАФФ",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
}

function getPingColor(ping: number) {
  if (ping <= 30) return "text-emerald-400";
  if (ping <= 70) return "text-amber-400";
  return "text-rose-400";
}

function copyText(text: string, label: string) {
  try {
    void navigator.clipboard.writeText(text);
    toast.success(`${label} скопирован!`);
  } catch {
    toast.error("Не удалось скопировать");
  }
}

function OnlineModCard({ m }: { m: OnlineModerator }) {
  const team = getTeamBadge(m.team);
  const rank = getRankBadgeProps(m.rank, m.adminRole);
  const handle = m.nickname || m.name || m.steamid;
  const initial = (handle.trim().charAt(0) || "?").toUpperCase();

  return (
    <article
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border/80 bg-surface/90 glass-panel p-5 shadow-lg transition-all hover:scale-[1.015] hover:shadow-2xl hover:shadow-accent/10",
        team.accentBorder,
      )}
    >
      {/* Top ambient glow based on team */}
      <div
        className={cn(
          "absolute -top-12 left-1/2 -translate-x-1/2 size-40 rounded-full blur-2xl pointer-events-none transition-opacity opacity-40 group-hover:opacity-75",
          team.ambientGlow,
        )}
      />

      {/* Header: Avatar, Name, Badges */}
      <div className="relative z-10 flex items-start gap-3.5">
        <div className="relative shrink-0">
          {m.avatar ? (
            <img
              src={m.avatar}
              alt=""
              loading="lazy"
              className="size-12 rounded-2xl object-cover border-2 border-border/80 ring-2 ring-transparent group-hover:ring-accent/40 transition-all shadow-md"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-12 place-items-center rounded-2xl bg-gradient-to-tr from-surface to-elevated text-base font-black text-fg border-2 border-border/80 shadow-md"
            >
              {initial}
            </span>
          )}
          {/* Live pulsing online dot */}
          <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex size-3 rounded-full border-2 border-surface bg-success shadow-[0_0_8px_var(--color-success)]" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-extrabold text-sm text-fg group-hover:text-accent transition-colors" title={handle}>
              {handle}
            </p>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {/* Rank / Role badge */}
            <span
              className={cn(
                "inline-flex items-center rounded-lg border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider",
                rank.className,
              )}
            >
              {rank.label}
            </span>

            {/* Team badge (T / CT / Spec) */}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider",
                team.className,
              )}
            >
              <span className={cn("size-1.5 rounded-full", team.dot)} />
              {team.short} &middot; {team.label}
            </span>
          </div>

          {/* SteamID */}
          <div className="mt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => copyText(m.steamid, `SteamID ${m.steamid}`)}
              className="inline-flex items-center gap-1 font-mono text-[11px] text-subtle hover:text-fg transition-colors"
              title="Скопировать SteamID64"
            >
              <span>{m.steamid}</span>
              <Copy className="size-3 text-muted" />
            </button>
            <a
              href={fearProfileUrl(m.steamid)}
              target="_blank"
              rel="noreferrer"
              className="text-subtle hover:text-accent transition-colors"
              title="Открыть профиль на FearProject"
            >
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Server & Map Block */}
      <div className="relative z-10 mt-4 rounded-2xl border border-border/70 bg-elevated/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface border border-border/60 text-accent">
              <Server className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-fg" title={m.server}>
                {m.server}
              </p>
              <p className="font-mono text-[10px] text-muted truncate">
                {m.serverAddr}
              </p>
            </div>
          </div>

          {m.map ? (
            <span className="shrink-0 rounded-lg border border-border/60 bg-surface px-2 py-1 font-mono text-[10px] font-semibold text-muted">
              {m.map}
            </span>
          ) : null}
        </div>

        {/* Quick Connect & Copy buttons */}
        <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-border/40">
          <a
            href={`steam://connect/${m.serverAddr}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent/15 border border-accent/30 px-2.5 py-1.5 text-[11px] font-bold text-accent transition-all hover:bg-accent hover:text-accent-fg active:scale-98 shadow-sm"
          >
            <Play className="size-3 fill-current" />
            Подключиться
          </a>
          <button
            type="button"
            onClick={() => copyText(m.serverAddr, "Адрес сервера")}
            className="inline-flex items-center gap-1 rounded-xl border border-border/70 bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-muted hover:text-fg hover:border-accent/40 transition-colors"
            title="Скопировать IP:Port сервера"
          >
            <Copy className="size-3" />
            IP
          </button>
        </div>
      </div>

      {/* Session Time & In-game Stats Grid */}
      <div className="relative z-10 mt-3 grid grid-cols-2 gap-2">
        {/* Время на сервере */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-elevated/40 p-2.5 text-center">
          <div className="flex items-center gap-1 text-[11px] font-medium text-muted">
            <Clock className="size-3 text-accent" />
            На сервере
          </div>
          <p className="mt-1 font-mono text-base font-extrabold tabular-nums text-fg">
            {fmtDuration(m.sessionDuration)}
          </p>
        </div>

        {/* Счёт и Пинг */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-elevated/40 p-2.5 text-center">
          <div className="flex items-center gap-1 text-[11px] font-medium text-muted">
            <Swords className="size-3 text-subtle" />
            K/D &middot; Пинг
          </div>
          <p className="mt-1 font-mono text-base font-extrabold tabular-nums text-fg flex items-center gap-1.5">
            <span>
              {m.kills}/{m.deaths}
            </span>
            <span className="text-border">|</span>
            <span className={cn("text-xs font-semibold flex items-center gap-0.5", getPingColor(m.ping))}>
              <Wifi className="size-2.5" />
              {m.ping}мс
            </span>
          </p>
        </div>
      </div>
    </article>
  );
}

export function ActivityView() {
  const [data, setData] = useState<ActivityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<"all" | "T" | "CT" | "Spec">("all");
  const [serverFilter, setServerFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"duration" | "kills" | "ping" | "name">("duration");

  async function load(silent = false) {
    if (!silent) {
      if (data) setRefreshing(true);
      else setLoading(true);
    }
    setError(null);
    try {
      const res = await getActivityFn();
      setData(res);
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : "Не удалось загрузить активность");
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  // Load initially and auto-refresh every 15s
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load(true);
    }, 15_000);
    return () => clearInterval(timer);
  }, []);

  // Unique servers list for filter dropdown
  const uniqueServers = useMemo(() => {
    if (!data?.moderators) return [];
    const set = new Set<string>();
    data.moderators.forEach((m) => {
      if (m.server) set.add(m.server);
    });
    return Array.from(set).sort();
  }, [data?.moderators]);

  // Filtered and sorted moderators
  const filtered = useMemo(() => {
    if (!data?.moderators) return [];
    let list = [...data.moderators];

    // Search query
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.nickname.toLowerCase().includes(q) ||
          m.steamid.includes(q) ||
          m.server.toLowerCase().includes(q) ||
          m.map.toLowerCase().includes(q),
      );
    }

    // Team filter
    if (teamFilter !== "all") {
      list = list.filter((m) => m.team === teamFilter);
    }

    // Server filter
    if (serverFilter !== "all") {
      list = list.filter((m) => m.server === serverFilter);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === "duration") return b.sessionDuration - a.sessionDuration;
      if (sortBy === "kills") return b.kills - a.kills;
      if (sortBy === "ping") return a.ping - b.ping;
      return a.nickname.localeCompare(b.nickname);
    });

    return list;
  }, [data?.moderators, search, teamFilter, serverFilter, sortBy]);

  // Statistics summaries
  const totalCount = data?.moderators?.length ?? 0;
  const countT = data?.moderators?.filter((m) => m.team === "T").length ?? 0;
  const countCT = data?.moderators?.filter((m) => m.team === "CT").length ?? 0;
  const countSpec = data?.moderators?.filter((m) => m.team === "Spec").length ?? 0;

  if (loading && !data) {
    return (
      <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-8 space-y-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-5">
          <div className="space-y-2">
            <div className="h-7 w-64 rounded-xl bg-elevated animate-pulse" />
            <div className="h-4 w-96 rounded-lg bg-elevated/60 animate-pulse" />
          </div>
          <div className="h-10 w-28 rounded-xl bg-elevated animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-elevated animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-60 rounded-3xl bg-elevated animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center space-y-4">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-danger/15 text-danger border border-danger/30">
          <Activity className="size-7" />
        </div>
        <p className="text-danger font-bold text-sm">{error}</p>
        <Button className="rounded-xl" onClick={() => void load()}>
          Повторить попытку
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-8 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-success/15 text-success border border-success/30 shadow-sm">
              <Radio className="size-4.5 animate-pulse" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-fg flex items-center gap-2">
              Онлайн на серверах
              <span className="rounded-full bg-success/20 px-2.5 py-0.5 text-xs font-black text-success border border-success/30">
                {totalCount} ОНЛАЙН
              </span>
            </h1>
          </div>
          <p className="mt-1.5 text-xs text-muted">
            Модераторы и администраторы FearProject, которые прямо сейчас играют на серверах CS2.
            Данные обновляются автоматически каждые 15 сек.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            className="rounded-xl border-border/80 bg-elevated/70 text-xs font-semibold shadow-sm transition-all hover:bg-elevated hover:border-accent/40"
            onClick={() => void load()}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Обновить
          </Button>
        </div>
      </div>

      {/* ── Summary KPI Tiles ────────────────────────────────────────── */}
      <AnimatedBlock delay={50}>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {/* Всего онлайн */}
          <div className="rounded-2xl border border-success/30 bg-success/10 p-4 text-center transition-all">
            <p className="text-3xl font-black tabular-nums text-success">
              <AnimatedNumber value={totalCount} />
            </p>
            <p className="mt-1 text-xs font-bold text-success/90 flex items-center justify-center gap-1">
              <Users className="size-3.5" /> В игре сейчас
            </p>
          </div>

          {/* Террористы (T) */}
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-center transition-all">
            <p className="text-3xl font-black tabular-nums text-rose-400">
              <AnimatedNumber value={countT} />
            </p>
            <p className="mt-1 text-xs font-bold text-rose-400/90 flex items-center justify-center gap-1">
              <span className="size-2 rounded-full bg-rose-500" /> Команда T
            </p>
          </div>

          {/* Спецназ (CT) */}
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-center transition-all">
            <p className="text-3xl font-black tabular-nums text-sky-400">
              <AnimatedNumber value={countCT} />
            </p>
            <p className="mt-1 text-xs font-bold text-sky-400/90 flex items-center justify-center gap-1">
              <span className="size-2 rounded-full bg-sky-500" /> Команда CT
            </p>
          </div>

          {/* Наблюдатели (Spec) */}
          <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4 text-center transition-all">
            <p className="text-3xl font-black tabular-nums text-purple-400">
              <AnimatedNumber value={countSpec} />
            </p>
            <p className="mt-1 text-xs font-bold text-purple-400/90 flex items-center justify-center gap-1">
              <Eye className="size-3.5" /> Наблюдатели
            </p>
          </div>
        </div>
      </AnimatedBlock>

      {/* ── Filters and Controls Bar ─────────────────────────────────── */}
      <AnimatedBlock delay={100}>
        <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-surface/90 glass-panel p-3.5 sm:flex-row sm:items-center sm:justify-between shadow-sm">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[14rem]">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
            <input
              type="text"
              placeholder="Поиск по нику, SteamID, серверу, карте..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9.5 w-full rounded-xl border border-border/70 bg-elevated/70 pl-9 pr-8 text-xs text-fg placeholder:text-subtle focus:border-accent outline-none"
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

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Team */}
            <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-elevated/60 p-1">
              {(
                [
                  { id: "all", label: "Все" },
                  { id: "T", label: "T" },
                  { id: "CT", label: "CT" },
                  { id: "Spec", label: "Spec" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTeamFilter(tab.id)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-bold transition-all",
                    teamFilter === tab.id
                      ? "bg-accent text-accent-fg shadow-sm"
                      : "text-muted hover:text-fg hover:bg-surface/50",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filter by Server dropdown */}
            {uniqueServers.length > 0 ? (
              <div className="relative">
                <select
                  value={serverFilter}
                  onChange={(e) => setServerFilter(e.target.value)}
                  className="h-9.5 rounded-xl border border-border/70 bg-elevated/70 px-3 text-xs font-medium text-fg outline-none focus:border-accent cursor-pointer"
                >
                  <option value="all">Все серверы ({uniqueServers.length})</option>
                  {uniqueServers.map((srv) => (
                    <option key={srv} value={srv}>
                      {srv}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-9.5 rounded-xl border border-border/70 bg-elevated/70 px-3 text-xs font-medium text-fg outline-none focus:border-accent cursor-pointer"
              >
                <option value="duration">Время на сервере ↓</option>
                <option value="kills">Убийства (Kills) ↓</option>
                <option value="ping">Пинг (лучший) ↑</option>
                <option value="name">По имени (А-Я)</option>
              </select>
            </div>
          </div>
        </div>
      </AnimatedBlock>

      {/* ── Moderators Cards Grid ───────────────────────────────────── */}
      <AnimatedBlock delay={150}>
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-border/80 bg-surface/80 p-12 text-center space-y-3 glass-panel">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-elevated text-muted">
              <Gamepad2 className="size-6" />
            </div>
            <p className="text-sm font-bold text-fg">
              {totalCount === 0
                ? "Сейчас никто из модераторов не играет на серверах"
                : "По вашему запросу никто не найден"}
            </p>
            <p className="text-xs text-muted max-w-md mx-auto">
              {totalCount === 0
                ? "Как только модератор зайдёт на один из серверов FearProject, он моментально появится в этом списке."
                : "Попробуйте изменить поисковый запрос или сбросить фильтры команды и сервера."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((m) => (
              <OnlineModCard key={m.steamid} m={m} />
            ))}
          </div>
        )}
      </AnimatedBlock>
    </div>
  );
}
