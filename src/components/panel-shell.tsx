import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Command, Home, Search } from "lucide-react";
import { UserButton } from "@/lib/auth/gates";
import { ThemeSelect } from "@/components/theme-provider";
import { usePalette } from "@/components/command-palette";
import { NotificationBell } from "@/components/notification-bell";
import { StatusIndicator } from "@/components/status-indicator";
import { Skeleton } from "@/components/skeletons";
import { allowedTabs } from "@/lib/tabs";
import { usePanel } from "@/lib/panel";
import { getStatsFn } from "@/lib/fn";
import type { StatsPayload } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navItem =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-transparent px-2.5 text-xs font-medium text-muted transition-colors hover:bg-elevated hover:text-fg";
const navItemActive = "border-border bg-elevated text-fg";

export function PanelShell({ children }: { children: ReactNode }) {
  const { profile } = usePanel();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const setPaletteOpen = usePalette((s) => s.setOpen);
  const tabs = allowedTabs(profile.caps);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      ) {
        return;
      }
      if (e.key === "Escape") {
        if (pathname !== "/") void navigate({ to: "/" });
        return;
      }
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= 9) {
        const dest = tabs[n - 1];
        if (dest) void navigate({ to: dest.to });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, pathname, tabs]);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1440px] items-center gap-2 px-3 py-2 sm:px-4">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img
              src="/logo.png"
              alt="PremuteBOT logo"
              className="size-8 shrink-0 rounded-sm border border-border object-cover"
            />
            <span className="hidden text-sm font-semibold leading-none sm:block">PremuteBOT</span>
          </Link>

          <nav className="no-scrollbar hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex" aria-label="Разделы">
            <Link
              to="/"
              className={cn(navItem, pathname === "/" && navItemActive)}
              title="Главная · Esc"
            >
              <Home className="size-3.5" />
              Главная
            </Link>
            {tabs.map((t, i) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.id}
                  to={t.to}
                  className={cn(navItem, pathname === t.to && navItemActive)}
                  title={`${t.desc} · ${i + 1}`}
                >
                  <Icon className="size-3.5" />
                  {t.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-2 [&_>div>span:not(.sr-only)]:max-w-[7rem] [&_>div>span:not(.sr-only)]:truncate [&_button]:h-8">
            <StatusIndicator />
            <NotificationBell />
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              title="Палитра команд (Ctrl/⌘ + K)"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-border bg-elevated px-2 text-xs text-muted transition-colors hover:text-fg"
            >
              <Search className="size-3.5 md:hidden" />
              <Command className="hidden size-3.5 md:block" />
              <span className="hidden md:inline">K</span>
            </button>
            {profile.tag ? (
              <Badge className="hidden max-w-[9rem] truncate normal-case tracking-normal sm:inline-flex" tone="accent">
                {profile.tag}
              </Badge>
            ) : null}
            <ThemeSelect />
            <UserButton />
          </div>
        </div>
      </header>

      <main className="pb-20 md:pb-0">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/95 backdrop-blur-md md:hidden"
        aria-label="Разделы"
      >
        <div className="no-scrollbar flex items-stretch overflow-x-auto">
          <Link
            to="/"
            className={cn(
              "flex min-w-[4.25rem] flex-1 flex-col items-center gap-1 px-2 py-2 text-[10px] font-medium text-muted",
              pathname === "/" && "text-accent",
            )}
          >
            <Home className="size-4" />
            Главная
          </Link>
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.id}
                to={t.to}
                className={cn(
                  "flex min-w-[4.25rem] flex-1 flex-col items-center gap-1 px-2 py-2 text-[10px] font-medium text-muted",
                  pathname === t.to && "text-accent",
                )}
              >
                <Icon className="size-4" />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function fmtMonth(ym: string) {
  const d = new Date(`${ym}-01T00:00:00`);
  if (Number.isNaN(d.getTime())) return ym;
  return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

export function HomeTiles() {
  const { profile } = usePanel();
  const caps = profile.caps;
  const tiles = allowedTabs(caps);

  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(caps.canStats);

  useEffect(() => {
    if (!caps.canStats) return;
    let cancelled = false;
    void getStatsFn({ data: { refresh: false } })
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {
        /* на главной пропускаем тихо */
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caps.canStats]);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Доброй ночи" : hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";
  const name = profile.displayName || profile.tag || "модератор";
  const roleLine = profile.isOwner ? "Владелец панели" : profile.isBotOwner ? "Владелец бота" : "Модератор сервера";
  const initial = (name.trim().charAt(0) || "?").toUpperCase();

  const quick = stats?.totals
    ? [
        { label: "Баны", value: stats.totals.bans },
        { label: "Муты", value: stats.totals.mutes },
        { label: "Разбаны", value: stats.totals.removed },
        { label: "Всего", value: stats.totals.total },
      ]
    : [];

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          {profile.image ? (
            <img src={profile.image} alt="" className="size-12 shrink-0 rounded-full border border-border object-cover" />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-full border border-border bg-elevated text-lg font-semibold text-fg">
              {initial}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {greeting}, {name}
            </h1>
            <p className="mt-0.5 text-sm text-muted">{roleLine}</p>
          </div>
        </div>

        {caps.canStats ? (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-fg">Выдано наказаний</h2>
              <div className="flex items-center gap-3">
                {stats ? <span className="text-xs text-muted capitalize">{fmtMonth(stats.month)}</span> : null}
                <Link
                  to="/stats"
                  className="inline-flex h-8 items-center gap-1 rounded-sm border border-border bg-elevated px-2.5 text-xs text-muted transition-colors hover:text-fg"
                >
                  Подробнее
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>
            </div>
            {stats ? (
              <div className="mt-4 grid grid-cols-2 gap-3 min-[560px]:grid-cols-4">
                {quick.map((it) => (
                  <div key={it.label} className="rounded-xl border border-border bg-elevated/60 px-3 py-3 text-center">
                    <p className="text-2xl font-bold tabular-nums leading-none text-fg">{it.value}</p>
                    <p className="mt-1.5 text-xs text-muted">{it.label}</p>
                  </div>
                ))}
              </div>
            ) : statsLoading ? (
              <div className="mt-4 grid grid-cols-2 gap-3 min-[560px]:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[4.5rem] rounded-xl" />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Разделы</h2>
          <div className="mt-3 flex flex-wrap justify-center gap-3 lg:flex-nowrap">
            {tiles.map((i) => {
              const Icon = i.icon;
              return (
                <Link
                  key={i.id}
                  to={i.to}
                  className="group flex w-full items-center gap-3 rounded-md border border-border bg-surface p-4 text-left transition-colors hover:border-accent/40 hover:bg-elevated sm:w-[calc(50%-0.375rem)] lg:w-auto lg:min-w-0 lg:flex-1"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-sm border border-border bg-elevated text-accent transition-colors group-hover:border-accent/40">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">{i.label}</span>
                    <span className="block truncate text-xs text-muted">{i.desc}</span>
                  </span>
                  <ChevronRight className="ml-auto size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
