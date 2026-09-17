import { useMemo, useState, type FormEvent } from "react";
import { Ban, Loader2, Search, ShieldAlert, UserMinus, VolumeX, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogActions,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { moderateFn, searchMembersFn } from "@/lib/fn";
import { MUTE_PRESETS, parseMuteDuration } from "@/lib/constants";
import type { GuildMember } from "@/lib/types";
import { cn } from "@/lib/utils";

type Action = "ban" | "kick" | "mute" | "warn" | "unmute";

const ACTIONS: { id: Action; label: string; icon: typeof Ban; danger?: boolean }[] = [
  { id: "ban", label: "Бан", icon: Ban, danger: true },
  { id: "mute", label: "Мут", icon: VolumeX },
  { id: "kick", label: "Кик", icon: UserMinus },
  { id: "warn", label: "Предупреждение", icon: ShieldAlert },
  { id: "unmute", label: "Размут", icon: Volume2 },
];

export function ModerationView() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GuildMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [target, setTarget] = useState<GuildMember | null>(null);
  const [action, setAction] = useState<Action>("warn");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState(MUTE_PRESETS[0].ms);
  const [customDur, setCustomDur] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const customParsed = customDur.trim() ? parseMuteDuration(customDur) : null;

  async function search(e?: FormEvent) {
    e?.preventDefault();
    setSearching(true);
    try {
      const rows = await searchMembersFn({ data: { query } });
      setHits(rows);
      if (rows.length === 1) setTarget(rows[0]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Поиск не удался");
    } finally {
      setSearching(false);
    }
  }

  const display = useMemo(() => {
    if (!target) return null;
    return target.nick || target.globalName || target.username;
  }, [target]);

  async function submit() {
    if (!target) {
      toast.error("Выберите участника");
      return;
    }
    let durationMs = duration;
    if (action === "mute" && customDur.trim()) {
      const parsed = parseMuteDuration(customDur);
      if ("error" in parsed) {
        toast.error(parsed.error);
        return;
      }
      durationMs = parsed.ms;
    }
    setBusy(true);
    try {
      const res = await moderateFn({
        data: {
          action,
          targetId: target.id,
          reason,
          durationMs: action === "mute" ? durationMs : undefined,
        },
      });
      toast.success(res.message);
      setReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Действие не выполнено");
    } finally {
      setBusy(false);
    }
  }

  function requestSubmit() {
    if (!target) {
      toast.error("Выберите участника");
      return;
    }
    if (action === "ban" || action === "kick") {
      setConfirmOpen(true);
      return;
    }
    void submit();
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <header className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">Модерирование</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Наказания на сервере</h1>
        <p className="mt-1 text-sm text-muted">
          Бан, мут, кик и предупреждение — те же действия, что выполняет бот в Discord.
        </p>
      </header>

      <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            className="pl-10"
            placeholder="Ник, имя или Discord ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={searching}>
          {searching ? <Loader2 className="animate-spin" /> : <Search />}
          Найти
        </Button>
      </form>

      {hits.length > 0 ? (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
          {hits.map((m) => {
            const name = m.nick || m.globalName || m.username;
            const active = target?.id === m.id;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setTarget(m)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    active ? "bg-elevated" : "hover:bg-elevated/60",
                  )}
                >
                  {m.avatar ? (
                    <img src={m.avatar} alt="" className="size-9 rounded-full object-cover" />
                  ) : (
                    <span className="grid size-9 place-items-center rounded-full bg-elevated text-xs font-medium">
                      {name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{name}</span>
                    <span className="block truncate font-mono text-[11px] text-subtle">
                      @{m.username} · {m.id}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-8 rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-panel)] sm:p-6">
        <p className="text-sm text-muted">
          Цель:{" "}
          <span className="font-medium text-fg">{display ?? "не выбрана"}</span>
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {ACTIONS.map((a) => (
            <Button
              key={a.id}
              type="button"
              size="sm"
              variant={action === a.id ? (a.danger ? "danger" : "default") : "secondary"}
              onClick={() => setAction(a.id)}
            >
              <a.icon />
              {a.label}
            </Button>
          ))}
        </div>

        {action === "mute" ? (
          <div className="mt-5">
            <Label>Срок мута</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {MUTE_PRESETS.map((p) => (
                <Button
                  key={p.ms}
                  type="button"
                  size="sm"
                  variant={!customDur.trim() && duration === p.ms ? "default" : "secondary"}
                  onClick={() => {
                    setCustomDur("");
                    setDuration(p.ms);
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="mt-3 grid gap-1.5">
              <Label htmlFor="custom-mute">Свой срок</Label>
              <Input
                id="custom-mute"
                placeholder="1s · 10m · 2h · 1d или 1h30m"
                value={customDur}
                onChange={(e) => setCustomDur(e.target.value)}
              />
              {customParsed && "error" in customParsed ? (
                <p className="text-xs text-danger">{customParsed.error}</p>
              ) : customParsed && "ms" in customParsed ? (
                <p className="text-xs text-muted">Будет выдано на {Math.max(1, Math.round(customParsed.ms / 1000))} сек.</p>
              ) : (
                <p className="text-xs text-subtle">s — секунды, m — минуты, h — часы, d — дни</p>
              )}
            </div>
          </div>
        ) : null}

        {action !== "unmute" ? (
          <div className="mt-5 grid gap-2">
            <Label htmlFor="reason">Причина</Label>
            <Textarea
              id="reason"
              placeholder="Нарушение правил сервера"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        ) : null}

        <Button className="mt-6 w-full sm:w-auto" disabled={busy || !target} onClick={requestSubmit}>
          {busy ? <Loader2 className="animate-spin" /> : null}
          Выполнить
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>
            {action === "ban" ? "Забанить" : "Кикнуть"} {display ?? "участника"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Действие выполнит бот в Discord и запишет его в лог-канал.
            {reason.trim() ? ` Причина: ${reason.trim()}` : " Причина не указана."}
          </AlertDialogDescription>
          <AlertDialogActions>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                void submit();
              }}
            >
              {action === "ban" ? "Забанить" : "Кикнуть"}
            </AlertDialogAction>
          </AlertDialogActions>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
