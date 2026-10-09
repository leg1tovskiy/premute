import { useEffect, useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Loader2, LogOut, ShieldAlert, TriangleAlert } from "lucide-react";
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

function BootScreen({ error }: { error?: string | null }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 text-fg">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <img src="/logo.png" alt="" className="size-12 rounded-sm border border-border object-cover" />
        {error ? (
          <p className="flex items-start gap-2 text-sm text-danger">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" />
            Открываю панель
          </p>
        )}
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

function PanelLayout() {
  const { user: authUser, isPending } = useCurrentUserState();
  const { isDark } = useTheme();
  const [profile, setProfile] = useState<StaffProfile | null>(
    import.meta.env.DEV ? LOCAL_DEV_PROFILE : null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authUser) {
      if (import.meta.env.DEV) {
        setProfile(LOCAL_DEV_PROFILE);
      } else {
        setProfile(null);
      }
      return;
    }
    let cancelled = false;
    setError(null);
    void getMe({
      data: {
        displayName: authUser.displayName,
        email: authUser.primaryEmail,
        image: authUser.profileImageUrl,
      },
    })
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((e) => {
        if (!cancelled) {
          if (import.meta.env.DEV) {
            setProfile(LOCAL_DEV_PROFILE);
          } else {
            setError(e instanceof Error ? e.message : "Ошибка профиля");
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  if (!import.meta.env.DEV) {
    if (isPending) return <BootScreen />;
    if (!authUser) return <LoginScreen />;
  }
  if (!profile) return <BootScreen error={error} />;
  if (profile.caps.isBanned || profile.isBanned) {
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
  if (profile.caps.waiting) {
    return (
      <>
        <WaitingView profile={profile} onUpdate={setProfile} />
        <Toaster
          theme={isDark ? "dark" : "light"}
          position="bottom-center"
          toastOptions={{ className: "bg-elevated text-fg border border-border" }}
        />
      </>
    );
  }

  return (
    <PanelProvider profile={profile} setProfile={setProfile}>
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
