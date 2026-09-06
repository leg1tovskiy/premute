import { useEffect, useState } from "react";
import { Gamepad2, Hammer, Loader2, RefreshCw, Unlock, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStatsFn, moderatorOnlineFn } from "@/lib/fn";
import { RANK_SHORT } from "@/lib/constants";
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

function placeTone(i: number) {
  if (i === 0) return "text-gold";
  if (i === 1) return "text-silver";
  if (i === 2) return "text-bronze";
  return "text-subtle";
}

export function StatsView() {
  const [data, setData] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState<Record<string, OnlineInfo>>({});

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

  // Кто из модеров сейчас в игре на серверах FEAR — обновляем раз в минуту
  useEffect(() => {
    let alive = true;
    async function pull(ids: string[]) {
      if (!ids.length) return;
      try {
        const res = await moderatorOnlineFn({ data: { ids } });
        if (alive) setOnline(res);
      } catch {
        /* тихо: индикатор не критичен */
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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Собираю статистику FEAR
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-danger">{error}</p>
        <Button className="mt-4" onClick={() => void load(true)}>
          Повторить
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const tiles = [
    { label: "Баны", value: data.totals.bans, icon: Hammer, tone: "text-danger" },
    { label: "Разбаны", value: data.totals.removed, icon: Unlock, tone: "text-muted" },
    { label: "Муты", value: data.totals.mutes, icon: VolumeX, tone: "text-warn" },
    { label: "Всего", value: data.totals.total, icon: null, tone: "text-fg" },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">FearProject</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Статистика за {fmtDay(data.updatedAt)}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {data.month}
            {data.stale ? " · кэш" : ""} · обновлено {fmtMsk(data.updatedAt)} МСК
          </p>
        </div>
        <Button variant="secondary" onClick={() => void load(true)} disabled={refreshing}>
          {refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Обновить
        </Button>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((c) => (
          <div key={c.label} className="rounded-md border border-border bg-surface p-4 shadow-[var(--shadow-panel)]">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-medium uppercase tracking-wider">{c.label}</span>
              {c.icon ? <c.icon className={cn("size-4", c.tone)} /> : null}
            </div>
            <p className={cn("mt-2 text-3xl font-semibold tabular-nums tracking-tight", c.tone)}>{c.value}</p>
          </div>
        ))}
      </div>

      <section className="relative mt-6 overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-panel)]">
        <div className="absolute inset-y-0 left-0 w-1 bg-embed" aria-hidden="true" />
        <div className="px-5 py-4 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Модераторы</p>
        </div>
        <ol>
          {data.moderators.map((m, i) => (
            <li
              key={m.steamid}
              className="border-t border-border px-5 py-3.5 sm:px-6"
            >
              <div className="flex items-baseline gap-2">
                <span className={cn("w-6 shrink-0 text-sm font-semibold tabular-nums", placeTone(i))}>
                  {i + 1}.
                </span>
                <p className="min-w-0 flex-1 truncate font-medium">
                  {m.name}
                  <span className="ml-1.5 font-normal text-muted">
                    ({m.rank ? RANK_SHORT[m.rank] ?? "—" : "—"})
                  </span>
                </p>
                <OnlineBadges info={online[m.steamid]} />
                {m.pct != null ? (
                  <span
                    className={cn(
                      "shrink-0 text-sm tabular-nums",
                      m.done ? "text-success" : "text-muted",
                    )}
                  >
                    {m.pct}%{m.done ? " ✓" : ""}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-8 text-sm tabular-nums text-muted">
                <Count icon={Hammer} n={m.bans} tone="text-danger" />
                <Count icon={Unlock} n={m.removed} />
                <Count icon={VolumeX} n={m.mutes} tone="text-warn" />
                <span className="font-semibold text-fg">= {m.total}</span>
              </div>
              {m.pct != null ? (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-elevated pl-0 sm:ml-8">
                  <div
                    className={cn("h-full rounded-full", m.done ? "bg-success" : "bg-accent")}
                    style={{ width: `${Math.min(100, Math.max(2, m.pct))}%` }}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
        <div className="border-t border-border px-5 py-5 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Итого</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles.map((t) => (
              <div key={t.label}>
                <dt className="text-xs text-subtle">{t.label}</dt>
                <dd className={cn("mt-1 text-xl font-semibold tabular-nums", t.tone)}>{t.value}</dd>
              </div>
            ))}
          </dl>
          {data.totals.excluded ? (
            <p className="mt-3 text-xs text-subtle">Исключено (тикет / поддержка): {data.totals.excluded}</p>
          ) : null}
        </div>
        <p className="border-t border-border px-5 py-3 text-center text-xs text-subtle sm:px-6">
          Статистика была взята с официального сайта FearProject.ru
          <span className="mx-1.5">·</span>
          Обновлено {fmtMsk(data.updatedAt)} МСК
        </p>
      </section>
    </div>
  );
}

function Count({
  icon: Icon,
  n,
  tone,
}: {
  icon: typeof Hammer;
  n: number;
  tone?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", tone)}>
      <Icon className="size-3.5" />
      {n}
    </span>
  );
}

function OnlineBadges({ info }: { info?: OnlineInfo }) {
  if (!info) return null;
  return (
    <span className="ml-auto mr-2 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
      <Gamepad2 className="size-3.5" />
      <span className="max-w-44 truncate" title={info.map ? `${info.server} · ${info.map}` : info.server}>
        {info.server}
      </span>
    </span>
  );
}
