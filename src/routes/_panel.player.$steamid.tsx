import { createFileRoute } from "@tanstack/react-router";
import { PlayerView } from "@/components/player-view";
import { RequireAnyCap } from "@/lib/panel";

export const Route = createFileRoute("/_panel/player/$steamid")({
  component: () => (
    <RequireAnyCap caps={["canStats", "canModeration"]}>
      <PlayerView />
    </RequireAnyCap>
  ),
});
