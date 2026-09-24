import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Clock3, Download, Gamepad2, Hammer, Loader2, RefreshCw, Unlock, VolumeX } from "lucide-react";
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
  const ratioTone = monthTarget == null ? "text-muted" : monthDone ? "text-accent" : "text-muted";

  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-panel)]">
      <div className="flex items-center gap-3">
        {m.avatar ? (
          <img
            src={m.avatar}
            alt=""
            loading="lazy"
            className="size-11 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-elevated text-base font-semibold text-fg"
          >
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <a
            href={fearProfileUrl(m.steamid)}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-[15px] font-semibold leading-tight hover:underline"
          >
            {handle}
          </a>
          <p className="mt-0.5 truncate font-mono text-[11px] text-subtle">
            {m.steamid}
            {m.rank ? ` · ${RANK_SHORT[m.rank] ?? "—"}` : ""}
          </p>
        </div>
        <PresenceBadge info={info} lastOnline={m.lastOnline} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 min-[560px]:grid-cols-4">
        <MetricTile
          value={m.bans ?? "—"}
          label="Банов выдано"
          className="border-border bg-elevated/60"
          valueClassName="text-fg"
        />
        <MetricTile
          value={m.mutes ?? "—"}
          label="Мутов выдано"
          className="border-border bg-elevated/60"
          valueClassName="text-fg"
        />
        <MetricTile
          value={m.total}
          label="Выдано за текущий месяц"
          className="border-border bg-elevated/70"
          valueClassName="text-fg"
        />
        <MetricTile
          value={m.removed ?? "—"}
          label="Снято · за период"
          className="border-border bg-elevated/70"
          valueClassName="text-fg"
        />
      </div>

      <div className="mt-2 flex items-center justify-between rounded-xl border border-border bg-elevated/60 px-3 py-2 text-xs">
        <span className="font-medium uppercase tracking-[0.18em] text-muted">Норма</span>
        <span className="tabular-nums text-muted">
          Мес{" "}
          <span className={cn("font-semibold", ratioTone)}>
            {m.total}/{monthTarget ?? "—"}
          </span>
        </span>
      </div>

      {m.prevTotal != null || m.best ? (
        <p className="mt-2 text-center text-[11px] text-subtle">
          {m.prevTotal != null ? `Прошлый месяц: ${m.prevTotal}` : null}
          {m.best ? `${m.prevTotal != null ? " · " : ""}Лучший: ${m.best.total} (${m.best.month})` : null}
        </p>
      ) : null}

      {m.slug ? (
        <Link
          to="/$slug"
          params={{ slug: m.slug }}
          className="mt-2 inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-sm border border-border bg-elevated text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-fg"
        >
          Подробнее
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

  // Автообновление раз в 5 минут (тихо, без спиннера).
  useEffect(() => {
    const t = setInterval(() => void load(true), 5 * 60_000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
        <PageHeaderSkeleton />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-md" />
          ))}
        </div>
        <CardsSkeleton count={6} />
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
  const payload = data;

  const tiles = [
    { key: "bans", label: "Баны", value: data.totals.bans, icon: Hammer },
    { key: "removed", label: "Разбаны", value: data.totals.removed, icon: Unlock },
    { key: "mutes", label: "Муты", value: data.totals.mutes, icon: VolumeX },
    { key: "total", label: "Всего", value: data.totals.total, icon: null },
  ] as const;
  const prevTotals = data.prevTotals ?? null;

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
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
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
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => void load(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Обновить
          </Button>
          <Button variant="secondary" onClick={exportCsv} title="Экспорт статистики в CSV">
            <Download />
            CSV
          </Button>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((c) => {
          const prev = prevTotals ? prevTotals[c.key] : null;
          const delta = prev != null ? c.value - prev : null;
          return (
            <div key={c.label} className="rounded-md border border-border bg-surface p-4 shadow-[var(--shadow-panel)]">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-medium uppercase tracking-wider">{c.label}</span>
                {c.icon ? <c.icon className="size-4 text-muted" /> : null}
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-fg">{c.value}</p>
              {delta != null ? (
                <p className="mt-1 text-[11px] text-subtle">
                  {delta > 0 ? `+${delta}` : delta < 0 ? `−${Math.abs(delta)}` : "±0"} к прошлому месяцу
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <DailyChart />

      <ModeratorsChart mods={data.moderators} />

      <section className="mt-8">
        <div className="flex items-end justify-between px-1">
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Модераторы</h2>
          <p className="text-xs tabular-nums text-subtle">{data.moderators.length}</p>
        </div>
        {data.moderators.length === 0 ? (
          <p className="mt-5 rounded-lg border border-border bg-surface px-5 py-10 text-center text-sm text-muted">
            В этом месяце наказаний ещё нет.
          </p>
        ) : (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {data.moderators.map((m) => (
            <ModeratorCard
              key={m.steamid}
              m={m}
              info={online[m.steamid]}
            />
          ))}
        </div>
        )}
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-panel)]">
          <div className="border-t border-border px-5 py-5 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Итого</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles.map((t) => (
              <div key={t.label}>
                <dt className="text-xs text-subtle">{t.label}</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-fg">{t.value}</dd>
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
      <span className="ml-auto mr-2 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
        <Gamepad2 className="size-3.5" />
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
