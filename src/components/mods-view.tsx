import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteModFn, listModsFn, upsertModFn } from "@/lib/fn";
import { RANK_TITLE } from "@/lib/constants";
import type { RosterMod, RosterRank } from "@/lib/types";

const STEAMID_RE = /^\d{17}$/;

const emptyForm = { steamid: "", name: "", rank: 1, discord: "" };

export function ModsView() {
  const [mods, setMods] = useState<RosterMod[]>([]);
  const [ranks, setRanks] = useState<RosterRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", rank: 1, discord: "" });
  const [recounting, setRecounting] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await listModsFn();
      setMods(data.moderators);
      setRanks(data.ranks);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить состав");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const sorted = useMemo(
    () =>
      [...mods].sort(
        (a, b) => b.rank - a.rank || a.name.localeCompare(b.name, "ru"),
      ),
    [mods],
  );

  const query = search.trim().toLowerCase();

  const visible = useMemo(() => {
    if (!query) return sorted;
    return sorted.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.steamid.includes(query) ||
        (m.discord || "").toLowerCase().includes(query),
    );
  }, [sorted, query]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!STEAMID_RE.test(form.steamid.trim())) {
      toast.error("SteamID64 — ровно 17 цифр");
      return;
    }
    setSaving(true);
    try {
      const next = await upsertModFn({
        data: {
          create: true,
          steamid: form.steamid.trim(),
          name: form.name.trim(),
          rank: form.rank,
          discord: form.discord.trim() || null,
        },
      });
      setMods(next.moderators);
      if (next.ranks.length) setRanks(next.ranks);
      setForm(emptyForm);
      if (next.recounting) {
        setRecounting(true);
        toast.success("Добавлен. Бот пересчитывает статистику всех модераторов.");
        setTimeout(() => setRecounting(false), 8000);
      } else {
        toast.success("Модератор добавлен");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не добавлен");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(steamid: string) {
    setSaving(true);
    try {
      const next = await upsertModFn({
        data: {
          steamid,
          name: draft.name.trim(),
          rank: draft.rank,
          discord: draft.discord.trim(),
        },
      });
      setMods(next.moderators);
      setEditing(null);
      toast.success("Сохранено");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не сохранено");
    } finally {
      setSaving(false);
    }
  }

  async function remove(m: RosterMod) {
    if (!window.confirm(`Убрать ${m.name} из списка?`)) return;
    setSaving(true);
    try {
      const next = await deleteModFn({ data: { steamid: m.steamid } });
      setMods(next.moderators);
      toast.success(`${m.name} убран`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалён");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Загружаю состав
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <header className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">FearProject</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Состав модераторов</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Добавление сразу запускает полный пересчёт статистики у бота, включая нового человека.
        </p>
        {recounting ? (
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-accent">
            <Loader2 className="size-4 animate-spin" />
            Идёт пересчёт статистики
          </p>
        ) : null}
      </header>

      <form
        onSubmit={(e) => void add(e)}
        className="mb-6 grid gap-3 rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-panel)] sm:grid-cols-[1fr_1fr_8rem_1fr_auto] sm:items-end"
      >
        <div>
          <Label htmlFor="mod-steamid">SteamID64</Label>
          <Input
            id="mod-steamid"
            value={form.steamid}
            onChange={(e) => setForm((f) => ({ ...f, steamid: e.target.value.replace(/\D/g, "").slice(0, 17) }))}
            placeholder="7656119…"
            inputMode="numeric"
            className="mt-1.5 font-mono"
            required
          />
        </div>
        <div>
          <Label htmlFor="mod-name">Ник</Label>
          <Input
            id="mod-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Как на fearproject.ru"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="mod-rank">Ранг</Label>
          <select
            id="mod-rank"
            value={form.rank}
            onChange={(e) => setForm((f) => ({ ...f, rank: Number(e.target.value) }))}
            className="mt-1.5 flex h-11 w-full rounded-sm border border-border bg-elevated px-3 text-sm text-fg"
          >
            {(ranks.length ? ranks : Object.keys(RANK_TITLE).map((n) => ({ rank: Number(n), title: RANK_TITLE[Number(n)] }))).map(
              (r) => (
                <option key={r.rank} value={r.rank}>
                  {r.rank}. {r.title}
                </option>
              ),
            )}
          </select>
        </div>
        <div>
          <Label htmlFor="mod-discord">Discord</Label>
          <Input
            id="mod-discord"
            value={form.discord}
            onChange={(e) => setForm((f) => ({ ...f, discord: e.target.value }))}
            placeholder="необязательно"
            className="mt-1.5"
          />
        </div>
        <Button type="submit" disabled={saving} className="h-11">
          {saving ? <Loader2 className="animate-spin" /> : <Plus />}
          Добавить
        </Button>
      </form>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск: ник, SteamID64 или Discord"
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-panel)]">
        {visible.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            {query ? "Никого не найдено" : "Список пуст."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((m) => {
              const on = editing === m.steamid;
              return (
                <li key={m.steamid} className="px-4 py-4 sm:px-5">
                  {on ? (
                    <div className="grid gap-3 sm:grid-cols-[1fr_8rem_1fr_auto] sm:items-end">
                      <div>
                        <Label>Ник</Label>
                        <Input
                          value={draft.name}
                          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label>Ранг</Label>
                        <select
                          value={draft.rank}
                          onChange={(e) => setDraft((d) => ({ ...d, rank: Number(e.target.value) }))}
                          className="mt-1.5 flex h-11 w-full rounded-sm border border-border bg-elevated px-3 text-sm text-fg"
                        >
                          {(ranks.length ? ranks : [1, 2, 3, 4, 5].map((n) => ({ rank: n, title: RANK_TITLE[n] }))).map(
                            (r) => (
                              <option key={r.rank} value={r.rank}>
                                {r.title}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                      <div>
                        <Label>Discord</Label>
                        <Input
                          value={draft.discord}
                          onChange={(e) => setDraft((d) => ({ ...d, discord: e.target.value }))}
                          className="mt-1.5"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={() => void saveEdit(m.steamid)} disabled={saving}>
                          Сохранить
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{m.name}</p>
                          <Badge tone={m.rank >= 4 ? "gold" : m.rank === 3 ? "accent" : "muted"}>
                            {RANK_TITLE[m.rank] || `ранг ${m.rank}`}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate font-mono text-xs text-subtle">
                          {m.steamid}
                          {m.discord ? ` · @${m.discord}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditing(m.steamid);
                            setDraft({
                              name: m.name,
                              rank: m.rank,
                              discord: m.discord || "",
                            });
                          }}
                        >
                          <Pencil />
                          Изменить
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-danger hover:text-danger"
                          onClick={() => void remove(m)}
                          disabled={saving}
                        >
                          <Trash2 />
                          Убрать
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-subtle">
        <Users className="size-3.5" />
        {query ? `${visible.length} из ${sorted.length} в списке` : `${sorted.length} в списке`} · состав синхронизируется с ботом
      </p>
    </div>
  );
}
