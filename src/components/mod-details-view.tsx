import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ChevronLeft, Download, ExternalLink, Hammer, RefreshCw, Search, Unlock, VolumeX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeaderSkeleton, RowsSkeleton, Skeleton } from "@/components/skeletons";
import { getModDetailsFn } from "@/lib/fn";
import { downloadCsv } from "@/lib/csv";
import { RANK_SHORT, fearProfileUrl } from "@/lib/constants";
import type { ModDetails, PunishmentRecord } from "@/lib/types";
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

function fmtUpdated(sec: number) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(sec * 1000));
  } catch {
    return "—";
  }
}

function recordStatus(r: PunishmentRecord): { label: string; className: string } {
  if (r.unpunishAdmin || r.status === 2) return { label: "Снято", className: "text-subtle" };
  if (r.expires && r.expires <= Math.floor(Date.now() / 1000)) {
    return { label: "Истёк", className: "text-subtle" };
  }
  return { label: "Активен", className: "text-success" };
}

function MetricTile({
  value,
  label,
  className,
  valueClassName,
}: {
  value: number | string;
  label: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border px-3 py-3 text-center", className)}>
      <p className={cn("text-2xl font-bold tabular-nums leading-none", valueClassName)}>{value}</p>
      <p className="mt-1.5 text-xs font-medium leading-tight text-muted">{label}</p>
    </div>
  );
}

