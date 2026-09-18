import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ExternalLink,
  Gavel,
  Loader2,
  MessageSquareWarning,
  RefreshCw,
  ShieldAlert,
  TicketCheck,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeaderSkeleton, RowsSkeleton } from "@/components/skeletons";
import { getSuspiciousFn } from "@/lib/fn";
import { fearProfileUrl } from "@/lib/constants";
import type { SuspiciousPayload, SuspiciousSource } from "@/lib/types";

/** Как бейдж выглядит для каждого источника попадания игрока в список. */
const SOURCE_BADGES: Record<SuspiciousSource, { label: string; tone: "muted" | "warn" | "danger" }> = {
  online: { label: "Онлайн", tone: "muted" },
  ticket: { label: "Тикет", tone: "warn" },
  report: { label: "Жалоба", tone: "danger" },
};

function fmtPlaytime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  return `${Math.max(1, m)}м`;
}

function fmtTime(sec: number) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(sec * 1000));
  } catch {
    return "";
  }
}

export function SuspiciousView() {
  const [data, setData] = useState<SuspiciousPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setData(await getSuspiciousFn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось получить список");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(true), 60_000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
        <PageHeaderSkeleton />
        <div className="mt-8">
          <RowsSkeleton rows={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-danger">{error}</p>
        <Button className="mt-4" onClick={() => void load()}>
          Повторить
        </Button>
      </div>
    );
  }

  const players = data?.players ?? [];
  const tickets = data?.tickets ?? null;
  const ticketsWarning = tickets && (!tickets.configured || tickets.error) ? tickets : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Античит</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Подозрительные аккаунты</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Онлайн-игроки с KD выше 2 и наигранными меньше 2 часов, нарушители из тикетов
            fearproject.ru и все, на кого жаловались по причине «Спам микрофон/чат» или «Токсичность».
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data?.updatedAt ? (
            <span className="text-xs text-subtle">обновлено {fmtTime(data.updatedAt)} МСК</span>
          ) : null}
          <Button variant="secondary" size="sm" disabled={refreshing} onClick={() => void load(true)}>
            {refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Обновить
          </Button>
        </div>
      </header>

      {ticketsWarning ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-warn/25 bg-warn/10 px-4 py-3">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" />
          <div className="min-w-0 text-xs">
            <p className="font-medium text-warn">Тикеты fearproject.ru не подключены</p>
            <p className="mt-0.5 text-subtle">
              {!ticketsWarning.configured
                ? "В воркере статистики не задан FEAR_ADMIN_COOKIE — игроки из тикетов и жалобы пока не попадают в список."
                : `Не удалось получить тикеты: ${ticketsWarning.error}`}
            </p>
          </div>
        </div>
      ) : null}

      {players.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface px-5 py-14 text-center shadow-[var(--shadow-panel)]">
          <ShieldAlert className="mx-auto size-6 text-success" />
          <p className="mt-3 text-sm font-medium">Сейчас подозрительных аккаунтов нет</p>
          <p className="mt-1 text-xs text-subtle">Список обновляется автоматически раз в минуту.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-panel)]">
          {players.map((p) => (
            <li key={p.steamid} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {p.avatar ? (
                  <img src={p.avatar} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-elevated text-sm font-medium">
                    {(p.nickname.trim().charAt(0) || "?").toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.nickname || p.steamid}</p>
                  <p className="truncate font-mono text-[11px] text-subtle">
                    {p.steamid}
                    {p.server ? ` · ${p.server}` : ""}
                    {p.map ? ` · ${p.map}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <Badge tone={SOURCE_BADGES[p.source ?? "online"].tone}>
                  {SOURCE_BADGES[p.source ?? "online"].label}
                </Badge>
                {p.reason ? (
                  <Badge tone="danger" className="normal-case">
                    <MessageSquareWarning className="size-3" />
                    {p.reason}
                  </Badge>
                ) : null}
                {p.reports != null && p.reports > 1 ? <Badge tone="muted">жалоб: {p.reports}</Badge> : null}
                {p.playtime > 0 ? (
                  <>
                    <Badge tone="danger">KD {p.kd.toFixed(2)}</Badge>
                    <span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted">
                      <Timer className="size-3.5" />
                      {fmtPlaytime(p.playtime)}
                    </span>
                    <span className="text-xs tabular-nums text-subtle">
                      {p.kills}/{p.deaths}
                    </span>
                  </>
                ) : null}
                <Link
                  to="/player/$steamid"
                  params={{ steamid: p.steamid }}
                  className="inline-flex h-8 items-center rounded-sm border border-border bg-elevated px-2.5 text-xs font-medium text-muted transition-colors hover:text-fg"
                >
                  Профиль
                </Link>
                <a
                  href={fearProfileUrl(p.steamid)}
                  target="_blank"
                  rel="noreferrer"
                  title="Профиль на FearProject"
                  className="inline-flex size-8 items-center justify-center rounded-sm border border-border bg-elevated text-muted transition-colors hover:text-fg"
                >
                  <ExternalLink className="size-3.5" />
                </a>
                {p.source === 'report' ? (
                  <Link
                    to="/moderation"
                    search={{ target: p.steamid }}
                    className="inline-flex h-8 items-center gap-1 rounded-sm bg-accent px-2.5 text-xs font-medium text-accent-fg transition-[filter] hover:brightness-110"
                  >
                    <Gavel className="size-3.5" />
                    Рассмотреть жалобу
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 flex items-start gap-1.5 text-xs text-subtle">
        <TicketCheck className="mt-0.5 size-3.5 shrink-0" />
        <span>
          KD и время считаются из профиля FearProject; админы серверов в список не попадают. Жалобы и
          тикеты берутся из админки fearproject.ru.
        </span>
      </p>
    </div>
  );
}
