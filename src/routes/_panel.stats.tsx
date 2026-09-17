import { createFileRoute } from "@tanstack/react-router";
import { StatsView } from "@/components/stats-view";
import { RequireCap } from "@/lib/panel";

export const Route = createFileRoute("/_panel/stats")({
  component: () => (
    <RequireCap cap="canStats">
      <StatsView />
    </RequireCap>
  ),
});
