import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, BarChart2 } from "lucide-react";
import { Skeleton } from "@/components/skeletons";
import { getDailyStatsFn } from "@/lib/fn";
import type { DailyPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

function fmtDay(date: string) {
  const [, m, d] = date.split("-");
  return `${d}.${m}`;
}

function DailyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  const bans = payload.find((p) => p.dataKey === "Баны")?.value ?? 0;
  const mutes = payload.find((p) => p.dataKey === "Муты")?.value ?? 0;
  const total = bans + mutes;

  return (
    <div className="rounded-xl border border-border/80 bg-surface/95 p-3 text-xs shadow-2xl backdrop-blur-md">
      <p className="font-bold text-fg border-b border-border/60 pb-1.5">{label}</p>
      <div className="mt-2 space-y-1">
        <p className="flex items-center justify-between gap-4 text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent shadow-[0_0_6px_var(--color-accent)]" />
            Баны:
          </span>
          <span className="font-bold tabular-nums text-fg">{bans}</span>
        </p>
        <p className="flex items-center justify-between gap-4 text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-warn shadow-[0_0_6px_var(--color-warn)]" />
            Муты:
          </span>
          <span className="font-bold tabular-nums text-fg">{mutes}</span>
        </p>
        <div className="mt-2 flex items-center justify-between gap-4 border-t border-border/60 pt-1.5 font-bold text-fg">
          <span>Всего:</span>
          <span className="text-accent tabular-nums">{total}</span>
        </div>
      </div>
    </div>
  );
}

export function DailyChart() {
  const [days, setDays] = useState<DailyPoint[] | null>(null);
  const [mode, setMode] = useState<"area" | "bar">("area");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let alive = true;
    void getDailyStatsFn()
      .then((d) => {
        if (alive) setDays(d);
      })
      .catch(() => {
        if (alive) setDays([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!days) {
    return (
      <section className="mt-6 rounded-3xl border border-border/80 bg-surface/90 glass-panel p-6 shadow-sm">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </section>
    );
  }

  const data = days.map((d) => ({ name: fmtDay(d.date), Баны: d.bans, Муты: d.mutes }));
  if (!data.length) return null;

  return (
    <section className="mt-6 rounded-3xl border border-border/80 bg-surface/90 glass-panel p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-fg">
            Динамика наказаний по дням
          </h2>
          <p className="text-xs text-muted mt-0.5">Суточная активность модераторов за текущий месяц</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
              Баны
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-warn shadow-[0_0_8px_var(--color-warn)]" />
              Муты
            </span>
          </div>

          {/* Toggle Area vs Bar */}
          <div className="flex items-center rounded-xl border border-border/60 bg-elevated/70 p-0.5">
            <button
              type="button"
              onClick={() => setMode("area")}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                mode === "area" ? "bg-accent/20 text-accent font-bold" : "text-muted hover:text-fg",
              )}
              title="Волновой график"
            >
              <Activity className="size-3.5" />
              Волна
            </button>
            <button
              type="button"
              onClick={() => setMode("bar")}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                mode === "bar" ? "bg-accent/20 text-accent font-bold" : "text-muted hover:text-fg",
              )}
              title="Столбчатый график"
            >
              <BarChart2 className="size-3.5" />
              Бары
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 h-64 w-full">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            {mode === "area" ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 4, left: -20 }}>
                <defs>
                  <linearGradient id="bansGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-bans)" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="var(--color-chart-bans)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="mutesGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-warn)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-warn)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
                <Tooltip cursor={{ stroke: "var(--color-border-strong)", strokeWidth: 1 }} content={<DailyTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Баны"
                  stroke="var(--color-chart-bans)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#bansGlow)"
                />
                <Area
                  type="monotone"
                  dataKey="Муты"
                  stroke="var(--color-warn)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#mutesGlow)"
                />
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 10, right: 10, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
                <Tooltip cursor={{ fill: "var(--color-elevated)", opacity: 0.5 }} content={<DailyTooltip />} />
                <Bar dataKey="Баны" stackId="a" fill="var(--color-chart-bans)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Муты" stackId="a" fill="var(--color-warn)" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <Skeleton className="h-full w-full rounded-2xl" />
        )}
      </div>
    </section>
  );
}
