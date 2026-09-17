import { useEffect, useState } from "react";
import { getSystemStatusFn } from "@/lib/fn";
import type { SystemStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

function fmtTime(sec: number) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(sec * 1000));
  } catch {
    return "";
  }
}

export function StatusIndicator() {
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const s = await getSystemStatusFn();
        if (alive) setStatus(s);
      } catch {
        /* тихо — индикатор не критичен */
      }
    };
    void pull();
    const t = setInterval(() => void pull(), 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const allOk = Boolean(status?.worker && status?.bot);
  const title = !status
    ? "Проверяю состояние бота и воркера…"
    : [
        `Бот: ${status.bot ? "онлайн" : "недоступен"}`,
        `Воркер статистики: ${status.worker ? "ок" : "недоступен"}`,
        status.workerUpdatedAt ? `данные обновлены в ${fmtTime(status.workerUpdatedAt)} МСК` : null,
        `проверено в ${fmtTime(status.checkedAt)} МСК`,
      ]
        .filter(Boolean)
        .join(" · ");

  return (
    <span
      title={title}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-border bg-elevated px-2 text-xs text-muted"
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          !status ? "bg-subtle" : allOk ? "bg-success" : "bg-danger",
        )}
      />
      <span className="hidden lg:inline">{!status ? "…" : allOk ? "Онлайн" : "Сбой"}</span>
    </span>
  );
}
