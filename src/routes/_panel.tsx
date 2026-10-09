import { useEffect, useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LogOut, ShieldAlert } from "lucide-react";
import { Toaster } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMe } from "@/lib/fn";
import { PanelProvider } from "@/lib/panel";
import { useTheme } from "@/components/theme-provider";
import { LoginScreen } from "@/components/login-screen";
import { PanelShell } from "@/components/panel-shell";
import { WaitingView } from "@/components/waiting-view";
import { CommandPalette } from "@/components/command-palette";
import type { StaffProfile } from "@/lib/types";

export const Route = createFileRoute("/_panel")({ component: PanelLayout });

function BannedView() {
  async function handleLogout() {
    try {
      const { signOut } = await import("@/lib/auth/client");
      await signOut();
    } catch {}
    window.location.href = "/";
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 text-fg">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="mb-5 grid size-16 place-items-center rounded-3xl bg-danger/15 text-danger border border-danger/30 shadow-lg shadow-danger/10">
          <ShieldAlert className="size-8" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-fg">Доступ к панели заблокирован</h1>
        <p className="mt-3 text-xs sm:text-sm text-muted leading-relaxed">
          Ваш аккаунт заблокирован администратором панели управления. Доступ ко всем разделам и функциям ограничен.
        </p>
        <button
          type="button"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-border bg-elevated px-5 py-2.5 text-xs font-bold text-fg hover:border-danger/50 hover:text-danger transition-colors shadow-sm cursor-pointer"
          onClick={() => void handleLogout()}
        >
          <LogOut className="size-4" />
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}



const LOCAL_DEV_PROFILE: StaffProfile = {
  userId: "dev-user",
  displayName: "Администратор (Local)",
  email: "admin@fearproject.ru",
  image: null,
  discordId: "1234567890",
  mySteamId: "76561198805786012",
  tag: "FearAdmin",
  isRoot: true,
  isOwner: true,
  isBotOwner: true,
  canStats: true,
  canSuspicious: true,
  canModeration: true,
  canVoice: true,
  canMods: true,
  canLogs: true,
  canPower: true,
  createdAt: new Date().toISOString(),
  lastSeen: new Date().toISOString(),
  caps: {
    isRoot: true,
    isOwner: true,
    canStats: true,
    canGeneralStats: true,
    canOwnStats: true,
    canSuspicious: true,
    canModeration: true,
    canVoice: true,
    canMods: true,
    canLogs: true,
    canPower: true,
    canConsole: true,
    canAdmin: true,
    canGrantOwner: true,
    canGrantBotOwner: true,
    waiting: false,
  },
};

function makeDefaultProfile(u: { id: string; displayName?: string | null; primaryEmail?: string | null; profileImageUrl?: string | null }): StaffProfile {
  return {
    userId: u.id,
    displayName: u.displayName || u.primaryEmail || "Пользователь",
    email: u.primaryEmail ?? null,
    image: u.profileImageUrl ?? null,
    discordId: null,
    mySteamId: null,
    tag: null,
    isRoot: false,
    isOwner: false,
    isBotOwner: false,
    isBanned: false,
    canStats: true,
    canSuspicious: false,
    canModeration: false,
    canVoice: false,
    canMods: false,
    canLogs: false,
    canPower: false,
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    caps: {
      isRoot: false,
      isOwner: false,
      canStats: true,
      canGeneralStats: false,
      canOwnStats: false,
      isSundayAccess: false,
      hasPermanentGeneralStats: false,
      canSuspicious: false,
      canModeration: false,
      canVoice: false,
      canMods: false,
      canLogs: false,
      canPower: false,
      canConsole: false,
      canAdmin: false,
      canGrantOwner: false,
      canGrantBotOwner: false,
      waiting: false,
      isBanned: false,
    },
  };
}

const PROFILE_CACHE_KEY = "premute_cached_profile";

function getCachedProfile(): StaffProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as StaffProfile) : null;
  } catch {
    return null;
  }
}

function setCachedProfile(p: StaffProfile | null) {
  if (typeof window === "undefined") return;
  try {
    if (p) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p));
    else localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {}
}

function PanelLayout() {
  const { user: authUser, isPending } = useCurrentUserState();
  const { isDark } = useTheme();
  const [profile, setProfile] = useState<StaffProfile | null>(() =>
    import.meta.env.DEV ? LOCAL_DEV_PROFILE : getCachedProfile(),
  );

  useEffect(() => {
    if (!authUser) {
      if (import.meta.env.DEV) {
        setProfile(LOCAL_DEV_PROFILE);
      } else {
        setProfile(null);
        setCachedProfile(null);
      }
      return;
    }
    let cancelled = false;
    void getMe({
      data: {
        displayName: authUser.displayName,
        email: authUser.primaryEmail,
        image: authUser.profileImageUrl,
      },
    })
      .then((p) => {
        if (!cancelled) {
          setProfile(p);
          setCachedProfile(p);
        }
      })
      .catch((e) => {
        console.error("[panel] getMe failed:", e);
      });
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  if (!import.meta.env.DEV) {
    // Если сессия ещё проверяется и пользователя нет в кэше — держим нейтральный фон на доли секунды,
    // чтобы экран авторизации не проскакивал перед входом
    if (isPending && !authUser) {
      return <div className="min-h-dvh bg-bg" />;
    }
    if (!authUser) {
      return <LoginScreen />;
    }
  }

  const currentProfile =
    profile ||
    (import.meta.env.DEV
      ? LOCAL_DEV_PROFILE
      : authUser
        ? makeDefaultProfile(authUser)
        : null);

  if (!currentProfile) {
    return <LoginScreen />;
  }

  if (currentProfile.caps.isBanned || currentProfile.isBanned) {
    return (
      <>
        <BannedView />
        <Toaster
          theme={isDark ? "dark" : "light"}
          position="bottom-center"
          toastOptions={{ className: "bg-elevated text-fg border border-border" }}
        />
      </>
    );
  }

  if (currentProfile.caps.waiting) {
    return (
      <>
        <WaitingView profile={currentProfile} onUpdate={setProfile} />
        <Toaster
          theme={isDark ? "dark" : "light"}
          position="bottom-center"
          toastOptions={{ className: "bg-elevated text-fg border border-border" }}
        />
      </>
    );
  }

  return (
    <PanelProvider profile={currentProfile} setProfile={setProfile}>
      <PanelShell>
        <Outlet />
      </PanelShell>
      <CommandPalette />
      <Toaster
        theme={isDark ? "dark" : "light"}
        position="bottom-center"
        toastOptions={{ className: "bg-elevated text-fg border border-border" }}
      />
    </PanelProvider>
  );
}
