import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import { toast } from "sonner";
import { ModDetailsView } from "@/components/mod-details-view";
import { RequireCap, usePanel } from "@/lib/panel";
import { bindSteamFn } from "@/lib/fn";

function BindSteamPrompt({ onBound }: { onBound: (p: any) => void }) {
  const [steamid, setSteamid] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clean = steamid.trim().replace(/\D/g, "");
  const isValid = clean.length === 17;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await bindSteamFn({ data: { steamid: clean } });
      toast.success("SteamID успешно привязан! Статистика загружается.");
      onBound(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось привязать SteamID");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-6">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent/15 text-accent border border-accent/30 shadow-lg">
        <Gamepad2 className="size-7" />
      </div>
      <div>
        <h1 className="text-2xl font-black tracking-tight text-fg">Привязка SteamID модератора</h1>
        <p className="mt-2 text-xs text-muted leading-relaxed">
          Укажите ваш SteamID64 (17 цифр), чтобы открыть доступ к личной статистике наказаний и норме.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl border border-border/80 bg-surface/90 p-6 text-left shadow-xl space-y-4 glass-panel">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-fg">SteamID64 (17 цифр)</label>
            <span className="font-mono text-[10px] text-muted">{clean.length}/17</span>
          </div>
          <input
            type="text"
            inputMode="numeric"
            placeholder="76561198..."
            value={steamid}
            onChange={(e) => setSteamid(e.target.value)}
            disabled={busy}
            className="h-11 w-full rounded-xl border border-border/80 bg-elevated/70 px-3.5 font-mono text-sm text-fg placeholder:text-muted/60 focus:border-accent outline-none"
          />
        </div>

        {error ? (
          <p className="text-xs text-danger font-medium">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={busy || !isValid}
          className="h-11 w-full rounded-xl bg-accent font-bold text-accent-fg text-xs shadow-lg shadow-accent/20 transition-all hover:brightness-110 active:scale-98 disabled:opacity-50 cursor-pointer"
        >
          {busy ? "Привязка..." : "Привязать и открыть статистику"}
        </button>
      </form>
    </div>
  );
}

function MyStatsRoute() {
  const { profile, setProfile } = usePanel();

  if (profile.mySteamId) {
    return (
      <div className="space-y-4">
        <ModDetailsView explicitSlug={profile.mySteamId} hideBackLink={true} />
      </div>
    );
  }

  return <BindSteamPrompt onBound={setProfile} />;
}

export const Route = createFileRoute("/_panel/mystats")({
  component: () => (
    <RequireCap cap="canOwnStats">
      <MyStatsRoute />
    </RequireCap>
  ),
});
