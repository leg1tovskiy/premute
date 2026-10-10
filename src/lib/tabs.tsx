import {
  BarChart3,
  Gamepad2,
  Radio,
  Shield,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Caps } from "@/lib/types";

export type TabId = "stats" | "online" | "tops" | "suspicious" | "mods" | "admin";

export type TabPath = "/stats" | "/online" | "/tops" | "/suspicious" | "/mods" | "/admin";

export type TabDef = {
  id: TabId;
  to: TabPath;
  label: string;
  desc: string;
  icon: LucideIcon;
  cap: keyof Caps;
};

export const TABS: TabDef[] = [
  { id: "stats", to: "/stats", label: "Статистика", desc: "Статистика модераторов", icon: BarChart3, cap: "canStats" },
  { id: "online", to: "/online", label: "Онлайн", desc: "Онлайн модераторов на серверах", icon: Radio, cap: "canActivity" },
  { id: "tops", to: "/tops", label: "Топы", desc: "Рейтинг модераторов", icon: Trophy, cap: "canGeneralStats" },
  { id: "suspicious", to: "/suspicious", label: "Игроки", desc: "Подозрительные и новореги", icon: Gamepad2, cap: "canSuspicious" },
  { id: "mods", to: "/mods", label: "Модераторы", desc: "Состав команды", icon: Users, cap: "canMods" },
  { id: "admin", to: "/admin", label: "Панель управления", desc: "Настройки панели", icon: Shield, cap: "canAdmin" },
];

export function allowedTabs(caps: Caps): TabDef[] {
  return TABS.filter((t) => caps[t.cap]);
}
