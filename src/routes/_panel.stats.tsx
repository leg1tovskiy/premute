import { createFileRoute } from "@tanstack/react-router";
import { StatsView } from "@/components/stats-view";
import { ModDetailsView } from "@/components/mod-details-view";
import { RequireCap, usePanel } from "@/lib/panel";
import { ShieldAlert } from "lucide-react";

import { useState } from "react";
import { Sparkles, User, BarChart3 } from "lucide-react";

function StatsRoute() {
  const { profile } = usePanel();
  const [viewMode, setViewMode] = useState<"general" | "personal">("general");

  // Если у пользователя нет прав на общую статистику всех модераторов (Пн-Сб):
  if (!profile.caps.canGeneralStats) {
    if (profile.mySteamId) {
      // Показываем детальный профиль модератора со всей личной статистикой (Photo 1)
      return (
        <div className="space-y-4">
          <ModDetailsView explicitSlug={profile.mySteamId} hideBackLink={true} />
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 mb-4">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Личная статистика недоступна</h1>
        <p className="mt-2 text-xs text-muted leading-relaxed">
          К вашему аккаунту ещё не привязан SteamID. Обратитесь к администратору панели для привязки SteamID.
        </p>
      </div>
    );
  }

  // Если доступ открыт временно по воскресеньям:
  if (profile.caps.isSundayAccess) {
    return (
      <div className="space-y-5">
        <div className="mx-auto max-w-[1500px] px-4 pt-4 sm:px-8">
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
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
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
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
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

        {viewMode === "personal" && profile.mySteamId ? (
          <ModDetailsView explicitSlug={profile.mySteamId} hideBackLink={true} />
        ) : (
          <StatsView />
        )}
      </div>
    );
  }

  // Постоянный полный доступ (владельцы и модераторы с правами от админа)
  return <StatsView />;
}

export const Route = createFileRoute("/_panel/stats")({
  component: () => (
    <RequireCap cap="canStats">
      <StatsRoute />
    </RequireCap>
  ),
});
