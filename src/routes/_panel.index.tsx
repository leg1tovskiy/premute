import { createFileRoute } from "@tanstack/react-router";
import { HomeTiles } from "@/components/panel-shell";

export const Route = createFileRoute("/_panel/")({ component: HomeTiles });
