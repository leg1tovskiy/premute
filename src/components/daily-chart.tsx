import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/skeletons";
import { getDailyStatsFn } from "@/lib/fn";
import type { DailyPoint } from "@/lib/types";

function fmtDay(date: string) {
  const [, m, d] = date.split("-");
  return `${d}.${m}`;
}

function DailyTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  const bans = payload.find((p) => p.dataKey === "Баны")?.value ?? 0;
  const mutes = payload.find((p) => p.dataKey === "Муты")?.value ?? 0;
  const total = bans + mutes;
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        padding: "8px 10px",
        fontSize: 12,
        color: "var(--color-fg)",
        minWidth: 110,
      }}
    >
      <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
      <p style={{ margin: "6px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--color-chart-bans)", flexShrink: 0 }} />
        Баны: {bans}
      </p>
      <p style={{ margin: "3px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--color-chart-mutes)", flexShrink: 0 }} />
        Муты: {mutes}
      </p>
      <p style={{ margin: "6px 0 0", fontWeight: 600, borderTop: "1px solid var(--color-border)", paddingTop: 6 }}>общее: {total}</p>
    </div>
  );
}

export function DailyChart() {
  const [days, setDays] = useState<DailyPoint[] | null>(null);
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
      <section className="mt-8 rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-panel)] sm:p-5">
        <Skeleton className="h-56 w-full" />
      </section>
    );
  }

  const data = days.map((d) => ({ name: fmtDay(d.date), Баны: d.bans, Муты: d.mutes }));
  if (!data.length) return null;

  return (
    <section className="mt-8 rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-panel)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
          Наказания по дням за месяц
        </h2>
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: "var(--color-chart-bans)" }} aria-hidden="true" />
            Баны
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: "var(--color-chart-mutes)" }} aria-hidden="true" />
            Муты
          </span>
        </div>
      </div>
      <div className="mt-4 h-56 w-full">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -22 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
              <Tooltip cursor={{ fill: "var(--color-elevated)" }} content={<DailyTooltip />} />
              <Bar dataKey="Баны" stackId="a" fill="var(--color-chart-bans)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Муты" stackId="a" fill="var(--color-chart-mutes)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Skeleton className="h-full w-full" />
        )}
      </div>
    </section>
  );
}
