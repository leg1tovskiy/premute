import { createContext, useContext, type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import type { Caps, StaffProfile } from "@/lib/types";

type PanelContextValue = {
  profile: StaffProfile;
  setProfile: (p: StaffProfile) => void;
};

const PanelContext = createContext<PanelContextValue | null>(null);

export function PanelProvider({
  profile,
  setProfile,
  children,
}: PanelContextValue & { children: ReactNode }) {
  return (
    <PanelContext.Provider value={{ profile, setProfile }}>{children}</PanelContext.Provider>
  );
}

export function usePanel(): PanelContextValue {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error("usePanel must be used within PanelProvider");
  return ctx;
}

export function RequireCap({ cap, children }: { cap: keyof Caps; children: ReactNode }) {
  const { profile } = usePanel();
  if (!profile.caps[cap]) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function RequireAnyCap({ caps, children }: { caps: Array<keyof Caps>; children: ReactNode }) {
  const { profile } = usePanel();
  if (!caps.some((c) => profile.caps[c])) return <Navigate to="/" replace />;
  return <>{children}</>;
}
