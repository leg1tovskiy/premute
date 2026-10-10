import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { AuthProvider } from "@/lib/auth/provider";
import { ThemeProvider } from "@/components/theme-provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "PremuteBOT";

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    const key = "premute_last_chunk_reload";
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last > 10000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
  });
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "theme-color", content: "#0c0d10" },
      {
        name: "description",
        content: "Панель управления Discord-ботом PremuteBOT: статистика FEAR, модерация и озвучка.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  errorComponent: ({ error }: { error: unknown }) => {
    const err = error as (Error & { message?: string; name?: string }) | null | undefined;
    const msg = err?.message || "";
    const isChunkError =
      Boolean(err) &&
      (msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("error loading dynamically imported module") ||
        err?.name === "ChunkLoadError");

    if (typeof window !== "undefined" && isChunkError) {
      const key = "premute_last_chunk_reload";
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last > 10000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
        return null;
      }
    }

    return (
      <html lang="ru" className="antialiased" suppressHydrationWarning>
        <head>
          <HeadContent />
        </head>
        <body className="flex min-h-dvh flex-col items-center justify-center bg-[#0c0d10] px-4 py-12 text-center text-[#eef0f4]">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/15 text-red-400">
            <AlertTriangle className="size-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            {isChunkError ? "Вышло обновление сайта" : "Произошла ошибка"}
          </h1>
          <p className="mt-2 max-w-md text-xs text-[#8b909a] leading-relaxed">
            {isChunkError
              ? "Была опубликована новая версия панели. Нажмите кнопку ниже для обновления страницы."
              : (msg || "Что-то пошло не так при загрузке страницы.")}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-[#6ea8ff] px-5 text-xs font-bold text-[#0c0d10] hover:opacity-90 transition-all shadow-lg cursor-pointer"
          >
            <RefreshCw className="size-3.5" />
            Обновить страницу
          </button>
          <Scripts />
        </body>
      </html>
    );
  },
  component: () => (
    <html lang="ru" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <ThemeProvider>
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  ),
});
