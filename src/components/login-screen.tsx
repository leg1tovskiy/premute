import { useState, useEffect } from "react";
import { Eye, EyeOff, Lock, Loader2, User, Shield, Check } from "lucide-react";
import { loginWithPasswordFn } from "@/lib/fn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fearassist_saved_login");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.username === "string") setUsername(parsed.username);
        if (typeof parsed?.password === "string") setPassword(parsed.password);
        setRemember(true);
      }
    } catch {}
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanUser = username.trim();
    if (!cleanUser) {
      toast.error("Введите логин");
      return;
    }
    if (!password) {
      toast.error("Введите пароль");
      return;
    }

    setLoading(true);
    try {
      const res = await loginWithPasswordFn({
        data: {
          username: cleanUser,
          password,
        },
      });

      if (res.ok) {
        if (remember) {
          try {
            localStorage.setItem(
              "fearassist_saved_login",
              JSON.stringify({ username: cleanUser, password }),
            );
          } catch {}
        } else {
          try {
            localStorage.removeItem("fearassist_saved_login");
          } catch {}
        }

        if (res.sessionToken) {
          sessionStorage.setItem("grok-auth.bearer-token", res.sessionToken);
        }
        toast.success("Авторизация успешна!");
        window.location.href = "/";
      }
    } catch (err: any) {
      toast.error(err?.message || "Неверный логин или пароль");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-dvh place-items-center bg-bg px-4 py-10 text-fg">
      <div className="login-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-3xl border border-border/80 bg-surface/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="absolute inset-y-6 left-0 w-1.5 rounded-full bg-accent" aria-hidden="true" />

        {/* Header */}
        <div className="mb-6 flex items-center gap-3.5 pl-2">
          <img
            src="/logo.png"
            alt="FearAssist"
            className="size-12 rounded-2xl border border-accent/40 bg-elevated/40 p-1 object-contain shadow-md"
          />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-accent">FearAssist</p>
            <p className="text-xs font-semibold text-muted">Панель для модераторов FearProject</p>
          </div>
        </div>

        <div className="pl-2 mb-6">
          <h1 className="text-2xl font-black tracking-tight text-fg sm:text-3xl">
            Авторизация
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Введите логин и пароль вашей учётной записи для входа в панель модерации.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pl-2">
          {/* Username Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-fg flex items-center gap-1.5">
              <User className="size-3.5 text-accent" />
              Логин
            </label>
            <div className="relative">
              <Input
                type="text"
                autoFocus
                autoComplete="username"
                autoCapitalize="none"
                placeholder="Ваш логин"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="h-11 rounded-xl border-border/80 bg-elevated/70 px-3.5 text-sm font-medium focus:border-accent"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-fg flex items-center gap-1.5">
              <Lock className="size-3.5 text-accent" />
              Пароль
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-11 rounded-xl border-border/80 bg-elevated/70 px-3.5 pr-10 text-sm font-medium focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Remember Password Checkbox */}
          <div className="pt-0.5">
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none group text-xs text-muted hover:text-fg transition-colors">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={loading}
                  className="peer sr-only"
                />
                <div className="size-4 rounded-md border border-border/80 bg-elevated/70 transition-all peer-checked:bg-accent peer-checked:border-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 flex items-center justify-center shadow-inner group-hover:border-accent/60">
                  <Check
                    className={`size-3 text-accent-fg stroke-[3] transition-opacity duration-150 ${
                      remember ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </div>
              </div>
              <span className="font-medium text-fg/90 group-hover:text-fg transition-colors">
                Запомнить данные для входа
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            disabled={loading || !username.trim() || !password}
            className="mt-6 h-12 w-full gap-2 rounded-xl bg-accent hover:bg-accent/90 text-accent-fg font-black text-sm shadow-lg shadow-accent/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Вход в систему...
              </>
            ) : (
              "Войти в систему"
            )}
          </Button>

          <div className="pt-2 text-center">
            <p className="text-[11px] text-subtle flex items-center justify-center gap-1.5">
              <Shield className="size-3 text-muted" />
              Новые аккаунты создаются владельцами в панели управления
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
