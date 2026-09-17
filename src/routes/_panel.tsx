import { useEffect, useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Loader2, TriangleAlert } from "lucide-react";
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

function PanelLayout() {
  const { user, isPending } = useCurrentUserState();
  const { isDark } = useTheme();
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setError(null);
    void getMe({
      data: {
        displayName: user.displayName,
        email: user.primaryEmail,
        image: user.profileImageUrl,
      },
    })
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка профиля");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (isPending) return <BootScreen />;
  if (!user) return <LoginScreen />;
  if (!profile) return <BootScreen error={error} />;
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
