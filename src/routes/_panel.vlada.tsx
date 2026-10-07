import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MinecraftBook } from "@/components/minecraft-book";

function VladaRoute() {
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return <MinecraftBook />;
}

export const Route = createFileRoute("/_panel/vlada")({ component: VladaRoute });
