import { createFileRoute } from "@tanstack/react-router";
import { ActivityView } from "@/components/activity-view";
import { RequireCap } from "@/lib/panel";

export const Route = createFileRoute("/_panel/online")({
  component: () => (
    <RequireCap cap="canStats">
      <ActivityView />
    </RequireCap>
  ),
});
