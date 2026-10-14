import { useEffect, useState } from "react";
import {
  ExternalLink,
  Loader2,
  Trash2,
  Video,
  X,
  Check,
  Clock,
  Shield,
  FileText,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { attachProofFn, removeProofFn } from "@/lib/fn";
import type { PunishmentRecord } from "@/lib/types";

function fmtDateTime(sec: number) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(sec * 1000));
  } catch {
    return "—";
  }
}

export function AttachProofModal({
  open,
  record,
  onClose,
  onSaved,
  onRemoved,
}: {
  open: boolean;
  record: PunishmentRecord | null;
  onClose: () => void;
  onSaved: (
    recordId: number,
    kind: "ban" | "mute",
    proof: NonNullable<PunishmentRecord["proof"]>,
  ) => void;
  onRemoved: (recordId: number, kind: "ban" | "mute") => void;
}) {
  const [url, setUrl] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (record) {
      setUrl(record.proof?.url || "");
      setComment(record.proof?.comment || "");
    } else {
      setUrl("");
      setComment("");
    }
  }, [record]);

  if (!open || !record) return null;

  const isExisting = Boolean(record.proof?.url);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!record) return;

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      toast.error("Введите ссылку на видео или скриншот доказательства");
      return;
    }

    if (!/^https?:\/\//i.test(trimmedUrl)) {
      toast.error("Ссылка должна начинаться с http:// или https://");
      return;
    }

    setSaving(true);
    try {
      const res = await attachProofFn({
        data: {
          recordId: record.id,
          kind: record.kind,
          proofUrl: trimmedUrl,
          comment: comment.trim() || null,
        },
      });

      toast.success(isExisting ? "Доказательство обновлено!" : "Доказательство успешно прикреплено!");
      onSaved(record.id, record.kind, res);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка при сохранении доказательства");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!record || !record.proof?.url) return;
    if (!window.confirm("Удалить доказательство к этому наказанию?")) return;

    setDeleting(true);
    try {
      await removeProofFn({
        data: {
          recordId: record.id,
          kind: record.kind,
        },
      });

      toast.success("Доказательство удалено");
      onRemoved(record.id, record.kind);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка при удалении доказательства");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative my-8 w-full max-w-lg rounded-3xl border border-border/80 bg-surface/95 p-6 shadow-2xl glass-panel space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-accent/20 border border-accent/40 text-accent shadow-sm">
              <Video className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-fg flex items-center gap-2">
                {isExisting ? "Доказательство (Опра)" : "Прикрепить доказательство (Опру)"}
              </h2>
              <p className="text-xs text-muted">
                {record.kind === "ban" ? "Бан" : "Мут"} #{record.id} &middot; {fmtDateTime(record.created)} МСК
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted hover:bg-elevated hover:text-fg transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Punishment Summary Card */}
        <div className="rounded-2xl border border-border/70 bg-elevated/60 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-fg text-sm">{record.player}</span>
              <span className="font-mono text-[11px] text-muted">{record.playerSteamid}</span>
            </div>
            <Badge tone={record.kind === "ban" ? "danger" : "warn"} className="font-bold">
              {record.kind === "ban" ? "Бан" : "Мут"}
            </Badge>
          </div>

          {record.reason && (
            <div className="rounded-xl bg-surface/80 p-2 text-muted border border-border/50">
              <span className="font-bold text-fg">Причина: </span>
              {record.reason}
            </div>
          )}

          <div className="flex items-center justify-between text-subtle text-[11px] pt-1">
            <span>Срок: {record.durationLabel || "Навсегда / без срока"}</span>
            {"adminName" in record && (record as unknown as { adminName?: string }).adminName ? (
              <span>Выдал: {(record as unknown as { adminName: string }).adminName}</span>
            ) : null}
          </div>
        </div>

        {/* Existing Proof Banner */}
        {record.proof?.url && (
          <div className="rounded-2xl border border-accent/40 bg-accent/10 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-accent uppercase tracking-wider flex items-center gap-1.5">
                <Check className="size-3.5" /> Опра прикреплена
              </span>
              {record.proof.authorName && (
                <span className="text-[11px] text-muted">
                  Автор: <span className="text-fg font-semibold">{record.proof.authorName}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <a
                href={record.proof.url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2 text-xs font-black text-accent-fg hover:bg-accent/90 transition-colors shadow-sm"
              >
                <ExternalLink className="size-3.5" />
                <span>Открыть запись в новой вкладке</span>
              </a>
            </div>

            {record.proof.comment && (
              <p className="text-xs text-fg/90 bg-surface/60 rounded-xl p-2 border border-border/50">
                <span className="font-bold text-muted">Таймкод/Заметка: </span>
                {record.proof.comment}
              </p>
            )}
          </div>
        )}

        {/* Edit / Attach Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-fg flex items-center justify-between">
              <span>Ссылка на доказательство (видео / скриншот):</span>
              <span className="text-[10px] text-muted font-normal">YouTube, Medal.tv, Rutube, Диск...</span>
            </label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtu.be/... или https://medal.tv/..."
              className="h-9.5 rounded-xl border-border/80 bg-elevated/70 text-xs text-fg focus:border-accent"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-fg flex items-center justify-between">
              <span>Таймкод и комментарий (опционально):</span>
              <span className="text-[10px] text-muted font-normal">до 500 символов</span>
            </label>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Например: 01:23 WallHack на миду, 02:40 AimBot"
              className="h-9.5 rounded-xl border-border/80 bg-elevated/70 text-xs text-fg focus:border-accent"
              maxLength={500}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/60">
            {isExisting ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={saving || deleting}
                onClick={handleDelete}
                className="h-9 rounded-xl gap-1.5 text-xs font-bold"
              >
                {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                <span>Удалить опру</span>
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-9 rounded-xl text-xs font-bold border-border/80 bg-elevated/70 text-fg hover:border-accent"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving || deleting || !url.trim()}
                className="h-9 rounded-xl gap-1.5 text-xs font-black bg-accent hover:bg-accent/90 text-accent-fg shadow-md shadow-accent/20"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                <span>{isExisting ? "Обновить" : "Сохранить"}</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
