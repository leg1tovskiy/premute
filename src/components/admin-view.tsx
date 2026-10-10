import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Download, ExternalLink, Loader2, Shield, ShieldCheck, SlidersHorizontal, Sparkles, Terminal, Trash2, User, Users, X } from "lucide-react";
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
  const [openManual, setOpenManual] = useState<Record<string, boolean>>({});
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
    next: Partial<StaffListItem> & { setRoot?: boolean; steamid?: string | null; roleRank?: number | null },
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
          roleRank: next.roleRank,
        },
      });
      setRows((prev) => prev.map((r) => (r.userId === userId ? updated : r)));
      toast.success("Данные успешно сохранены");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка при сохранении прав");
    }
  }

  function handleRoleChange(u: StaffListItem, val: string) {
    if (val === "owner") {
      void patch(u.userId, {
        isOwner: true,
        roleRank: null,
        canStats: true,
        canActivity: true,
        canSuspicious: true,
        canMods: true,
      });
    } else if (val === "none") {
      void patch(u.userId, {
        isOwner: false,
        roleRank: null,
        canStats: false,
        canActivity: false,
        canSuspicious: false,
        canMods: false,
      });
    } else {
      const rank = Number(val);
      const isSenior = rank >= 3;
      void patch(u.userId, {
        isOwner: false,
        roleRank: rank,
        canStats: isSenior,
        canActivity: isSenior,
        canSuspicious: true,
        canMods: isSenior,
      });
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
              Гибкая настройка ролей и прав администраторов и модераторов. Управление доступом к статистике,
              онлайну на серверах, списку игроков, составу команды и правам владельцев.
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

                        {!u.isRoot && !u.isOwner && u.roleRank ? (
                          <Badge
                            tone={u.roleRank >= 5 ? "gold" : u.roleRank >= 3 ? "warn" : "accent"}
                            className="font-bold text-[10px]"
                          >
                            {u.roleTitle || (u.roleRank === 1 ? "Мл. Модератор" : u.roleRank === 2 ? "Модератор" : u.roleRank === 3 ? "Ст. Модератор" : u.roleRank === 4 ? "Ст. Администратор" : "Стафф")}
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
                        onSave={(sid) => void patch(u.userId, { steamid: sid })}
                      />
                      <TagField
                        value={u.tag}
                        disabled={locked}
                        onSave={(tag) => void patch(u.userId, { tag })}
                      />
                    </div>
                  ) : null}

                  {/* ── Назначение роли ────────────────────────── */}
                  {me.caps.canAdmin ? (
                    <div className="relative z-10 mt-3 rounded-2xl border border-border/70 bg-elevated/40 p-2.5 sm:p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-fg flex items-center gap-1.5">
                          <ShieldCheck className="size-3.5 text-accent" />
                          Назначение роли
                        </span>
                        {u.roleRank ? (
                          <Badge tone={u.roleRank >= 5 ? "gold" : u.roleRank >= 3 ? "warn" : "accent"} className="text-[9px] font-black">
                            Ранг {u.roleRank}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="relative">
                        <select
                          value={
                            u.isRoot
                              ? "root"
                              : u.isOwner
                              ? "owner"
                              : u.roleRank
                              ? String(u.roleRank)
                              : "none"
                          }
                          disabled={locked || u.isRoot || u.isBanned}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          className="w-full h-8.5 rounded-xl border border-border/80 bg-surface/90 px-3 text-xs font-semibold text-fg shadow-sm focus:border-accent focus:outline-none disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          <option value="none">Без роли (доступ закрыт)</option>
                          <option value="1">Мл. Модератор (только своя стата + Игроки)</option>
                          <option value="2">Модератор (только своя стата + Игроки)</option>
                          <option value="3">Ст. Модератор (все вкладки)</option>
                          <option value="4">Ст. Администратор (все вкладки)</option>
                          <option value="5">Стафф (все вкладки)</option>
                          {me.caps.canGrantOwner ? (
                            <option value="owner">Владелец сайта (все вкладки + админка)</option>
                          ) : null}
                          {u.isRoot ? <option value="root" disabled>Корневой владелец (ROOT)</option> : null}
                        </select>
                      </div>
                    </div>
                  ) : null}

                  {/* ── Ручная настройка прав (аккордеон) ────────────────────────── */}
                  <div className="relative z-10 mt-2 rounded-2xl border border-border/60 bg-elevated/30 overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => setOpenManual((prev) => ({ ...prev, [u.userId]: !prev[u.userId] }))}
                      className="flex w-full items-center justify-between p-2.5 text-xs font-bold text-muted hover:text-fg hover:bg-elevated/50 transition-colors cursor-pointer select-none"
                    >
                      <span className="flex items-center gap-1.5">
                        <SlidersHorizontal className="size-3.5 text-muted" />
                        Ручная настройка прав
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-subtle font-mono">
                          {openManual[u.userId] ? "Скрыть" : "Настроить"}
                        </span>
                        <ChevronDown className={cn("size-3.5 transition-transform duration-200", openManual[u.userId] && "rotate-180")} />
                      </div>
                    </button>

                    {openManual[u.userId] ? (
                      (() => {
                        const roleRank = u.roleRank ?? null;
                        const isSeniorOrStaff = roleRank !== null && roleRank >= 3;
                        const statsByRole = isSeniorOrStaff;
                        const activityByRole = isSeniorOrStaff;
                        const suspiciousByRole = roleRank !== null && roleRank >= 1;
                        const modsByRole = isSeniorOrStaff;

                        return (
                          <div className="p-3 pt-1 border-t border-border/40 space-y-2 animate-in fade-in duration-200">
                            <p className="text-[10px] text-subtle pb-1">
                              Индивидуальное переопределение пунктов доступа:
                            </p>

                            <Toggle
                              label="Полная статистика (все)"
                              hint="Включено: доступ ко всей статистике и топам. Выключено: если указан SteamID — видит только свою личную статистику."
                              checked={u.isOwner || statsByRole || u.canStats}
                              disabled={locked || u.isOwner || u.isBanned || statsByRole}
                              byRole={statsByRole}
                              onChange={(v) => void patch(u.userId, { canStats: v })}
                            />
                            <Toggle
                              label="Онлайн"
                              hint="Вкладка «Онлайн» с онлайном модераторов на серверах FearProject"
                              checked={u.isOwner || activityByRole || u.canActivity}
                              disabled={locked || u.isOwner || u.isBanned || activityByRole}
                              byRole={activityByRole}
                              onChange={(v) => void patch(u.userId, { canActivity: v })}
                            />
                            <Toggle
                              label="Игроки"
                              hint="Вкладка «Игроки» (подозрительные аккаунты и новореги)"
                              checked={u.isOwner || suspiciousByRole || u.canSuspicious}
                              disabled={locked || u.isOwner || u.isBanned || suspiciousByRole}
                              byRole={suspiciousByRole}
                              onChange={(v) => void patch(u.userId, { canSuspicious: v })}
                            />
                            <Toggle
                              label="Модераторы"
                              hint="Вкладка «Модераторы» (состав команды FearProject)"
                              checked={u.isOwner || modsByRole || u.canMods}
                              disabled={locked || u.isOwner || u.isBanned || modsByRole}
                              byRole={modsByRole}
                              onChange={(v) => void patch(u.userId, { canMods: v })}
                            />
                        {me.caps.canGrantBotOwner ? (
                          <Toggle
                            label="Владелец бота"
                            checked={u.isRoot || u.isBotOwner}
                            disabled={locked || u.isRoot || u.isBanned}
                            onChange={(v) => void patch(u.userId, { isBotOwner: v })}
                          />
                        ) : null}
                        {me.caps.canGrantOwner ? (
                          <Toggle
                            label="Владелец сайта"
                            checked={u.isOwner || u.isRoot}
                            disabled={locked || u.isRoot || u.isBanned}
                            onChange={(v) => void patch(u.userId, { isOwner: v })}
                          />
                        ) : null}
                        {!isMainOwner(u) && !u.isRoot && u.userId !== me.userId ? (
                          <Toggle
                            label="Бан в панели"
                            hint="Заблокировать доступ пользователя к панели управления"
                            checked={Boolean(u.isBanned)}
                            disabled={locked}
                            onChange={(v) => void patch(u.userId, { isBanned: v })}
                          />
                        ) : null}
                      </div>
                    );
                  })()
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
  byRole,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
  byRole?: boolean;
}) {
  return (
    <label
      title={byRole ? "Включено через роль (нельзя отключить)" : hint}
      className={`flex items-center justify-between gap-2 py-0.5 text-xs font-medium text-fg select-none ${
        disabled ? "opacity-75 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <span className="flex items-center gap-1.5 truncate min-w-0">
        <span className="truncate">{label}</span>
        {byRole ? (
          <span className="shrink-0 rounded bg-accent/15 px-1.5 py-0.2 text-[9px] font-bold text-accent border border-accent/30">
            роль
          </span>
        ) : null}
      </span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </label>
  );
}
