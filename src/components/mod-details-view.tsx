import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Download,
  ExternalLink,
  Flame,
  Hammer,
  RefreshCw,
  Search,
  Shield,
  Unlock,
  VolumeX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeaderSkeleton, RowsSkeleton, Skeleton } from "@/components/skeletons";
import { getModDetailsFn } from "@/lib/fn";
import { downloadCsv } from "@/lib/csv";
import { RANK_SHORT, fearProfileUrl } from "@/lib/constants";
import type { ModDetails, PunishmentRecord } from "@/lib/types";
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

function fmtDate(sec: number) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(sec * 1000));
  } catch {
    return "—";
  }
}

function fmtDateTime(sec: number) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(sec * 1000));
  } catch {
    return "—";
  }
}

function fmtUpdated(sec: number) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(sec * 1000));
  } catch {
    return "—";
  }
}

function recordStatus(r: PunishmentRecord): { label: string; className: string } {
  if (r.unpunishAdmin || r.status === 2) return { label: "Снято", className: "text-subtle" };
  if (r.expires && r.expires <= Math.floor(Date.now() / 1000)) {
    return { label: "Истёк", className: "text-subtle" };
  }
  return { label: "Активен", className: "text-success font-bold" };
}

function moscowDateKey(tsSec: number): string {
  return new Date(tsSec * 1000).toLocaleDateString("en-CA", { timeZone: "Europe/Moscow" });
}

function buildModDailyData(
  records: PunishmentRecord[],
  monthStart: number | null,
  monthEnd: number | null,
): { name: string; Баны: number; Муты: number; total: number; dateKey: string }[] {
  const map = new Map<string, { bans: number; mutes: number }>();
  for (const r of records) {
    if (r.counted === false) continue;
    const key = moscowDateKey(r.created);
    const cur = map.get(key) ?? { bans: 0, mutes: 0 };
    if (r.kind === "ban") cur.bans += 1;
    else if (r.kind === "mute") cur.mutes += 1;
    map.set(key, cur);
  }
  const days: { name: string; Баны: number; Муты: number; total: number; dateKey: string }[] = [];
  if (monthStart != null && monthEnd != null) {
    const start = new Date(monthStart * 1000);
    const end = new Date(monthEnd * 1000);
    for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
      const tsSec = Math.floor(d.getTime() / 1000);
      const key = moscowDateKey(tsSec);
      const [, m, day] = key.split("-");
      const name = `${day}.${m}`;
      const v = map.get(key);
      days.push({ name, Баны: v?.bans ?? 0, Муты: v?.mutes ?? 0, total: (v?.bans ?? 0) + (v?.mutes ?? 0), dateKey: key });
    }
  } else {
    const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [key, v] of sorted) {
      const [, m, day] = key.split("-");
      days.push({ name: `${day}.${m}`, Баны: v.bans, Муты: v.mutes, total: v.bans + v.mutes, dateKey: key });
    }
    if (days.length === 0) return [];
  }
  return days;
}

