import { createFileRoute, Navigate } from "@tanstack/react-router";
import { ModDetailsView } from "@/components/mod-details-view";
import { RequireCap } from "@/lib/panel";

/** Вырезанные вкладки: старые ссылки ведут на главную, а не на «не найден». */
const REMOVED_TABS = new Set(["moderation", "voice", "logs", "power", "console"]);

function ModDetailsRoute() {
  const { slug } = Route.useParams();
  if (REMOVED_TABS.has(slug.toLowerCase())) return <Navigate to="/" replace />;
  return (
    <RequireCap cap="canStats">
      <ModDetailsView />
    </RequireCap>
  );
}

export const Route = createFileRoute("/_panel/$slug")({ component: ModDetailsRoute });
