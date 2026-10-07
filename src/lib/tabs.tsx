import {
  BarChart3,
  Heart,
  Shield,
  ShieldAlert,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Caps, StaffProfile } from "@/lib/types";
import { canAccessVlada } from "@/lib/vlada-access";

export type TabId = "stats" | "tops" | "suspicious" | "mods" | "admin" | "vlada";

export type TabPath = "/stats" | "/tops" | "/suspicious" | "/mods" | "/admin" | "/vlada";

export type TabDef = {
  id: TabId;
  to: TabPath;
  label: string;
  desc: string;
  icon: LucideIcon;
  cap?: keyof Caps;
};

export const TABS: TabDef[] = [
  { id: "stats", to: "/stats", label: "Стата", desc: "Статистика модераторов", icon: BarChart3, cap: "canStats" },
  { id: "tops", to: "/tops", label: "Топы", desc: "Рейтинг модераторов", icon: Trophy, cap: "canStats" },
  { id: "suspicious", to: "/suspicious", label: "Подозрит.", desc: "Подозрительные аккаунты", icon: ShieldAlert, cap: "canSuspicious" },
  { id: "mods", to: "/mods", label: "Моды", desc: "Состав команды", icon: Users, cap: "canMods" },
  { id: "admin", to: "/admin", label: "Админ", desc: "Настройки панели", icon: Shield, cap: "canAdmin" },
  { id: "vlada", to: "/vlada", label: "для Влады", desc: "Книга поздравлений в стиле Minecraft", icon: Heart },
];

export function allowedTabs(caps: Caps, profile?: StaffProfile | null): TabDef[] {
  return TABS.filter((t) => {
    if (t.id === "vlada") {
      return canAccessVlada(profile);
    }
    return !t.cap || caps[t.cap];
  });
}