function ModDailyCharts({
  records,
  month,
  monthStart,
  monthEnd,
  handle,
}: {
  records: PunishmentRecord[];
  month: string;
  monthStart: number | null;
  monthEnd: number | null;
  handle: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const daily = useMemo(() => buildModDailyData(records, monthStart, monthEnd), [records, monthStart, monthEnd]);
  const activeDays = useMemo(() => daily.filter((d) => d.total > 0).length, [daily]);
  const totalDays = daily.length;
  const hasData = daily.some((d) => d.total > 0);

  if (!hasData) {
    return (
      <section className="rounded-3xl border border-border/80 bg-surface/90 glass-panel p-5 sm:p-6 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
          График активности по дням &middot; {handle}
        </h2>
        <p className="mt-4 rounded-2xl border border-border/60 bg-elevated/40 px-4 py-8 text-center text-xs text-muted">
          В этом месяце график пуст — наказаний ещё нет.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-border/80 bg-surface/90 glass-panel p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted flex items-center gap-2">
            <Flame className="size-4 text-accent" />
            Наказания по дням &middot; {handle}
          </h2>
          <p className="text-xs text-subtle mt-0.5">
            {month} &middot; {activeDays} активных дней из {totalDays} &middot; время МСК
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
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 8, right: 10, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: "var(--color-elevated)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const bans = payload.find((p) => p.dataKey === "Баны")?.value ?? 0;
                  const mutes = payload.find((p) => p.dataKey === "Муты")?.value ?? 0;
                  return (
                    <div className="rounded-xl border border-border bg-surface p-3 text-xs shadow-xl min-w-[130px]">
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
              <Bar dataKey="Баны" stackId="a" fill="var(--color-chart-bans)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Муты" stackId="a" fill="var(--color-chart-mutes)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Skeleton className="h-full w-full rounded-2xl" />
        )}
      </div>
    </section>
  );
}

export function ModDetailsView() {
  const { slug } = useParams({ from: "/_panel/$slug" });
  const [data, setData] = useState<ModDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<"all" | "ban" | "mute">("all");
  const [status, setStatus] = useState<"all" | "active" | "expired" | "removed">("all");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const next = await getModDetailsFn({ data: { slug } });
      setData(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить статистику модератора");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const records = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const now = Math.floor(Date.now() / 1000);
    return [...data.records]
      .sort((a, b) => b.created - a.created)
      .filter((r) => {
        if (kind !== "all" && r.kind !== kind) return false;
        const st =
          r.unpunishAdmin || r.status === 2
            ? "removed"
            : r.expires && r.expires <= now
              ? "expired"
              : "active";
        if (status !== "all" && st !== status) return false;
        if (!q) return true;
        return (
          r.player.toLowerCase().includes(q) ||
          (r.reason || "").toLowerCase().includes(q) ||
          r.playerSteamid.includes(q)
        );
      });
  }, [data, kind, status, search]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-8 space-y-6">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-3xl" />
          ))}
        </div>
        <RowsSkeleton rows={6} />
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

  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Модератор не найден</h1>
        <p className="mt-2 text-xs text-muted">
          Возможно, ссылка устарела или модератор больше не состоит в составе.
        </p>
        <Link
          to="/stats"
          className="mt-6 inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-elevated px-4 text-xs font-bold text-muted hover:text-fg"
        >
          <ChevronLeft className="size-4" />
          Вернуться к статистике
        </Link>
      </div>
    );
  }

  const m = data.moderator;
  const handle = m.discord && m.discord !== m.name ? m.discord : m.name;
  const initial = (handle.trim().charAt(0) || "?").toUpperCase();
  const monthTarget = m.norma?.month ?? null;
  const monthDone = monthTarget != null && monthTarget > 0 && m.total >= monthTarget;
  const progressPct = monthTarget ? Math.min(Math.round((m.total / monthTarget) * 100), 100) : 0;
  const actualRatio = monthTarget ? Math.round((m.total / monthTarget) * 100) : null;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-8 sm:py-8 space-y-6 animate-in fade-in duration-300">
      {/* ── Top Back Link ──────────────────────────────────────────── */}
      <div>
        <Link
          to="/stats"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-elevated/70 px-3 py-1.5 text-xs font-bold text-muted hover:border-accent hover:text-fg transition-all shadow-sm"
        >
          <ArrowLeft className="size-3.5" />
          Назад к общей статистике
        </Link>
      </div>

      {/* ── Moderator Hero Profile Card ────────────────────────────── */}
      <article className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-r from-surface via-surface/95 to-elevated/70 p-6 sm:p-8 shadow-2xl glass-panel cyber-border-glow">
        <div className="absolute right-0 top-0 size-80 bg-accent/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            {m.avatar ? (
              <img
                src={m.avatar}
                alt=""
                className="size-16 sm:size-20 shrink-0 rounded-2xl object-cover border-2 border-border/80 ring-4 ring-accent/20 shadow-xl"
              />
            ) : (
              <span className="grid size-16 sm:size-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-surface to-elevated text-2xl font-black text-fg border-2 border-border/80 shadow-xl">
                {initial}
              </span>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  to="/player/$steamid"
                  params={{ steamid: m.steamid }}
                  className="truncate text-xl sm:text-3xl font-black text-fg hover:text-accent transition-colors"
                >
                  {handle}
                </Link>
                {m.rank ? (
                  <span className="rounded-lg bg-accent/15 px-2.5 py-0.5 text-xs font-black uppercase text-accent border border-accent/25">
                    {RANK_SHORT[m.rank] ?? "мод"}
                  </span>
                ) : null}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-xs text-subtle">
                <span className="truncate">{m.steamid}</span>
                <a
                  href={fearProfileUrl(m.steamid)}
                  target="_blank"
                  rel="noreferrer"
                  title="Профиль на FearProject"
                  className="inline-flex items-center gap-1 text-muted hover:text-accent transition-colors"
                >
                  FearProject <ExternalLink className="size-3" />
                </a>
                <span>&middot;</span>
                <span>Обновлено {fmtUpdated(data.updatedAt)} МСК</span>
              </div>
            </div>
          </div>

          {/* Norma Widget on Hero */}
          <div className="rounded-2xl border border-border/70 bg-surface/80 p-4 shadow-sm min-w-[220px]">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-muted uppercase tracking-wider text-[10px]">Норма месяца</span>
              <span className={cn("font-mono", monthDone ? "text-success" : "text-fg")}>
                {m.total}/{monthTarget ?? "—"}{" "}
                {actualRatio != null ? `(${actualRatio}%)` : ""}
              </span>
            </div>
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-elevated border border-border/50">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  monthDone ? "bg-success shadow-[0_0_8px_var(--color-success)]" : "bg-accent/70",
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* 4 Cyber Metric Chips */}
        <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-danger/25 bg-danger/10 p-3.5 text-center transition-all hover:bg-danger/15">
            <p className="text-3xl font-black tabular-nums text-danger">{m.bans ?? 0}</p>
            <p className="mt-1 text-xs font-bold text-danger/80 flex items-center justify-center gap-1">
              <Hammer className="size-3.5" /> Банов выдано
            </p>
          </div>

          <div className="rounded-2xl border border-warn/25 bg-warn/10 p-3.5 text-center transition-all hover:bg-warn/15">
            <p className="text-3xl font-black tabular-nums text-warn">{m.mutes ?? 0}</p>
            <p className="mt-1 text-xs font-bold text-warn/80 flex items-center justify-center gap-1">
              <VolumeX className="size-3.5" /> Мутов выдано
            </p>
          </div>

          <div className="rounded-2xl border border-accent/30 bg-accent/15 p-3.5 text-center shadow-inner transition-all hover:bg-accent/20">
            <p className="text-3xl font-black tabular-nums text-accent">{m.total}</p>
            <p className="mt-1 text-xs font-bold text-accent">Выдано за период</p>
          </div>

          <div className="rounded-2xl border border-success/25 bg-success/10 p-3.5 text-center transition-all hover:bg-success/15">
            <p className="text-3xl font-black tabular-nums text-success">{m.removed ?? 0}</p>
            <p className="mt-1 text-xs font-bold text-success/80 flex items-center justify-center gap-1">
              <Unlock className="size-3.5" /> Снято решений
            </p>
          </div>
        </div>
      </article>

      {/* ── Daily Chart Section ────────────────────────────────────── */}
      <ModDailyCharts
        records={data.records}
        month={data.month}
        monthStart={data.monthStart}
        monthEnd={data.monthEnd}
        handle={handle}
      />

      {/* ── All Punishments Table with Filters ─────────────────────── */}
      <section className="rounded-3xl border border-border/80 bg-surface/90 glass-panel overflow-hidden shadow-sm">
        {/* Table Header & Filters */}
        <div className="p-5 border-b border-border/60 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-extrabold text-fg">Все наказания за период</h2>
              <p className="text-xs text-muted">
                {records.length} записей &middot; {data.records.filter((r) => r.kind === "ban").length} банов,{" "}
                {data.records.filter((r) => r.kind === "mute").length} мутов,{" "}
                {data.records.filter((r) => r.unpunishAdmin || r.status === 2).length} снято
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="h-8.5 rounded-xl border-border/80 bg-elevated/70 px-3 text-xs font-bold text-fg hover:border-accent"
                onClick={() =>
                  data &&
                  downloadCsv(`mod-${m.steamid}.csv`, [
                    ["Дата", "Игрок", "SteamID игрока", "Тип", "Срок", "Статус", "Причина"],
                    ...records.map((r) => [
                      fmtDateTime(r.created),
                      r.player,
                      r.playerSteamid,
                      r.kind === "ban" ? "Бан" : "Мут",
                      r.durationLabel || "",
                      recordStatus(r).label,
                      r.reason || "",
                    ]),
                  ])
                }
                disabled={!records.length}
                title="Экспорт наказаний в CSV"
              >
                <Download className="size-3.5" />
                Экспорт CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8.5 w-8.5 rounded-xl border border-border/80 bg-elevated/70 p-0 text-muted hover:text-fg"
                onClick={() => void load()}
              >
                <RefreshCw className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Filter Chips & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "all", label: "Все типы" },
                  { id: "ban", label: "Баны" },
                  { id: "mute", label: "Муты" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setKind(f.id)}
                  className={cn(
                    "h-7.5 rounded-xl border px-3 text-xs font-bold transition-all",
                    kind === f.id
                      ? "border-accent bg-accent text-accent-fg shadow-sm"
                      : "border-border/60 bg-elevated/60 text-muted hover:text-fg",
                  )}
                >
                  {f.label}
                </button>
              ))}

              <span className="mx-1 h-4 w-px bg-border/80" />

              {(
                [
                  { id: "all", label: "Любой статус" },
                  { id: "active", label: "Активные" },
                  { id: "expired", label: "Истёкшие" },
                  { id: "removed", label: "Снятые" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatus(f.id)}
                  className={cn(
                    "h-7.5 rounded-xl border px-3 text-xs font-bold transition-all",
                    status === f.id
                      ? "border-accent bg-accent text-accent-fg shadow-sm"
                      : "border-border/60 bg-elevated/60 text-muted hover:text-fg",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Quick Search */}
            <div className="relative min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по игроку, SteamID или причине..."
                className="h-8.5 rounded-xl border-border/80 bg-elevated/70 pl-8.5 text-xs text-fg focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Sanctions List */}
        {records.length === 0 ? (
          <p className="px-5 py-12 text-center text-xs text-muted">
            {data.records.length === 0 ? "За текущий месяц наказаний нет." : "Ничего не найдено по заданным фильтрам."}
          </p>
        ) : (
          <ul className="max-h-[70vh] divide-y divide-border/60 overflow-y-auto">
            {records.map((r) => {
              const st = recordStatus(r);
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-elevated/50"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-surface to-elevated text-xs font-black text-fg border border-border/80">
                    {(r.player.trim().charAt(0) || "?").toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={fearProfileUrl(r.playerSteamid)}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-sm font-bold text-fg hover:underline hover:text-accent transition-colors"
                      >
                        {r.player}
                      </a>
                      <Link
                        to="/player/$steamid"
                        params={{ steamid: r.playerSteamid }}
                        className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent hover:bg-accent hover:text-accent-fg transition-all shrink-0"
                        title="Открыть досье игрока"
                      >
                        <Shield className="size-2.5" />
                        Досье
                      </Link>
                      <span className="font-mono text-[10px] text-subtle">{r.playerSteamid}</span>
                    </div>

                    {r.reason ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted leading-tight" title={r.reason}>
                        {r.reason}
                      </p>
                    ) : null}
                  </div>
                  <Badge
                    tone={r.kind === "ban" ? "danger" : "warn"}
                    className="shrink-0 font-bold"
                  >
                    {r.kind === "ban" ? "Бан" : "Мут"}
                  </Badge>
                  <span className="hidden w-20 shrink-0 text-right text-xs font-mono tabular-nums text-muted min-[560px]:block">
                    {r.durationLabel || "—"}
                  </span>
                  <span className={cn("w-20 shrink-0 text-right text-xs", st.className)}>
                    {st.label}
                  </span>
                  <span className="hidden w-24 shrink-0 text-right font-mono text-[11px] text-subtle sm:block">
                    {fmtDate(r.created)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
