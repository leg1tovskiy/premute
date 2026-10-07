import {
  BarChart3,
  Shield,
  ShieldAlert,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Caps } from "@/lib/types";

export type TabId = "stats" | "tops" | "suspicious" | "mods" | "admin";

export type TabPath = "/stats" | "/tops" | "/suspicious" | "/mods" | "/admin";

export type TabDef = {
  id: TabId;
  to: TabPath;
  label: string;
  desc: string;
  icon: LucideIcon;
  cap: keyof Caps;
};

export const TABS: TabDef[] = [
  { id: "stats", to: "/stats", label: "Стата", desc: "Статистика модераторов", icon: BarChart3, cap: "canStats" },
  { id: "tops", to: "/tops", label: "Топы", desc: "Рейтинг модераторов", icon: Trophy, cap: "canStats" },
  { id: "suspicious", to: "/suspicious", label: "Подозрит.", desc: "Подозрительные аккаунты", icon: ShieldAlert, cap: "canSuspicious" },
  { id: "mods", to: "/mods", label: "Моды", desc: "Состав команды", icon: Users, cap: "canMods" },
  { id: "admin", to: "/admin", label: "Админ", desc: "Настройки панели", icon: Shield, cap: "canAdmin" },
];

export function allowedTabs(caps: Caps): TabDef[] {
  return TABS.filter((t) => caps[t.cap]);
}
