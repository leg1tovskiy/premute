import { createFileRoute } from "@tanstack/react-router";
import { LogsView } from "@/components/logs-view";
import { RequireCap, usePanel } from "@/lib/panel";

function LogsRoute() {
  const { profile } = usePanel();
  return (
    <RequireCap cap="canLogs">
      <LogsView me={profile} />
    </RequireCap>
  );
}

export const Route = createFileRoute("/_panel/logs")({ component: LogsRoute });
