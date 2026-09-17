import { createFileRoute } from "@tanstack/react-router";
import { LogsView } from "@/components/logs-view";
import { RequireCap } from "@/lib/panel";

export const Route = createFileRoute("/_panel/logs")({
  component: () => (
    <RequireCap cap="canLogs">
      <LogsView />
    </RequireCap>
  ),
});
