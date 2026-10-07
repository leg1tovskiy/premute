import { useEffect } from "react";
import { Command } from "cmdk";
import { useNavigate } from "@tanstack/react-router";
import { create } from "zustand";
import { Home, Monitor, Moon, Search, Sun } from "lucide-react";
import { allowedTabs } from "@/lib/tabs";
import { THEMES, useTheme, type ThemeId } from "@/components/theme-provider";
import { usePanel } from "@/lib/panel";

export const usePalette = create<{ open: boolean; setOpen: (v: boolean) => void }>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

function themeIcon(kind: (typeof THEMES)[number]["kind"]) {
  if (kind === "auto") return Monitor;
  if (kind === "light") return Sun;
  return Moon;
}

export function CommandPalette() {
  const open = usePalette((s) => s.open);
  const setOpen = usePalette((s) => s.setOpen);
  const { profile } = usePanel();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const tabs = allowedTabs(profile.caps);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!usePalette.getState().open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Палитра команд"
      overlayClassName="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-[12vh] z-50 w-[min(94vw,34rem)] -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-surface text-fg shadow-[var(--shadow-panel)]"
    >
      <div className="flex items-center gap-2 border-b border-border px-4">
        <Search className="size-4 shrink-0 text-subtle" />
        <Command.Input
          autoFocus
          placeholder="Раздел или тема…"
          className="h-11 w-full bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
        />
      </div>
      <Command.List className="max-h-[min(60vh,24rem)] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-8 text-center text-sm text-muted">
          Ничего не найдено
        </Command.Empty>
        <Command.Group
          heading="Разделы"
          className="text-subtle [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
        >
          <Command.Item
            value="Главная"
            onSelect={() => {
              setOpen(false);
              void navigate({ to: "/" });
            }}
            className="flex cursor-pointer items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-muted data-[selected=true]:bg-elevated data-[selected=true]:text-fg"
          >
            <Home className="size-4" />
            Главная
          </Command.Item>
          {tabs.map((t, i) => {
            const Icon = t.icon;
            return (
              <Command.Item
                key={t.id}
                value={`${t.label} ${t.desc}`}
                onSelect={() => {
                  setOpen(false);
                  void navigate({ to: t.to });
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-muted data-[selected=true]:bg-elevated data-[selected=true]:text-fg"
              >
                <Icon className="size-4" />
                <span className="min-w-0 flex-1 truncate">{t.label}</span>
                <span className="text-xs text-subtle">{t.desc}</span>
                <kbd className="rounded-xs border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-subtle">
                  {i + 1}
                </kbd>
              </Command.Item>
            );
          })}
        </Command.Group>
        <Command.Group
          heading="Тема"
          className="text-subtle [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
        >
          {THEMES.map((t) => {
            const Icon = themeIcon(t.kind);
            return (
              <Command.Item
                key={t.id}
                value={`Тема ${t.label}`}
                onSelect={() => {
                  setTheme(t.id as ThemeId);
                  setOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-muted data-[selected=true]:bg-elevated data-[selected=true]:text-fg"
              >
                <Icon className="size-4" />
                {t.label}
                {theme === t.id ? <span className="ml-auto text-xs text-accent">выбрана</span> : null}
              </Command.Item>
            );
          })}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
