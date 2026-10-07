import { useEffect, useState, type ReactNode } from "react";
import { Download, Loader2, Shield, ShieldCheck, Sparkles, Terminal } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeaderSkeleton, RowsSkeleton } from "@/components/skeletons";
import { exportBackupFn, listStaffFn, setStaffPerms } from "@/lib/fn";
import { ROOT_DISCORD_ID } from "@/lib/constants";
import type { StaffListItem, StaffProfile } from "@/lib/types";

export function AdminView({ me }: { me: StaffProfile }) {
  const [rows, setRows] = useState<StaffListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const meIsMainOwner = me.userId === ROOT_DISCORD_ID || me.discordId === ROOT_DISCORD_ID;

  async function downloadBackup() {
    setBackingUp(true);
    try {
      const data = await exportBackupFn();
      const blob = new Blob([data.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `premute-backup-${new Date(data.generatedAt * 1000).toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Резервная копия успешно выгружена");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось выгрузить копию");
    } finally {
      setBackingUp(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      setRows(await listStaffFn());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить список");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function patch(userId: string, next: Partial<StaffListItem> & { setRoot?: boolean }) {
    try {
      const updated = await setStaffPerms({
        data: {
          userId,
          canStats: next.canStats,
          canSuspicious: next.canSuspicious,
          canMods: next.canMods,
          isOwner: next.isOwner,
          isBotOwner: next.isBotOwner,
          setRoot: next.setRoot,
          tag: next.tag,
        },
      });
      setRows((prev) => prev.map((r) => (r.userId === userId ? updated : r)));
      toast.success("Права доступа обновлены");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка при сохранении прав");
    }
  }

  function toggleOwnership(u: StaffListItem) {
    const setRoot = !u.isRoot;
    void patch(u.userId, { ...u, setRoot });
  }

  function isMainOwner(u: StaffListItem) {
    return u.userId === ROOT_DISCORD_ID || u.discordId === ROOT_DISCORD_ID;
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 space-y-6">
        <PageHeaderSkeleton />
        <RowsSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6 animate-in fade-in duration-300">
      {/* ── Admin Header Banner ────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-r from-surface via-surface/95 to-elevated/70 p-6 sm:p-7 shadow-2xl glass-panel cyber-border-glow">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent/20 border border-accent/40 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-accent">
              СИСТЕМА БЕЗОПАСНОСТИ &middot; ACL
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-fg flex items-center gap-2.5">
            Управление правами доступа
            <Shield className="size-6 text-accent" />
          </h1>
          <p className="max-w-3xl text-xs sm:text-sm text-muted leading-relaxed">
            Гибкая настройка прав администраторов и модераторов. Управление доступом к статистике,
            радару подозрительных аккаунтов, составу и ролям владельцев.
          </p>
        </div>
      </div>

      {/* ── Users Access Matrix ────────────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-surface/90 glass-panel shadow-sm">
        {rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-xs text-muted">
            Пользователей с активным доступом пока нет.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((u) => {
              const locked = u.isRoot && u.userId !== me.userId;
              return (
                <li
                  key={u.userId}
                  className="flex flex-col gap-4 p-5 transition-colors hover:bg-elevated/40"
                >
                  <div className="flex items-center gap-4">
                    {u.image ? (
                      <img
                        src={u.image}
                        alt=""
                        className="size-11 shrink-0 rounded-2xl object-cover border-2 border-border/80 shadow-md"
                      />
                    ) : (
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-surface to-elevated text-sm font-black text-fg border-2 border-border/80 shadow-md">
                        {(u.displayName || u.email || "?").charAt(0).toUpperCase()}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-extrabold text-sm text-fg">
                          {u.displayName || u.email || "Без имени"}
                        </p>
                        {u.isRoot ? (
                          <OwnershipBadge
                            tone="gold"
                            canClick={meIsMainOwner && !isMainOwner(u)}
                            title={meIsMainOwner && !isMainOwner(u) ? "Понизить до «Владельца»" : "Корневой владелец"}
                            onClick={() => toggleOwnership(u)}
                          >
                            <Shield className="mr-1 size-3" />
                            ROOT
                          </OwnershipBadge>
                        ) : u.isBotOwner ? (
                          <OwnershipBadge
                            tone="danger"
                            canClick={meIsMainOwner}
                            title={meIsMainOwner ? "Назначить «Корневым владельцем»" : "Владелец"}
                            onClick={() => toggleOwnership(u)}
                          >
                            Владелец
                          </OwnershipBadge>
                        ) : null}
                        {u.isOwner && !u.isRoot ? (
                          <Badge tone="accent" className="font-bold">владелец сайта</Badge>
                        ) : null}
                        {u.tag ? <Badge className="font-bold font-mono text-[10px]">{u.tag}</Badge> : null}
                      </div>

                      <p className="mt-0.5 text-xs text-subtle font-mono">
                        {u.email || "—"}
                        {u.discordId ? ` · Discord: ${u.discordId}` : " · Discord не привязан"}
                      </p>
                    </div>

                    {me.caps.isOwner ? (
                      <TagField
                        value={u.tag}
                        disabled={locked}
                        onSave={(tag) => void patch(u.userId, { ...u, tag })}
                      />
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-border/60 bg-elevated/60 p-3.5">
                    <Toggle
                      label="Статистика"
                      checked={u.isOwner || u.canStats}
                      disabled={locked || u.isOwner}
                      onChange={(v) => void patch(u.userId, { ...u, canStats: v })}
                    />
                    <Toggle
                      label="Подозрительные"
                      checked={u.isOwner || u.canSuspicious}
                      disabled={locked || u.isOwner}
                      onChange={(v) => void patch(u.userId, { ...u, canSuspicious: v })}
                    />
                    <Toggle
                      label="Модераторы"
                      checked={u.isOwner || u.canMods}
                      disabled={locked || u.isOwner}
                      onChange={(v) => void patch(u.userId, { ...u, canMods: v })}
                    />
                    {me.caps.canGrantBotOwner ? (
                      <Toggle
                        label="Владелец бота"
                        checked={u.isRoot || u.isBotOwner}
                        disabled={locked || u.isRoot}
                        onChange={(v) => void patch(u.userId, { ...u, isBotOwner: v })}
                      />
                    ) : null}
                    {me.caps.canGrantOwner ? (
                      <Toggle
                        label="Владелец сайта"
                        checked={u.isOwner || u.isRoot}
                        disabled={locked || u.isRoot}
                        onChange={(v) => void patch(u.userId, { ...u, isOwner: v })}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Database Backup ────────────────────────────────────────── */}
      <section className="rounded-3xl border border-border/80 bg-surface/90 glass-panel p-6 shadow-sm">
        <h2 className="text-sm font-extrabold text-fg uppercase tracking-wider flex items-center gap-2">
          <Terminal className="size-4 text-accent" />
          Резервная копия базы данных
        </h2>
        <p className="mt-1 max-w-2xl text-xs text-muted leading-relaxed">
          Экспорт полного снимка конфигурации в формате JSON: staff, слаги модераторов, архив
          статистики, кэш, журнал действий и пользователи.
        </p>
        <Button
          className="mt-4 rounded-xl border border-border bg-elevated px-4 text-xs font-bold text-fg hover:border-accent shadow-sm"
          variant="secondary"
          disabled={backingUp}
          onClick={() => void downloadBackup()}
        >
          {backingUp ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Скачать JSON-дамп
        </Button>
      </section>
    </div>
  );
}

function TagField({
  value,
  disabled,
  onSave,
}: {
  value: string | null;
  disabled?: boolean;
  onSave: (tag: string | null) => void;
}) {
  const [text, setText] = useState(value ?? "");
  useEffect(() => {
    setText(value ?? "");
  }, [value]);
  return (
    <label className="grid gap-1 text-[11px] font-bold text-muted">
      Тег
      <Input
        className="h-8 w-32 rounded-xl text-xs font-mono"
        maxLength={24}
        disabled={disabled}
        placeholder="CURATOR"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const next = text.trim() || null;
          if (next !== (value || null)) onSave(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
    </label>
  );
}

function OwnershipBadge({
  tone,
  canClick,
  title,
  onClick,
  children,
}: {
  tone: "gold" | "danger";
  canClick: boolean;
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Badge tone={tone} className={canClick ? "p-0 transition hover:opacity-80 font-bold" : "font-bold"}>
      {canClick ? (
        <button
          type="button"
          title={title}
          onClick={onClick}
          className="inline-flex items-center px-2 py-0.5"
        >
          {children}
        </button>
      ) : (
        children
      )}
    </Badge>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-fg cursor-pointer select-none">
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
      {label}
    </label>
  );
}
