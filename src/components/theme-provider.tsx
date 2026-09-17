import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const THEMES = [
  { id: "system", label: "Системная", kind: "auto" },
  { id: "graphite", label: "Графит", kind: "dark" },
  { id: "midnight", label: "Полночь", kind: "dark" },
  { id: "forest", label: "Лес", kind: "dark" },
  { id: "wine", label: "Бордо", kind: "dark" },
  { id: "light", label: "Светлая", kind: "light" },
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
  const [theme, setTheme] = useState<ThemeId>("system");
  const [system, setSystem] = useState<"light" | "graphite">("graphite");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (THEMES.some((t) => t.id === saved)) setTheme(saved as ThemeId);
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

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  return (
    <label className="inline-flex items-center gap-1.5" title="Тема оформления">
      <span
        aria-hidden="true"
        className="size-3 rounded-full border border-border"
        style={{ background: "var(--color-accent)" }}
      />
      <span className="sr-only">Тема оформления</span>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeId)}
        className="h-8 rounded-sm border border-border bg-elevated px-1.5 text-xs text-muted outline-none focus:ring-1 focus:ring-accent"
      >
        {THEMES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </label>
  );
}
