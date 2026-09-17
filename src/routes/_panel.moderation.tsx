import { createFileRoute } from "@tanstack/react-router";
import { ModerationView } from "@/components/moderation-view";
import { RequireCap } from "@/lib/panel";

export const Route = createFileRoute("/_panel/moderation")({
  validateSearch: (search: Record<string, unknown>): { target?: string } => ({
    target: typeof search.target === "string" && search.target ? search.target : undefined,
  }),
  component: () => (
    <RequireCap cap="canModeration">
      <ModerationView />
    </RequireCap>
  ),
});
