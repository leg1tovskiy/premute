import fs from "node:fs";
import { Resvg } from "@resvg/resvg-js";

// Read ghost logo as base64
const logoBase64 = fs.readFileSync("public/logo.png").toString("base64");

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0d14"/>
      <stop offset="50%" stop-color="#0f121d"/>
      <stop offset="100%" stop-color="#141824"/>
    </linearGradient>

    <!-- Neon Cyan / Indigo Glow Radial -->
    <radialGradient id="cyanGlow" cx="30%" cy="50%" r="45%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.25"/>
      <stop offset="60%" stop-color="#6366f1" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#0b0d14" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="purpleGlow" cx="80%" cy="30%" r="40%">
      <stop offset="0%" stop-color="#818cf8" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#0b0d14" stop-opacity="0"/>
    </radialGradient>

    <!-- Text Gradient -->
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>

    <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>

    <!-- Grid pattern -->
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#38bdf8" stroke-width="0.75" stroke-opacity="0.05"/>
    </pattern>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="15" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)"/>
  <rect width="1200" height="630" fill="url(#cyanGlow)"/>
  <rect width="1200" height="630" fill="url(#purpleGlow)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>

  <!-- Sleek Outer Border -->
  <rect x="24" y="24" width="1152" height="582" rx="28" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.25"/>
  <rect x="25" y="25" width="1150" height="580" rx="27" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.05"/>

  <!-- Corner Tech Accent Marks -->
  <path d="M 40 70 L 40 40 L 70 40" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-opacity="0.8"/>
  <path d="M 1160 70 L 1160 40 L 1130 40" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-opacity="0.8"/>
  <path d="M 40 560 L 40 590 L 70 590" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-opacity="0.8"/>
  <path d="M 1160 560 L 1160 590 L 1130 590" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-opacity="0.8"/>

  <!-- Left: Ghost Logo with Aura Halo -->
  <circle cx="270" cy="315" r="170" fill="#38bdf8" fill-opacity="0.12" filter="url(#glow)"/>
  <image href="data:image/png;base64,${logoBase64}" x="120" y="165" width="300" height="300"/>

  <!-- Right: Content Block -->
  <!-- Top Pill Badge: Online Status -->
  <g transform="translate(480, 160)">
    <rect width="210" height="36" rx="18" fill="#1e293b" fill-opacity="0.8" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.4"/>
    <circle cx="20" cy="18" r="5" fill="#22c55e" filter="url(#glow)"/>
    <text x="36" y="23" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="#38bdf8" letter-spacing="2">FEARPROJECT.RU</text>
  </g>

  <!-- Big Title: FEARASSIST -->
  <text x="480" y="275" font-family="system-ui, -apple-system, sans-serif" font-size="78" font-weight="900" fill="url(#textGrad)" letter-spacing="4">
    FEARASSIST
  </text>

  <!-- Subtitle -->
  <text x="482" y="325" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700" fill="#94a3b8" letter-spacing="1.5">
    ЕДИНАЯ ПАНЕЛЬ МОДЕРАЦИИ И СТАТИСТИКИ
  </text>

  <!-- Feature Pills / Badges -->
  <g transform="translate(480, 375)">
    <!-- Badge 1: Модерация -->
    <g transform="translate(0, 0)">
      <rect width="145" height="42" rx="12" fill="#131926" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.3"/>
      <text x="72" y="26" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700" fill="#e2e8f0">🛡 Модерация</text>
    </g>

    <!-- Badge 2: Статистика -->
    <g transform="translate(160, 0)">
      <rect width="150" height="42" rx="12" fill="#131926" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.3"/>
      <text x="75" y="26" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700" fill="#e2e8f0">📊 Статистика</text>
    </g>

    <!-- Badge 3: Игроки -->
    <g transform="translate(325, 0)">
      <rect width="130" height="42" rx="12" fill="#131926" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.3"/>
      <text x="65" y="26" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700" fill="#e2e8f0">👥 Игроки</text>
    </g>

    <!-- Badge 4: Логи -->
    <g transform="translate(470, 0)">
      <rect width="140" height="42" rx="12" fill="#131926" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.3"/>
      <text x="70" y="26" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700" fill="#e2e8f0">📑 Аудит логов</text>
    </g>
  </g>

  <!-- Bottom Info line -->
  <g transform="translate(480, 465)">
    <line x1="0" y1="0" x2="620" y2="0" stroke="#334155" stroke-width="1" stroke-opacity="0.6"/>
    <text x="0" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#64748b" letter-spacing="1">
      fearassist.online • Управление составом и контроль порядка серверов
    </text>
  </g>
</svg>
`;

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
});
const pngData = resvg.render();
const pngBuffer = pngData.asPng();

fs.writeFileSync("public/og-image.png", pngBuffer);
console.log("Successfully generated public/og-image.png! Size:", pngBuffer.length, "bytes");
