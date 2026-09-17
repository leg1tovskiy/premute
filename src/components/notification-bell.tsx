import { useEffect, useRef, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { getStatsFn, getSystemStatusFn } from "@/lib/fn";
import { usePanel } from "@/lib/panel";

const LS_KEY = "premute-notify";

function notify(title: string, body: string) {
  try {
    new Notification(title, { body, icon: "/logo.png" });
  } catch {
    /* уведомление не показалось — не критично */
  }
}

/**
 * Браузерные уведомления, пока вкладка открыта: падение бота и новые наказания.
 * (Полноценный web-push с доставкой при закрытой вкладке требует VAPID и
 * сервис-воркера — отдельная задача.)
 */
export function NotificationBell() {
  const { profile } = usePanel();
  const [enabled, setEnabled] = useState(false);
  const prev = useRef<{ bot: boolean | null; total: number | null }>({ bot: null, total: null });

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(LS_KEY) === "1" && Notification.permission === "granted");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const pull = async () => {
      try {
        const status = await getSystemStatusFn();
        if (!alive) return;
        if (prev.current.bot === true && !status.bot) {
          notify("PremuteBOT недоступен", "Бот перестал отвечать. Проверьте «Питание» или сервер.");
        }
        prev.current.bot = status.bot;

        if (profile.caps.canStats) {
          const stats = await getStatsFn({ data: { refresh: false } });
          if (!alive) return;
          const total = stats.totals?.total ?? null;
          if (prev.current.total != null && total != null && total > prev.current.total) {
            notify("Новые наказания", `С прошлой проверки выдано ${total - prev.current.total}. Всего за месяц: ${total}.`);
          }
          prev.current.total = total;
        }
      } catch {
        /* тихо */
      }
    };
    void pull();
    const t = setInterval(() => void pull(), 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [enabled, profile.caps.canStats]);

  async function toggle() {
    if (enabled) {
      setEnabled(false);
      try {
        localStorage.setItem(LS_KEY, "0");
      } catch {
        /* ignore */
      }
      return;
    }
    if (typeof Notification === "undefined") {
      toast.error("Браузер не поддерживает уведомления");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      toast.error("Разрешение на уведомления не выдано");
      return;
    }
    try {
      localStorage.setItem(LS_KEY, "1");
    } catch {
      /* ignore */
    }
    setEnabled(true);
    toast.success("Уведомления включены, пока вкладка открыта");
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      title={enabled ? "Уведомления включены" : "Уведомления о падении бота и новых наказаниях"}
      className={
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border bg-elevated transition-colors " +
        (enabled ? "text-accent" : "text-muted hover:text-fg")
      }
    >
      {enabled ? <BellRing className="size-3.5" /> : <Bell className="size-3.5" />}
    </button>
  );
}
