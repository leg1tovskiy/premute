import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeaderSkeleton, CardsSkeleton } from "@/components/skeletons";
import {
  createStaffUserFn,
  deleteStaffFn,
  exportBackupFn,
  listStaffFn,
  setStaffPerms,
  updateStaffPasswordFn,
} from "@/lib/fn";
import { notifyActionLogUpdated } from "@/lib/action-log-events";
import { ROOT_DISCORD_ID, fearProfileUrl } from "@/lib/constants";
import type { StaffListItem, StaffProfile } from "@/lib/types";
import { usePanel } from "@/lib/panel";
import { AnimatedBlock } from "@/components/animated-number";
import { cn } from "@/lib/utils";

export function AdminView({ me }: { me: StaffProfile }) {
  const { setProfile } = usePanel();
  const [rows, setRows] = useState<StaffListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [manualModalUserId, setManualModalUserId] = useState<string | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [changePasswordUser, setChangePasswordUser] = useState<StaffListItem | null>(null);
  const meIsMainOwner = me.userId === ROOT_DISCORD_ID || me.discordId === ROOT_DISCORD_ID;
  const isRootUser = Boolean(me.isRoot || me.caps?.isRoot);
  const canCreate = isRootUser;

  useEffect(() => {
    if (!manualModalUserId) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setManualModalUserId(null);
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [manualModalUserId]);

  async function downloadBackup() {
    setBackingUp(true);
    try {
      const data = await exportBackupFn();
      const blob = new Blob([data.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fearassist-backup-${new Date(data.generatedAt * 1000).toISOString().slice(0, 10)}.json`;
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
          canLogs: next.canLogs,
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
      if (userId === me.userId) {
        setProfile({
          ...me,
          ...updated,
          roleRank: updated.roleRank,
          roleTitle: updated.roleTitle,
          caps: {
            ...me.caps,
            canStats: updated.canStats,
            canActivity: updated.canActivity,
            canSuspicious: updated.canSuspicious,
            canMods: updated.canMods,
            canLogs: updated.canLogs,
            canGeneralStats: updated.canStats,
            isOwner: updated.isOwner,
          },
        });
      }
      notifyActionLogUpdated();
      toast.success("Данные успешно сохранены");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка при сохранении прав");
    }
  }

  function handleRoleChange(u: StaffListItem, val: string) {
    if (u.isRoot) {
      toast.error("Роль корневого владельца (ROOT) нельзя изменить.");
      return;
    }
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
      notifyActionLogUpdated();
      toast.success(`Аккаунт ${name} успешно удалён`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось удалить аккаунт");
    }
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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

            {canCreate ? (
              <div className="shrink-0">
                <Button
                  type="button"
                  onClick={() => setCreateUserOpen(true)}
                  className="h-11 gap-2 rounded-2xl bg-accent hover:bg-accent/90 text-accent-fg font-black text-xs shadow-lg shadow-accent/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <UserPlus className="size-4" />
                  Создать профиль
                </Button>
              </div>
            ) : null}
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            {rows.map((u) => {
              const isTargetMainOwner = isMainOwner(u);
              const locked = isTargetMainOwner && !meIsMainOwner;
              const canEditCredentials = isRootUser;
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
                        {u.username && isRootUser ? (
                          <span className="font-mono text-xs font-bold text-accent">
                            @{u.username}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {u.isRoot ? (
                          <OwnershipBadge
                            tone="gold"
                            canClick={false}
                            title="Корневой владелец (ROOT)"
                          >
                            <Shield className="mr-1 size-3" />
                            ROOT
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

                        {u.canLogs && !u.isOwner && !u.isRoot ? (
                          <Badge tone="accent" className="font-bold text-[10px]">
                            Логи
                          </Badge>
                        ) : null}
                      </div>

                      <div className="mt-1 text-[11px] text-subtle font-mono truncate space-y-0.5">
                        {u.email ? <p className="truncate">{u.email}</p> : null}
                        {u.discordId ? <p className="truncate">Discord: {u.discordId}</p> : null}
                      </div>
                    </div>
                  </div>

                  {/* ── Учётные данные для входа (логин и пароль) ────────────────── */}
                  {isRootUser ? (
                    <div className="relative z-10 mt-3 rounded-2xl border border-border/70 bg-elevated/40 p-2.5 sm:p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-fg flex items-center gap-1.5">
                          <KeyRound className="size-3.5 text-accent" />
                          Учётные данные для входа
                        </span>
                        {canEditCredentials ? (
                          <button
                            type="button"
                            onClick={() => setChangePasswordUser(u)}
                            className="text-[10px] text-accent font-bold hover:underline cursor-pointer flex items-center gap-1"
                          >
                            {u.passwordPlain ? "Сменить →" : "Задать →"}
                          </button>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex flex-col justify-center gap-1 rounded-xl border border-border/70 bg-surface/90 px-3.5 py-2">
                          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Логин</span>
                          <div className="flex items-center justify-between min-w-0 gap-1.5">
                            <span className="font-mono text-xs font-bold text-fg truncate">
                              {u.username ? (
                                `@${u.username}`
                              ) : (
                                <span className="text-amber-400 font-normal italic">не задан</span>
                              )}
                            </span>
                            {u.username ? <CopyButton text={u.username} title="Скопировать логин" /> : null}
                          </div>
                        </div>

                        <PasswordDisplayField
                          password={u.passwordPlain}
                          onSet={() => setChangePasswordUser(u)}
                          canEdit={canEditCredentials}
                        />
                      </div>
                    </div>
                  ) : null}

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
                        {u.isRoot ? (
                          <div className="flex h-8.5 w-full items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 text-xs font-bold text-amber-300 select-none">
                            <span className="flex items-center gap-1.5">
                              <Shield className="size-3.5 text-amber-400" />
                              Корневой владелец (ROOT)
                            </span>
                            <span className="text-[10px] text-amber-400/80 font-normal uppercase tracking-wider">
                              Неизменяемо
                            </span>
                          </div>
                        ) : (
                          <Select
                            value={
                              u.isOwner
                                ? "owner"
                                : u.roleRank
                                ? String(u.roleRank)
                                : "none"
                            }
                            disabled={locked || u.isBanned}
                            onValueChange={(val) => handleRoleChange(u, val)}
                          >
                            <SelectTrigger className="w-full h-8.5 bg-surface/90 text-xs font-semibold">
                              <SelectValue placeholder="Выберите роль" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Без роли (доступ закрыт)</SelectItem>
                              <SelectItem value="1">Мл. Модератор (только своя стата + Игроки)</SelectItem>
                              <SelectItem value="2">Модератор (только своя стата + Игроки)</SelectItem>
                              <SelectItem value="3">Ст. Модератор (все вкладки)</SelectItem>
                              <SelectItem value="4">Ст. Администратор (все вкладки)</SelectItem>
                              <SelectItem value="5">Стафф (все вкладки)</SelectItem>
                              {me.caps.canGrantOwner ? (
                                <SelectItem value="owner">Владелец сайта (все вкладки + админка)</SelectItem>
                              ) : null}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* ── Ручная настройка прав (кнопка модального окна) ── */}
                  {u.isRoot ? (
                    <div className="relative z-10 mt-2 flex w-full items-center justify-between rounded-xl border border-border/50 bg-elevated/20 p-2.5 text-xs font-bold text-muted select-none opacity-60">
                      <span className="flex items-center gap-1.5">
                        <SlidersHorizontal className="size-3.5 text-accent" />
                        Ручная настройка прав
                      </span>
                      <span className="text-[10px] text-accent/80 font-semibold">
                        Полный доступ (ROOT)
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setManualModalUserId(u.userId)}
                      className="relative z-10 mt-2 flex w-full items-center justify-between rounded-xl border border-border/70 bg-elevated/40 p-2.5 text-xs font-bold text-muted hover:text-fg hover:border-accent/40 hover:bg-elevated/70 transition-all cursor-pointer shadow-xs select-none"
                    >
                      <span className="flex items-center gap-1.5">
                        <SlidersHorizontal className="size-3.5 text-accent" />
                        Ручная настройка прав
                      </span>
                      <span className="text-[10px] text-accent font-semibold flex items-center gap-1">
                        Настроить →
                      </span>
                    </button>
                  )}

                  {/* Card Footer: Dates & Actions */}
                  <div className="relative z-10 mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-subtle">
                    <span className="font-mono">
                      {u.createdAt ? `Рег: ${new Date(u.createdAt).toLocaleDateString("ru-RU")}` : ""}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {canEditCredentials ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 rounded-lg text-xs font-bold text-muted hover:text-accent hover:bg-accent/10"
                          onClick={() => setChangePasswordUser(u)}
                          title="Сменить пароль"
                        >
                          <KeyRound className="mr-1 size-3 text-accent" />
                          Пароль
                        </Button>
                      ) : null}

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

      {/* ── Модальное окно ручной настройки прав ── */}
      {manualModalUserId && typeof document !== "undefined"
        ? (() => {
            const u = rows.find((r) => r.userId === manualModalUserId);
            if (!u) return null;
            const isTargetMainOwner = isMainOwner(u);
            const locked = isTargetMainOwner && !meIsMainOwner;
            const handle = u.displayName || u.email || "Пользователь";
            const roleRank = u.roleRank ?? null;
            const isSeniorOrStaff = roleRank !== null && roleRank >= 3;
            const statsByRole = isSeniorOrStaff;
            const activityByRole = isSeniorOrStaff;
            const suspiciousByRole = roleRank !== null && roleRank >= 1;
            const modsByRole = isSeniorOrStaff;

            return createPortal(
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
                {/* Затемненный фон */}
                <div
                  className="fixed inset-0 bg-black/75 backdrop-blur-md animate-page-enter"
                  onClick={() => setManualModalUserId(null)}
                  aria-hidden="true"
                />

                {/* Окно диалога */}
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Ручная настройка прав"
                  className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border/90 bg-surface/98 p-5 text-fg shadow-2xl backdrop-blur-xl animate-page-enter"
                >
                  {/* Заголовок */}
                  <div className="flex items-start justify-between border-b border-border/60 pb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 place-items-center rounded-2xl border border-accent/30 bg-accent/15 text-accent shadow-sm">
                        <SlidersHorizontal className="size-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-extrabold text-fg sm:text-base">
                          Ручная настройка прав
                        </h2>
                        <p className="text-xs text-muted">
                          {handle} {u.roleTitle ? `• ${u.roleTitle}` : ""}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setManualModalUserId(null)}
                      className="grid size-8 place-items-center rounded-xl border border-border/80 bg-elevated/70 text-subtle hover:text-fg hover:bg-elevated transition-colors cursor-pointer"
                      aria-label="Закрыть"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Список переключателей */}
                  <div className="overflow-y-auto py-4 space-y-2.5 max-h-[60vh] pr-1">
                    <p className="text-[11px] text-subtle pb-1">
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
                    <Toggle
                      label="Логи сайта"
                      hint="Вкладка «Логи» (журнал действий, авторизаций и изменений)"
                      checked={u.isOwner || u.canLogs}
                      disabled={locked || u.isOwner || u.isBanned}
                      onChange={(v) => void patch(u.userId, { canLogs: v })}
                    />
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

                  {/* Подвал модалки */}
                  <div className="flex justify-end border-t border-border/60 pt-3.5">
                    <Button
                      onClick={() => setManualModalUserId(null)}
                      className="rounded-xl px-4 py-2 font-bold"
                    >
                      Готово
                    </Button>
                  </div>
                </div>
              </div>,
              document.body,
            );
          })()
        : null}

      {createUserOpen ? (
        <CreateUserModal
          actor={me}
          onClose={() => setCreateUserOpen(false)}
          onCreated={(newUser) => setRows((prev) => [newUser, ...prev])}
        />
      ) : null}

      {changePasswordUser ? (
        <ChangePasswordModal
          user={changePasswordUser}
          onClose={() => setChangePasswordUser(null)}
          onSaved={(updated) => {
            setRows((prev) => prev.map((r) => (r.userId === updated.userId ? updated : r)));
          }}
        />
      ) : null}
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
  onClick?: () => void;
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

function CreateUserModal({
  actor,
  onClose,
  onCreated,
}: {
  actor: StaffProfile;
  onClose: () => void;
  onCreated: (newUser: StaffListItem) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [steamid, setSteamid] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [roleRank, setRoleRank] = useState<string>("none");
  const [canStats, setCanStats] = useState(false);
  const [canActivity, setCanActivity] = useState(false);
  const [canSuspicious, setCanSuspicious] = useState(true);
  const [canMods, setCanMods] = useState(false);
  const [canLogs, setCanLogs] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [busy, setBusy] = useState(false);

  function generatePassword() {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let res = "";
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
    setShowPassword(true);
  }

  function handleRolePresetChange(val: string) {
    setRoleRank(val);
    if (val === "owner") {
      setIsOwner(true);
      setCanStats(true);
      setCanActivity(true);
      setCanSuspicious(true);
      setCanMods(true);
      setCanLogs(true);
    } else if (val === "none") {
      setIsOwner(false);
      setCanStats(false);
      setCanActivity(false);
      setCanSuspicious(false);
      setCanMods(false);
      setCanLogs(false);
    } else {
      const rank = Number(val);
      setIsOwner(false);
      const isSenior = rank >= 3;
      setCanStats(isSenior);
      setCanActivity(isSenior);
      setCanSuspicious(true);
      setCanMods(isSenior);
      setCanLogs(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanNick = displayName.trim();
    const cleanLogin = username.trim().toLowerCase();
    const cleanPass = password.trim();
    const cleanSid = steamid.trim().replace(/\D/g, "");

    if (!cleanNick) {
      toast.error("Укажите НИК");
      return;
    }
    if (!cleanLogin || cleanLogin.length < 3) {
      toast.error("Логин должен быть от 3 символов");
      return;
    }
    if (!cleanPass || cleanPass.length < 4) {
      toast.error("Пароль должен быть от 4 символов");
      return;
    }
    if (cleanSid && cleanSid.length !== 17) {
      toast.error("SteamID64 должен содержать ровно 17 цифр");
      return;
    }

    setBusy(true);
    try {
      const numericRank = !isNaN(Number(roleRank)) && Number(roleRank) > 0 ? Number(roleRank) : null;
      const created = await createStaffUserFn({
        data: {
          displayName: cleanNick,
          steamid: cleanSid || null,
          username: cleanLogin,
          password: cleanPass,
          roleRank: numericRank,
          canStats: isOwner || canStats,
          canActivity: isOwner || canActivity,
          canSuspicious: isOwner || canSuspicious,
          canMods: isOwner || canMods,
          canLogs: isOwner || canLogs,
          isOwner,
        },
      });

      notifyActionLogUpdated();
      toast.success(`Профиль ${cleanNick} (@${cleanLogin}) успешно создан!`);
      onCreated(created);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Ошибка создания профиля");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative my-8 w-full max-w-lg rounded-3xl border border-border/80 bg-surface/95 p-6 shadow-2xl glass-panel space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-2xl bg-accent/20 border border-accent/40 text-accent">
              <UserPlus className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-fg">Создать новый профиль</h2>
              <p className="text-xs text-muted">Создание учётной записи с логином, паролем и правами</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted hover:bg-elevated hover:text-fg transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-fg">НИК *</label>
              <Input
                placeholder="minilyyy"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="h-10 rounded-xl bg-elevated/70 text-xs focus:border-accent"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-fg">SteamID64 (17 цифр)</label>
              <Input
                placeholder="76561198..."
                value={steamid}
                onChange={(e) => setSteamid(e.target.value)}
                className="h-10 rounded-xl bg-elevated/70 text-xs font-mono focus:border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-fg">Логин (для входа) *</label>
              <Input
                placeholder="логин"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoCapitalize="none"
                className="h-10 rounded-xl bg-elevated/70 text-xs font-mono focus:border-accent"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-fg">Пароль *</label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-[11px] text-accent font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="size-3" />
                  Сгенерировать
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 rounded-xl bg-elevated/70 pr-9 text-xs font-mono focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Роль */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-bold text-fg">Роль (пресет прав)</label>
            <Select value={roleRank} onValueChange={handleRolePresetChange}>
              <SelectTrigger className="h-10 rounded-xl bg-elevated/70 text-xs">
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без роли (настраивается вручную)</SelectItem>
                <SelectItem value="1">Мл. Модератор (Ранг 1: своя стата, игроки)</SelectItem>
                <SelectItem value="2">Модератор (Ранг 2: своя стата, игроки)</SelectItem>
                <SelectItem value="3">Ст. Модератор (Ранг 3: вся стата, онлайн, игроки, модераторы)</SelectItem>
                <SelectItem value="4">Ст. Администратор (Ранг 4: полный доступ без админки)</SelectItem>
                <SelectItem value="5">Стафф (Ранг 5: высший ранг состава)</SelectItem>
                <SelectItem value="owner">Владелец сайта</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Переключатели прав */}
          <div className="rounded-2xl border border-border/70 bg-elevated/40 p-3.5 space-y-2.5">
            <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Индивидуальные права доступа</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center justify-between rounded-xl border border-border/60 bg-surface/60 p-2 cursor-pointer">
                <span>Общая стата</span>
                <Switch checked={isOwner || canStats} onCheckedChange={setCanStats} disabled={isOwner} />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-border/60 bg-surface/60 p-2 cursor-pointer">
                <span>Онлайн серверов</span>
                <Switch checked={isOwner || canActivity} onCheckedChange={setCanActivity} disabled={isOwner} />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-border/60 bg-surface/60 p-2 cursor-pointer">
                <span>Игроки</span>
                <Switch checked={isOwner || canSuspicious} onCheckedChange={setCanSuspicious} disabled={isOwner} />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-border/60 bg-surface/60 p-2 cursor-pointer">
                <span>Модераторы</span>
                <Switch checked={isOwner || canMods} onCheckedChange={setCanMods} disabled={isOwner} />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-border/60 bg-surface/60 p-2 cursor-pointer">
                <span>Логи</span>
                <Switch checked={isOwner || canLogs} onCheckedChange={setCanLogs} disabled={isOwner} />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-border/60 bg-surface/60 p-2 cursor-pointer">
                <span className="font-bold text-accent">Владелец сайта</span>
                <Switch checked={isOwner} onCheckedChange={setIsOwner} />
              </label>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy} className="rounded-xl">
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-accent hover:bg-accent/90 text-accent-fg font-bold"
            >
              {busy ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Plus className="size-4 mr-1.5" />}
              Создать профиль
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChangePasswordModal({
  user,
  onClose,
  onSaved,
}: {
  user: StaffListItem;
  onClose: () => void;
  onSaved: (updated: StaffListItem) => void;
}) {
  const [username, setUsername] = useState(user.username || "");
  const [password, setPassword] = useState(user.passwordPlain || "");
  const [showPassword, setShowPassword] = useState(true);
  const [busy, setBusy] = useState(false);

  function generatePassword() {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let res = "";
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanPass = password.trim();
    if (!cleanPass || cleanPass.length < 4) {
      toast.error("Пароль должен содержать минимум 4 символа");
      return;
    }
    const cleanLogin = username.trim().toLowerCase();
    if (cleanLogin && cleanLogin.length < 3) {
      toast.error("Логин должен содержать минимум 3 символа");
      return;
    }
    if (cleanLogin && !/^[a-z0-9_\-\.]+$/.test(cleanLogin)) {
      toast.error("Логин может содержать только латинские буквы, цифры, дефис, точку и подчеркивание");
      return;
    }

    setBusy(true);
    try {
      const updated = await updateStaffPasswordFn({
        data: {
          userId: user.userId,
          password: cleanPass,
          username: cleanLogin || null,
        },
      });
      notifyActionLogUpdated();
      toast.success(`Учётные данные для @${updated.username || updated.displayName} успешно сохранены!`);
      onSaved(updated);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Не удалось сохранить учётные данные");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-border/80 bg-surface/95 p-6 shadow-2xl glass-panel space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-2xl bg-accent/20 border border-accent/40 text-accent">
              <KeyRound className="size-4.5" />
            </span>
            <div>
              <h2 className="text-base font-black text-fg">Учётные данные для входа</h2>
              <p className="text-xs text-muted">
                {user.displayName || user.email || user.userId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted hover:bg-elevated hover:text-fg transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Логин */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-fg">Логин</label>
              <span className="text-[10px] text-muted">Латиница, мин. 3 симв.</span>
            </div>
            <Input
              type="text"
              placeholder="логин (например: minilyyy)"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_\-\.]/g, ""))}
              className="h-10 rounded-xl bg-elevated/70 text-xs font-mono focus:border-accent"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          {/* Пароль */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-fg">Пароль *</label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-[11px] text-accent font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="size-3" />
                Случайный пароль
              </button>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Новый пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 rounded-xl bg-elevated/70 pr-10 text-xs font-mono focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy} className="rounded-xl text-xs">
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={busy || !password.trim()}
              className="rounded-xl bg-accent hover:bg-accent/90 text-accent-fg font-bold text-xs"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              Сохранить
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordDisplayField({
  password,
  onSet,
  canEdit,
}: {
  password?: string | null;
  onSet?: () => void;
  canEdit?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);

  if (!password) {
    return (
      <div className="flex flex-col justify-center gap-1 rounded-xl border border-border/70 bg-surface/90 px-3.5 py-2">
        <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Пароль</span>
        <div className="flex items-center justify-between min-w-0">
          <span className="font-mono text-xs text-amber-400 font-normal italic">не задан</span>
          {canEdit && onSet ? (
            <button
              type="button"
              onClick={onSet}
              className="text-[10px] text-accent font-semibold hover:underline cursor-pointer"
            >
              Задать
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center gap-1 rounded-xl border border-border/70 bg-surface/90 px-3.5 py-2">
      <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Пароль</span>
      <div className="flex items-center justify-between min-w-0 gap-1.5">
        <span className="font-mono text-xs font-bold text-fg truncate select-all">
          {revealed ? password : "••••••••"}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setRevealed(!revealed)}
            className="grid size-6 place-items-center rounded-lg text-muted hover:text-fg hover:bg-elevated transition-colors cursor-pointer"
            title={revealed ? "Скрыть пароль" : "Показать пароль"}
          >
            {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
          <CopyButton text={password} title="Скопировать пароль" />
        </div>
      </div>
    </div>
  );
}

function CopyButton({ text, title }: { text: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Скопировано в буфер");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="grid size-6 place-items-center rounded-lg text-muted hover:text-accent hover:bg-elevated transition-colors cursor-pointer shrink-0"
      title={title}
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
    </button>
  );
}