export function ModDetailsView() {
  const { slug } = useParams({ from: "/_panel/$slug" });
  const [data, setData] = useState<ModDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<"all" | "ban" | "mute">("all");
  const [status, setStatus] = useState<"all" | "active" | "expired" | "removed">("all");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const next = await getModDetailsFn({ data: { slug } });
      setData(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить статистику модератора");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const records = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const now = Math.floor(Date.now() / 1000);
    return [...data.records]
      .sort((a, b) => b.created - a.created)
      .filter((r) => {
        if (kind !== "all" && r.kind !== kind) return false;
        const st =
          r.unpunishAdmin || r.status === 2
            ? "removed"
            : r.expires && r.expires <= now
              ? "expired"
              : "active";
        if (status !== "all" && st !== status) return false;
        if (!q) return true;
        return r.player.toLowerCase().includes(q) || (r.reason || "").toLowerCase().includes(q);
      });
  }, [data, kind, status, search]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
        <PageHeaderSkeleton />
        <div className="mt-8 flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 min-[560px]:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="mt-8">
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

  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Модератор не найден</h1>
        <p className="mt-2 text-sm text-muted">
          Возможно, ссылка устарела или модератор больше не в составе.
        </p>
        <Link
          to="/stats"
          className="mt-6 inline-flex h-9 items-center gap-1 rounded-sm border border-border bg-elevated px-3 text-xs font-medium text-muted transition-colors hover:text-fg"
        >
          <ChevronLeft className="size-3.5" />
          К статистике
        </Link>
      </div>
    );
  }

  const m = data.moderator;
  const handle = m.discord && m.discord !== m.name ? m.discord : m.name;
  const initial = (handle.trim().charAt(0) || "?").toUpperCase();
  const monthTarget = m.norma?.month ?? null;
  const monthDone = monthTarget != null && monthTarget > 0 && m.total >= monthTarget;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <Link
        to="/stats"
        className="inline-flex h-8 items-center gap-1 rounded-sm border border-border bg-elevated px-2 text-xs font-medium text-muted transition-colors hover:text-fg"
      >
        <ChevronLeft className="size-3.5" />
        Статистика
      </Link>

      <article className="mt-4 flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-panel)] sm:p-5">
        <div className="flex items-center gap-3">
          {m.avatar ? (
            <img src={m.avatar} alt="" className="size-12 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-elevated text-lg font-semibold text-fg">
              {initial}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <Link
              to="/player/$steamid"
              params={{ steamid: m.steamid }}
              className="block truncate text-xl font-semibold leading-tight hover:underline"
            >
              {handle}
            </Link>
            <p className="mt-0.5 flex items-center gap-1.5 truncate font-mono text-xs text-subtle">
              <span className="truncate">{m.steamid}</span>
              {m.rank ? <span>· {RANK_SHORT[m.rank] ?? "—"}</span> : null}
              <a
                href={fearProfileUrl(m.steamid)}
                target="_blank"
                rel="noreferrer"
                title="Профиль на FearProject"
                className="inline-flex shrink-0 text-subtle transition-colors hover:text-fg"
              >
                <ExternalLink className="size-3" />
              </a>
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 min-[560px]:grid-cols-4">
          <MetricTile value={m.bans ?? "—"} label="Банов выдано" className="border-border bg-elevated/60" />
          <MetricTile value={m.mutes ?? "—"} label="Мутов выдано" className="border-border bg-elevated/60" />
          <MetricTile
            value={m.total}
            label="Выдано за период"
            className="border-border bg-elevated/70"
          />
          <MetricTile value={m.removed ?? "—"} label="Снято · за период" className="border-border bg-elevated/70" />
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-elevated/60 px-3 py-2 text-xs">
          <span className="font-medium uppercase tracking-[0.18em] text-muted">Норма</span>
          <span className="tabular-nums text-muted">
            Мес{" "}
            <span className={cn("font-semibold", monthDone ? "text-accent" : "text-fg")}>
              {m.total}/{monthTarget ?? "—"}
            </span>
          </span>
        </div>

        <p className="mt-3 text-xs text-subtle">
          {data.month} · данные на {fmtUpdated(data.updatedAt)} МСК
        </p>
      </article>

      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Все наказания за период
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
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
            <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
            {(
              [
                { id: "all", label: "Любой статус" },
                { id: "active", label: "Активные" },
                { id: "expired", label: "Истёкшие" },
                { id: "removed", label: "Снятые" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatus(f.id)}
                className={cn(
                  "h-7 rounded-sm border px-2.5 text-xs font-medium transition-colors",
                  status === f.id
                    ? "border-border bg-elevated text-fg"
                    : "border-transparent text-muted hover:text-fg",
                )}
              >
                {f.label}
              </button>
            ))}
            <Button
              variant="secondary"
              size="sm"
              className="h-7"
              onClick={() =>
                data &&
                downloadCsv(`mod-${m.steamid}.csv`, [
                  ["Дата", "Игрок", "SteamID игрока", "Тип", "Срок", "Статус", "Причина"],
                  ...records.map((r) => [
                    fmtDateTime(r.created),
                    r.player,
                    r.playerSteamid,
                    r.kind === "ban" ? "Бан" : "Мут",
                    r.durationLabel || "",
                    recordStatus(r).label,
                    r.reason || "",
                  ]),
                ])
              }
              disabled={!records.length}
              title="Экспорт наказаний в CSV"
            >
              <Download className="size-3.5" />
              CSV
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => void load()}>
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по игроку или причине"
            className="h-9 pl-9"
          />
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-panel)]">
          {records.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">
              {data.records.length === 0 ? "За текущий месяц наказаний нет." : "Ничего не найдено по фильтру."}
            </p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
              {records.map((r) => {
                const st = recordStatus(r);
                return (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-elevated text-xs font-medium">
                      {(r.player.trim().charAt(0) || "?").toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={fearProfileUrl(r.playerSteamid)}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {r.player}
                      </a>
                      <p className="truncate font-mono text-[11px] text-subtle">{r.playerSteamid}</p>
                      {r.reason ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted" title={r.reason}>
                          {r.reason}
                        </p>
                      ) : null}
                    </div>
                    <Badge tone={r.kind === "ban" ? "danger" : "warn"} className="shrink-0">
                      {r.kind === "ban" ? "Бан" : "Мут"}
                    </Badge>
                    <span className="hidden w-16 shrink-0 text-right text-xs tabular-nums text-muted min-[560px]:block">
                      {r.durationLabel || "—"}
                    </span>
                    <span className={cn("w-16 shrink-0 text-right text-xs font-medium", st.className)}>
                      {st.label}
                    </span>
                    <span className="hidden w-24 shrink-0 text-right font-mono text-[11px] text-subtle sm:block">
                      {fmtDate(r.created)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
          <span className="inline-flex items-center gap-1.5">
            <Hammer className="size-3.5 text-danger" />
            {data.records.filter((r) => r.kind === "ban").length} банов
          </span>
          <span className="inline-flex items-center gap-1.5">
            <VolumeX className="size-3.5 text-warn" />
            {data.records.filter((r) => r.kind === "mute").length} мутов
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Unlock className="size-3.5" />
            {data.records.filter((r) => r.unpunishAdmin || r.status === 2).length} снято
          </span>
        </p>
      </section>
    </div>
  );
}
