import { useEffect, useState, type ReactNode } from "react";
import { Download, ExternalLink, Loader2, Shield, ShieldCheck, Sparkles, Terminal, Trash2, User, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeaderSkeleton, CardsSkeleton } from "@/components/skeletons";
import { deleteStaffFn, exportBackupFn, listStaffFn, setStaffPerms } from "@/lib/fn";
import { ROOT_DISCORD_ID, fearProfileUrl } from "@/lib/constants";
import type { StaffListItem, StaffProfile } from "@/lib/types";
import { AnimatedBlock } from "@/components/animated-number";
import { cn } from "@/lib/utils";

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

  async function patch(
    userId: string,
    next: Partial<StaffListItem> & { setRoot?: boolean; steamid?: string | null },
  ) {
    try {
      const updated = await setStaffPerms({
        data: {
          userId,
          canStats: next.canStats,
          canActivity: next.canActivity,
          canSuspicious: next.canSuspicious,
          canMods: next.canMods,
          isOwner: next.isOwner,
          isBotOwner: next.isBotOwner,
          isBanned: next.isBanned,
          setRoot: next.setRoot,
          tag: next.tag,
          steamid: next.steamid !== undefined ? next.steamid : next.mySteamId,
        },
      });
      setRows((prev) => prev.map((r) => (r.userId === userId ? updated : r)));
      toast.success("Данные успешно сохранены");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка при сохранении прав");
    }
  }

  async function handleDelete(u: StaffListItem) {
    const name = u.displayName || u.email || u.userId;
    if (!window.confirm(`Вы действительно хотите безвозвратно удалить аккаунт ${name} с сайта?`)) {
      return;
    }
    try {
      await deleteStaffFn({ data: { userId: u.userId } });
      setRows((prev) => prev.filter((r) => r.userId !== u.userId));
      toast.success(`Аккаунт ${name} успешно удалён`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось удалить аккаунт");
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
      <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-8 space-y-6">
        <PageHeaderSkeleton />
        <CardsSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-8 space-y-6">
      {/* ── Admin Header Banner ────────────────────────────────────── */}
      <AnimatedBlock delay={0}>
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
              активности онлайн, радару подозрительных аккаунтов, составу и ролям владельцев.
            </p>
          </div>
        </div>
      </AnimatedBlock>

      {/* ── Compact Tiles Grid (как у модераторов) ────────────────────── */}
      <AnimatedBlock delay={60}>
        {rows.length === 0 ? (
          <div className="overflow-hidden rounded-3xl border border-border/80 bg-surface/90 glass-panel p-12 text-center text-xs text-muted">
            Пользователей с активным доступом пока нет.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rows.map((u) => {
              const locked = u.isRoot && u.userId !== me.userId;
              const handle = u.displayName || u.email || "Без имени";
              const initial = handle.trim().charAt(0).toUpperCase();

              return (
                <article
                  key={u.userId}
                  className="group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border/80 bg-surface/90 glass-panel p-5 shadow-lg transition-all hover:scale-[1.01] hover:border-accent/50 hover:shadow-2xl hover:shadow-accent/10"
                >
                  {/* Subtle top glow if root or owner */}
                  {u.isRoot ? (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 size-36 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />
                  ) : u.isOwner ? (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 size-36 rounded-full bg-accent/15 blur-2xl pointer-events-none" />
                  ) : null}

                  {/* Header: Avatar, Name, Badges */}
                  <div className="relative z-10 flex items-start gap-3.5">
                    <div className="relative shrink-0">
                      {u.image ? (
                        <img
                          src={u.image}
                          alt=""
                          loading="lazy"
                          className={cn(
                            "size-12 rounded-2xl object-cover border-2 shadow-md transition-all",
                            u.isRoot
                              ? "border-amber-400/80 ring-2 ring-amber-400/30"
                              : "border-border/80 ring-2 ring-transparent group-hover:ring-accent/40",
                          )}
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "grid size-12 place-items-center rounded-2xl text-base font-black border-2 shadow-md",
                            u.isRoot
                              ? "bg-amber-500/20 text-amber-300 border-amber-400/60"
                              : "bg-gradient-to-tr from-surface to-elevated text-fg border-border/80",
                          )}
                        >
                          {initial}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate font-extrabold text-sm text-fg" title={handle}>
                          {handle}
                        </p>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {u.isRoot ? (
                          <OwnershipBadge
                            tone="gold"
                            canClick={meIsMainOwner && !isMainOwner(u)}
                            title={
                              meIsMainOwner && !isMainOwner(u)
                                ? "Понизить до «Владельца»"
                                : "Корневой владелец"
                            }
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
                          <Badge tone="accent" className="font-bold">
                            владелец сайта
                          </Badge>
                        ) : null}

                        {u.tag ? (
                          <Badge className="font-bold font-mono text-[10px]">{u.tag}</Badge>
                        ) : null}

                        {u.isBanned ? (
                          <Badge tone="danger" className="font-bold text-[10px]">
                            ЗАБАНЕН В ПАНЕЛИ
                          </Badge>
                        ) : u.isOwner || u.canStats ? (
                          <Badge tone="success" className="font-bold text-[10px]">
                            Вся статистика
                          </Badge>
                        ) : u.mySteamId ? (
                          <Badge tone="accent" className="font-bold text-[10px]">
                            Только своя стата
                          </Badge>
                        ) : (
                          <Badge tone="muted" className="font-bold text-[10px]">
                            Стата закрыта
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1 text-[11px] text-subtle font-mono truncate space-y-0.5">
                        {u.email ? <p className="truncate">{u.email}</p> : null}
                        {u.discordId ? <p className="truncate">Discord: {u.discordId}</p> : null}
                      </div>
                    </div>
                  </div>

                  {/* Compact SteamID & Tag Inputs */}
                  {me.caps.isOwner ? (
                    <div className="relative z-10 mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-elevated/40 p-2.5">
                      <SteamIdField
                        value={u.mySteamId}
                        disabled={locked}
                        onSave={(sid) => void patch(u.userId, { ...u, steamid: sid, mySteamId: sid })}
                      />
                      <TagField
                        value={u.tag}
                        disabled={locked}
                        onSave={(tag) => void patch(u.userId, { ...u, tag })}
                      />
                    </div>
                  ) : null}

                  {/* Permissions Switches Matrix */}
                  <div className="relative z-10 mt-3 rounded-2xl border border-border/60 bg-elevated/60 p-3 space-y-2">
                    <Toggle
                      label="Полная статистика (все)"
                      hint="Включено: доступ ко всей статистике и топам. Выключено: если указан SteamID — видит только свою личную статистику."
                      checked={u.isOwner || u.canStats}
                      disabled={locked || u.isOwner || u.isBanned}
                      onChange={(v) => void patch(u.userId, { ...u, canStats: v })}
                    />
                    <Toggle
                      label="Активность"
                      hint="Вкладка «Активность» с онлайном модераторов на серверах FearProject (привязана к статистике)"
                      checked={u.isOwner || u.canActivity}
                      disabled={locked || u.isOwner || u.isBanned}
                      onChange={(v) => void patch(u.userId, { ...u, canActivity: v })}
                    />
                    <Toggle
                      label="Подозрительные"
                      checked={u.isOwner || u.canSuspicious}
                      disabled={locked || u.isOwner || u.isBanned}
                      onChange={(v) => void patch(u.userId, { ...u, canSuspicious: v })}
                    />
                    <Toggle
                      label="Модераторы"
                      checked={u.isOwner || u.canMods}
                      disabled={locked || u.isOwner || u.isBanned}
                      onChange={(v) => void patch(u.userId, { ...u, canMods: v })}
                    />
                    {me.caps.canGrantBotOwner ? (
                      <Toggle
                        label="Владелец бота"
                        checked={u.isRoot || u.isBotOwner}
                        disabled={locked || u.isRoot || u.isBanned}
                        onChange={(v) => void patch(u.userId, { ...u, isBotOwner: v })}
                      />
                    ) : null}
                    {me.caps.canGrantOwner ? (
                      <Toggle
                        label="Владелец сайта"
                        checked={u.isOwner || u.isRoot}
                        disabled={locked || u.isRoot || u.isBanned}
                        onChange={(v) => void patch(u.userId, { ...u, isOwner: v })}
                      />
                    ) : null}
                    {!isMainOwner(u) && !u.isRoot && u.userId !== me.userId ? (
                      <Toggle
                        label="Бан в панели"
                        hint="Заблокировать доступ пользователя к панели управления"
                        checked={Boolean(u.isBanned)}
                        disabled={locked}
                        onChange={(v) => void patch(u.userId, { ...u, isBanned: v })}
                      />
                    ) : null}
                  </div>

                  {/* Card Footer: Dates & Actions */}
                  <div className="relative z-10 mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-subtle">
                    <span className="font-mono">
                      {u.createdAt ? `Рег: ${new Date(u.createdAt).toLocaleDateString("ru-RU")}` : ""}
                    </span>

                    {!isMainOwner(u) && !u.isRoot && u.userId !== me.userId ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 rounded-lg text-xs font-bold text-danger hover:bg-danger/10 hover:text-danger"
                        onClick={() => handleDelete(u)}
                      >
                        <Trash2 className="mr-1 size-3" />
                        Удалить
                      </Button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </AnimatedBlock>

      {/* ── Database Backup ────────────────────────────────────────── */}
      <AnimatedBlock delay={120}>
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
      </AnimatedBlock>
    </div>
  );
}

function SteamIdField({
  value,
  disabled,
  onSave,
}: {
  value: string | null;
  disabled?: boolean;
  onSave: (steamid: string | null) => void;
}) {
  const [text, setText] = useState(value ?? "");

  useEffect(() => {
    setText(value ?? "");
  }, [value]);

  function commit() {
    const clean = text.trim().replace(/\D/g, "");
    const next = clean.length >= 16 ? clean : null;
    if (next !== (value || null)) {
      onSave(next);
    } else {
      setText(value ?? "");
    }
  }

  function handleClear() {
    setText("");
    onSave(null);
  }

  return (
    <label className="grid gap-1 text-[11px] font-bold text-muted">
      SteamID64
      <div className="flex items-center gap-1">
        <Input
          className="h-8 w-full min-w-0 rounded-xl text-xs font-mono"
          maxLength={17}
          disabled={disabled}
          placeholder="76561198..."
          value={text}
          onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 17))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        {value && !disabled ? (
          <button
            type="button"
            title="Отвязать SteamID"
            onClick={handleClear}
            className="grid size-8 shrink-0 place-items-center rounded-xl border border-border/80 bg-surface/90 text-subtle hover:text-danger hover:border-danger/50 transition-colors shadow-sm cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
        {value ? (
          <a
            href={fearProfileUrl(value)}
            target="_blank"
            rel="noreferrer"
            title="Открыть профиль на FearProject"
            className="grid size-8 shrink-0 place-items-center rounded-xl border border-border/80 bg-surface/90 text-subtle hover:text-accent hover:border-accent/50 transition-colors shadow-sm"
          >
            <ExternalLink className="size-3.5" />
          </a>
        ) : null}
      </div>
    </label>
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
        className="h-8 w-full min-w-0 rounded-xl text-xs font-mono"
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
          className="inline-flex items-center px-2 py-0.5 cursor-pointer"
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
  hint,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label
      title={hint}
      className={`flex items-center justify-between gap-2 py-0.5 text-xs font-medium text-fg select-none ${
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <span className="truncate">{label}</span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </label>
  );
}
