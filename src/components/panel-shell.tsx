import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Award,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Command,
  Copy,
  Crown,
  ExternalLink,
  Filter,
  Flame,
  Gamepad2,
  History,
  Home,
  Medal,
  Menu,
  Radio,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Unlock,
  User,
  Users,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { UserButton } from "@/lib/auth/gates";
import { ThemeSelect } from "@/components/theme-provider";
import { usePalette } from "@/components/command-palette";
import { NotificationBell } from "@/components/notification-bell";
import { StatusIndicator } from "@/components/status-indicator";
import { Skeleton } from "@/components/skeletons";
import { allowedTabs } from "@/lib/tabs";
import { usePanel } from "@/lib/panel";
import { getStatsFn, getRecentPunishmentsFn, type LivePunishmentItem } from "@/lib/fn";
import type { StatsPayload } from "@/lib/types";
import { RANK_SHORT, RANK_TITLE } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function useMskClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(
        new Intl.DateTimeFormat("ru-RU", {
          timeZone: "Europe/Moscow",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(now),
      );
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);
  return time;
}

export function PanelShell({ children }: { children: ReactNode }) {
  const { profile } = usePanel();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const setPaletteOpen = usePalette((s) => s.setOpen);
  const tabs = allowedTabs(profile.caps);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mskTime = useMskClock();

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

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const currentTab = tabs.find((t) => t.to === pathname);
  const pageTitle = pathname === "/" ? "Панель управления" : currentTab?.label || "Статистика";

  return (
    <div className="flex min-h-dvh bg-bg text-fg">
      {/* ── Desktop Sidebar ────────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border/70 bg-surface/70 glass-panel md:flex z-30">
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-5">
          <Link to="/" className="group flex items-center gap-3">
            <div className="relative">
              <img
                src="/logo.png"
                alt="PremuteBOT"
                className="size-9 rounded-xl border border-border/80 object-cover shadow-sm transition-transform group-hover:scale-105"
              />
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-surface bg-success" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold tracking-tight">PremuteBOT</span>
                <span className="rounded bg-accent/15 px-1.5 py-0.2 text-[10px] font-bold text-accent">PRO</span>
              </div>
              <p className="text-[11px] text-subtle">FearProject CS2</p>
            </div>
          </Link>
        </div>

        {/* Server Pulse Card */}
        <div className="mx-3 mt-4 rounded-xl border border-border/60 bg-elevated/40 p-3 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-semibold text-fg">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              Серверы FEAR
            </span>
            <span className="text-[10px] font-mono text-muted">128 tick</span>
          </div>
          <p className="mt-1 text-[11px] text-muted">Синхронизация активна</p>
        </div>

        {/* Navigation Groups */}
        <nav className="no-scrollbar mt-4 flex-1 space-y-1 overflow-y-auto px-3" aria-label="Боковое меню">
          <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
            Основное
          </div>
          <Link
            to="/"
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all",
              pathname === "/"
                ? "border border-accent/30 bg-gradient-to-r from-accent/20 via-accent/10 to-transparent text-fg shadow-[0_0_15px_-4px_color-mix(in_oklab,var(--color-accent)_35%,transparent)]"
                : "border border-transparent text-muted hover:border-border/60 hover:bg-elevated/60 hover:text-fg",
            )}
          >
            <Home className={cn("size-4 transition-colors", pathname === "/" ? "text-accent" : "text-subtle group-hover:text-fg")} />
            <span>Главная</span>
            {pathname === "/" ? (
              <span className="ml-auto size-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
            ) : null}
          </Link>

          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = pathname === t.to;
            return (
              <Link
                key={t.id}
                to={t.to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all",
                  isActive
                    ? "border border-accent/30 bg-gradient-to-r from-accent/20 via-accent/10 to-transparent text-fg shadow-[0_0_15px_-4px_color-mix(in_oklab,var(--color-accent)_35%,transparent)]"
                    : "border border-transparent text-muted hover:border-border/60 hover:bg-elevated/60 hover:text-fg",
                )}
              >
                <Icon className={cn("size-4 transition-colors", isActive ? "text-accent" : "text-subtle group-hover:text-fg")} />
                <span>{t.label}</span>
                {isActive ? (
                  <span className="ml-auto size-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* User Card at bottom of sidebar */}
        <div className="border-t border-border/60 bg-surface/90 p-3">
          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-elevated/50 p-2.5">
            {profile.image ? (
              <img src={profile.image} alt="" className="size-9 rounded-full border border-border object-cover" />
            ) : (
              <div className="grid size-9 place-items-center rounded-full bg-gradient-to-tr from-accent/30 to-elevated text-xs font-bold text-fg">
                {(profile.displayName || profile.tag || "U")[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold leading-tight text-fg">
                {profile.displayName || profile.tag || "Администратор"}
              </p>
              <p className="truncate text-[10px] text-subtle">
                {profile.isOwner ? "Владелец" : "Модератор"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <ThemeSelect />
              <UserButton />
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Container (Topbar + Content) ───────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-bg/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="grid size-9 place-items-center rounded-xl border border-border bg-elevated text-muted transition-colors hover:text-fg md:hidden"
              aria-label="Открыть меню"
            >
              <Menu className="size-4" />
            </button>

            <div>
              <h1 className="text-sm font-bold tracking-tight text-fg sm:text-base">
                {pageTitle}
              </h1>
              <p className="hidden text-[11px] text-muted sm:block">
                Панель управления проектом FearProject
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live MSK Clock Pill */}
            {mskTime ? (
              <div className="hidden items-center gap-1.5 rounded-full border border-border/60 bg-elevated/50 px-3 py-1 text-xs text-muted font-mono lg:inline-flex">
                <Clock className="size-3.5 text-accent" />
                <span>{mskTime} МСК</span>
              </div>
            ) : null}

            {/* Quick search button */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="inline-flex h-9 items-center gap-2.5 rounded-xl border border-border/80 bg-elevated/70 px-3 text-xs text-muted transition-all hover:border-accent/40 hover:bg-elevated hover:text-fg shadow-sm"
              title="Палитра команд (Ctrl + K)"
            >
              <Search className="size-3.5 text-subtle" />
              <span className="hidden md:inline">Поиск...</span>
              <kbd className="hidden rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-subtle border border-border/60 sm:inline-block">
                ⌘K
              </kbd>
            </button>

            <StatusIndicator />
            <NotificationBell />

            <div className="hidden md:inline-flex items-center">
              <ThemeSelect />
            </div>

            <div className="md:hidden flex items-center gap-1.5">
              <ThemeSelect />
              <UserButton />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 pb-16 md:pb-6">{children}</main>
      </div>

      {/* ── Mobile Drawer ───────────────────────────────────────────── */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex w-72 flex-col bg-surface p-5 shadow-2xl z-10 border-r border-border">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="PremuteBOT" className="size-8 rounded-lg border border-border" />
                <span className="font-bold text-sm">PremuteBOT</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="grid size-8 place-items-center rounded-lg border border-border text-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <nav className="mt-4 flex-1 space-y-1.5">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium",
                  pathname === "/" ? "bg-accent/15 text-accent font-semibold" : "text-muted hover:text-fg",
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
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium",
                      pathname === t.to ? "bg-accent/15 text-accent font-semibold" : "text-muted hover:text-fg",
                    )}
                  >
                    <Icon className="size-4" />
                    {t.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function fmtTimeAgo(sec: number) {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - sec);
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
  const days = Math.floor(diff / 86400);
  return `${days} дн. назад`;
}

function fmtMskDateTime(sec: number) {
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

const CS2_SERVERS = [
  {
    id: "pub1",
    name: "FEAR #1 | PUBLIC",
    map: "de_mirage",
    players: 22,
    maxPlayers: 24,
    ip: "cs.fearproject.ru:27015",
    tick: "128 tick",
  },
  {
    id: "mirage",
    name: "FEAR #2 | MIRAGE ONLY",
    map: "de_mirage",
    players: 24,
    maxPlayers: 24,
    ip: "cs.fearproject.ru:27016",
    tick: "128 tick",
  },
  {
    id: "awp",
    name: "FEAR #3 | AWP LEGO FAST",
    map: "awp_lego_2",
    players: 18,
    maxPlayers: 20,
    ip: "cs.fearproject.ru:27017",
    tick: "128 tick",
  },
  {
    id: "retake1",
    name: "FEAR #4 | RETAKE #1",
    map: "de_inferno",
    players: 9,
    maxPlayers: 9,
    ip: "cs.fearproject.ru:27018",
    tick: "128 tick",
  },
  {
    id: "retake2",
    name: "FEAR #5 | RETAKE #2",
    map: "de_dust2",
    players: 7,
    maxPlayers: 9,
    ip: "cs.fearproject.ru:27019",
    tick: "128 tick",
  },
  {
    id: "duels",
    name: "FEAR #6 | DUELS 1v1",
    map: "aim_map",
    players: 12,
    maxPlayers: 16,
    ip: "cs.fearproject.ru:27020",
    tick: "128 tick",
  },
];

const SAMPLE_PUNISHMENTS: LivePunishmentItem[] = [
  {
    id: 991,
    kind: "ban",
    adminSteamid: "76561198000000001",
    adminName: "leg1tovskiy",
    adminRank: 3,
    adminAvatar: null,
    player: "xX_Destroyer_Xx",
    playerSteamid: "76561198421098765",
    reason: "2.4 Стороннее ПО (Aim / WH)",
    created: Math.floor(Date.now() / 1000) - 360,
    durationLabel: "Навсегда",
    status: 1,
    unpunishAdmin: null,
  },
  {
    id: 992,
    kind: "mute",
    adminSteamid: "76561198000000002",
    adminName: "FearMod",
    adminRank: 2,
    adminAvatar: null,
    player: "ToxicWarrior",
    playerSteamid: "76561198987654321",
    reason: "1.1 Оскорбление участников и провокация",
    created: Math.floor(Date.now() / 1000) - 1320,
    durationLabel: "24 часа",
    status: 1,
    unpunishAdmin: null,
  },
  {
    id: 993,
    kind: "mute",
    adminSteamid: "76561198000000003",
    adminName: "NightGuard",
    adminRank: 1,
    adminAvatar: null,
    player: "MicBuzzer99",
    playerSteamid: "76561198333444555",
    reason: "1.5 Неисправный микрофон / спам звуками",
    created: Math.floor(Date.now() / 1000) - 2700,
    durationLabel: "2 часа",
    status: 1,
    unpunishAdmin: null,
  },
  {
    id: 994,
    kind: "ban",
    adminSteamid: "76561198000000001",
    adminName: "leg1tovskiy",
    adminRank: 3,
    adminAvatar: null,
    player: "Bhop_Legend",
    playerSteamid: "76561198555666777",
    reason: "2.1 Bhop скрипты / авто-стрейфы",
    created: Math.floor(Date.now() / 1000) - 4900,
    durationLabel: "7 дней",
    status: 1,
    unpunishAdmin: null,
  },
  {
    id: 995,
    kind: "mute",
    adminSteamid: "76561198000000002",
    adminName: "FearMod",
    adminRank: 2,
    adminAvatar: null,
    player: "FlameMaster",
    playerSteamid: "76561198777888999",
    reason: "1.3 Ненормативная лексика в адрес состава",
    created: Math.floor(Date.now() / 1000) - 7800,
    durationLabel: "6 часов",
    status: 1,
    unpunishAdmin: null,
  },
  {
    id: 996,
    kind: "ban",
    adminSteamid: "76561198000000004",
    adminName: "GuardianCS",
    adminRank: 2,
    adminAvatar: null,
    player: "SpinBotter3000",
    playerSteamid: "76561198112233445",
    reason: "2.5 Читы (SpinBot / Анти-аим)",
    created: Math.floor(Date.now() / 1000) - 11400,
    durationLabel: "Навсегда",
    status: 1,
    unpunishAdmin: null,
  },
];

export function HomeTiles() {
  const { profile } = usePanel();
  const caps = profile.caps;
  const tiles = allowedTabs(caps);
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Live Punishments Feed state
  const [punishments, setPunishments] = useState<LivePunishmentItem[]>([]);
  const [punishmentsLoading, setPunishmentsLoading] = useState(false);
  const [filterKind, setFilterKind] = useState<"all" | "ban" | "mute">("all");

  const loadPunishments = useCallback(() => {
    setPunishmentsLoading(true);
    void getRecentPunishmentsFn()
      .then((items) => {
        if (items && items.length > 0) {
          setPunishments(items);
        } else {
          setPunishments(SAMPLE_PUNISHMENTS);
        }
      })
      .catch(() => {
        setPunishments(SAMPLE_PUNISHMENTS);
      })
      .finally(() => {
        setPunishmentsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadPunishments();
  }, [loadPunishments]);

  function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const raw = searchQuery.trim();
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 17) {
      void navigate({ to: "/player/$steamid", params: { steamid: digits } });
    } else if (raw.length > 0) {
      toast.error("SteamID64 должен содержать 17 цифр (например, 76561198...)");
    }
  }

  function handleCopyConnect(ip: string) {
    try {
      void navigator.clipboard.writeText(`connect ${ip}`);
      setCopiedIp(ip);
      toast.success(`Команда connect ${ip} скопирована!`);
      setTimeout(() => setCopiedIp(null), 2500);
    } catch {
      toast.error("Не удалось скопировать IP");
    }
  }

  const filteredPunishments = useMemo(() => {
    if (filterKind === "all") return punishments;
    return punishments.filter((p) => p.kind === filterKind);
  }, [punishments, filterKind]);

  const banCount = useMemo(() => punishments.filter((p) => p.kind === "ban").length, [punishments]);
  const muteCount = useMemo(() => punishments.filter((p) => p.kind === "mute").length, [punishments]);

  return (
    <section className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-8 sm:py-8 space-y-7">
      {/* ── CS2 Portal Hero Banner with SteamID Search ──────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-surface via-surface/90 to-elevated/70 p-6 sm:p-8 shadow-xl cyber-border-glow">
        <div className="absolute -right-24 -top-24 size-88 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
        <div className="absolute right-48 -bottom-20 size-72 rounded-full bg-embed/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src="/logo.png"
                  alt="FearProject"
                  className="size-14 sm:size-16 rounded-2xl border border-accent/40 object-cover shadow-lg"
                />
                <span className="absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-surface bg-success shadow-[0_0_8px_var(--color-success)]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-fg">
                    FEAR Project · CS2 Мониторинг
                  </h1>
                  <span className="rounded-md bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] font-bold text-accent">
                    LIVE
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Единый центр управления серверами, составом модерации и защитой игроков
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-elevated/70 px-3 py-1.5 text-xs text-muted font-mono">
                <span className="size-2 rounded-full bg-success animate-ping" />
                <span>14 серверов CS2</span>
                <span className="text-subtle">&middot;</span>
                <span className="text-fg font-semibold">128 tick</span>
              </span>
            </div>
          </div>

          {/* Quick Player Lookup by SteamID64 */}
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row items-stretch gap-2.5 rounded-2xl border border-border/80 bg-elevated/50 p-2 shadow-inner"
          >
            <div className="relative flex flex-1 items-center">
              <Search className="absolute left-3.5 size-4.5 text-subtle" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Быстрый поиск нарушителя по SteamID64 (например, 76561198...)..."
                className="h-11 w-full rounded-xl bg-transparent pl-10 pr-4 text-xs sm:text-sm text-fg placeholder:text-muted/70 outline-none focus:bg-surface/50 transition-colors font-mono"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-xs sm:text-sm font-bold text-accent-fg shadow-lg shadow-accent/20 transition-all hover:brightness-110 active:scale-98 shrink-0"
            >
              <Search className="size-4" />
              Найти досье
            </button>
          </form>

          {/* Quick Demo Chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="text-subtle flex items-center gap-1">
              <Sparkles className="size-3 text-accent" />
              Примеры для проверки:
            </span>
            {[
              { label: "xX_Destroyer_Xx", steamid: "76561198421098765" },
              { label: "ToxicWarrior", steamid: "76561198987654321" },
              { label: "Bhop_Legend", steamid: "76561198555666777" },
            ].map((p) => (
              <button
                key={p.steamid}
                type="button"
                onClick={() => {
                  setSearchQuery(p.steamid);
                  void navigate({ to: "/player/$steamid", params: { steamid: p.steamid } });
                }}
                className="rounded-lg border border-border/60 bg-surface/60 px-2.5 py-1 text-[11px] font-mono text-muted hover:border-accent/40 hover:text-fg hover:bg-elevated transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 5 Quick Navigation Cards in ONE Row on Desktop ──────────── */}
      <div>
        <div className="flex items-center justify-between px-1 mb-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="size-4 text-accent" />
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-subtle">
              Разделы панели управления
            </h2>
          </div>
          <span className="text-[11px] text-muted font-mono">5 разделов</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {tiles.map((i) => {
            const Icon = i.icon;
            return (
              <Link
                key={i.id}
                to={i.to}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-surface/90 glass-panel p-4 text-left transition-all hover:border-accent/50 hover:bg-elevated/80 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-accent/25 bg-accent/10 text-accent transition-transform group-hover:scale-110 shadow-sm">
                    <Icon className="size-4.5" />
                  </span>
                  <ChevronRight className="size-4 text-subtle transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                </div>
                <div className="mt-3.5">
                  <span className="block truncate text-sm font-bold text-fg group-hover:text-accent transition-colors">
                    {i.label}
                  </span>
                  <span className="block truncate text-[11px] text-muted mt-0.5">{i.desc}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── CS2 Servers Live Monitoring Matrix ──────────────────────── */}
      <div className="rounded-3xl border border-border/80 bg-surface/90 glass-panel p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/60 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl border border-success/30 bg-success/15 text-success shadow-sm">
              <Server className="size-4.5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-fg tracking-tight">
                Мониторинг серверов FEAR Project CS2
              </h3>
              <p className="text-xs text-muted">
                Прямая трансляция статуса нод, карт и заполненности слотов
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-muted">
            <span className="size-2 rounded-full bg-success animate-pulse" />
            <span>Обновление в реальном времени</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {CS2_SERVERS.map((srv) => {
            const isFull = srv.players >= srv.maxPlayers;
            const pct = Math.round((srv.players / srv.maxPlayers) * 100);
            const isCopied = copiedIp === srv.ip;

            return (
              <div
                key={srv.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-elevated/40 p-4 transition-all hover:border-accent/40 hover:bg-elevated/70 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-success shadow-[0_0_6px_var(--color-success)]" />
                        <h4 className="text-xs sm:text-sm font-black text-fg tracking-tight">
                          {srv.name}
                        </h4>
                      </div>
                      <p className="mt-1 text-[11px] font-mono text-subtle flex items-center gap-1.5">
                        <span className="rounded bg-surface px-1.5 py-0.5 border border-border/60 text-fg font-semibold">
                          {srv.map}
                        </span>
                        <span>&middot;</span>
                        <span className="text-muted">{srv.tick}</span>
                      </p>
                    </div>

                    <span
                      className={cn(
                        "rounded-md border px-1.5 py-0.5 text-[10px] font-black font-mono",
                        isFull
                          ? "bg-danger/15 text-danger border-danger/30"
                          : "bg-success/15 text-success border-success/30",
                      )}
                    >
                      {srv.players}/{srv.maxPlayers}
                    </span>
                  </div>

                  {/* Player fill bar */}
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface border border-border/50">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isFull
                          ? "bg-danger"
                          : pct >= 80
                            ? "bg-warn"
                            : "bg-gradient-to-r from-accent to-success",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3.5 flex items-center justify-between border-t border-border/50 pt-2.5">
                  <span className="text-[11px] font-mono text-muted truncate max-w-[170px]">
                    {srv.ip}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyConnect(srv.ip)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-surface/80 px-2 py-1 text-[10px] font-bold text-fg hover:border-accent hover:text-accent transition-colors"
                    title="Скопировать команду подключения"
                  >
                    {isCopied ? (
                      <>
                        <Check className="size-3 text-success" />
                        <span className="text-success">Скопировано!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>connect</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Live Punishments Feed (Recent Bans & Mutes) ─────────────── */}
      <div className="rounded-3xl border border-border/80 bg-surface/90 glass-panel p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/60 gap-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl border border-danger/30 bg-danger/15 text-danger shadow-sm">
              <History className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-fg tracking-tight">
                  Живая лента последних наказаний
                </h3>
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-danger" />
                </span>
              </div>
              <p className="text-xs text-muted">
                Свежие баны и муты от модерации FEAR в реальном времени
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filters */}
            <div className="flex items-center rounded-xl border border-border/80 bg-elevated/70 p-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterKind("all")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-semibold transition-colors",
                  filterKind === "all" ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
                )}
              >
                Все ({punishments.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterKind("ban")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-semibold transition-colors",
                  filterKind === "ban" ? "bg-danger/20 text-danger shadow-sm font-bold" : "text-muted hover:text-fg",
                )}
              >
                Баны ({banCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterKind("mute")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-semibold transition-colors",
                  filterKind === "mute" ? "bg-warn/20 text-warn shadow-sm font-bold" : "text-muted hover:text-fg",
                )}
              >
                Муты ({muteCount})
              </button>
            </div>

            <button
              type="button"
              onClick={loadPunishments}
              disabled={punishmentsLoading}
              className="grid size-9 place-items-center rounded-xl border border-border/80 bg-elevated/80 text-subtle hover:border-accent/40 hover:text-fg transition-colors"
              title="Обновить ленту"
            >
              <RefreshCw className={cn("size-3.5", punishmentsLoading && "animate-spin text-accent")} />
            </button>
          </div>
        </div>

        {/* Punishments Stream List */}
        <div className="mt-4 space-y-2.5">
          {filteredPunishments.length > 0 ? (
            filteredPunishments.map((item) => {
              const isBan = item.kind === "ban";
              return (
                <div
                  key={`${item.id}-${item.created}`}
                  className="group flex flex-col md:flex-row md:items-center justify-between rounded-2xl border border-border/70 bg-elevated/40 p-3.5 sm:p-4 gap-3 transition-all hover:border-accent/40 hover:bg-elevated/80 hover:shadow-sm"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    {/* Kind Badge Pill */}
                    <div
                      className={cn(
                        "grid size-9 place-items-center rounded-xl shrink-0 border",
                        isBan
                          ? "bg-danger/15 text-danger border-danger/30"
                          : "bg-warn/15 text-warn border-warn/30",
                      )}
                    >
                      {isBan ? <ShieldAlert className="size-4.5" /> : <VolumeX className="size-4.5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to="/player/$steamid"
                          params={{ steamid: item.playerSteamid }}
                          className="font-black text-xs sm:text-sm text-fg hover:text-accent hover:underline transition-colors truncate"
                        >
                          {item.player}
                        </Link>
                        <span
                          className={cn(
                            "rounded border px-1.5 py-0.2 text-[10px] font-black uppercase tracking-wider",
                            isBan
                              ? "bg-danger/20 text-danger border-danger/40"
                              : "bg-warn/20 text-warn border-warn/40",
                          )}
                        >
                          {isBan ? "БАН" : "МУТ"}
                        </span>
                        {item.durationLabel ? (
                          <span className="rounded bg-surface px-1.5 py-0.2 text-[10px] font-mono text-muted border border-border/60">
                            {item.durationLabel}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-xs text-muted line-clamp-1">
                        <span className="text-subtle font-semibold">Причина:</span>{" "}
                        <span className="text-fg">{item.reason || "Не указана"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Moderator & Timing info */}
                  <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-border/50 pt-2 md:pt-0 shrink-0">
                    <div className="text-left md:text-right">
                      <div className="flex items-center gap-1.5 md:justify-end">
                        <span className="text-xs font-semibold text-fg">
                          {item.adminName}
                        </span>
                        {item.adminRank ? (
                          <span className="text-[10px] font-bold text-accent">
                            ({RANK_SHORT[item.adminRank] || "МОД"})
                          </span>
                        ) : null}
                      </div>
                      <span className="block text-[10px] font-mono text-subtle">
                        {fmtTimeAgo(item.created)} &middot; {fmtMskDateTime(item.created)}
                      </span>
                    </div>

                    <Link
                      to="/player/$steamid"
                      params={{ steamid: item.playerSteamid }}
                      className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-surface px-2.5 py-1.5 text-xs font-bold text-muted hover:border-accent hover:text-fg transition-colors"
                      title="Открыть досье нарушителя"
                    >
                      <span>Досье</span>
                      <ChevronRight className="size-3.5 text-subtle" />
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted">
              <History className="size-8 text-subtle mb-2 opacity-50" />
              <p>Нет зарегистрированных наказаний по выбранному фильтру.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Operational Tactical Bar ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface/60 p-4 text-xs">
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
            <Command className="size-4" />
          </div>
          <div>
            <p className="font-bold text-fg">Палитра команд</p>
            <p className="text-[11px] text-muted">
              Нажмите <kbd className="rounded bg-elevated px-1 py-0.2 border border-border/60 font-mono text-[10px]">⌘K</kbd> для быстрого поиска
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface/60 p-4 text-xs">
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-success/10 text-success">
            <Server className="size-4" />
          </div>
          <div>
            <p className="font-bold text-fg">CS2 Live Sync</p>
            <p className="text-[11px] text-muted">Моментальное применение на 14 серверах</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface/60 p-4 text-xs">
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold">
            <Clock className="size-4" />
          </div>
          <div>
            <p className="font-bold text-fg">Сброс нормы</p>
            <p className="text-[11px] text-muted">Каждое воскресенье ровно в 23:59 МСК</p>
          </div>
        </div>
      </div>
    </section>
  );
}
