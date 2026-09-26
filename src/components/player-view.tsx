import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock,
  Download,
  ExternalLink,
  Hammer,
  RefreshCw,
  Search,
  ShieldAlert,
  User,
  VolumeX,
} from "lucide-react";
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
  if (r.status === 3) return { label: "Выкуплен", className: "text-accent font-semibold" };
  if (r.status === 4 || (r.expires && r.expires <= Math.floor(Date.now() / 1000))) {
    return { label: "Истёк", className: "text-subtle" };
  }
  return { label: "Активен", className: "text-success font-bold" };
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
  const playerAvatar = records?.find((r) => r.avatar)?.avatar ?? null;
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
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 space-y-6">
        <PageHeaderSkeleton />
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded-xl" />
            <Skeleton className="h-4 w-64 rounded-xl" />
          </div>
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

  const banCount = (records ?? []).filter((r) => r.kind === "ban").length;
  const muteCount = (records ?? []).filter((r) => r.kind === "mute").length;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          to="/stats"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-elevated/70 px-3 py-1.5 text-xs font-bold text-muted hover:border-accent hover:text-fg transition-all shadow-sm"
        >
          <ArrowLeft className="size-3.5" />
          Назад к панели
        </Link>
      </div>

      {/* ── Player Header Card ─────────────────────────────────────── */}
      <article className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-r from-surface via-surface/95 to-elevated/70 p-6 sm:p-7 shadow-2xl glass-panel cyber-border-glow">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            {playerAvatar ? (
              <img
                src={playerAvatar}
                alt={playerName ?? "Avatar"}
                className="size-16 shrink-0 rounded-2xl object-cover border-2 border-border/80 shadow-md ring-2 ring-accent/20"
              />
            ) : (
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-surface to-elevated text-2xl font-black text-fg border-2 border-border/80 shadow-md">
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-xl sm:text-2xl font-black text-fg">
                {playerName ?? "Игрок"}
              </h1>
              <p className="mt-0.5 truncate font-mono text-xs text-subtle">{steamid}</p>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                <span>{month ? `Период: ${month}` : "Вся история"}</span>
                <span>&middot;</span>
                <span className="font-bold text-fg">{(records ?? []).length} наказаний</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={fearProfileUrl(steamid)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/80 bg-elevated/80 px-3.5 text-xs font-bold text-fg hover:border-accent hover:text-accent transition-all shadow-sm"
            >
              <ExternalLink className="size-3.5" />
              Профиль FEAR
            </a>
            <Button
              variant="secondary"
              size="sm"
              className="h-9 rounded-xl border-border/80 bg-elevated/80 px-3.5 text-xs font-bold text-fg hover:border-accent shadow-sm"
              onClick={exportCsv}
              disabled={!visible.length}
            >
              <Download className="size-3.5" />
              CSV
            </Button>
          </div>
        </div>

        {/* Quick stat chips */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 border-t border-border/60 pt-4">
          <div className="rounded-xl border border-danger/25 bg-danger/10 p-2.5 text-center">
            <p className="text-xl font-black text-danger tabular-nums">{banCount}</p>
            <p className="text-[11px] font-bold text-danger/80">Банов</p>
          </div>
          <div className="rounded-xl border border-warn/25 bg-warn/10 p-2.5 text-center">
            <p className="text-xl font-black text-warn tabular-nums">{muteCount}</p>
            <p className="text-[11px] font-bold text-warn/80">Мутов</p>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-accent/25 bg-accent/10 p-2.5 text-center">
            <p className="text-xl font-black text-accent tabular-nums">{(records ?? []).length}</p>
            <p className="text-[11px] font-bold text-accent">Всего</p>
          </div>
        </div>
      </article>

      {/* ── Sanctions History List ─────────────────────────────────── */}
      <section className="rounded-3xl border border-border/80 bg-surface/90 glass-panel overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border/60 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-extrabold text-fg uppercase tracking-wider">
              История наказаний игрока
            </h2>

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
                    "h-7.5 rounded-xl border px-3 text-xs font-bold transition-all",
                    kind === f.id
                      ? "border-accent bg-accent text-accent-fg shadow-sm"
                      : "border-border/60 bg-elevated/60 text-muted hover:text-fg",
                  )}
                >
                  {f.label}
                </button>
              ))}

              <Button
                variant="ghost"
                size="sm"
                className="h-7.5 w-7.5 rounded-xl border border-border/80 bg-elevated/60 p-0 text-muted hover:text-fg"
                onClick={() => void load()}
              >
                <RefreshCw className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по причине или никнейму модератора..."
              className="h-8.5 rounded-xl border-border/80 bg-elevated/70 pl-8.5 text-xs text-fg focus:border-accent"
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="px-5 py-12 text-center text-xs text-muted">
            {!records?.length
              ? "Наказаний не найдено."
              : "Ничего не найдено по заданному фильтру."}
          </p>
        ) : (
          <ul className="divide-y divide-border/60 max-h-[70vh] overflow-y-auto">
            {visible.map((r) => {
              const st = recordStatus(r);
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-elevated/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        tone={r.kind === "ban" ? "danger" : "warn"}
                        className="font-bold text-xs"
                      >
                        {r.kind === "ban" ? "Бан" : "Мут"}
                      </Badge>
                      <span className="font-mono text-[11px] text-subtle">
                        {fmtDateTime(r.created)} МСК
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-fg leading-snug">
                      {r.reason || "Причина не указана"}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                      {r.adminAvatar ? (
                        <img
                          src={r.adminAvatar}
                          alt=""
                          className="size-4.5 rounded-full object-cover shrink-0 border border-border/70"
                        />
                      ) : null}
                      <span>
                        Выдал: <span className="font-bold text-fg">{r.adminName}</span>
                        {r.adminRank ? ` (${r.adminRank})` : ""}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-mono tabular-nums text-muted">{r.durationLabel || "—"}</p>
                    <p className={cn("mt-0.5 text-xs", st.className)}>{st.label}</p>
                    <p className="mt-0.5 hidden font-mono text-[10px] text-subtle sm:block">
                      {fmtDate(r.created)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="flex items-center gap-2 text-xs text-subtle">
        <ShieldAlert className="size-3.5 text-accent" />
        История всех наказаний игрока синхронизирована с серверами FearProject за всё время.
      </p>
    </div>
  );
}
