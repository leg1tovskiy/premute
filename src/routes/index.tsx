import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Toaster } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMe } from "@/lib/fn";
import type { StaffProfile } from "@/lib/types";
import { LoginScreen } from "@/components/login-screen";
import { HomeTiles, PanelShell, type Tab } from "@/components/panel-shell";
import { WaitingView } from "@/components/waiting-view";
import { StatsView } from "@/components/stats-view";
import { TopsView } from "@/components/tops-view";
import { ModerationView } from "@/components/moderation-view";
import { VoiceView } from "@/components/voice-view";
import { LogsView } from "@/components/logs-view";
import { PowerView } from "@/components/power-view";
import { ConsoleView } from "@/components/console-view";
import { AdminView } from "@/components/admin-view";
import { ModsView } from "@/components/mods-view";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useCurrentUserState();
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("home");

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let cancelled = false;
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

  if (isPending || !user) {
    return <LoginScreen />;
  }

  if (!profile) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg text-muted">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          {error || "Открываю панель"}
        </div>
      </div>
    );
  }

  const waiting = profile.caps.waiting;

  return (
    <>
      <PanelShell
        tab={waiting ? "home" : tab}
        tag={profile.tag}
        onTab={(t) => {
          if (waiting) return;
          setTab(t);
        }}
      >
        {waiting ? (
          <WaitingView profile={profile} onUpdate={setProfile} />
        ) : tab === "stats" && profile.caps.canStats ? (
          <StatsView />
        ) : tab === "tops" ? (
          <TopsView />
        ) : tab === "moderation" && profile.caps.canModeration ? (
          <ModerationView />
        ) : tab === "voice" && profile.caps.canVoice ? (
          <VoiceView />
        ) : tab === "logs" && profile.caps.canLogs ? (
          <LogsView />
        ) : tab === "power" && profile.caps.canPower ? (
          <PowerView />
        ) : tab === "console" && profile.caps.canConsole ? (
          <ConsoleView />
        ) : tab === "mods" && profile.caps.canMods ? (
          <ModsView isOwner={profile.caps.isOwner} />
        ) : tab === "admin" && profile.caps.canAdmin ? (
          <AdminView me={profile} />
        ) : (
          <HomeTiles caps={profile.caps} onTab={setTab} />
        )}
      </PanelShell>
      <Toaster
        theme="dark"
        position="bottom-center"
        toastOptions={{
          className: "bg-elevated text-fg border border-border",
        }}
      />
    </>
  );
}
