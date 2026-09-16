import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const THEMES = [
  { id: "graphite", label: "Графит" },
  { id: "midnight", label: "Полночь" },
  { id: "forest", label: "Лес" },
  { id: "wine", label: "Бордо" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const STORAGE_KEY = "premute-theme";

const ThemeContext = createContext<{ theme: ThemeId; setTheme: (t: ThemeId) => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>("graphite");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (THEMES.some((t) => t.id === saved)) setTheme(saved as ThemeId);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  return (
    <label className="inline-flex items-center gap-1.5" title="Фон сайта">
      <span aria-hidden="true" className="size-3 rounded-full border border-border" style={{ background: "var(--color-accent)" }} />
      <span className="sr-only">Фон сайта</span>
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
