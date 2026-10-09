import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Flame,
  Hammer,
  RefreshCw,
  Search,
  Share2,
  Shield,
  Target,
  TrendingUp,
  Unlock,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
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

function NormaRadialGauge({
  current,
  target,
  size = 110,
}: {
  current: number;
  target: number | null;
  size?: number;
}) {
  const pct = target && target > 0 ? Math.round((current / target) * 100) : 0;
  const cappedPct = Math.min(pct, 100);
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (cappedPct / 100) * circumference;
  const isDone = target != null && target > 0 && current >= target;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="size-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-elevated/70"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={cn(
            "transition-all duration-1000 ease-out",
            isDone
              ? "stroke-success drop-shadow-[0_0_8px_var(--color-success)]"
              : "stroke-accent drop-shadow-[0_0_8px_var(--color-accent)]",
          )}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={cn("text-xl font-black tracking-tight font-mono leading-none", isDone ? "text-success" : "text-fg")}>
          {target ? `${pct}%` : `${current}`}
        </span>
        <span className="mt-1 text-[9px] font-bold text-muted uppercase tracking-wider">
          {isDone ? "Закрыта" : "Норма"}
        </span>
      </div>
    </div>
  );
}

function PaceForecastCard({
  total,
  target,
}: {
  total: number;
  target: number | null;
}) {
  const now = new Date();
  const mskDayStr = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Moscow", day: "numeric" }).format(now);
  const mskMonthStr = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Moscow", month: "numeric" }).format(now);
  const mskYearStr = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Moscow", year: "numeric" }).format(now);
  const currentDay = Math.max(1, parseInt(mskDayStr, 10));
  const currentMonth = parseInt(mskMonthStr, 10);
  const currentYear = parseInt(mskYearStr, 10);
  const totalDays = new Date(currentYear, currentMonth, 0).getDate();
  const daysRemaining = Math.max(0, totalDays - currentDay);

  const pace = total / currentDay;
  const projected = Math.round(pace * totalDays);
  const isDone = target != null && target > 0 && total >= target;
  const remainingActions = target ? Math.max(0, target - total) : 0;
  const neededPace = daysRemaining > 0 && target && !isDone ? (remainingActions / daysRemaining).toFixed(1) : "0";

  return (
    <div className="rounded-2xl border border-border/80 bg-surface/80 p-4 space-y-3 glass-panel">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-fg flex items-center gap-1.5">
          <Zap className="size-3.5 text-accent" />
          Умный темп и прогноз
        </span>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-black uppercase border",
            isDone
              ? "bg-success/15 text-success border-success/30"
              : projected >= (target || 0)
                ? "bg-accent/15 text-accent border-accent/30"
                : "bg-warn/15 text-warn border-warn/30",
          )}
        >
          {isDone ? "Норма закрыта 🎉" : projected >= (target || 0) ? "Опережает график" : "Нужно ускориться"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-elevated/60 p-2 border border-border/50">
          <p className="text-xs font-mono font-bold text-fg">{pace.toFixed(1)}</p>
          <p className="text-[10px] text-muted leading-tight">действ. / день</p>
        </div>
        <div className="rounded-xl bg-elevated/60 p-2 border border-border/50">
          <p className="text-xs font-mono font-bold text-accent">~{projected}</p>
          <p className="text-[10px] text-muted leading-tight">прогноз на месяц</p>
        </div>
        <div className="rounded-xl bg-elevated/60 p-2 border border-border/50">
          <p className="text-xs font-mono font-bold text-fg">{daysRemaining} дн.</p>
          <p className="text-[10px] text-muted leading-tight">до итогов</p>
        </div>
      </div>

      <p className="text-[11px] text-muted leading-relaxed">
        {isDone
          ? `Отличная работа! Норма перевыполнена на ${total - (target || 0)} действий. Каждое следующее наказание закрепляет лидерство в топе сезона.`
          : daysRemaining > 0 && target
            ? `Для закрытия нормы (${target} действий) необходимо делать от ${neededPace} наказаний в день.`
            : `Месяц завершается. Текущий результат зафиксирован.`}
      </p>
    </div>
  );
}

