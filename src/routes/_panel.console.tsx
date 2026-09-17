import { createFileRoute } from "@tanstack/react-router";
import { ConsoleView } from "@/components/console-view";
import { RequireCap } from "@/lib/panel";

export const Route = createFileRoute("/_panel/console")({
  component: () => (
    <RequireCap cap="canConsole">
      <ConsoleView />
    </RequireCap>
  ),
});
