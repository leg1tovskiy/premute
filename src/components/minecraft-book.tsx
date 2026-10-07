import { useState, useEffect, useCallback, useRef } from "react";
import {
  Volume2,
  VolumeX,
  BookOpen,
  Sparkles,
  List,
  Heart,
} from "lucide-react";
import { VLADA_INTRO, VLADA_WISHES, type VladaWishItem } from "@/data/vlada-wishes";

/**
 * Аутентичные звуки перелистывания страниц из Minecraft (item.book.page_turn 1, 2, 3).
 * Воспроизводит официальные сэмплы из ванильной игры со случайным питчем и чередованием вариаций.
 */
class PageTurnAudio {
  private audioFiles = [
    "/sounds/page_flip1.ogg",
    "/sounds/page_flip2.ogg",
    "/sounds/page_flip3.ogg",
  ];
  private pool: HTMLAudioElement[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      this.pool = this.audioFiles.map((src) => {
        const audio = new Audio(src);
        audio.preload = "auto";
        return audio;
      });
    }
  }

  play() {
    try {
      if (typeof window === "undefined" || this.pool.length === 0) return;
      const index = Math.floor(Math.random() * this.pool.length);
      const original = this.pool[index];
      // Клонируем для естественного наложения при быстром перелистывании
      const sound = original.cloneNode() as HTMLAudioElement;
      sound.volume = 0.9;
      // Лёгкая вариация скорости/питча (0.95 - 1.05), как в звуковом движке Minecraft
      sound.playbackRate = 0.95 + Math.random() * 0.1;
      void sound.play();
    } catch {
      // Игнорируем ограничения автовоспроизведения
    }
  }
}

const pageAudio = new PageTurnAudio();

