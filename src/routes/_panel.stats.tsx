import { createFileRoute } from "@tanstack/react-router";
import { StatsView } from "@/components/stats-view";
import { ModDetailsView } from "@/components/mod-details-view";
import { RequireCap, usePanel } from "@/lib/panel";
import { ShieldAlert } from "lucide-react";

function StatsRoute() {
  const { profile } = usePanel();

  // Если у пользователя нет прав на общую статистику всех модераторов:
  if (!profile.caps.canGeneralStats) {
    if (profile.mySteamId) {
      // Показываем детальный профиль модератора со всей личной статистикой (Photo 1)
      return <ModDetailsView explicitSlug={profile.mySteamId} hideBackLink={true} />;
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

  // Полный доступ: общая статистика, топы и сводка (Photo 2)
  return <StatsView />;
}

export const Route = createFileRoute("/_panel/stats")({
  component: () => (
    <RequireCap cap="canStats">
      <StatsRoute />
    </RequireCap>
  ),
});
