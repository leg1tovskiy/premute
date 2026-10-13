import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { StatsView } from "@/components/stats-view";
import { RequireCap, usePanel } from "@/lib/panel";

function StatsRoute() {
  const { profile } = usePanel();
  const search = Route.useSearch();

  if (search.tab === "activity" || search.tab === "online") {
    return <Navigate to="/online" replace />;
  }

  return (
    <div className="space-y-4">
      {/* Если доступ открыт временно по воскресеньям */}
      {profile.caps.isSundayAccess ? (
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
          </div>
        </div>
      ) : null}

      <StatsView />
    </div>
  );
}

type StatsSearch = {
  tab?: "stats" | "activity" | "online";
};

export const Route = createFileRoute("/_panel/stats")({
  validateSearch: (search: Record<string, unknown>): StatsSearch => {
    return {
      tab: typeof search?.tab === "string" ? (search.tab as any) : undefined,
    };
  },
  component: () => (
    <RequireCap cap="canGeneralStats">
      <StatsRoute />
    </RequireCap>
  ),
});
