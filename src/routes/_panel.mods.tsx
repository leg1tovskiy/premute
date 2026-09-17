import { createFileRoute } from "@tanstack/react-router";
import { ModsView } from "@/components/mods-view";
import { RequireCap, usePanel } from "@/lib/panel";

function ModsRoute() {
  const { profile } = usePanel();
  return (
    <RequireCap cap="canMods">
      <ModsView isOwner={profile.caps.isOwner} />
    </RequireCap>
  );
}

export const Route = createFileRoute("/_panel/mods")({ component: ModsRoute });
