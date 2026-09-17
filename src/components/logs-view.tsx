import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeaderSkeleton, RowsSkeleton } from "@/components/skeletons";
import { getLogsFn } from "@/lib/fn";
import type { LogEntry } from "@/lib/types";

function fmtTs(ts: number) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(ts));
  } catch {
    return "";
  }
}

export function LogsView() {
  const [rows, setRows] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  async function load(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getLogsFn();
      setRows([...data].reverse());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить логи");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(true), 15000);
    return () => clearInterval(t);
  }, []);

  const query = search.trim().toLowerCase();
  const visible = useMemo(
    () => (query ? rows.filter((r) => r.text.toLowerCase().includes(query)) : rows),
    [rows, query],
  );

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
        <PageHeaderSkeleton />
        <div className="mt-6">
          <RowsSkeleton rows={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Журнал</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Логи</h1>
          <p className="mt-1 text-sm text-muted">
            Те же записи, что и в канале логов Discord: перезапуски, наказания, озвучка и звуки.
          </p>
        </div>
        <Button variant="secondary" size="sm" className="sm:shrink-0" disabled={refreshing} onClick={() => void load(true)}>
          {refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Обновить
        </Button>
      </header>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по записям"
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-panel)]">
        {visible.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            {query ? "Ничего не найдено." : "Записей пока нет."}
          </p>
        ) : (
          <ul className="max-h-[65vh] divide-y divide-border overflow-y-auto">
            {visible.map((r, i) => (
              <li key={`${r.ts}-${i}`} className="px-4 py-3 sm:px-5">
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{r.text}</p>
                <p className="mt-1 font-mono text-[11px] text-subtle">{fmtTs(r.ts)} МСК</p>
              </li>
            ))}
          </ul>
        )}
        {query ? (
          <p className="border-t border-border px-4 py-2 text-xs text-subtle sm:px-5">
            {visible.length} из {rows.length}
          </p>
        ) : null}
      </div>
    </div>
  );
}
