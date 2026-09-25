import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ExternalLink,
  Loader2,
  MessageSquareWarning,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TicketCheck,
  Timer,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeaderSkeleton, RowsSkeleton } from "@/components/skeletons";
import { getSuspiciousFn } from "@/lib/fn";
import { fearProfileUrl } from "@/lib/constants";
import type { SuspiciousPayload, SuspiciousSource } from "@/lib/types";
import { cn } from "@/lib/utils";

const SOURCE_BADGES: Record<SuspiciousSource, { label: string; tone: "muted" | "warn" | "danger" }> = {
  online: { label: "Онлайн на сервере", tone: "muted" },
  ticket: { label: "Тикет", tone: "warn" },
  report: { label: "Жалоба в игре", tone: "danger" },
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
    const t = setInterval(() => void load(true), 30_000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 space-y-6">
        <PageHeaderSkeleton />
        <RowsSkeleton rows={5} />
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

  const players = data?.players ?? [];
  const tickets = data?.tickets ?? null;
  const ticketsWarning = tickets && (!tickets.configured || tickets.error) ? tickets : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 space-y-6 animate-in fade-in duration-300">
      {/* ── Top Header Banner ──────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-danger/30 bg-gradient-to-r from-danger/10 via-surface/95 to-elevated/80 p-6 sm:p-7 shadow-xl glass-panel cyber-border-glow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-danger/20 border border-danger/40 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-danger">
                СИСТЕМА МОНИТОРИНГА
              </span>
              {data?.updatedAt ? (
                <span className="font-mono text-xs text-subtle">
                  обновлено {fmtTime(data.updatedAt)} МСК
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-fg flex items-center gap-2.5">
              Подозрительные аккаунты
              <ShieldAlert className="size-6 text-danger animate-pulse" />
            </h1>
            <p className="mt-1 text-xs text-muted max-w-2xl leading-relaxed">
              В радаре отображаются исключительно игроки, находящиеся онлайн на серверах. Как только игрок
              выходит с сервера (даже если на него есть жалоба или тикет), он автоматически снимается со списка.
            </p>
          </div>

          <Button
            variant="secondary"
            className="h-10 rounded-xl border-border/80 bg-elevated/80 px-4 text-xs font-bold text-fg hover:border-danger/40 shadow-sm"
            disabled={refreshing}
            onClick={() => void load(true)}
          >
            {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Обновить радар
          </Button>
        </div>
      </div>

      {ticketsWarning ? (
        <div className="flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn/10 p-4 text-xs">
          <TriangleAlert className="mt-0.5 size-4.5 shrink-0 text-warn" />
          <div className="min-w-0">
            <p className="font-bold text-warn">Интеграция тикетов fearproject.ru не активна</p>
            <p className="mt-0.5 text-muted leading-relaxed">
              {!ticketsWarning.configured
                ? "В воркере статистики не задан FEAR_ADMIN_COOKIE — игроки из тикетов и жалобы временно не синхронизируются."
                : `Ошибка синхронизации тикетов: ${ticketsWarning.error}`}
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Suspicious Players List ─────────────────────────────────── */}
      {players.length === 0 ? (
        <div className="rounded-3xl border border-border/80 bg-surface/90 glass-panel px-6 py-16 text-center shadow-sm">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-success/15 border border-success/30 text-success shadow-lg shadow-success/10">
            <ShieldCheck className="size-8" />
          </div>
          <p className="mt-4 text-base font-extrabold text-fg">Подозрительных игроков онлайн не обнаружено</p>
          <p className="mt-1 text-xs text-muted">
            На серверах проекта сейчас нет активных игроков с жалобами или аномальной статистикой.
          </p>
          <p className="mt-3 font-mono text-[11px] text-subtle">
            Радар проверяет серверы каждые 30 секунд. Игроки не в сети в списке не отображаются.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-3xl border border-border/80 bg-surface/90 glass-panel shadow-sm">
          {players.map((p) => (
            <li
              key={p.steamid}
              className="flex flex-col gap-3.5 p-4.5 sm:flex-row sm:items-center sm:px-6 transition-colors hover:bg-elevated/40"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                <div className="relative shrink-0">
                  {p.avatar ? (
                    <img
                      src={p.avatar}
                      alt=""
                      className="size-11 shrink-0 rounded-2xl object-cover border-2 border-border/80 shadow-md"
                    />
                  ) : (
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-surface to-elevated text-sm font-black text-fg border-2 border-border/80 shadow-md">
                      {(p.nickname.trim().charAt(0) || "?").toUpperCase()}
                    </span>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface bg-success shadow-[0_0_8px_var(--color-success)]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-extrabold text-fg">{p.nickname || p.steamid}</p>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-success/15 border border-success/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-success">
                      <span className="size-1.5 rounded-full bg-success animate-pulse" />
                      В ИГРЕ
                    </span>
                  </div>
                  <p className="truncate font-mono text-[11px] text-subtle mt-0.5">
                    {p.steamid}
                    {p.server ? <span className="text-muted"> &middot; {p.server}</span> : ""}
                    {p.map ? <span className="text-accent font-semibold"> ({p.map})</span> : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <Badge tone={SOURCE_BADGES[p.source ?? "online"].tone} className="font-bold">
                  {SOURCE_BADGES[p.source ?? "online"].label}
                </Badge>

                {p.reason ? (
                  <Badge tone="danger" className="font-bold flex items-center gap-1">
                    <MessageSquareWarning className="size-3" />
                    {p.reason}
                  </Badge>
                ) : null}

                {p.reports != null && p.reports > 1 ? (
                  <Badge tone="muted" className="font-mono">
                    репортов: {p.reports}
                  </Badge>
                ) : null}

                {p.playtime > 0 ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-elevated/60 px-2.5 py-1 text-xs">
                    <span className="font-black text-danger">KD {p.kd.toFixed(2)}</span>
                    <span className="text-muted flex items-center gap-1">
                      <Timer className="size-3" />
                      {fmtPlaytime(p.playtime)}
                    </span>
                    <span className="font-mono text-subtle">
                      ({p.kills}/{p.deaths})
                    </span>
                  </div>
                ) : null}

                <Link
                  to="/player/$steamid"
                  params={{ steamid: p.steamid }}
                  className="inline-flex h-8 items-center rounded-xl border border-border/80 bg-elevated px-3 text-xs font-bold text-muted hover:border-accent hover:text-fg transition-all"
                >
                  История
                </Link>

                <a
                  href={fearProfileUrl(p.steamid)}
                  target="_blank"
                  rel="noreferrer"
                  title="Профиль на FearProject"
                  className="inline-flex size-8 items-center justify-center rounded-xl border border-border/80 bg-elevated text-muted hover:border-accent hover:text-fg transition-all"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-start gap-2 text-xs text-subtle px-1">
        <TicketCheck className="mt-0.5 size-4 shrink-0 text-accent" />
        <span>
          KD и игровое время вычисляются по данным профиля FearProject. Администрация и модераторы серверов
          исключены из проверки.
        </span>
      </p>
    </div>
  );
}
