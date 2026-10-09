import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Gamepad2, Loader2, LogOut, ShieldAlert, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bindSteamFn, lookupSteamFn, getMe } from "@/lib/fn";
import type { StaffProfile } from "@/lib/types";

export function WaitingView({
  profile,
  onUpdate,
}: {
  profile: StaffProfile;
  onUpdate: (p: StaffProfile) => void;
}) {
  const [steamIdInput, setSteamIdInput] = useState(profile.mySteamId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    found: boolean;
    name?: string;
    rank?: number;
    rankTitle?: string;
  } | null>(null);

  // Живая проверка SteamID при вводе 17 цифр
  useEffect(() => {
    const clean = steamIdInput.trim().replace(/\D/g, "");
    if (clean.length === 17) {
      setLookingUp(true);
      void lookupSteamFn({ data: { steamid: clean } })
        .then((res) => {
          setLookupResult(res);
        })
        .catch(() => {
          setLookupResult(null);
        })
        .finally(() => {
          setLookingUp(false);
        });
    } else {
      setLookupResult(null);
    }
  }, [steamIdInput]);

  // Фоновая проверка: если администратор выдал права или привязал SteamID в админке
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await getMe({ data: {} });
        if (!cancelled && !next.caps.waiting) {
          onUpdate(next);
        }
      } catch {
        /* ignore */
      }
    };
    const t = setInterval(() => void poll(), 4000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [onUpdate]);

  async function handleBindSteam(e: FormEvent) {
    e.preventDefault();
    const clean = steamIdInput.trim().replace(/\D/g, "");
    if (clean.length !== 17) {
      setError("SteamID64 должен содержать ровно 17 цифр (начинается с 7656119...)");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await bindSteamFn({ data: { steamid: clean } });
      toast.success("SteamID успешно привязан! Доступ к статистике открыт.");
      onUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось привязать SteamID");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    try {
      const { signOut } = await import("@/lib/auth/client");
      await signOut();
    } catch {}
    window.location.href = "/";
  }

  const cleanDigits = steamIdInput.trim().replace(/\D/g, "");
  const isValidLength = cleanDigits.length === 17;

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-12 sm:py-20 text-center animate-in fade-in duration-300">
      {/* Top Brand Pill */}
      <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-bold text-accent shadow-sm">
        <Sparkles className="size-3.5" />
        <span>FearProject CS2 · Модерация</span>
      </div>

      <h1 className="mt-4 text-2xl font-black tracking-tight text-fg sm:text-3xl">
        Активация личного кабинета
      </h1>
      <p className="mt-2 max-w-md text-xs sm:text-sm text-muted leading-relaxed">
        Укажите ваш SteamID64, чтобы автоматически получить доступ к вашей личной статистике наказаний, норме и ленте нарушений.
      </p>

      {/* Profile Card */}
      <div className="mt-6 flex items-center gap-3.5 rounded-2xl border border-border/80 bg-surface/80 p-3.5 sm:p-4 text-left glass-panel w-full shadow-md">
        {profile.image ? (
          <img
            src={profile.image}
            alt=""
            className="size-12 shrink-0 rounded-xl border border-border object-cover shadow-sm"
          />
        ) : (
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-elevated text-base font-black text-fg border border-border">
            <User className="size-6 text-muted" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-fg truncate">
            {profile.displayName || "Пользователь Discord"}
          </p>
          <p className="text-xs text-muted truncate font-mono">
            {profile.discordId ? `Discord ID: ${profile.discordId}` : profile.email || "Вход выполнен"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-elevated/70 px-2.5 py-1.5 text-[11px] font-bold text-muted hover:border-danger/50 hover:text-danger transition-colors cursor-pointer"
          title="Сменить аккаунт"
        >
          <LogOut className="size-3" />
          <span>Выйти</span>
        </button>
      </div>

      {/* SteamID Form */}
      <form
        onSubmit={handleBindSteam}
        className="relative mt-6 w-full rounded-3xl border border-border/80 bg-surface/90 p-6 text-left shadow-2xl glass-panel space-y-4 cyber-border-glow"
      >
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="steamid" className="text-xs font-bold text-fg flex items-center gap-1.5">
              <Gamepad2 className="size-3.5 text-accent" />
              Ваш SteamID64
            </Label>
            <span className="font-mono text-[10px] text-muted">
              {cleanDigits.length}/17 цифр
            </span>
          </div>

          <Input
            id="steamid"
            inputMode="numeric"
            placeholder="76561198..."
            value={steamIdInput}
            onChange={(e) => setSteamIdInput(e.target.value)}
            disabled={busy}
            className="h-11 rounded-xl border-border/80 bg-elevated/70 font-mono text-sm text-fg placeholder:text-muted/60 focus:border-accent"
          />
        </div>

        {/* Live Lookup Status */}
        {lookingUp ? (
          <div className="flex items-center gap-2 rounded-xl bg-elevated/60 px-3 py-2 text-xs text-muted font-mono">
            <Loader2 className="size-3.5 animate-spin text-accent" />
            <span>Проверка SteamID в составе...</span>
          </div>
        ) : lookupResult?.found ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 px-3 py-2.5 text-xs text-success">
            <CheckCircle2 className="size-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold">
                Найден в составе: {lookupResult.name}
              </p>
              <p className="text-[11px] text-success/80">
                Ранг: {lookupResult.rankTitle || "Модератор"}. Доступ откроется сразу после сохранения.
              </p>
            </div>
          </div>
        ) : isValidLength ? (
          <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
            <span>ℹ️ Новый SteamID64. Личная статистика будет считываться по этому аккаунту.</span>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs text-danger">
            <ShieldAlert className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* How to find SteamID helper */}
        <div className="rounded-2xl border border-border/50 bg-elevated/40 p-3.5 text-xs text-muted leading-relaxed space-y-1">
          <p className="font-bold text-fg text-[11px] uppercase tracking-wider">
            💡 Где взять свой SteamID64:
          </p>
          <p className="text-[11px]">
            1. Зайдите в свой профиль Steam или <a href="https://fearproject.ru" target="_blank" rel="noreferrer" className="text-accent hover:underline">fearproject.ru</a>.
          </p>
          <p className="text-[11px]">
            2. Скопируйте 17-значный номер из адресной строки (например, <span className="font-mono text-fg">76561198421098765</span>) и вставьте в поле выше.
          </p>
        </div>

        <Button
          type="submit"
          disabled={busy || !isValidLength}
          className="w-full h-11 rounded-xl bg-accent text-accent-fg font-extrabold text-sm shadow-lg shadow-accent/20 hover:brightness-110 active:scale-98 transition-all cursor-pointer"
        >
          {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
          Активировать доступ к статистике
        </Button>
      </form>
    </section>
  );
}
