import { createFileRoute } from "@tanstack/react-router";
import { PlayerView } from "@/components/player-view";
import { RequireCap } from "@/lib/panel";

export const Route = createFileRoute("/_panel/player/$steamid")({
  component: () => (
    <RequireCap cap="canStats">
      <PlayerView />
    </RequireCap>
  ),
});
