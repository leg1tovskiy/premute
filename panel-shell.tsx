import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BarChart3,
  ChevronDown,
  Home,
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
import { cn } from "@/lib/utils";
import type { Caps } from "@/lib/types";
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

export function PanelShell({
  caps,
  tab,
  onTab,
  tag,
  children,
}: {
  caps: Caps;
  tab: Tab;
  onTab: (t: Tab) => void;
  tag?: string | null;
  children: ReactNode;
}) {
  const items: { id: Tab; label: string; icon: typeof BarChart3; show: boolean }[] = [
    { id: "stats", label: "Стата", icon: BarChart3, show: caps.canStats },
    { id: "tops", label: "Топы", icon: Trophy, show: caps.canStats },
    { id: "moderation", label: "Модер", icon: ShieldCheck, show: caps.canModeration },
    { id: "voice", label: "Голос", icon: Volume2, show: caps.canVoice },
    { id: "logs", label: "Логи", icon: ScrollText, show: caps.canLogs },
    { id: "power", label: "Питание", icon: Power, show: caps.canPower },
    { id: "console", label: "Консоль", icon: SquareTerminal, show: caps.canConsole },
    { id: "mods", label: "Моды", icon: Users, show: caps.canMods },
    { id: "admin", label: "Админ", icon: Shield, show: caps.canAdmin },
  ];

  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const visibleItems = items.filter((i) => i.show);

  const mobileItems: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
    { id: "home", label: "Главная", icon: Home },
    ...visibleItems.map(({ id, label, icon }) => ({ id, label, icon })),
  ];

  const onBrandClick = () => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
      onTab("home");
    } else {
      setMenuOpen((o) => !o);
    }
  };

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header ref={headerRef} className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-none flex-nowrap items-center gap-2 overflow-hidden px-3 py-2">
          <button
            type="button"
            onClick={onBrandClick}
            aria-haspopup="true"
            aria-expanded={menuOpen}
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
            <ChevronDown
              className={cn("size-3.5 text-subtle transition-transform md:hidden", menuOpen && "rotate-180")}
            />
          </button>

          <nav className="hidden min-w-0 flex-1 flex-nowrap items-center justify-center gap-0.5 overflow-x-auto md:flex">
            {visibleItems.map((i) => {
                const Icon = i.icon;
                const active = tab === i.id;
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => onTab(i.id)}
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm px-2.5 text-xs font-medium transition-colors sm:text-sm",
                      active
                        ? "bg-elevated text-fg"
                        : "text-muted hover:bg-elevated/70 hover:text-fg",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {i.label}
                  </button>
                );
              })}
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-2 [&_>div>span]:hidden [&_button]:h-8 [&_button]:rounded-sm [&_button]:border [&_button]:border-border [&_button]:bg-elevated [&_button]:px-2 [&_button]:text-xs [&_button]:text-muted">
            {tag ? (
              <Badge className="max-w-[9rem] truncate normal-case tracking-normal" tone="accent">
                {tag}
              </Badge>
            ) : null}
            <ThemeSelect />
            <UserButton />
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-border bg-bg/95 backdrop-blur-md md:hidden">
            <nav className="mx-auto w-full max-w-none px-3 py-2">
              <ul role="menu" className="flex flex-col gap-1">
                {mobileItems.map((i) => {
                  const Icon = i.icon;
                  const active = tab === i.id;
                  return (
                    <li key={i.id}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onTab(i.id);
                          setMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-sm px-3 py-2.5 text-left text-sm font-medium transition-colors",
                          active
                            ? "bg-elevated text-fg"
                            : "text-muted hover:bg-elevated/70 hover:text-fg",
                        )}
                      >
                        <Icon className="size-4" />
                        {i.label}
                        {active ? <span className="ml-auto size-1.5 rounded-full bg-accent" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        )}
      </header>
      <main>{children}</main>
    </div>
  );
}

export function HomeHero() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <span className="mb-6 grid size-12 place-items-center rounded-sm border border-accent/40 bg-elevated text-lg font-semibold">
        P
      </span>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Приветствую в панели управления бота PremuteBOT
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Вкладки сверху — статистика модераторов FEAR, наказания на сервере, озвучка, логи и
        управление питанием бота.
      </p>
    </section>
  );
}