function MonthActivityHeatmap({ records }: { records: PunishmentRecord[] }) {
  const now = new Date();
  const mskMonthStr = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Moscow", month: "numeric" }).format(now);
  const mskYearStr = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Moscow", year: "numeric" }).format(now);
  const currentMonth = parseInt(mskMonthStr, 10);
  const currentYear = parseInt(mskYearStr, 10);
  const totalDays = new Date(currentYear, currentMonth, 0).getDate();

  const dayCounts: Record<number, { bans: number; mutes: number; total: number }> = {};
  for (let i = 1; i <= totalDays; i++) {
    dayCounts[i] = { bans: 0, mutes: 0, total: 0 };
  }

  for (const r of records) {
    if (r.counted === false) continue;
    const d = new Date(r.created * 1000);
    const dDayStr = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Moscow", day: "numeric" }).format(d);
    const dMonthStr = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Moscow", month: "numeric" }).format(d);
    if (parseInt(dMonthStr, 10) === currentMonth) {
      const dayNum = parseInt(dDayStr, 10);
      if (dayCounts[dayNum]) {
        dayCounts[dayNum].total++;
        if (r.kind === "ban") dayCounts[dayNum].bans++;
        else if (r.kind === "mute") dayCounts[dayNum].mutes++;
      }
    }
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-surface/80 p-4 glass-panel space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-fg flex items-center gap-1.5">
          <CalendarDays className="size-3.5 text-accent" />
          Активность по дням месяца (МСК)
        </span>
        <span className="text-[10px] text-muted">
          {records.length} действий за месяц
        </span>
      </div>

      <div className="grid grid-cols-7 sm:grid-cols-11 md:grid-cols-16 gap-1.5">
        {Array.from({ length: totalDays }).map((_, idx) => {
          const day = idx + 1;
          const stat = dayCounts[day] || { total: 0, bans: 0, mutes: 0 };
          const cnt = stat.total;

          let bgClass = "bg-elevated/40 border-border/40 text-subtle hover:border-border";
          if (cnt >= 6) {
            bgClass = "bg-accent border-accent text-accent-fg font-black shadow-sm";
          } else if (cnt >= 3) {
            bgClass = "bg-accent/40 border-accent/60 text-fg font-bold";
          } else if (cnt >= 1) {
            bgClass = "bg-accent/20 border-accent/30 text-accent font-medium";
          }

          return (
            <div
              key={day}
              title={`День ${day}: ${cnt} действий (${stat.bans} бан., ${stat.mutes} мут.)`}
              className={cn(
                "group relative flex flex-col items-center justify-center rounded-lg border p-1 text-[11px] font-mono transition-all duration-150 cursor-default select-none aspect-square",
                bgClass,
              )}
            >
              <span>{day}</span>
              {cnt > 0 && <span className="text-[9px] opacity-85 leading-none font-bold">{cnt}</span>}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2 text-[10px] text-muted pt-1">
        <span>Меньше</span>
        <span className="size-2.5 rounded bg-elevated/40 border border-border/40" />
        <span className="size-2.5 rounded bg-accent/20 border border-accent/30" />
        <span className="size-2.5 rounded bg-accent/40 border border-accent/60" />
        <span className="size-2.5 rounded bg-accent border border-accent" />
        <span>Больше</span>
      </div>
    </div>
  );
}

function DiscordShareModal({
  open,
  onClose,
  handle,
  steamid,
  rank,
  m,
  monthName,
}: {
  open: boolean;
  onClose: () => void;
  handle: string;
  steamid: string;
  rank: number | null;
  m: ModDetails["moderator"];
  monthName: string;
}) {
  if (!open) return null;

  const rankText = (rank && RANK_SHORT[rank]) || "МОДЕРАТОР";
  const target = m.norma?.month ?? 150;
  const pct = target ? Math.round((m.total / target) * 100) : 100;

  const discordMarkdown = `📊 **Отчёт модератора ${handle} | FearProject CS2**
📅 Период: ${monthName}
🛡 Ранг: ${rankText}
───────────────────────
🔨 Банов выдано: ${m.bans ?? 0}
🔇 Мутов выдано: ${m.mutes ?? 0}
⚡ Всего действий: ${m.total}
🎯 Норма месяца: ${m.total} / ${target} (${pct}%)
🔓 Снято решений: ${m.removed ?? 0}
───────────────────────
🔗 Профиль: https://premute.vercel.app/player/${steamid}`;

  function copyText() {
    try {
      void navigator.clipboard.writeText(discordMarkdown);
      toast.success("Отчёт для Discord скопирован в буфер!");
    } catch {
      toast.error("Не удалось скопировать текст");
    }
  }

  function copyLink() {
    try {
      void navigator.clipboard.writeText(`https://premute.vercel.app/player/${steamid}`);
      toast.success("Ссылка на профиль скопирована!");
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-border/80 bg-surface p-6 shadow-2xl glass-panel space-y-5">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-fg">
              <Share2 className="size-4.5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-fg">Поделиться статистикой</h3>
              <p className="text-xs text-muted">Форматированный отчёт для Discord и соцсетей</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-xl bg-elevated/70 text-muted hover:text-fg hover:bg-elevated transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Preview Card */}
        <div className="rounded-2xl border border-border/80 bg-elevated/60 p-4 font-mono text-xs text-fg space-y-2 select-all">
          <p className="font-sans font-bold text-accent">📊 Отчёт модератора {handle} | FearProject CS2</p>
          <p className="text-muted text-[11px]">📅 {monthName} &middot; 🛡 {rankText}</p>
          <div className="border-t border-border/40 pt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div>🔨 Банов: <span className="font-bold text-danger">{m.bans ?? 0}</span></div>
            <div>🔇 Мутов: <span className="font-bold text-warn">{m.mutes ?? 0}</span></div>
            <div>⚡ Всего: <span className="font-bold text-fg">{m.total}</span></div>
            <div>🎯 Норма: <span className="font-bold text-success">{pct}%</span></div>
          </div>
          <p className="border-t border-border/40 pt-2 text-[10px] text-subtle truncate">
            SteamID: {steamid}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={copyText}
            className="flex-1 rounded-xl bg-accent text-accent-fg font-bold text-xs h-10 shadow-lg shadow-accent/20"
          >
            <Copy className="size-4" />
            Скопировать для Discord
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={copyLink}
            className="rounded-xl border-border/80 bg-elevated text-fg text-xs font-bold h-10"
          >
            Ссылка
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ModDetailsView({
  explicitSlug,
  hideBackLink,
}: {
  explicitSlug?: string;
  hideBackLink?: boolean;
} = {}) {
  const params = useParams({ strict: false }) as { slug?: string };
  const slug = explicitSlug || params.slug || "";
  const [data, setData] = useState<ModDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<"all" | "ban" | "mute">("all");
  const [status, setStatus] = useState<"all" | "active" | "expired" | "removed">("all");
  const [search, setSearch] = useState("");

  const [datePreset, setDatePreset] = useState<"all" | "today" | "3days" | "week">("all");
  const [shareOpen, setShareOpen] = useState(false);

  async function load() {
    if (!slug) {
      setLoading(false);
      return;
    }
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
    const nowMs = Date.now();
    const mskOffset = 3 * 3600 * 1000;
    const mskNow = new Date(nowMs + mskOffset);
    const mskTodayStartUtc = Date.UTC(mskNow.getUTCFullYear(), mskNow.getUTCMonth(), mskNow.getUTCDate()) - mskOffset;
    const todayStartSec = Math.floor(mskTodayStartUtc / 1000);

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

        if (datePreset === "today" && r.created < todayStartSec) return false;
        if (datePreset === "3days" && r.created < now - 3 * 86400) return false;
        if (datePreset === "week" && r.created < now - 7 * 86400) return false;

        if (!q) return true;
        return (
          r.player.toLowerCase().includes(q) ||
          (r.reason || "").toLowerCase().includes(q) ||
          r.playerSteamid.includes(q)
        );
      });
  }, [data, kind, status, datePreset, search]);

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
        {!hideBackLink && (
          <Link
            to="/stats"
            className="mt-6 inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-elevated px-4 text-xs font-bold text-muted hover:text-fg"
          >
            <ChevronLeft className="size-4" />
            Вернуться к статистике
          </Link>
        )}
      </div>
    );
  }

  const m = data.moderator;
  const handle = m.name && !/^\d{17,20}$/.test(m.name) ? m.name : (m.discord && !/^\d{17,20}$/.test(m.discord) ? m.discord : m.name);
  const initial = (handle.trim().charAt(0) || "?").toUpperCase();
  const monthTarget = m.norma?.month ?? null;
  const monthDone = monthTarget != null && monthTarget > 0 && m.total >= monthTarget;
  const actualRatio = monthTarget ? Math.round((m.total / monthTarget) * 100) : null;

  function copySteamId(id: string) {
    try {
      void navigator.clipboard.writeText(id);
      toast.success(`SteamID ${id} скопирован!`);
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-8 sm:py-8 space-y-6 animate-in fade-in duration-300">
      {/* ── Top Back Link ──────────────────────────────────────────── */}
      {!hideBackLink && (
        <div className="flex items-center justify-between">
          <Link
            to="/stats"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-elevated/70 px-3 py-1.5 text-xs font-bold text-muted hover:border-accent hover:text-fg transition-all shadow-sm"
          >
            <ArrowLeft className="size-3.5" />
            Назад к общей статистике
          </Link>
          <Button
            size="sm"
            onClick={() => setShareOpen(true)}
            className="rounded-xl border border-accent/40 bg-accent/15 px-3 py-1.5 text-xs font-bold text-accent hover:bg-accent hover:text-accent-fg transition-all shadow-sm"
          >
            <Share2 className="size-3.5" />
            Поделиться отчётом
          </Button>
        </div>
      )}

      {/* ── Moderator Hero Profile Card (Bento Style) ──────────────── */}
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
                  <span className="rounded-lg bg-accent/15 px-2.5 py-0.5 text-xs font-black uppercase text-accent border border-accent/25 shadow-sm">
                    {RANK_SHORT[m.rank] ?? "мод"}
                  </span>
                ) : null}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-xs text-subtle">
                <button
                  type="button"
                  onClick={() => copySteamId(m.steamid)}
                  title="Нажмите, чтобы скопировать SteamID"
                  className="inline-flex items-center gap-1 text-muted hover:text-accent transition-colors"
                >
                  <span>{m.steamid}</span>
                  <Copy className="size-3" />
                </button>
                {m.discord && m.discord !== handle && (
                  <span className="text-muted">Discord: {m.discord}</span>
                )}
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

          {/* Norma Radial Gauge Widget */}
          <div className="flex items-center gap-5 rounded-2xl border border-border/70 bg-surface/80 p-4 shadow-sm">
            <NormaRadialGauge current={m.total} target={monthTarget} size={96} />
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Норма месяца</p>
              <p className={cn("text-lg font-black font-mono", monthDone ? "text-success" : "text-fg")}>
                {m.total} <span className="text-xs text-muted font-normal">/ {monthTarget ?? "—"}</span>
              </p>
              <p className="text-[11px] text-muted font-mono">
                {actualRatio != null ? `${actualRatio}% от плана` : "цель не задана"}
              </p>
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline cursor-pointer"
              >
                <Share2 className="size-3" />
                Поделиться
              </button>
            </div>
          </div>
        </div>

        {/* 4 Cyber Metric Chips */}
        <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-danger/25 bg-danger/10 p-3.5 text-center transition-all hover:bg-danger/15 shadow-sm">
            <p className="text-3xl font-black tabular-nums text-danger">{m.bans ?? 0}</p>
            <p className="mt-1 text-xs font-bold text-danger/80 flex items-center justify-center gap-1">
              <Hammer className="size-3.5" /> Банов выдано
            </p>
          </div>

          <div className="rounded-2xl border border-warn/25 bg-warn/10 p-3.5 text-center transition-all hover:bg-warn/15 shadow-sm">
            <p className="text-3xl font-black tabular-nums text-warn">{m.mutes ?? 0}</p>
            <p className="mt-1 text-xs font-bold text-warn/80 flex items-center justify-center gap-1">
              <VolumeX className="size-3.5" /> Мутов выдано
            </p>
          </div>

          <div className="rounded-2xl border border-accent/30 bg-accent/15 p-3.5 text-center shadow-inner transition-all hover:bg-accent/20">
            <p className="text-3xl font-black tabular-nums text-accent">{m.total}</p>
            <p className="mt-1 text-xs font-bold text-accent">Выдано за период</p>
          </div>

          <div className="rounded-2xl border border-success/25 bg-success/10 p-3.5 text-center transition-all hover:bg-success/15 shadow-sm">
            <p className="text-3xl font-black tabular-nums text-success">{m.removed ?? 0}</p>
            <p className="mt-1 text-xs font-bold text-success/80 flex items-center justify-center gap-1">
              <Unlock className="size-3.5" /> Снято решений
            </p>
          </div>
        </div>
      </article>

      {/* ── Bento Grid: Smart Pace & Month Heatmap ───────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <PaceForecastCard total={m.total} target={monthTarget} />
        <MonthActivityHeatmap records={data.records} />
      </div>

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
              {/* Type Filter */}
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

              {/* Status Filter */}
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

              <span className="mx-1 h-4 w-px bg-border/80" />

              {/* Date Preset Filter */}
              {(
                [
                  { id: "all", label: "Все дни" },
                  { id: "today", label: "Сегодня" },
                  { id: "3days", label: "3 дня" },
                  { id: "week", label: "Неделя" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDatePreset(f.id)}
                  className={cn(
                    "h-7.5 rounded-xl border px-2.5 text-xs font-bold transition-all",
                    datePreset === f.id
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
                      <button
                        type="button"
                        onClick={() => copySteamId(r.playerSteamid)}
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-subtle hover:text-accent transition-colors cursor-pointer"
                        title="Копировать SteamID"
                      >
                        <span>{r.playerSteamid}</span>
                        <Copy className="size-2.5" />
                      </button>
                      <a
                        href={`https://steamcommunity.com/profiles/${r.playerSteamid}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-subtle hover:text-accent transition-colors"
                        title="Профиль в Steam Community"
                      >
                        <ExternalLink className="size-2.5" />
                      </a>
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

      {/* ── Discord Share Modal ────────────────────────────────────── */}
      <DiscordShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        handle={handle}
        steamid={m.steamid}
        rank={m.rank}
        m={m}
        monthName={data.month}
      />
    </div>
  );
}
