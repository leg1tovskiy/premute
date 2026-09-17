import { createFileRoute } from "@tanstack/react-router";
import { ModerationView } from "@/components/moderation-view";
import { RequireCap } from "@/lib/panel";

export const Route = createFileRoute("/_panel/moderation")({
  component: () => (
    <RequireCap cap="canModeration">
      <ModerationView />
    </RequireCap>
  ),
});
