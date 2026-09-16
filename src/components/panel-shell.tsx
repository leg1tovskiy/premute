import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Power,
  ScrollText,
  Shield,
  ShieldCheck,
  SquareTerminal,
  Trophy,
  Users,
  Volume2,
} from "lucide-react";
import { UserButton } from "@/lib/auth/gates";
import { ThemeSelect } from "@/components/theme-provider";
import { getStatsFn } from "@/lib/fn";
import type { Caps, StaffProfile, StatsPayload } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export type Tab =
  | "home"
  | "stats"
  | "tops"
  | "moderation"
  | "voice"
  | "logs"
  | "power"
  | "console"
  | "mods"
  | "admin";

const TAB_ITEMS: { id: Exclude<Tab, "home">; label: string; desc: string; icon: typeof BarChart3 }[] = [
  { id: "stats", label: "Стата", desc: "Статистика модераторов", icon: BarChart3 },
  { id: "tops", label: "Топы", desc: "Рейтинг модераторов", icon: Trophy },
  { id: "moderation", label: "Модер", desc: "Наказания и модерация", icon: ShieldCheck },
  { id: "voice", label: "Голос", desc: "Озвучка", icon: Volume2 },
  { id: "logs", label: "Логи", desc: "Журнал событий", icon: ScrollText },
  { id: "power", label: "Питание", desc: "Управление ботом", icon: Power },
  { id: "console", label: "Консоль", desc: "Команды бота", icon: SquareTerminal },
  { id: "mods", label: "Моды", desc: "Состав команды", icon: Users },
  { id: "admin", label: "Админ", desc: "Настройки панели", icon: Shield },
];

function tabAllowed(id: Exclude<Tab, "home">, caps: Caps): boolean {
  switch (id) {
    case "stats":
    case "tops":
      return caps.canStats;
    case "moderation":
      return caps.canModeration;
    case "voice":
      return caps.canVoice;
    case "logs":
      return caps.canLogs;
    case "power":
      return caps.canPower;
    case "console":
      return caps.canConsole;
    case "mods":
      return caps.canMods;
    case "admin":
      return caps.canAdmin;
  }
}

export function PanelShell({
  tab,
  onTab,
  tag,
  children,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  tag?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-none flex-nowrap items-center gap-2 overflow-hidden px-3 py-2">
          <button
            type="button"
            onClick={() => onTab("home")}
            className="flex shrink-0 cursor-pointer items-center gap-2"
          >
            <img
              src="/logo.png"
              alt="PremuteBOT logo"
              className="size-8 shrink-0 rounded-sm border border-border object-cover"
            />
            <span className="text-left">
              <span className="block text-sm font-semibold leading-none">PremuteBOT</span>
            </span>
          </button>

          {tab !== "home" ? (
            <button
              type="button"
              onClick={() => onTab("home")}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-sm border border-border bg-elevated px-2 text-xs font-medium text-muted transition-colors hover:text-fg"
            >
              <ChevronLeft className="size-3.5" />
              Главная
            </button>
          ) : null}

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 [&_>div>span]:hidden [&_button]:h-8 [&_button]:rounded-sm [&_button]:border [&_button]:border-border [&_button]:bg-elevated [&_button]:px-2 [&_button]:text-xs [&_button]:text-muted">
            {tag ? (
              <Badge className="max-w-[9rem] truncate normal-case tracking-normal" tone="accent">
                {tag}
              </Badge>
            ) : null}
            <ThemeSelect />
            <UserButton />
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

function fmtMonth(ym: string) {
  const d = new Date(`${ym}-01T00:00:00`);
  if (Number.isNaN(d.getTime())) return ym;
  return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

export function HomeTiles({ profile, onTab }: { profile: StaffProfile; onTab: (t: Tab) => void }) {
  const caps = profile.caps;
  const tiles = TAB_ITEMS.filter((i) => tabAllowed(i.id, caps));

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
    <section className="mx-auto w-full max-w-none px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
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
                <button
                  type="button"
                  onClick={() => onTab("stats")}
                  className="inline-flex h-8 items-center gap-1 rounded-sm border border-border bg-elevated px-2.5 text-xs text-muted transition-colors hover:text-fg"
                >
                  Подробнее
                  <ChevronRight className="size-3.5" />
                </button>
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
              <div className="mt-4 flex items-center justify-center gap-2 py-6 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" />
                Загружаю статистику
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Разделы</h2>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            {tiles.map((i) => {
              const Icon = i.icon;
              return (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => onTab(i.id)}
                  className="group flex w-full items-center gap-3 rounded-md border border-border bg-surface p-4 text-left transition-colors hover:border-accent/40 hover:bg-elevated sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.3333%-0.5rem)] 2xl:w-[calc(25%-0.5625rem)]"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-sm border border-border bg-elevated text-accent transition-colors group-hover:border-accent/40">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">{i.label}</span>
                    <span className="block truncate text-xs text-muted">{i.desc}</span>
                  </span>
                  <ChevronRight className="ml-auto size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}