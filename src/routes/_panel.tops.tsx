import { createFileRoute } from "@tanstack/react-router";
import { TopsView } from "@/components/tops-view";
import { RequireCap } from "@/lib/panel";

export const Route = createFileRoute("/_panel/tops")({
  component: () => (
    <RequireCap cap="canStats">
      <TopsView />
    </RequireCap>
  ),
});
