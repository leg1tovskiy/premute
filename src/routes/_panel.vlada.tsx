import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { MinecraftBook } from "@/components/minecraft-book";
import { usePanel } from "@/lib/panel";
import { canAccessVlada } from "@/lib/vlada-access";

function VladaRoute() {
  const { profile } = usePanel();
  const navigate = useNavigate();
  const [isAllowed, setIsAllowed] = useState(() => canAccessVlada(profile));

  // Проверка доступа при монтировании и каждые 5 сек (если время истечёт прямо во время просмотра)
  useEffect(() => {
    const check = () => {
      const allowed = canAccessVlada(profile);
      setIsAllowed(allowed);
      if (!allowed) {
        void navigate({ to: "/", replace: true });
      }
    };
    check();
    const timer = window.setInterval(check, 5000);
    return () => window.clearInterval(timer);
  }, [profile, navigate]);

  useEffect(() => {
    if (!isAllowed) return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [isAllowed]);

  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }

  return <MinecraftBook />;
}

export const Route = createFileRoute("/_panel/vlada")({ component: VladaRoute });
