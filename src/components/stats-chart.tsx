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
import type { ModRow } from "@/lib/types";

function shortName(m: ModRow): string {
  const raw = m.discord && m.discord !== m.name ? m.discord : m.name;
  const clean = raw.trim().replace(/^@/, "");
  return clean.length > 14 ? `${clean.slice(0, 13)}…` : clean;
}

export function ModeratorsChart({ mods }: { mods: ModRow[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const data = [...mods]
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "ru"))
    .slice(0, 10)
    .map((m) => ({
      name: shortName(m),
      Баны: m.bans ?? 0,
      Муты: m.mutes ?? 0,
    }));

  if (data.length === 0) return null;

  return (
    <section className="mt-8 rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-panel)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
          Топ-10 по наказаниям за месяц
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
      <div className="mt-4 h-72 w-full">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="name"
                interval={0}
                angle={-24}
                textAnchor="end"
                height={58}
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
              />
              <Tooltip
                cursor={{ fill: "var(--color-elevated)" }}
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  color: "var(--color-fg)",
                  fontSize: 12,
                }}
              />
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
