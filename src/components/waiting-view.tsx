import { useEffect, useState, type FormEvent } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bindDiscord, pollDiscordClaim, getMe } from "@/lib/fn";
import { ROOT_DISCORD_ID } from "@/lib/constants";
import type { StaffProfile } from "@/lib/types";

export function WaitingView({
  profile,
  onUpdate,
}: {
  profile: StaffProfile;
  onUpdate: (p: StaffProfile) => void;
}) {
  const [discordId, setDiscordId] = useState(profile.discordId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"form" | "pending" | "declined">("form");

  useEffect(() => {
    if (!claimId || phase !== "pending") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await pollDiscordClaim({ data: { claimId } });
        if (cancelled) return;
        if (res.claim.status === "accepted" && res.profile) {
          onUpdate(res.profile);
          return;
        }
        if (res.claim.status === "declined") {
          setPhase("declined");
          setError(res.claim.error || "Владелец Discord ID отклонил привязку.");
          setClaimId(null);
          return;
        }
        if (res.claim.status === "error") {
          setPhase("form");
          setError(res.claim.error || "Не удалось подтвердить.");
          setClaimId(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Ошибка проверки");
      }
    };
    void tick();
    const t = setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [claimId, phase, onUpdate]);

  // Фоновая проверка: если администратор выдал права или привязал SteamID, окно ожидания сразу откроет панель
  useEffect(() => {
    if (phase === "pending") return;
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
  }, [phase, onUpdate]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const claim = await bindDiscord({ data: { discordId } });
      if (claim.status === "accepted") {
        const next = await getMe({ data: {} });
        onUpdate(next);
        return;
      }
      setClaimId(claim.id);
      setPhase("pending");
    } catch (err) {
      setPhase("form");
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-16 text-center sm:py-24">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent">PremuteBOT</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
        Приветствую в панели управления бота PremuteBOT
      </h1>
      <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
        Ожидайте пока администратор выдаст вам разрешение на использование панелью
      </p>

      <form
        onSubmit={save}
        className="relative mt-10 w-full rounded-lg border border-border bg-surface p-5 text-left shadow-[var(--shadow-panel)] sm:p-6"
      >
        <div className="absolute inset-y-3 left-0 w-1 rounded-full bg-accent" aria-hidden="true" />
        <Label htmlFor="did">Discord ID</Label>
        <p className="mt-1 mb-3 text-xs text-subtle">
          Discord → Настройки → Дополнительно → Режим разработчика. Затем правый клик по своему
          профилю → Копировать ID. На этот аккаунт придёт ЛС с кнопками «Принять» / «Отклонить» —
          чужой ID привязать нельзя.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="did"
            inputMode="numeric"
            placeholder={ROOT_DISCORD_ID}
            value={discordId}
            onChange={(e) => setDiscordId(e.target.value)}
            disabled={phase === "pending"}
          />
          <Button type="submit" disabled={busy || phase === "pending"} className="sm:w-44">
            {busy || phase === "pending" ? <Loader2 className="animate-spin" /> : null}
            {phase === "pending" ? "Ждём ЛС" : "Привязать"}
          </Button>
        </div>
        {phase === "pending" ? (
          <p className="mt-3 text-xs leading-relaxed text-accent">
            Запрос отправлен в личные сообщения Discord. Откройте ЛС с PremuteBOT и нажмите
            «Принять». Если кнопки нет — разрешите сообщения от участников сервера.
          </p>
        ) : null}
        {profile.discordId && phase !== "pending" ? (
          <p className="mt-3 text-xs text-success">Привязан ID {profile.discordId}</p>
        ) : null}
        {phase === "declined" || error ? (
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-danger">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}
      </form>
    </section>
  );
}
