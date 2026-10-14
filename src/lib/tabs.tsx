import {
  BarChart3,
  Gamepad2,
  Radio,
  ScrollText,
  Shield,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Caps } from "@/lib/types";

export type TabId = "mystats" | "stats" | "online" | "tops" | "suspicious" | "mods" | "logs" | "admin";

export type TabPath = "/mystats" | "/stats" | "/online" | "/tops" | "/suspicious" | "/mods" | "/logs" | "/admin";

export type TabDef = {
  id: TabId;
  to: TabPath;
  label: string;
  desc: string;
  icon: LucideIcon;
  cap: keyof Caps;
};

export const TABS: TabDef[] = [
  { id: "mystats", to: "/mystats", label: "Моя статистика", desc: "Личные показатели и наказания", icon: User, cap: "canOwnStats" },
  { id: "stats", to: "/stats", label: "Общая статистика", desc: "Общая статистика состава модераторов", icon: BarChart3, cap: "canGeneralStats" },
  { id: "online", to: "/online", label: "Онлайн", desc: "Онлайн модераторов на серверах", icon: Radio, cap: "canActivity" },
  { id: "tops", to: "/tops", label: "Топы", desc: "Рейтинг модераторов", icon: Trophy, cap: "canGeneralStats" },
  { id: "suspicious", to: "/suspicious", label: "Игроки", desc: "Подозрительные и новореги", icon: Gamepad2, cap: "canSuspicious" },
  { id: "mods", to: "/mods", label: "Модераторы", desc: "Состав команды", icon: Users, cap: "canMods" },
  { id: "logs", to: "/logs", label: "Логи", desc: "Журнал действий и событий", icon: ScrollText, cap: "canLogs" },
  { id: "admin", to: "/admin", label: "Панель управления", desc: "Настройки панели", icon: Shield, cap: "canAdmin" },
];

export function allowedTabs(caps: Caps): TabDef[] {
  return TABS.filter((t) => caps[t.cap]);
}
