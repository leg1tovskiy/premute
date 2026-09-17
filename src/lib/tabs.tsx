import {
  BarChart3,
  Power,
  ScrollText,
  Shield,
  ShieldCheck,
  SquareTerminal,
  Trophy,
  Users,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import type { Caps } from "@/lib/types";

export type TabId =
  | "stats"
  | "tops"
  | "moderation"
  | "voice"
  | "logs"
  | "power"
  | "console"
  | "mods"
  | "admin";

export type TabPath =
  | "/stats"
  | "/tops"
  | "/moderation"
  | "/voice"
  | "/logs"
  | "/power"
  | "/console"
  | "/mods"
  | "/admin";

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
  { id: "moderation", to: "/moderation", label: "Модер", desc: "Наказания и модерация", icon: ShieldCheck, cap: "canModeration" },
  { id: "voice", to: "/voice", label: "Голос", desc: "Озвучка", icon: Volume2, cap: "canVoice" },
  { id: "logs", to: "/logs", label: "Логи", desc: "Журнал событий", icon: ScrollText, cap: "canLogs" },
  { id: "power", to: "/power", label: "Питание", desc: "Управление ботом", icon: Power, cap: "canPower" },
  { id: "console", to: "/console", label: "Консоль", desc: "Команды бота", icon: SquareTerminal, cap: "canConsole" },
  { id: "mods", to: "/mods", label: "Моды", desc: "Состав команды", icon: Users, cap: "canMods" },
  { id: "admin", to: "/admin", label: "Админ", desc: "Настройки панели", icon: Shield, cap: "canAdmin" },
];

export function allowedTabs(caps: Caps): TabDef[] {
  return TABS.filter((t) => caps[t.cap]);
}
