import { useEffect, useMemo, useState } from "react";
import { Hammer, Loader2, RefreshCw, Trophy, Unlock, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStatsFn } from "@/lib/fn";
import { RANK_SHORT, fearProfileUrl } from "@/lib/constants";
import type { ModRow, StatsPayload } from "@/lib/types";
import { cn } from "@/lib/utils";

const TOP_RANKS = new Set([1, 2]);

function fmtMsk(sec: number) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(sec * 1000));
}

function PlaceMedal({ place }: { place: 1 | 2 | 3 }) {
  const fill = place === 1 ? "#E2B00B" : place === 2 ? "#8E9AA8" : "#C56A2D";
  const ribbon = place === 1 ? "#3B82F6" : place === 2 ? "#60A5FA" : "#2563EB";
  return (
    <svg viewBox="0 0 32 36" className="size-9 shrink-0" aria-label={`${place} место`}>
      <path d="M10 2h5.2l.8 10H9.4z" fill={ribbon} />
      <path d="M16.8 2H22l.6 10h-6.6z" fill={ribbon} />
      <circle cx="16" cy="22" r="12" fill={fill} />
      <circle cx="16" cy="22" r="9.2" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.6" />
      <text
        x="16"
        y="23.2"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize="12"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {place}
      </text>
    </svg>
  );
}

function rankOf(m: ModRow) {
  return Number(m.rank ?? 0);
}

export function TopsView() {
  const [data, setData] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await load(false);
      if (!cancelled) await load(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.moderators
      .filter((m) => TOP_RANKS.has(rankOf(m)))
      .slice()
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "ru"))
      .slice(0, 3);
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Собираю топ модераторов
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

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Топ месяца</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Топы модераторов</h1>
          <p className="mt-1 text-sm text-muted">
            Только топ-3 среди модераторов и мл. модераторов · {data.month}
            {data.stale ? " · кэш" : ""}
          </p>
        </div>
        <Button variant="secondary" onClick={() => void load(true)} disabled={refreshing}>
          {refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Обновить
        </Button>
      </header>

      {data.isMonthFirst && data.lastMonthTop ? (
        <div className="mt-6 rounded-lg border border-gold/40 bg-elevated px-5 py-4 text-center shadow-[var(--shadow-panel)] sm:px-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">ТОП 1 прошлого месяца. Поздравляем</p>
          <p className="mt-2 text-lg font-semibold tracking-tight">
            {data.lastMonthTop.steamid ? (
              <a
                href={fearProfileUrl(data.lastMonthTop.steamid)}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                {data.lastMonthTop.name}
              </a>
            ) : (
              data.lastMonthTop.name
            )}
            <span className="ml-1.5 text-sm font-normal text-muted">
              ({RANK_SHORT[Number(data.lastMonthTop.rank ?? 0)] ?? "мод"}) · {data.lastMonthTop.total}
            </span>
          </p>
        </div>
      ) : null}

      <section className="relative mt-6 overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-panel)]">
        <div className="absolute inset-y-0 left-0 w-1 bg-embed" aria-hidden="true" />
        <div className="flex items-center gap-2 px-5 py-4 sm:px-6">
          <Trophy className="size-4 text-gold" />
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Рейтинг</p>
        </div>
        {rows.length === 0 ? (
          <p className="border-t border-border px-5 py-8 text-sm text-muted sm:px-6">Пока нет модераторов в топе.</p>
        ) : (
          <ol>
            {rows.map((m, i) => (
              <li key={m.steamid} className="border-t border-border px-5 py-3.5 sm:px-6">
                <div className="flex items-center gap-2.5">
                  <PlaceMedal place={(i + 1) as 1 | 2 | 3} />
                  <p className="min-w-0 flex-1 truncate font-medium">
                    <a
                      href={fearProfileUrl(m.steamid)}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {m.name}
                    </a>
                    <span className="ml-1.5 font-normal text-muted">
                      ({RANK_SHORT[rankOf(m)] ?? "—"})
                    </span>
                  </p>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-fg">{m.total}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-8 text-sm tabular-nums text-muted">
                  <span className="inline-flex items-center gap-1 text-danger">
                    <Hammer className="size-3.5" />
                    {m.bans}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Unlock className="size-3.5" />
                    {m.removed}
                  </span>
                  <span className="inline-flex items-center gap-1 text-warn">
                    <VolumeX className="size-3.5" />
                    {m.mutes}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="border-t border-border px-5 py-3 text-center text-xs text-subtle sm:px-6">
          Ст. модеры, админы и стафф в этот рейтинг не входят
          <span className="mx-1.5">·</span>
          Обновлено {fmtMsk(data.updatedAt)} МСК
        </p>
      </section>
    </div>
  );
}
