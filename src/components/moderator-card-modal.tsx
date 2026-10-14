import { useEffect, useRef, useState } from "react";
import { Download, Copy, Check, Loader2, Sparkles, X, Share2, Shield, Flame } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ModRow } from "@/lib/types";
import { RANK_TITLE } from "@/lib/constants";

export function ModeratorCardModal({
  open,
  onClose,
  m,
  monthName,
}: {
  open: boolean;
  onClose: () => void;
  m: ModRow & {
    allTimeTotal?: number;
    allTimeBans?: number;
    allTimeMutes?: number;
    weekTotal?: number;
  };
  monthName: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [generating, setGenerating] = useState(true);

  const rankText = (m.rank ? RANK_TITLE[m.rank] : null) || "Модератор";

  useEffect(() => {
    if (!open) return;
    setGenerating(true);

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Load avatar if available, otherwise draw initials
    const avatarImg = new Image();
    avatarImg.crossOrigin = "anonymous";
    avatarImg.onload = () => drawCard(ctx, canvas, avatarImg);
    avatarImg.onerror = () => drawCard(ctx, canvas, null);

    if (m.avatar) {
      avatarImg.src = m.avatar;
    } else {
      drawCard(ctx, canvas, null);
    }

    function drawCard(c: CanvasRenderingContext2D, cvs: HTMLCanvasElement, img: HTMLImageElement | null) {
      // 1. Background
      const bgGrad = c.createLinearGradient(0, 0, 1200, 675);
      bgGrad.addColorStop(0, "#08090d");
      bgGrad.addColorStop(0.5, "#0e1017");
      bgGrad.addColorStop(1, "#090a0f");
      c.fillStyle = bgGrad;
      c.fillRect(0, 0, 1200, 675);

      // Subtle cyber grid
      c.strokeStyle = "rgba(255, 255, 255, 0.025)";
      c.lineWidth = 1;
      const gridSize = 45;
      for (let x = 0; x < 1200; x += gridSize) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, 675);
        c.stroke();
      }
      for (let y = 0; y < 675; y += gridSize) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(1200, y);
        c.stroke();
      }

      // Ambient glows (accent gold & blue)
      const glow1 = c.createRadialGradient(200, 150, 20, 200, 150, 450);
      glow1.addColorStop(0, "rgba(234, 179, 8, 0.12)");
      glow1.addColorStop(1, "rgba(234, 179, 8, 0)");
      c.fillStyle = glow1;
      c.fillRect(0, 0, 1200, 675);

      const glow2 = c.createRadialGradient(1000, 500, 20, 1000, 500, 400);
      glow2.addColorStop(0, "rgba(59, 130, 246, 0.1)");
      glow2.addColorStop(1, "rgba(59, 130, 246, 0)");
      c.fillStyle = glow2;
      c.fillRect(0, 0, 1200, 675);

      // Decorative outer border
      c.strokeStyle = "rgba(255, 255, 255, 0.1)";
      c.lineWidth = 1.5;
      c.strokeRect(30, 30, 1140, 615);

      // Corner accent brackets
      const cornerLen = 30;
      c.strokeStyle = "#eab308";
      c.lineWidth = 4;
      // Top-left
      c.beginPath();
      c.moveTo(30, 30 + cornerLen);
      c.lineTo(30, 30);
      c.lineTo(30 + cornerLen, 30);
      c.stroke();
      // Top-right
      c.beginPath();
      c.moveTo(1170 - cornerLen, 30);
      c.lineTo(1170, 30);
      c.lineTo(1170, 30 + cornerLen);
      c.stroke();
      // Bottom-left
      c.beginPath();
      c.moveTo(30, 645 - cornerLen);
      c.lineTo(30, 645);
      c.lineTo(30 + cornerLen, 645);
      c.stroke();
      // Bottom-right
      c.beginPath();
      c.moveTo(1170 - cornerLen, 645);
      c.lineTo(1170, 645);
      c.lineTo(1170, 645 - cornerLen);
      c.stroke();

      // Top brand header
      c.fillStyle = "#eab308";
      c.font = "900 14px sans-serif";
      c.letterSpacing = "4px";
      c.fillText("FEARASSIST • FEARPROJECT CS2", 60, 72);

      c.fillStyle = "rgba(255, 255, 255, 0.4)";
      c.font = "bold 12px sans-serif";
      c.letterSpacing = "2px";
      c.textAlign = "right";
      c.fillText(`ОФИЦИАЛЬНАЯ КАРТОЧКА СОСТАВА • ${monthName.toUpperCase()}`, 1140, 72);
      c.textAlign = "left";

      c.strokeStyle = "rgba(255, 255, 255, 0.08)";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(60, 92);
      c.lineTo(1140, 92);
      c.stroke();

      // 2. Left side: Avatar & Info
      const avX = 80;
      const avY = 140;
      const avSize = 170;

      // Avatar glow ring
      c.save();
      c.beginPath();
      c.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2 + 5, 0, Math.PI * 2);
      c.strokeStyle = "#eab308";
      c.lineWidth = 3;
      c.shadowColor = "#eab308";
      c.shadowBlur = 18;
      c.stroke();
      c.restore();

      // Avatar clipping
      c.save();
      c.beginPath();
      c.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
      c.clip();

      if (img) {
        c.drawImage(img, avX, avY, avSize, avSize);
      } else {
        c.fillStyle = "#1c1e28";
        c.fillRect(avX, avY, avSize, avSize);
        c.fillStyle = "#eab308";
        c.font = "900 64px sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText((m.name.charAt(0) || "?").toUpperCase(), avX + avSize / 2, avY + avSize / 2);
      }
      c.restore();

      // Info block under avatar
      const infoX = 280;
      let textY = 175;

      // Moderator name
      c.fillStyle = "#ffffff";
      c.font = "900 38px sans-serif";
      c.letterSpacing = "0px";
      c.fillText(m.name, infoX, textY);

      // Rank pill
      textY += 42;
      c.font = "900 13px sans-serif";
      c.letterSpacing = "1.5px";
      const rankBadgeWidth = c.measureText(rankText.toUpperCase()).width + 36;
      c.fillStyle = "rgba(234, 179, 8, 0.15)";
      c.strokeStyle = "rgba(234, 179, 8, 0.4)";
      c.lineWidth = 1.5;
      c.beginPath();
      c.roundRect(infoX, textY - 22, rankBadgeWidth, 32, 10);
      c.fill();
      c.stroke();

      c.fillStyle = "#eab308";
      c.fillText(rankText.toUpperCase(), infoX + 18, textY);

      // SteamID / Details
      textY += 45;
      c.fillStyle = "rgba(255, 255, 255, 0.45)";
      c.font = "bold 13px monospace";
      c.fillText(`SteamID: ${m.steamid}`, infoX, textY);

      if (m.discord) {
        textY += 24;
        c.fillText(`Discord: @${m.discord}`, infoX, textY);
      }

      // 3. Stats Grid (Tiles)
      const gridLeft = 650;
      const tileW = 225;
      const tileH = 105;
      const gap = 20;

      const tiles = [
        { label: "БАНЫ", value: m.bans, icon: "🔨", color: "#f87171" },
        { label: "МУТЫ", value: m.mutes, icon: "🔇", color: "#fbbf24" },
        { label: "ДЕЙСТВИЯ (НЕДЕЛЯ)", value: m.weekTotal ?? 0, icon: "⚡", color: "#60a5fa" },
        {
          label: "ДЕЙСТВИЯ (МЕСЯЦ)",
          value: m.total,
          icon: "🔥",
          color: "#a78bfa",
        },
      ];

      tiles.forEach((t, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const tx = gridLeft + col * (tileW + gap);
        const ty = 140 + row * (tileH + gap);

        // Tile bg
        c.fillStyle = "rgba(255, 255, 255, 0.035)";
        c.strokeStyle = "rgba(255, 255, 255, 0.08)";
        c.lineWidth = 1;
        c.beginPath();
        c.roundRect(tx, ty, tileW, tileH, 16);
        c.fill();
        c.stroke();

        // Tile Accent line
        c.fillStyle = t.color;
        c.beginPath();
        c.roundRect(tx + 16, ty + 18, 4, 16, 2);
        c.fill();

        // Label
        c.fillStyle = "rgba(255, 255, 255, 0.45)";
        c.font = "bold 10px sans-serif";
        c.letterSpacing = "1px";
        c.fillText(t.label, tx + 28, ty + 30);

        // Value
        c.fillStyle = "#ffffff";
        c.font = "900 36px monospace";
        c.letterSpacing = "-1px";
        c.fillText(String(t.value), tx + 20, ty + 80);

        // Emoji icon
        c.font = "20px sans-serif";
        c.textAlign = "right";
        c.fillText(t.icon, tx + tileW - 16, ty + 35);
        c.textAlign = "left";
      });

      // 4. Monthly Norma Progress Bar
      const normY = 410;
      const normW = 1060;
      const targetNorm = m.norma?.month || 50;
      const pct = Math.min(Math.round((m.total / targetNorm) * 100), 200);
      const isDone = m.total >= targetNorm;

      c.fillStyle = "rgba(255, 255, 255, 0.035)";
      c.strokeStyle = "rgba(255, 255, 255, 0.08)";
      c.lineWidth = 1;
      c.beginPath();
      c.roundRect(80, normY, normW, 130, 20);
      c.fill();
      c.stroke();

      // Norma Header
      c.fillStyle = "#ffffff";
      c.font = "900 15px sans-serif";
      c.letterSpacing = "0.5px";
      c.fillText("ВЫПОЛНЕНИЕ МЕСЯЧНОЙ НОРМЫ", 110, normY + 38);

      // Norma status pill
      c.textAlign = "right";
      c.font = "900 14px sans-serif";
      if (isDone) {
        c.fillStyle = "#4ade80";
        c.fillText(`✓ НОРМА ЗАКРЫТА (${pct}%) • ${m.total} / ${targetNorm}`, 110 + normW - 60, normY + 38);
      } else {
        c.fillStyle = "#fbbf24";
        c.fillText(`В ПРОЦЕССЕ (${pct}%) • ${m.total} / ${targetNorm}`, 110 + normW - 60, normY + 38);
      }
      c.textAlign = "left";

      // Progress bar track
      const barX = 110;
      const barY = normY + 62;
      const barW = normW - 60;
      const barH = 20;

      c.fillStyle = "rgba(0, 0, 0, 0.5)";
      c.beginPath();
      c.roundRect(barX, barY, barW, barH, 10);
      c.fill();

      // Progress fill
      const fillW = Math.max(Math.min((m.total / targetNorm) * barW, barW), 14);
      const pGrad = c.createLinearGradient(barX, 0, barX + fillW, 0);
      if (isDone) {
        pGrad.addColorStop(0, "#22c55e");
        pGrad.addColorStop(1, "#4ade80");
      } else {
        pGrad.addColorStop(0, "#eab308");
        pGrad.addColorStop(1, "#f59e0b");
      }
      c.fillStyle = pGrad;
      c.beginPath();
      c.roundRect(barX, barY, fillW, barH, 10);
      c.fill();

      // Norma text hint
      c.fillStyle = "rgba(255, 255, 255, 0.4)";
      c.font = "bold 11px sans-serif";
      const hint = isDone
        ? `Отличная работа! Превышение нормы на ${m.total - targetNorm} действий.`
        : `До выполнения нормы осталось ${targetNorm - m.total} действий.`;
      c.fillText(hint, 110, normY + 105);

      // 5. Footer Watermark
      c.fillStyle = "rgba(255, 255, 255, 0.25)";
      c.font = "bold 11px monospace";
      c.fillText("FEARASSIST.ONLINE", 80, 615);

      c.textAlign = "right";
      c.fillText("OFFICIAL VERIFIED BADGE 🛡️", 1120, 615);
      c.textAlign = "left";

      // Convert to blob and DataURL
      const url = cvs.toDataURL("image/png");
      setDataUrl(url);
      cvs.toBlob((b) => {
        setBlob(b);
        setGenerating(false);
      }, "image/png");
    }
  }, [open, m, monthName, rankText]);

  async function handleDownload() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `fearassist-${m.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Карточка успешно скачана!");
  }

  async function handleCopyImage() {
    if (!blob) return;
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard && navigator.clipboard.write) {
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2000);
        toast.success("Карточка скопирована в буфер обмена! Вставьте её (Ctrl+V) в Discord или Telegram.");
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  }

  function handleCopyDiscordText() {
    const text =
      `🛡️ **FearProject CS2 — Карточка модератора**\n` +
      `👤 **Никнейм:** ${m.name}\n` +
      `🎖️ **Ранг:** ${rankText}\n` +
      `⚡ **Действий за ${monthName}:** ${m.total} (🔨 Баны: ${m.bans} | 🔇 Муты: ${m.mutes})\n` +
      `🎯 **Норма:** ${m.norma?.month ? `${Math.round((m.total / m.norma.month) * 100)}% (${m.total}/${m.norma.month})` : "Без нормы"}\n` +
      `🌐 **Панель:** https://fearassist.online`;

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    toast.success("Текст для Discord скопирован!");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative my-8 w-full max-w-4xl rounded-3xl border border-border/80 bg-surface/95 p-6 shadow-2xl glass-panel space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-accent/20 border border-accent/40 text-accent shadow-sm">
              <Share2 className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-fg flex items-center gap-2">
                Карточка модератора {m.name}
                <Sparkles className="size-4 text-accent animate-pulse" />
              </h2>
              <p className="text-xs text-muted">
                Графический профиль для Discord, Steam или соцсетей в ультра-качестве (1200×675)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted hover:bg-elevated hover:text-fg transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Card Preview */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-black shadow-inner flex items-center justify-center aspect-[16/9]">
          {generating ? (
            <div className="flex flex-col items-center gap-3 text-muted">
              <Loader2 className="size-8 animate-spin text-accent" />
              <p className="text-xs font-bold">Генерация карточки в высоком разрешении...</p>
            </div>
          ) : dataUrl ? (
            <img src={dataUrl} alt={`Карточка ${m.name}`} className="w-full h-full object-contain" />
          ) : null}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyDiscordText}
              className="h-10 rounded-xl gap-2 text-xs font-bold border-border/80 bg-elevated/70 text-fg hover:border-accent"
            >
              {copiedText ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
              <span>{copiedText ? "Текст скопирован!" : "Скопировать текст для Discord"}</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={generating || !blob}
              onClick={handleCopyImage}
              className="h-10 rounded-xl gap-2 text-xs font-bold border-border/80 bg-elevated/90 text-fg hover:border-accent"
            >
              {copiedImage ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
              <span>{copiedImage ? "Картинка в буфере!" : "Скопировать картинку"}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={generating || !dataUrl}
              onClick={handleDownload}
              className="h-10 rounded-xl gap-2 text-xs font-black bg-accent hover:bg-accent/90 text-accent-fg shadow-lg shadow-accent/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="size-4" />
              <span>Скачать PNG</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
