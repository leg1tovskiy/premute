import { createFileRoute } from "@tanstack/react-router";
import { SuspiciousView } from "@/components/suspicious-view";
import { RequireCap } from "@/lib/panel";

export const Route = createFileRoute("/_panel/suspicious")({
  component: () => (
    <RequireCap cap="canSuspicious">
      <SuspiciousView />
    </RequireCap>
  ),
});
