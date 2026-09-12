import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, MessageSquare, Mic, Pause, Play, Search, Send, Square, Trash2, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { botSendFn, botScheduleSendFn, listTextChannelsFn, playSoundFn, sayFn, searchMembersVoiceFn, voiceRecordFn } from "@/lib/fn";
import { SOUNDS } from "@/lib/constants";
import type { GuildMember, VoiceChannel } from "@/lib/types";
import { cn } from "@/lib/utils";

type MemberHit = { m: GuildMember; pick: () => void };

type ScheduleParts = { year: number; month: number; day: number; hour: number; minute: number };

const MONTH_NAMES = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

// Текущее время в МСК (UTC+3, без DST) как локальные календарные поля.
function mskNow(): Date {
  const off = -new Date().getTimezoneOffset() / 60;
  return new Date(Date.now() + (3 - off) * 3600 * 1000);
}

// Поля даты/времени «через час по МСК» — стартовое значение для планировщика.
function defaultSchedule(): ScheduleParts {
  const d = new Date(mskNow().getTime() + 3600 * 1000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

// МСК (дата без таймзоны) -> эпоха (мс). MSK = UTC+3 всегда.
function partsToWhen(p: ScheduleParts): number {
  return Date.UTC(p.year, p.month - 1, p.day, p.hour - 3, p.minute);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function fmtSched(p: ScheduleParts): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(p.day)}.${pad(p.month)}.${p.year} в ${pad(p.hour)}:${pad(p.minute)} МСК`;
}

function MemberSearch({ onPick }: { onPick: (m: GuildMember) => void }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<MemberHit[]>([]);
  const [searching, setSearching] = useState(false);

  async function search(e?: FormEvent) {
    e?.preventDefault();
    setSearching(true);
    try {
      const rows = await searchMembersVoiceFn({ data: { query } });
      setHits(rows.map((m) => ({ m, pick: () => { onPick(m); setHits([]); setQuery(""); } })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Поиск не удался");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div>
      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            className="pl-10"
            placeholder="Ник, имя или Discord ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={searching}>
          {searching ? <Loader2 className="animate-spin" /> : <Search />}
          Найти
        </Button>
      </form>
      {hits.length > 0 ? (
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
          {hits.map(({ m, pick }) => {
            const name = m.nick || m.globalName || m.username;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={pick}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-elevated/60"
                >
                  {m.avatar ? (
                    <img src={m.avatar} alt="" className="size-9 rounded-full object-cover" />
                  ) : (
                    <span className="grid size-9 place-items-center rounded-full bg-elevated text-xs font-medium">
                      {name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{name}</span>
                    <span className="block truncate font-mono text-[11px] text-subtle">
                      @{m.username} · {m.id}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function MemberChip({ m, onClear }: { m: GuildMember; onClear: () => void }) {
  const name = m.nick || m.globalName || m.username;
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-1.5 text-sm">
      {m.avatar ? (
        <img src={m.avatar} alt="" className="size-6 rounded-full object-cover" />
      ) : (
        <span className="grid size-6 place-items-center rounded-full bg-surface text-[10px] font-medium">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="max-w-48 truncate font-medium">{name}</span>
      <button type="button" onClick={onClear} className="text-subtle transition-colors hover:text-danger" aria-label="Убрать">
        <X className="size-3.5" />
      </button>
    </span>
  );
}

export function VoiceView() {
  const [text, setText] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Запись голосового сообщения
  const [recording, setRecording] = useState(false);
  const [recBlob, setRecBlob] = useState<Blob | null>(null);
  const [recUrl, setRecUrl] = useState<string | null>(null);
  const [recSec, setRecSec] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Написать от имени бота
  const [place, setPlace] = useState<"dm" | "channel">("dm");
  const [channels, setChannels] = useState<VoiceChannel[]>([]);
  const [channelId, setChannelId] = useState("");
  const [dmTarget, setDmTarget] = useState<GuildMember | null>(null);
  const [mention, setMention] = useState<"none" | "user" | "everyone">("none");
  const [mentionTarget, setMentionTarget] = useState<GuildMember | null>(null);
  const [sign, setSign] = useState(false);
  const [msg, setMsg] = useState("");
  const [later, setLater] = useState(false);
  const [sched, setSched] = useState<ScheduleParts>(defaultSchedule);

  useEffect(() => {
    let alive = true;
    listTextChannelsFn()
      .then((rows) => {
        if (!alive) return;
        setChannels(rows);
        setChannelId((prev) => prev || (rows[0] ? rows[0].id : ""));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startRec() {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || mime });
        setRecBlob(blob);
        setRecUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      mr.start(250);
      recRef.current = mr;
      setRecording(true);
      setRecBlob(null);
      setRecUrl(null);
      setRecSec(0);
      timerRef.current = setInterval(() => setRecSec((s) => Math.min(75, s + 0.25)), 250);
    } catch {
      toast.error("Нет доступа к микрофону — разреши его в браузере");
    }
  }

  function stopRec(send: boolean) {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    const mr = recRef.current;
    if (!mr) return;
    if (!send) {
      // отмена: стираем и останавливаем без сохранения
      mr.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      chunksRef.current = [];
      setRecBlob(null);
      setRecUrl(null);
      setRecSec(0);
    }
    mr.stop();
    recRef.current = null;
  }

  async function sendRec() {
    if (!recBlob) {
      toast.error("Сначала запиши голосовое");
      return;
    }
    if (recBlob.size > 6 * 1024 * 1024) {
      toast.error("Запись слишком длинная (макс ~1 минута)");
      return;
    }
    setBusy("rec");
    try {
      const buf = await recBlob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), ""),
      );
      await voiceRecordFn({
        data: {
          audio: base64,
          mime: recBlob.type || "audio/webm",
        },
      });
      toast.success("Голосовое отправлено в войс");
      if (recUrl) URL.revokeObjectURL(recUrl);
      setRecBlob(null);
      setRecUrl(null);
      setRecSec(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setBusy(null);
    }
  }

  function preview(src: string, id: string) {
    audioRef.current?.pause();
    if (playing === id) {
      setPlaying(null);
      return;
    }
    const a = new Audio(src);
    audioRef.current = a;
    a.onended = () => setPlaying(null);
    void a.play();
    setPlaying(id);
  }

  async function sendSound(file: string) {
    setBusy(file);
    try {
      await playSoundFn({ data: { file } });
      toast.success("Бот произносит звук в войсе");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setBusy(null);
    }
  }

  async function sendSay() {
    const t = text.trim();
    if (!t) return;
    setBusy("say");
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ru&client=tw-ob&q=${encodeURIComponent(t.slice(0, 190))}`;
      preview(url, "say-preview");
      await sayFn({ data: { text: t } });
      toast.success("Бот озвучивает текст в войсе");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось озвучить");
    } finally {
      setBusy(null);
    }
  }

  async function sendMsg() {
    const t = msg.trim();
    if (!t) {
      toast.error("Пустой текст");
      return;
    }
    if (place === "dm" && !dmTarget) {
      toast.error("Выберите получателя");
      return;
    }
    if (place === "channel" && !channelId) {
      toast.error("Выберите канал");
      return;
    }
    if (place === "channel" && mention === "user" && !mentionTarget) {
      toast.error("Выберите, кого упомянуть");
      return;
    }
    setBusy("send");
    try {
      if (later) {
        const when = partsToWhen(sched);
        if (when <= Date.now()) {
          toast.error("Время уже прошло — укажи будущую дату и время (по МСК)");
          return;
        }
        await botScheduleSendFn({
          data: {
            place,
            userId: place === "dm" ? dmTarget?.id : mention === "user" ? mentionTarget?.id : undefined,
            channelId: place === "channel" ? channelId : undefined,
            text: t,
            mention: place === "channel" ? mention : "none",
            sign,
            when,
          },
        });
        toast.success(`Запланировано: ${fmtSched(sched)}`);
        setMsg("");
        setLater(false);
      } else {
        await botSendFn({
          data: {
            place,
            userId: place === "dm" ? dmTarget?.id : mention === "user" ? mentionTarget?.id : undefined,
            channelId: place === "channel" ? channelId : undefined,
            text: t,
            mention: place === "channel" ? mention : "none",
            sign,
          },
        });
        toast.success("Отправлено от имени бота");
        setMsg("");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Озвучивание</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Голос бота</h1>
        <p className="mt-1 text-sm text-muted">
          Те же звуки, что у !eye / !koza1 / !koza2 / !svin, и тот же TTS, что у !say. Бот
          произнесёт их в голосовом канале, где он сидит, — не файлом в чат.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {SOUNDS.map((s) => {
          const src = `/sounds/${s.file}`;
          const isPlay = playing === s.id;
          return (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-md border border-border bg-surface p-4"
            >
              <button
                type="button"
                onClick={() => preview(src, s.id)}
                className={cn(
                  "grid size-11 place-items-center rounded-sm border border-border bg-elevated text-fg transition-colors",
                  isPlay && "border-accent text-accent",
                )}
                aria-label={isPlay ? "Пауза" : "Слушать"}
              >
                {isPlay ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.label}</p>
                <p className="font-mono text-xs text-subtle">{s.file}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy === s.file}
                onClick={() => void sendSound(s.file)}
              >
                {busy === s.file ? <Loader2 className="animate-spin" /> : <Send />}
                В Discord
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-panel)] sm:p-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Volume2 className="size-4 text-accent" />
          Свой текст
        </div>
        <Textarea
          placeholder="Произнести — тот же голос, что у команды !say…"
          value={text}
          maxLength={190}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs tabular-nums text-subtle">{text.length}/190</span>
          <Button disabled={busy === "say" || !text.trim()} onClick={() => void sendSay()}>
            {busy === "say" ? <Loader2 className="animate-spin" /> : <Send />}
            Озвучить
          </Button>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-panel)] sm:p-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Mic className="size-4 text-accent" />
          Голосовое сообщение
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!recording && !recBlob ? (
            <Button onClick={() => void startRec()}>
              <Mic />
              Записать
            </Button>
          ) : null}
          {recording ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
                <span className="size-2.5 animate-pulse rounded-full bg-danger" />
                {recSec.toFixed(1).replace(".", ":").slice(0, 4)} / 0:75
              </span>
              <Button variant="danger" onClick={() => stopRec(true)}>
                <Square />
                Стоп
              </Button>
              <Button variant="secondary" onClick={() => stopRec(false)}>
                <Trash2 />
                Отменить
              </Button>
            </>
          ) : null}
          {recBlob ? (
            <>
              <audio controls src={recUrl ?? undefined} className="h-9 max-w-xs" />
              <Button onClick={() => void sendRec()} disabled={busy === "rec"}>
                {busy === "rec" ? <Loader2 className="animate-spin" /> : <Send />}
                В голосовой канал
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (recUrl) URL.revokeObjectURL(recUrl);
                  setRecBlob(null);
                  setRecUrl(null);
                  setRecSec(0);
                }}
              >
                <Trash2 />
                Удалить
              </Button>
            </>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-subtle">
          До ~1 минуты. Запись идёт в браузере, потом уходит боту — он воспроизведёт её там, где сидит.
        </p>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-panel)] sm:p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="size-4 text-accent" />
          Написать от имени бота
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={place === "dm" ? "default" : "secondary"}
            onClick={() => setPlace("dm")}
          >
            В ЛС
          </Button>
          <Button
            type="button"
            size="sm"
            variant={place === "channel" ? "default" : "secondary"}
            onClick={() => setPlace("channel")}
          >
            В чат сервера
          </Button>
        </div>

        <div className="mt-4">
          {place === "dm" ? (
            <div className="grid gap-2">
              <Label>Получатель</Label>
              {dmTarget ? (
                <MemberChip m={dmTarget} onClear={() => setDmTarget(null)} />
              ) : (
                <MemberSearch onPick={(m) => setDmTarget(m)} />
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="say-channel">Канал</Label>
                <select
                  id="say-channel"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-elevated px-3 text-sm text-fg outline-none focus:ring-1 focus:ring-accent"
                >
                  {channels.length === 0 ? <option value="">Каналы не загружены</option> : null}
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Упоминание</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={mention === "none" ? "default" : "secondary"}
                    onClick={() => setMention("none")}
                  >
                    Без упоминания
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={mention === "user" ? "default" : "secondary"}
                    onClick={() => setMention("user")}
                  >
                    Упомянуть
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={mention === "everyone" ? "default" : "secondary"}
                    onClick={() => setMention("everyone")}
                  >
                    @everyone
                  </Button>
                </div>
                {mention === "user" ? (
                  <div className="mt-1">
                    {mentionTarget ? (
                      <MemberChip m={mentionTarget} onClear={() => setMentionTarget(null)} />
                    ) : (
                      <MemberSearch onPick={(m) => setMentionTarget(m)} />
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <Switch checked={sign} onCheckedChange={setSign} id="say-sign" />
            <Label htmlFor="say-sign" className="cursor-pointer text-xs">
              Подписать (указать от кого)
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={later} onCheckedChange={setLater} id="say-later" />
            <Label htmlFor="say-later" className="cursor-pointer text-xs">
              Отправить позже
            </Label>
          </div>
        </div>

        {later ? (
          <div className="mt-4 rounded-md border border-border bg-elevated/60 p-4">
            <Label className="text-xs">Дата и время отправки</Label>
            <div className="mt-2 grid grid-cols-5 gap-2">
              <select
                aria-label="День"
                value={sched.day}
                onChange={(e) => setSched((s) => ({ ...s, day: Number(e.target.value) }))}
                className="h-9 rounded-md border border-border bg-elevated px-2 text-sm text-fg outline-none focus:ring-1 focus:ring-accent"
              >
                {Array.from({ length: daysInMonth(sched.year, sched.month) }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                aria-label="Месяц"
                value={sched.month}
                onChange={(e) =>
                  setSched((s) => {
                    const n = { ...s, month: Number(e.target.value) };
                    return { ...n, day: Math.min(n.day, daysInMonth(n.year, n.month)) };
                  })
                }
                className="h-9 rounded-md border border-border bg-elevated px-2 text-sm text-fg outline-none focus:ring-1 focus:ring-accent"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Год"
                value={sched.year}
                onChange={(e) =>
                  setSched((s) => {
                    const n = { ...s, year: Number(e.target.value) };
                    return { ...n, day: Math.min(n.day, daysInMonth(n.year, n.month)) };
                  })
                }
                className="h-9 rounded-md border border-border bg-elevated px-2 text-sm text-fg outline-none focus:ring-1 focus:ring-accent"
              >
                {Array.from({ length: 2 }, (_, i) => mskNow().getUTCFullYear() + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                aria-label="Час"
                value={sched.hour}
                onChange={(e) => setSched((s) => ({ ...s, hour: Number(e.target.value) }))}
                className="h-9 rounded-md border border-border bg-elevated px-2 text-sm text-fg outline-none focus:ring-1 focus:ring-accent"
              >
                {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}
                  </option>
                ))}
              </select>
              <select
                aria-label="Минуты"
                value={sched.minute}
                onChange={(e) => setSched((s) => ({ ...s, minute: Number(e.target.value) }))}
                className="h-9 rounded-md border border-border bg-elevated px-2 text-sm text-fg outline-none focus:ring-1 focus:ring-accent"
              >
                {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, "0")}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-2 text-xs text-subtle">
              Время — по Московскому времени (МСК). Отправка запланируется на бота и выполнится в указанный
              момент, даже если ты закроешь вкладку.
            </p>
          </div>
        ) : null}

        <div className="mt-4">
          <Textarea
            placeholder="Текст сообщения от имени бота…"
            value={msg}
            maxLength={1500}
            onChange={(e) => setMsg(e.target.value)}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs tabular-nums text-subtle">{msg.length}/1500</span>
            <Button disabled={busy === "send" || !msg.trim()} onClick={() => void sendMsg()}>
              {busy === "send" ? <Loader2 className="animate-spin" /> : <Send />}
              {later ? "Отправить позже" : "Отправить"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}