function BookPageContent({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) {
  const isIntroPage = pageNumber === 1;
  const currentWish: VladaWishItem | undefined = !isIntroPage
    ? VLADA_WISHES[pageNumber - 2]
    : undefined;

  return (
    <>
      {/* ── Хэллоуин: лёгкая паутинка в углах пергамента (не мешает чтению) ── */}
      {/* Верхний левый угол пергамента */}
      <img
        src="/cobweb.png"
        alt=""
        draggable={false}
        className="absolute z-10 pointer-events-none select-none pixelated mix-blend-multiply opacity-35"
        style={{
          top: "6.2%",
          left: "9.6%",
          width: "clamp(34px, 7.8%, 46px)",
          aspectRatio: "1/1",
        }}
      />
      {/* Нижний правый угол пергамента */}
      <img
        src="/cobweb.png"
        alt=""
        draggable={false}
        className="absolute z-10 pointer-events-none select-none pixelated mix-blend-multiply opacity-25 -scale-x-100 -scale-y-100"
        style={{
          bottom: "9.8%",
          right: "8.6%",
          width: "clamp(26px, 6.2%, 36px)",
          aspectRatio: "1/1",
        }}
      />

      {/* ── Заголовок страницы: "Page X of Y" (1 в 1 как в игре) ── */}
      <div
        className="absolute z-20 pointer-events-none text-black font-minecraft text-right font-normal"
        style={{
          top: "7.9%",
          right: "12.3%",
          fontSize: "clamp(13px, 2.7vw, 19px)",
          lineHeight: 1,
          letterSpacing: "0px",
          imageRendering: "pixelated",
        }}
      >
        Page {pageNumber} of {totalPages}
      </div>

      {/* ── Область содержимого страницы книги ──────────────────── */}
      <div
        className="absolute z-10 flex flex-col justify-between overflow-hidden"
        style={{
          top: "14.2%",
          left: "12%",
          right: "13.5%",
          bottom: "14.8%",
        }}
      >
        {isIntroPage ? (
          /* Вступительный лист */
          <div className="flex h-full flex-col justify-between text-black font-minecraft leading-[1.4]">
            <div>
              <div className="text-center pb-2 border-b-2 border-black/15">
                <h3
                  className="font-bold text-black"
                  style={{ fontSize: "clamp(17px, 3.6vw, 24px)" }}
                >
                  {VLADA_INTRO.title}
                </h3>
                <p
                  className="text-black/70 mt-0.5"
                  style={{ fontSize: "clamp(11px, 2.2vw, 14px)" }}
                >
                  {VLADA_INTRO.subtitle}
                </p>
              </div>

              <div className="mt-4">
                {/* Приветствие «Дорогая Влада!» — крупный и жирный шрифт */}
                {VLADA_INTRO.paragraphs.length > 0 && (
                  <p
                    className="font-bold text-black pb-2 leading-snug"
                    style={{ fontSize: "clamp(16px, 3.4vw, 22px)" }}
                  >
                    {VLADA_INTRO.paragraphs[0]}
                  </p>
                )}

                {/* Остальные абзацы — увеличенный размер шрифта */}
                <div
                  className="space-y-3 text-black/95 font-normal"
                  style={{ fontSize: "clamp(13.5px, 2.7vw, 17.5px)", lineHeight: "1.45" }}
                >
                  {VLADA_INTRO.paragraphs.slice(1).map((p, i) => (
                    <p key={i} className="leading-snug">
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {VLADA_INTRO.signature ? (
              <div className="pt-2 text-right pr-4 text-black font-bold">
                <p
                  className="italic opacity-90 inline-flex items-center justify-end gap-1.5"
                  style={{ fontSize: "clamp(12px, 2.3vw, 15px)" }}
                >
                  {VLADA_INTRO.signature.includes("❤️") || VLADA_INTRO.signature.includes("❤") ? (
                    <>
                      <span>{VLADA_INTRO.signature.replace(/[❤️❤]/g, "").trim()}</span>
                      <span className="not-italic text-[#dc2626] inline-block font-sans text-[1.15em] leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
                        ❤️
                      </span>
                    </>
                  ) : (
                    VLADA_INTRO.signature
                  )}
                </p>
              </div>
            ) : null}
          </div>
        ) : currentWish ? (
          /* Страница с поздравлением (ОДНО поздравление на страницу) */
          <div className="flex h-full flex-col justify-between text-black font-minecraft leading-[1.45]">
            <div className="overflow-y-auto overscroll-contain no-scrollbar pr-2">
              {/* Иконка / шапка пожелания */}
              <div className="flex items-center justify-between pb-1.5 border-b border-black/10">
                <span
                  className="font-bold text-black/80 flex items-center gap-1"
                  style={{ fontSize: "clamp(12px, 2.3vw, 15px)" }}
                >
                  <span>Поздравление #{currentWish.id}</span>
                </span>
                {currentWish.date ? (
                  <span
                    className="text-black/50"
                    style={{ fontSize: "clamp(10px, 2vw, 12px)" }}
                  >
                    {currentWish.date}
                  </span>
                ) : null}
              </div>

              {/* Основной текст поздравления — увеличенный размер шрифта */}
              <div
                className="mt-3.5 text-black font-normal whitespace-pre-wrap leading-relaxed"
                style={{ fontSize: "clamp(14px, 2.8vw, 18px)", lineHeight: "1.5" }}
              >
                {currentWish.text}
              </div>
            </div>

            {/* Подпись автора внизу страницы: строго никнейм с отступом от правого края */}
            <div className="pt-2 text-right pr-4">
              <p
                className="font-bold text-black"
                style={{ fontSize: "clamp(14px, 2.8vw, 18px)" }}
              >
                — {currentWish.author}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

type FlipState = {
  id: number;
  fromPage: number;
  targetPage: number;
  direction: "forward" | "backward";
};

export function MinecraftBook() {
  // Страница 1 = Вступительный лист, страницы 2..N = поздравления
  const totalPages = VLADA_WISHES.length + 1;
  const [currentPage, setCurrentPage] = useState(1);
  const pageRef = useRef(1);
  const flipIdRef = useRef(0);
  const [flipState, setFlipState] = useState<FlipState | null>(null);
  const flipTimerRef = useRef<number | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showToc, setShowToc] = useState(false);
  const [nextHover, setNextHover] = useState(false);
  const [prevHover, setPrevHover] = useState(false);
  const bookContainerRef = useRef<HTMLDivElement>(null);

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (flipTimerRef.current !== null) {
        clearTimeout(flipTimerRef.current);
      }
    };
  }, []);

  const flipTo = useCallback(
    (page: number) => {
      const target = Math.max(1, Math.min(totalPages, page));
      const fromPage = pageRef.current;
      if (target === fromPage && !flipTimerRef.current) return;

      if (flipTimerRef.current !== null) {
        clearTimeout(flipTimerRef.current);
        flipTimerRef.current = null;
      }

      if (soundEnabled) pageAudio.play();

      const direction: "forward" | "backward" = target >= fromPage ? "forward" : "backward";

      // Мгновенно синхронно обновляем актуальный номер страницы
      pageRef.current = target;
      setCurrentPage(target);

      flipIdRef.current += 1;
      setFlipState({
        id: flipIdRef.current,
        fromPage,
        targetPage: target,
        direction,
      });

      flipTimerRef.current = window.setTimeout(() => {
        setFlipState(null);
        flipTimerRef.current = null;
      }, 480);
    },
    [soundEnabled, totalPages],
  );

  const nextPage = useCallback(() => {
    const cur = pageRef.current;
    if (cur < totalPages) flipTo(cur + 1);
  }, [flipTo, totalPages]);

  const prevPage = useCallback(() => {
    const cur = pageRef.current;
    if (cur > 1) flipTo(cur - 1);
  }, [flipTo]);

  // Навигация стрелками на клавиатуре
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        nextPage();
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        prevPage();
      } else if (e.key === "Home") {
        flipTo(1);
      } else if (e.key === "End") {
        flipTo(totalPages);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flipTo, nextPage, prevPage, totalPages]);

  return (
    <div
      ref={bookContainerRef}
      className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-3 sm:p-6 transition-all select-none overflow-hidden"
    >
      {/* ── Атмосферный фон Minecraft: Хэллоуинское мистическое свечение и угольки ──── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-radial from-transparent via-black/45 to-black/90" />
        {/* Мистические фиолетовые и тыквенно-оранжевые ареолы */}
        <div className="absolute top-1/4 -left-12 size-80 rounded-full bg-purple-700/10 blur-[100px]" />
        <div className="absolute top-1/3 -right-12 size-80 rounded-full bg-orange-600/12 blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/3 size-72 rounded-full bg-amber-500/8 blur-[90px]" />

        {/* Парящие хэллоуинские искорки / угольки */}
        <div className="halloween-ember absolute top-1/3 left-1/4 size-1.5 rounded-full bg-amber-400/60 shadow-[0_0_8px_#f59e0b]" style={{ animationDelay: "0s" }} />
        <div className="halloween-ember absolute bottom-1/3 right-1/4 size-2 rounded-full bg-orange-400/50 shadow-[0_0_10px_#ea580c]" style={{ animationDelay: "2.2s" }} />
        <div className="halloween-ember absolute top-2/3 left-1/3 size-1.5 rounded-full bg-purple-400/50 shadow-[0_0_8px_#c084fc]" style={{ animationDelay: "3.7s" }} />
      </div>

      {/* ── Верхняя панель управления книгой ───────────────────────── */}
      <div className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-3 w-full max-w-[584px] px-1">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg border border-orange-500/40 bg-orange-500/15 text-orange-400 shadow-sm text-sm">
            🎃
          </span>
          <div>
            <h2 className="text-xs sm:text-sm font-extrabold tracking-tight text-fg flex items-center gap-1.5 font-minecraft">
              Книга для Влады <span className="text-[10px] text-orange-400/90 font-normal">🎃 Halloween</span>
            </h2>
            <p className="text-[10px] text-muted font-minecraft">Оригинальный интерфейс Minecraft</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Кнопка оглавления */}
          <button
            type="button"
            onClick={() => setShowToc(!showToc)}
            className="mc-button flex h-7 items-center gap-1.5 px-2.5 text-[11px] font-minecraft"
            title="Оглавление поздравлений"
          >
            <List className="size-3" />
            <span>Страницы</span>
          </button>

          {/* Переключатель звука перелистывания */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="mc-button grid size-7 place-items-center text-[11px] font-minecraft"
            title={soundEnabled ? "Выключить звук страниц" : "Включить звук страниц"}
            aria-label="Звук"
          >
            {soundEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* ── Выпадающее оглавление со списком авторов ────────────────── */}
      {showToc && (
        <div className="relative z-30 mb-4 w-full max-w-[584px] rounded-xl border border-border/80 bg-surface/95 p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <span className="text-xs font-bold text-fg font-minecraft flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-accent" />
              Оглавление книги ({totalPages} стр.)
            </span>
            <button
              type="button"
              onClick={() => setShowToc(false)}
              className="text-xs text-subtle hover:text-fg font-minecraft px-1.5"
            >
              Закрыть ✕
            </button>
          </div>
          <div className="mt-2.5 max-h-56 space-y-1 overflow-y-auto no-scrollbar">
            {/* Стр 1 */}
            <button
              type="button"
              onClick={() => {
                flipTo(1);
                setShowToc(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors font-minecraft ${
                currentPage === 1 ? "bg-accent/20 text-accent font-bold" : "text-muted hover:bg-elevated hover:text-fg"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-[10px] opacity-70 font-mono">Стр. 1</span>
                <span>Вступительный лист</span>
              </span>
              <Sparkles className="size-3 text-pink-400" />
            </button>

            {/* Поздравления */}
            {VLADA_WISHES.map((w, idx) => {
              const pNum = idx + 2;
              const isActive = currentPage === pNum;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    flipTo(pNum);
                    setShowToc(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors font-minecraft ${
                    isActive ? "bg-accent/20 text-accent font-bold" : "text-muted hover:bg-elevated hover:text-fg"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] opacity-70 font-mono">Стр. {pNum}</span>
                    <span className="truncate max-w-[320px] font-semibold">{w.author}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── САМА КНИГА MINECRAFT (1 в 1) ────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-center">
        {/* Контейнер книги с точными пропорциями 146 : 180 (4x масштаб = 584px x 720px) */}
        <div
          className="relative aspect-[146/180] w-[min(92vw,584px)] max-h-[82vh] select-none shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] book-perspective"
          style={{ imageRendering: "pixelated" }}
        >
          {/* Базовая текстура книги из Minecraft 1 в 1 */}
          <img
            src="/book-bg-4x.png"
            alt="Minecraft Book GUI"
            draggable={false}
            className="absolute inset-0 size-full object-fill pixelated pointer-events-none"
          />

          {/* ── Хэллоуин: Пиксельная тыквочка, уютно сидящая на верхнем правом углу книги ── */}
          <div
            className="absolute z-40 pointer-events-auto select-none group"
            style={{
              top: "-36px",
              right: "-14px",
            }}
          >
            {/* Тень от тыквы на кожаном переплёте книги */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 sm:w-20 h-3 bg-black/60 rounded-full blur-[2.5px] pointer-events-none" />

            {/* Паутинка, свисающая с уголка книги под тыквой */}
            <img
              src="/cobweb.png"
              alt=""
              draggable={false}
              className="absolute -bottom-3 -left-4 w-12 h-12 pointer-events-none select-none pixelated opacity-50 -rotate-45"
            />

            {/* Сама пиксельная тыква с тёплым хэллоуинским мерцанием свечи */}
            <div className="relative halloween-pumpkin-glow transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-12 cursor-pointer">
              <img
                src="/pixel-pumpkin.png"
                alt="Halloween Jack-o'-lantern"
                draggable={false}
                className="w-20 sm:w-24 h-auto object-contain pixelated pointer-events-none"
                style={{ imageRendering: "pixelated" }}
              />
              {/* Всплывающая подсказка при наведении */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap rounded-md bg-black/90 px-2 py-0.5 text-[10px] text-amber-300 font-minecraft border border-amber-500/40 shadow-lg">
                Счастливого Хэллоуина! 🎃
              </div>
            </div>
          </div>

          {/* Базовый слой страницы (1 в 1 в границах книги) */}
          <div className="absolute inset-0 size-full pointer-events-auto">
            <BookPageContent
              pageNumber={
                flipState
                  ? flipState.direction === "forward"
                    ? flipState.targetPage
                    : flipState.fromPage
                  : currentPage
              }
              totalPages={totalPages}
            />
          </div>

          {/* Верхний перелистывающийся лист с пергаментным фоном и анимацией отсечения */}
          {flipState && (
            <div
              key={`peel-${flipState.id}`}
              className={`absolute inset-0 size-full pointer-events-none overflow-hidden ${
                flipState.direction === "forward" ? "mc-peel-forward" : "mc-peel-backward"
              }`}
              style={{ zIndex: 15 }}
            >
              {/* Пергаментный фон, точно покрывающий бумажный лист в текстуре книги */}
              <div
                className="absolute"
                style={{
                  top: "6.2%",
                  left: "9.6%",
                  right: "8.6%",
                  bottom: "9.8%",
                  background:
                    "linear-gradient(135deg, #fcf4e3 0%, #fffbee 40%, #fcf4e2 75%, #f6ebd2 100%)",
                  boxShadow: "inset 0 0 10px rgba(180, 140, 90, 0.2)",
                }}
              />
              <BookPageContent
                pageNumber={
                  flipState.direction === "forward" ? flipState.fromPage : flipState.targetPage
                }
                totalPages={totalPages}
              />
            </div>
          )}

          {/* 3D-гребень и тень изгиба листа пергамента */}
          {flipState && (
            <div
              className="absolute pointer-events-none overflow-hidden"
              style={{
                top: "6.2%",
                left: "9.6%",
                right: "8.6%",
                bottom: "9.8%",
                zIndex: 25,
              }}
            >
              {/* Мягкая бегущая тень по открывающемуся листу */}
              <div
                key={`shadow-${flipState.id}`}
                className={`absolute top-0 bottom-0 pointer-events-none ${
                  flipState.direction === "forward"
                    ? "mc-curl-shadow-forward"
                    : "mc-curl-shadow-backward"
                }`}
                style={{ width: "24px" }}
              />

              {/* 3D-гребень изгиба перелистываемого листа */}
              <div
                key={`ribbon-${flipState.id}`}
                className={`absolute top-0 bottom-0 pointer-events-none ${
                  flipState.direction === "forward"
                    ? "mc-curl-ribbon-forward"
                    : "mc-curl-ribbon-backward"
                }`}
                style={{ width: "36px" }}
              />
            </div>
          )}

          {/* ── Кнопка стрелки «Назад» (prev page) ───────────────────── */}
          {currentPage > 1 ? (
            <button
              type="button"
              onClick={prevPage}
              onMouseEnter={() => setPrevHover(true)}
              onMouseLeave={() => setPrevHover(false)}
              className="absolute z-30 cursor-pointer outline-none transition-transform active:scale-95 pixelated"
              style={{
                bottom: "7.2%",
                left: "12.7%",
                width: "15.75%", // 23px / 146px
                aspectRatio: "23/13",
              }}
              title="Предыдущая страница (← или A)"
              aria-label="Предыдущая страница"
            >
              <img
                src={prevHover ? "/book-btn-prev-hover.png" : "/book-btn-prev.png"}
                alt="Previous Page"
                draggable={false}
                className="size-full object-fill pixelated"
              />
            </button>
          ) : null}

          {/* ── Кнопка стрелки «Вперёд» (next page) ──────────────────── */}
          {currentPage < totalPages ? (
            <button
              type="button"
              onClick={nextPage}
              onMouseEnter={() => setNextHover(true)}
              onMouseLeave={() => setNextHover(false)}
              className="absolute z-30 cursor-pointer outline-none transition-transform active:scale-95 pixelated"
              style={{
                bottom: "7.2%",
                right: "14.4%",
                width: "15.75%", // 23px / 146px
                aspectRatio: "23/13",
              }}
              title="Следующая страница (→ или D)"
              aria-label="Следующая страница"
            >
              <img
                src={nextHover ? "/book-btn-next-hover.png" : "/book-btn-next.png"}
                alt="Next Page"
                draggable={false}
                className="size-full object-fill pixelated"
              />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
