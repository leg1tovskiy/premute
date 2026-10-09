import { useState } from "react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { botLoginFn } from "@/lib/fn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function DiscordMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export function LoginScreen() {
  const [discordLoading, setDiscordLoading] = useState(false);
  const [pin, setPin] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  async function handleDiscordLogin() {
    setDiscordLoading(true);
    try {
      const res = await authClient.signIn.social({
        provider: "discord",
        callbackURL: "/",
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err: any) {
      setDiscordLoading(false);
      toast.error(err?.message || "Ошибка входа через Discord");
    }
  }

  async function handlePinLogin(e: React.FormEvent) {
    e.preventDefault();
    const clean = pin.trim();
    if (!clean || clean.length < 4) {
      toast.error("Введите 6-значный код авторизации");
      return;
    }
    setPinLoading(true);
    try {
      const res = await botLoginFn({ data: { code: clean } });
      if (res.ok) {
        if (res.sessionToken) {
          sessionStorage.setItem("grok-auth.bearer-token", res.sessionToken);
        }
        toast.success("Авторизация успешна!");
        window.location.href = "/";
      }
    } catch (err: any) {
      toast.error(err?.message || "Неверный код авторизации");
    } finally {
      setPinLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-dvh place-items-center bg-bg px-4 py-10 text-fg">
      <div className="login-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-2xl border border-border/80 bg-surface/95 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
        <div className="absolute inset-y-4 left-0 w-1 rounded-full bg-accent" aria-hidden="true" />

        {/* Header */}
        <div className="mb-6 flex items-center gap-3 pl-2">
          <span className="grid size-12 place-items-center rounded-xl border border-accent/40 bg-elevated text-xl font-black text-accent shadow-sm">
            P
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-accent">PremuteBOT</p>
            <p className="text-sm font-semibold text-muted">Панель управления FEAR</p>
          </div>
        </div>

        <h1 className="pl-2 text-2xl font-black tracking-tight text-fg sm:text-3xl">
          Авторизация в панели
        </h1>
        <p className="mt-2 pl-2 text-xs leading-relaxed text-muted">
          Войдите через Discord-аккаунт модератора или используйте одноразовый PIN-код из бота.
        </p>

        {authEnabled ? (
          <div className="mt-6 space-y-5 pl-2">
            {/* Primary Discord Login Button */}
            <Button
              type="button"
              size="lg"
              disabled={discordLoading}
              onClick={handleDiscordLogin}
              className="h-12 w-full gap-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-sm shadow-lg shadow-[#5865F2]/25 transition-all hover:scale-[1.01]"
            >
              {discordLoading ? <Loader2 className="size-5 animate-spin" /> : <DiscordMark />}
              Войти через Discord (OAuth2)
            </Button>

            {/* Divider */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="w-full border-t border-border/80" />
              <span className="bg-surface px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
                Или по коду из бота
              </span>
            </div>

            {/* 6-Digit Bot Code Form */}
            <form onSubmit={handlePinLogin} className="space-y-3">
              <div>
                <label htmlFor="bot-pin" className="block text-xs font-semibold text-muted mb-1.5">
                  Одноразовый 6-значный код
                </label>
                <div className="flex gap-2">
                  <Input
                    id="bot-pin"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-11 font-mono text-center text-lg tracking-[0.3em] font-black bg-elevated/70 border-border/80 focus:border-accent"
                  />
                  <Button
                    type="submit"
                    disabled={pinLoading || pin.length < 6}
                    className="h-11 px-5 font-bold"
                  >
                    {pinLoading ? <Loader2 className="size-4 animate-spin" /> : "Войти"}
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-subtle leading-relaxed">
                💡 Напишите боту <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-fg font-bold">!login</code> в личные сообщения Discord, чтобы получить код.
              </p>
            </form>
          </div>
        ) : (
          <p className="mt-6 pl-2 text-sm text-muted">Вход временно отключён.</p>
        )}
      </div>
    </main>
  );
}
