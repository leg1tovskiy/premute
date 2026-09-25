import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, Monitor, Moon, Palette, Sparkles, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const THEMES = [
  {
    id: "graphite",
    label: "Графит",
    kind: "dark",
    color: "#6ea8ff",
    bg: "#101114",
    surface: "#17181d",
    badge: "Классика",
    desc: "Сдержанный темно-серый стиль с неоново-голубыми акцентами",
  },
  {
    id: "cyberpunk",
    label: "Киберпанк",
    kind: "dark",
    color: "#ff2a85",
    bg: "#0c0816",
    surface: "#150f24",
    badge: "⚡ Неон",
    desc: "Яркий неоновый розовый и футуристичный фиолетовый обсидиан",
  },
  {
    id: "asiimov",
    label: "Азимов",
    kind: "dark",
    color: "#ff6b00",
    bg: "#0f1013",
    surface: "#17181e",
    badge: "🎮 CS2",
    desc: "Легендарный оранжевый стиль скина Азимов и индустриальный карбон",
  },
  {
    id: "hyperbeast",
    label: "Гипербист",
    kind: "dark",
    color: "#00e5ff",
    bg: "#060e15",
    surface: "#0c1a26",
    badge: "🌊 Аква",
    desc: "Энергичный аквамарин и глубокая океаническая бездна",
  },
  {
    id: "amethyst",
    label: "Аметист",
    kind: "dark",
    color: "#a855f7",
    bg: "#0e0818",
    surface: "#170e28",
    badge: "🔮 Магия",
    desc: "Королевский ультрафиолет и атмосфера Vaporwave",
  },
  {
    id: "emerald",
    label: "Изумруд",
    kind: "dark",
    color: "#10b981",
    bg: "#06110a",
    surface: "#0c1f13",
    badge: "🌿 Матрица",
    desc: "Токсичный изумрудный неон и глубокий тёмный нефрит",
  },
  {
    id: "crimson",
    label: "Багровый",
    kind: "dark",
    color: "#ff2e4d",
    bg: "#120709",
    surface: "#1e0d11",
    badge: "🔥 Рубин",
    desc: "Насыщенный кровавый рубин и тёмный вампирский обсидиан",
  },
  {
    id: "gold",
    label: "Золото",
    kind: "dark",
    color: "#f59e0b",
    bg: "#100e0a",
    surface: "#1a1610",
    badge: "👑 Премиум",
    desc: "Императорский сияющий янтарь и премиальный темный графит",
  },
  {
    id: "arctic",
    label: "Арктика",
    kind: "dark",
    color: "#38bdf8",
    bg: "#080d14",
    surface: "#0f1926",
    badge: "❄️ Лед",
    desc: "Холодный полярный лед и морозная глубина",
  },
  {
    id: "sunset",
    label: "Закат",
    kind: "dark",
    color: "#f43f5e",
    bg: "#120912",
    surface: "#1f1020",
    badge: "🌅 Синтвейв",
    desc: "Теплые коралловые лучи и бархатные сумерки",
  },
  {
    id: "midnight",
    label: "Полночь",
    kind: "dark",
    color: "#3b82f6",
    bg: "#090e18",
    surface: "#0f1729",
    badge: "🌌 Кобальт",
    desc: "Глубокий ночной синий космос и кобальтовые огни",
  },
  {
    id: "forest",
    label: "Лес",
    kind: "dark",
    color: "#7ed6a7",
    bg: "#0a110d",
    surface: "#111a14",
    badge: "🌲 Природа",
    desc: "Умиротворяющий хвойный шалфей и таинственный северный бор",
  },
  {
    id: "wine",
    label: "Бордо",
    kind: "dark",
    color: "#e3a3b8",
    bg: "#110a0d",
    surface: "#1a1115",
    badge: "🍷 Винный",
    desc: "Глубокий винтажный мерло и нежные пудровые оттенки",
  },
  {
    id: "light",
    label: "Светлая",
    kind: "light",
    color: "#2563eb",
    bg: "#f4f5f8",
    surface: "#ffffff",
    badge: "☀️ День",
    desc: "Кристально чистый светлый студийный интерфейс",
  },
  {
    id: "system",
    label: "Системная",
    kind: "auto",
    color: "#6ea8ff",
    bg: "#101114",
    surface: "#17181d",
    badge: "💻 Авто",
    desc: "Автоматически подстраивается под настройки вашей системы",
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type ResolvedTheme = Exclude<ThemeId, "system">;

const STORAGE_KEY = "premute-theme";

type ThemeContextValue = {
  theme: ThemeId;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  setTheme: (t: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>("graphite");
  const [system, setSystem] = useState<"light" | "graphite">("graphite");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && THEMES.some((t) => t.id === saved)) setTheme(saved as ThemeId);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => setSystem(mq.matches ? "light" : "graphite");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const resolvedTheme: ResolvedTheme = theme === "system" ? system : theme;
  const isDark = resolvedTheme !== "light";

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [resolvedTheme, theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, isDark, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeSelect({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeThemeMeta = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="group inline-flex h-9 items-center gap-2 rounded-xl border border-border/80 bg-elevated/70 px-2.5 text-xs font-semibold text-muted transition-all hover:border-accent/40 hover:bg-elevated hover:text-fg shadow-sm active:scale-98"
        title="Сменить тему оформления"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <div className="relative flex items-center justify-center">
          <span
            className="size-3 rounded-full border border-border/60 transition-transform group-hover:scale-110 shadow-sm"
            style={{ background: activeThemeMeta.color }}
          />
        </div>
        {!compact ? (
          <span className="hidden sm:inline font-medium text-fg">
            {activeThemeMeta.label}
          </span>
        ) : null}
        <Palette className="size-3.5 text-subtle transition-colors group-hover:text-accent" />
      </button>

      {/* Theme Picker Modal / Dialog via Portal */}
      {open && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
                onClick={() => setOpen(false)}
                aria-hidden="true"
              />

              {/* Modal Content */}
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Выбор темы оформления"
                className="relative z-10 flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border/80 bg-surface text-fg shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              >
                {/* Modal Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-elevated/40 p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-xl border border-accent/30 bg-accent/15 text-accent shadow-sm">
                      <Palette className="size-4.5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black tracking-tight text-fg sm:text-base">
                        Темы оформления PremuteBOT
                      </h2>
                      <p className="text-[11px] text-muted sm:text-xs">
                        Выберите стиль интерфейса под ваше настроение и скины CS2
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="grid size-8 place-items-center rounded-xl border border-border/80 bg-elevated/70 text-subtle transition-colors hover:border-border hover:text-fg hover:bg-elevated"
                    aria-label="Закрыть"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Themes Grid */}
                <div className="no-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                    {THEMES.map((t) => {
                      const isCurrent = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setTheme(t.id);
                            setOpen(false);
                          }}
                          className={cn(
                            "group relative flex flex-col justify-between rounded-2xl border p-3 text-left transition-all hover:scale-[1.02]",
                            isCurrent
                              ? "border-accent bg-accent/15 shadow-md shadow-accent/10 ring-1 ring-accent"
                              : "border-border/70 bg-elevated/50 hover:border-border hover:bg-elevated/90",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              {/* Swatch Pill */}
                              <div
                                className="flex size-7.5 items-center justify-center rounded-xl border border-border/60 shadow-sm shrink-0"
                                style={{ background: t.bg }}
                              >
                                <span
                                  className="size-3.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                                  style={{ background: t.color }}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-black text-fg leading-tight">
                                  {t.label}
                                </p>
                                <span className="text-[10px] font-semibold text-subtle font-mono">
                                  {t.badge}
                                </span>
                              </div>
                            </div>

                            {isCurrent ? (
                              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent text-accent-fg shadow-sm">
                                <Check className="size-3 stroke-[3]" />
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-2 text-[11px] text-muted line-clamp-2 leading-relaxed">
                            {t.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex shrink-0 items-center justify-between border-t border-border/60 bg-elevated/40 px-5 py-3 text-xs text-subtle">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="size-3.5 text-accent" />
                    15 уникальных стилей FEAR Project
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-elevated px-3 py-1.5 font-bold text-fg border border-border/70 transition-colors hover:bg-surface hover:text-accent shadow-sm"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
