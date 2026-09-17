import { useEffect, useState, type ReactNode } from "react";
import { Download, Loader2, Shield } from "lucide-react";
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
      toast.success("Резервная копия скачана");
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
          canModeration: next.canModeration,
          canVoice: next.canVoice,
          canMods: next.canMods,
          canLogs: next.canLogs,
          canPower: next.canPower,
          isOwner: next.isOwner,
          isBotOwner: next.isBotOwner,
          setRoot: next.setRoot,
          tag: next.tag,
        },
      });
      setRows((prev) => prev.map((r) => (r.userId === userId ? updated : r)));
      toast.success("Права обновлены");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не сохранено");
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
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
        <PageHeaderSkeleton />
        <div className="mt-8">
          <RowsSkeleton rows={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <header className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">Админ панель</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Доступ к вкладкам</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Выдавайте статистику, модерирование, озвучивание, логи, питание, теги у аватарки и
          управление составом модераторов.
          {me.caps.canGrantBotOwner
            ? " «Владелец» (красный) — команды Discord. Нажатие по нему переключает в «Корневого владельца» и обратно. Назначать владельцев бота может корневой владелец."
            : me.caps.canGrantOwner
              ? " «Владелец сайта» — все вкладки сайта и выдача вкладок другим. Назначать владельцев бота и сайта может только корневой владелец."
              : " Назначать владельцев сайта и бота может только корневой владелец."}
        </p>
      </header>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-panel)]">
        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">Пока никто не входил.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((u) => {
              const locked = u.isRoot && u.userId !== me.userId;
              return (
                <li key={u.userId} className="flex flex-col gap-4 px-4 py-4 sm:px-5">
                  <div className="flex items-center gap-3">
                    {u.image ? (
                      <img src={u.image} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-elevated text-sm font-medium">
                        {(u.displayName || u.email || "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{u.displayName || u.email || "Без имени"}</p>
                        {u.isRoot ? (
                          <OwnershipBadge
                            tone="gold"
                            canClick={meIsMainOwner && !isMainOwner(u)}
                            title={meIsMainOwner && !isMainOwner(u) ? "Понизить до «Владельца»" : "Корневой владелец"}
                            onClick={() => toggleOwnership(u)}
                          >
                            <Shield className="mr-1 size-3" />
                            корень
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
                        {u.isOwner && !u.isRoot ? <Badge tone="accent">владелец сайта</Badge> : null}
                        {u.tag ? <Badge>{u.tag}</Badge> : null}
                      </div>
                      <p className="text-xs text-subtle">
                        {u.email || "—"}
                        {u.discordId ? ` · Discord ${u.discordId}` : " · Discord не привязан"}
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
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                    <Toggle
                      label="Статистика"
                      checked={u.isOwner || u.canStats}
                      disabled={locked || u.isOwner}
                      onChange={(v) => void patch(u.userId, { ...u, canStats: v })}
                    />
                    <Toggle
                      label="Модерация"
                      checked={u.isOwner || u.canModeration}
                      disabled={locked || u.isOwner}
                      onChange={(v) => void patch(u.userId, { ...u, canModeration: v })}
                    />
                    <Toggle
                      label="Озвучка"
                      checked={u.isOwner || u.canVoice}
                      disabled={locked || u.isOwner}
                      onChange={(v) => void patch(u.userId, { ...u, canVoice: v })}
                    />
                    <Toggle
                      label="Модераторы"
                      checked={u.isOwner || u.canMods}
                      disabled={locked || u.isOwner}
                      onChange={(v) => void patch(u.userId, { ...u, canMods: v })}
                    />
                    <Toggle
                      label="Логи"
                      checked={u.isOwner || u.canLogs}
                      disabled={locked || u.isOwner}
                      onChange={(v) => void patch(u.userId, { ...u, canLogs: v })}
                    />
                    <Toggle
                      label="Питание"
                      checked={u.isOwner || u.canPower}
                      disabled={locked || u.isOwner}
                      onChange={(v) => void patch(u.userId, { ...u, canPower: v })}
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

      <section className="mt-8 rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-panel)]">
        <h2 className="text-sm font-semibold">Резервная копия базы</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Выгрузка в JSON: staff, слаги модераторов, архив статистики, кэш, лог действий и
          пользователи. Neon хранит собственные резервные копии (PITR), а эта выгрузка — быстрый
          ручной снимок на случай отката.
        </p>
        <Button className="mt-4" variant="secondary" disabled={backingUp} onClick={() => void downloadBackup()}>
          {backingUp ? <Loader2 className="animate-spin" /> : <Download />}
          Скачать JSON
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
    <label className="grid gap-1 text-xs text-muted">
      Тег
      <Input
        className="h-8 w-36"
        maxLength={24}
        disabled={disabled}
        placeholder="например CURATOR"
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
    <Badge tone={tone} className={canClick ? "p-0 transition hover:opacity-80" : undefined}>
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
    <label className="flex items-center gap-2 text-xs text-muted">
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
      {label}
    </label>
  );
}
