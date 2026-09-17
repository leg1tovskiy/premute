import { createFileRoute } from "@tanstack/react-router";
import { AdminView } from "@/components/admin-view";
import { RequireCap, usePanel } from "@/lib/panel";

function AdminRoute() {
  const { profile } = usePanel();
  return (
    <RequireCap cap="canAdmin">
      <AdminView me={profile} />
    </RequireCap>
  );
}

export const Route = createFileRoute("/_panel/admin")({ component: AdminRoute });
