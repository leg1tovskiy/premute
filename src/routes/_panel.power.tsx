import { createFileRoute } from "@tanstack/react-router";
import { PowerView } from "@/components/power-view";
import { RequireCap } from "@/lib/panel";

export const Route = createFileRoute("/_panel/power")({
  component: () => (
    <RequireCap cap="canPower">
      <PowerView />
    </RequireCap>
  ),
});
