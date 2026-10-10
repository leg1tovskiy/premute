import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart3, Gamepad2, Radio, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { StatsView } from "@/components/stats-view";
import { ModDetailsView } from "@/components/mod-details-view";
import { ActivityView } from "@/components/activity-view";
import { RequireCap, usePanel } from "@/lib/panel";
import { bindSteamFn } from "@/lib/fn";
import { cn } from "@/lib/utils";

function BindSteamPrompt({ onBound }: { onBound: (p: any) => void }) {
  const [steamid, setSteamid] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clean = steamid.trim().replace(/\D/g, "");
  const isValid = clean.length === 17;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await bindSteamFn({ data: { steamid: clean } });
      toast.success("SteamID успешно привязан! Статистика загружается.");
      onBound(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось привязать SteamID");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-6">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent/15 text-accent border border-accent/30 shadow-lg">
        <Gamepad2 className="size-7" />
      </div>
      <div>
        <h1 className="text-2xl font-black tracking-tight text-fg">Привязка SteamID модератора</h1>
        <p className="mt-2 text-xs text-muted leading-relaxed">
          Укажите ваш SteamID64 (17 цифр), чтобы открыть доступ к личной статистике наказаний и норме.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl border border-border/80 bg-surface/90 p-6 text-left shadow-xl space-y-4 glass-panel">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-fg">SteamID64 (17 цифр)</label>
            <span className="font-mono text-[10px] text-muted">{clean.length}/17</span>
          </div>
          <input
            type="text"
            inputMode="numeric"
            placeholder="76561198..."
            value={steamid}
            onChange={(e) => setSteamid(e.target.value)}
            disabled={busy}
            className="h-11 w-full rounded-xl border border-border/80 bg-elevated/70 px-3.5 font-mono text-sm text-fg placeholder:text-muted/60 focus:border-accent outline-none"
          />
        </div>

        {error ? (
          <p className="text-xs text-danger font-medium">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={busy || !isValid}
          className="h-11 w-full rounded-xl bg-accent font-bold text-accent-fg text-xs shadow-lg shadow-accent/20 transition-all hover:brightness-110 active:scale-98 disabled:opacity-50 cursor-pointer"
        >
          {busy ? "Привязка..." : "Привязать и открыть статистику"}
        </button>
      </form>
    </div>
  );
}

function StatsRoute() {
  const { profile, setProfile } = usePanel();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<"general" | "personal">("general");
  const canActivity = Boolean(profile.caps.canActivity);
  const activeTab = canActivity && search.tab === "activity" ? "activity" : "stats";

  function switchTab(next: "stats" | "activity") {
    void navigate({
      to: "/stats",
      search: next === "activity" ? { tab: "activity" } : { tab: "stats" },
    });
  }

  // Top tab switcher between Statistics and Live Activity
  const activitySwitcher = canActivity ? (
    <div className="mx-auto max-w-[1500px] px-4 pt-4 sm:px-8">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => switchTab("stats")}
          className={cn(
            "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all border cursor-pointer",
            activeTab === "stats"
              ? "border-accent bg-accent text-accent-fg shadow-md shadow-accent/20"
              : "border-border/80 bg-surface/80 text-muted hover:text-fg hover:bg-elevated",
          )}
        >
          <BarChart3 className="size-4" />
          <span>Статистика</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab("activity")}
          className={cn(
            "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all border cursor-pointer",
            activeTab === "activity"
              ? "border-success bg-success/20 text-success shadow-md shadow-success/15 font-black"
              : "border-border/80 bg-surface/80 text-muted hover:text-fg hover:bg-elevated",
          )}
        >
          <Radio className={cn("size-4", activeTab === "activity" ? "animate-pulse text-success" : "text-muted")} />
          <span>Активность</span>
          <span className="size-2 rounded-full bg-success" />
        </button>
      </div>
    </div>
  ) : null;

  if (activeTab === "activity" && canActivity) {
    return (
      <div className="space-y-2">
        {activitySwitcher}
        <ActivityView />
      </div>
    );
  }

  // Если у пользователя нет прав на общую статистику всех модераторов (Пн-Сб):
  if (!profile.caps.canGeneralStats) {
    if (profile.mySteamId) {
      return (
        <div className="space-y-4">
          {activitySwitcher}
          <ModDetailsView explicitSlug={profile.mySteamId} hideBackLink={true} />
        </div>
      );
    }
    return <BindSteamPrompt onBound={setProfile} />;
  }

  // Если доступ открыт временно по воскресеньям:
  if (profile.caps.isSundayAccess) {
    return (
      <div className="space-y-4">
        {activitySwitcher}
        <div className="mx-auto max-w-[1500px] px-4 pt-1 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-accent/40 bg-gradient-to-r from-accent/15 via-surface to-elevated p-4 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-md">
                <Sparkles className="size-4.5" />
              </span>
              <div>
                <p className="text-xs font-bold text-fg flex items-center gap-2">
                  <span>Воскресный день: доступ к общей статистике открыт!</span>
                  <span className="rounded-md bg-accent/20 px-2 py-0.5 text-[10px] font-black uppercase text-accent border border-accent/30">
                    до 23:59 МСК
                  </span>
                </p>
                <p className="text-[11px] text-muted">
                  Каждое воскресенье вам открыт полный обзор состава, топы и общие показатели проекта.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("general")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                  viewMode === "general"
                    ? "border-accent bg-accent text-accent-fg shadow-sm"
                    : "border-border/80 bg-surface text-muted hover:text-fg"
                }`}
              >
                <BarChart3 className="size-3.5" />
                Общая стата
              </button>
              {profile.mySteamId ? (
                <button
                  type="button"
                  onClick={() => setViewMode("personal")}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                    viewMode === "personal"
                      ? "border-accent bg-accent text-accent-fg shadow-sm"
                      : "border-border/80 bg-surface text-muted hover:text-fg"
                  }`}
                >
                  <User className="size-3.5" />
                  Мой профиль
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div key={viewMode} className="animate-tab-enter">
          {viewMode === "personal" && profile.mySteamId ? (
            <ModDetailsView explicitSlug={profile.mySteamId} hideBackLink={true} />
          ) : (
            <StatsView />
          )}
        </div>
      </div>
    );
  }

  // Постоянный полный доступ (владельцы и модераторы с правами от админа)
  return (
    <div className="space-y-2">
      {activitySwitcher}
      <StatsView />
    </div>
  );
}

type StatsSearch = {
  tab?: "stats" | "activity";
};

export const Route = createFileRoute("/_panel/stats")({
  validateSearch: (search: Record<string, unknown>): StatsSearch => {
    return {
      tab: search?.tab === "activity" ? "activity" : "stats",
    };
  },
  component: () => (
    <RequireCap cap="canStats">
      <StatsRoute />
    </RequireCap>
  ),
});
