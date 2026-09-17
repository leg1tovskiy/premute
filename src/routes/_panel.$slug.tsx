import { createFileRoute } from "@tanstack/react-router";
import { ModDetailsView } from "@/components/mod-details-view";
import { RequireCap } from "@/lib/panel";

export const Route = createFileRoute("/_panel/$slug")({
  component: () => (
    <RequireCap cap="canStats">
      <ModDetailsView />
    </RequireCap>
  ),
});
