import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ChevronLeft, Download, ExternalLink, Gavel, RefreshCw, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeaderSkeleton, RowsSkeleton, Skeleton } from "@/components/skeletons";
import { getPlayerRecordsFn } from "@/lib/fn";
import { downloadCsv } from "@/lib/csv";
import { fearProfileUrl } from "@/lib/constants";
import type { PlayerRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

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

function recordStatus(r: PlayerRecord): { label: string; className: string } {
  if (r.unpunishAdmin || r.status === 2) return { label: "Снято", className: "text-subtle" };
  if (r.expires && r.expires <= Math.floor(Date.now() / 1000)) {
    return { label: "Истёк", className: "text-subtle" };
  }
  return { label: "Активен", className: "text-success" };
}

export function PlayerView() {
  const { steamid } = useParams({ from: "/_panel/player/$steamid" });
  const [records, setRecords] = useState<PlayerRecord[] | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<"all" | "ban" | "mute">("all");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getPlayerRecordsFn({ data: { steamid } });
      setRecords(res.records);
      setMonth(res.month);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить историю игрока");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steamid]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (records ?? []).filter((r) => {
      if (kind !== "all" && r.kind !== kind) return false;
      if (!q) return true;
      return (
        (r.reason || "").toLowerCase().includes(q) ||
        r.adminName.toLowerCase().includes(q)
      );
    });
  }, [records, kind, search]);

  const playerName = records?.[0]?.player ?? null;
  const initial = (playerName?.trim().charAt(0) || "?").toUpperCase();

  function exportCsv() {
    downloadCsv(
      `player-${steamid}.csv`,
      [
        ["Дата", "Тип", "Срок", "Статус", "Модератор", "Причина", "SteamID игрока"],
        ...visible.map((r) => [
          fmtDateTime(r.created),
          r.kind === "ban" ? "Бан" : "Мут",
          r.durationLabel || "",
          recordStatus(r).label,
          r.adminName,
          r.reason || "",
          r.playerSteamid,
        ]),
      ],
    );
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
        <PageHeaderSkeleton />
        <div className="mt-8 flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
        </div>
        <div className="mt-6">
          <RowsSkeleton rows={6} />
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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <Link
        to="/stats"
        className="inline-flex h-8 items-center gap-1 rounded-sm border border-border bg-elevated px-2 text-xs font-medium text-muted transition-colors hover:text-fg"
      >
        <ChevronLeft className="size-3.5" />
        Назад
      </Link>

      <article className="mt-4 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-panel)] sm:flex-row sm:items-center sm:p-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-elevated text-lg font-semibold text-fg">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {playerName ?? "Игрок"}
          </h1>
          <p className="mt-0.5 truncate font-mono text-xs text-subtle">{steamid}</p>
          <p className="mt-1 text-xs text-muted">
            {month ? `Наказания за ${month}` : "Текущий месяц"}
            {records ? ` · всего ${records.length}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/moderation"
            search={{ target: steamid }}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-accent px-3 text-xs font-medium text-accent-fg transition-[filter] hover:brightness-110"
          >
            <Gavel className="size-3.5" />
            Наказать
          </Link>
          <a
            href={fearProfileUrl(steamid)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border bg-elevated px-3 text-xs font-medium text-muted transition-colors hover:text-fg"
          >
            <ExternalLink className="size-3.5" />
            Профиль FEAR
          </a>
          <Button variant="secondary" size="sm" className="h-9" onClick={exportCsv} disabled={!visible.length}>
            <Download className="size-3.5" />
            CSV
          </Button>
        </div>
      </article>

      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted">История наказаний</h2>
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: "all", label: "Все" },
                { id: "ban", label: "Баны" },
                { id: "mute", label: "Муты" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setKind(f.id)}
                className={cn(
                  "h-7 rounded-sm border px-2.5 text-xs font-medium transition-colors",
                  kind === f.id
                    ? "border-border bg-elevated text-fg"
                    : "border-transparent text-muted hover:text-fg",
                )}
              >
                {f.label}
              </button>
            ))}
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => void load()}>
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по причине или модератору"
            className="h-9"
          />
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-panel)]">
          {visible.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">
              {!records?.length
                ? "За текущий месяц наказаний нет."
                : "Ничего не найдено по фильтру."}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((r) => {
                const st = recordStatus(r);
                return (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={r.kind === "ban" ? "danger" : "warn"}>
                          {r.kind === "ban" ? "Бан" : "Мут"}
                        </Badge>
                        <span className="font-mono text-[11px] text-subtle">{fmtDateTime(r.created)} МСК</span>
                      </div>
                      <p className="mt-1 text-sm leading-snug">{r.reason || "Без причины"}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        Выдал: {r.adminName}
                        {r.adminRank ? ` (${r.adminRank})` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs tabular-nums text-muted">{r.durationLabel || "—"}</p>
                      <p className={cn("mt-0.5 text-xs font-medium", st.className)}>{st.label}</p>
                      <p className="mt-0.5 hidden font-mono text-[11px] text-subtle sm:block">{fmtDate(r.created)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {!records?.length ? (
          <p className="mt-4 flex items-center gap-2 text-xs text-subtle">
            <ShieldAlert className="size-3.5" />
            Воркер хранит наказания текущего месяца; полная история — в профиле FEAR.
          </p>
        ) : null}
      </section>
    </div>
  );
}
