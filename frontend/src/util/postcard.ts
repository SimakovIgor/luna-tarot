/**
 * Генерация шеринговой открытки PNG из расклада.
 * Композиция: лого Luna + N карт + цитата + бренд-плашка.
 * Размер 1080×1350 (Instagram portrait / TG Stories friendly).
 *
 * Layout карт адаптируется под количество:
 *   1-3 карты: одна строка крупных
 *   4-6 карт:  одна строка средних
 *   7-12 карт: две строки маленьких
 */

import type { Reading } from '@/api/reading';
import { cardImageUrl } from '@/api/reading';
import { extractFirstSentence } from './text';

const W = 1080;
const H = 1350;
const FALLBACK_LABELS = ['ПРОШЛОЕ', 'НАСТОЯЩЕЕ', 'ГРЯДУЩЕЕ'];

const PALETTE = {
  bgTop: '#1c0d33',
  bgBottom: '#08050f',
  ink: '#ede0c4',
  inkDim: '#8a7c5e',
  goldWarm: '#d9b876',
  gold: '#c9a14a',
  goldDeep: '#8a6a2f',
};

interface CardSlot {
  x: number;
  y: number;
  w: number;
  h: number;
}

export async function generatePostcard(reading: Reading, positionLabels?: string[]): Promise<Blob> {
  await waitForFonts();

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');

  // Фон
  const grad = ctx.createRadialGradient(W / 2, H * 0.2, 0, W / 2, H * 0.2, H * 0.9);
  grad.addColorStop(0, PALETTE.bgTop);
  grad.addColorStop(1, PALETTE.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  drawStars(ctx);

  // Лого "Luna"
  ctx.fillStyle = PALETTE.goldWarm;
  ctx.font = '200px "UnifrakturMaguntia", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(201,161,74,0.45)';
  ctx.shadowBlur = 30;
  ctx.fillText('Luna', W / 2, 90);
  ctx.shadowBlur = 0;

  ctx.font = '26px "Cinzel", serif';
  ctx.fillStyle = PALETTE.inkDim;
  drawSpacedText(ctx, 'ЗЕРКАЛО ТАРО', W / 2, 290, 26, 8);

  drawOrnamentDivider(ctx, W / 2, 370, 260);

  // Карты — адаптивный layout
  const cardSlots = layoutCards(reading.cards.length, 440);
  const cardImages = await Promise.all(
    reading.cards.map((c) => loadImage(cardImageUrl(c.card) ?? '')),
  );
  const labels = positionLabels ?? FALLBACK_LABELS;

  let lastCardBottomY = 440;
  for (let i = 0; i < reading.cards.length; i++) {
    const slot = cardSlots[i];
    const rc = reading.cards[i];
    drawCardFrame(ctx, slot.x, slot.y, slot.w, slot.h);
    const img = cardImages[i];
    if (img) {
      ctx.save();
      roundedRectPath(ctx, slot.x + 4, slot.y + 4, slot.w - 8, slot.h - 8, 12);
      ctx.clip();
      if (rc.reversed) {
        ctx.translate(slot.x + slot.w / 2, slot.y + slot.h / 2);
        ctx.rotate(Math.PI);
        ctx.drawImage(img, -slot.w / 2 + 4, -slot.h / 2 + 4, slot.w - 8, slot.h - 8);
      } else {
        ctx.drawImage(img, slot.x + 4, slot.y + 4, slot.w - 8, slot.h - 8);
      }
      ctx.restore();
    }
    // Подпись позиции — только для не слишком плотных раскладов
    const showLabel = reading.cards.length <= 6;
    if (showLabel) {
      ctx.font = '18px "Cinzel", serif';
      ctx.fillStyle = PALETTE.gold;
      const labelText = (labels[i] ?? `${i + 1}`).toUpperCase();
      drawSpacedText(ctx, labelText, slot.x + slot.w / 2, slot.y + slot.h + 16, 18, 4);
    }
    lastCardBottomY = Math.max(lastCardBottomY, slot.y + slot.h + (showLabel ? 50 : 12));
  }

  // Цитата
  const quote = extractFirstSentence(reading.interpretation || '');
  const quoteTrimmed = quote.length > 140 ? quote.slice(0, 137).trimEnd() + '…' : quote;
  ctx.font = 'italic 30px "Cormorant Garamond", serif';
  ctx.fillStyle = PALETTE.inkDim;
  wrapText(ctx, '«' + quoteTrimmed + '»', W / 2, lastCardBottomY + 50, W - 120, 42);

  // Бренд снизу
  ctx.font = '22px "Cinzel", serif';
  ctx.fillStyle = PALETTE.gold;
  drawSpacedText(ctx, 'T.ME/LUNA_TARO_CARD_BOT', W / 2, H - 70, 22, 5);

  return canvasToBlob(canvas);
}

/**
 * Открытка совместимости: два знака зодиака, % посередине, цитата, бренд.
 * Используется в шеринге с CompatibilityPage. Размер тот же 1080×1350.
 */
export interface CompatibilityPostcardInput {
  /** Глифы или короткие подписи (Овен, Скорпион…). */
  mySign: string;
  mySymbol: string;
  partnerSign: string;
  partnerSymbol: string;
  partnerName: string;
  /** 1..100. */
  score: number;
  /** Текст для цитаты (первое предложение или короткая выжимка). */
  caption: string;
}

export async function generateCompatibilityPostcard(input: CompatibilityPostcardInput): Promise<Blob> {
  await waitForFonts();

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');

  // Фон — тот же, что и в основной открытке.
  const grad = ctx.createRadialGradient(W / 2, H * 0.2, 0, W / 2, H * 0.2, H * 0.9);
  grad.addColorStop(0, PALETTE.bgTop);
  grad.addColorStop(1, PALETTE.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  drawStars(ctx);

  // Лого
  ctx.fillStyle = PALETTE.goldWarm;
  ctx.font = '200px "UnifrakturMaguntia", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(201,161,74,0.45)';
  ctx.shadowBlur = 30;
  ctx.fillText('Luna', W / 2, 90);
  ctx.shadowBlur = 0;

  ctx.font = '26px "Cinzel", serif';
  ctx.fillStyle = PALETTE.inkDim;
  drawSpacedText(ctx, 'СОВМЕСТИМОСТЬ', W / 2, 290, 26, 8);
  drawOrnamentDivider(ctx, W / 2, 370, 260);

  // Два круга-знака + процент посередине
  const ringY = 600;
  const ringRadius = 130;
  const leftCx = W / 2 - 220;
  const rightCx = W / 2 + 220;
  drawZodiacRing(ctx, leftCx, ringY, ringRadius, input.mySymbol, input.mySign);
  drawZodiacRing(ctx, rightCx, ringY, ringRadius, input.partnerSymbol, input.partnerSign);

  // Соединительная линия между кругами
  ctx.save();
  ctx.strokeStyle = 'rgba(201,161,74,0.45)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(leftCx + ringRadius, ringY);
  ctx.lineTo(rightCx - ringRadius, ringY);
  ctx.stroke();
  ctx.restore();

  // Большое % в середине шкалы
  const scoreClamped = Math.max(1, Math.min(100, Math.round(input.score)));
  ctx.font = 'bold 86px "Cormorant Garamond", serif';
  ctx.fillStyle = PALETTE.goldWarm;
  ctx.shadowColor = 'rgba(201,161,74,0.55)';
  ctx.shadowBlur = 28;
  ctx.textBaseline = 'middle';
  ctx.fillText(`${scoreClamped}%`, W / 2, ringY);
  ctx.shadowBlur = 0;
  ctx.textBaseline = 'top';

  // Имя партнёра — небольшая строка над зоной цитаты
  ctx.font = 'italic 32px "Cormorant Garamond", serif';
  ctx.fillStyle = PALETTE.inkDim;
  ctx.fillText('с ' + input.partnerName, W / 2, ringY + ringRadius + 80);

  // Цитата
  const captionRaw = input.caption || '';
  const captionTrim = captionRaw.length > 140
    ? captionRaw.slice(0, 137).trimEnd() + '…'
    : captionRaw;
  if (captionTrim) {
    ctx.font = 'italic 30px "Cormorant Garamond", serif';
    ctx.fillStyle = PALETTE.inkDim;
    wrapText(ctx, '«' + captionTrim + '»', W / 2, ringY + ringRadius + 160, W - 160, 42);
  }

  // Бренд снизу
  ctx.font = '22px "Cinzel", serif';
  ctx.fillStyle = PALETTE.gold;
  drawSpacedText(ctx, 'T.ME/LUNA_TARO_CARD_BOT', W / 2, H - 70, 22, 5);

  return canvasToBlob(canvas);
}

function drawZodiacRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  symbol: string,
  label: string,
) {
  ctx.save();
  // Тёмный круг с золотой обводкой.
  ctx.fillStyle = 'rgba(15, 8, 30, 0.85)';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 26;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(201,161,74,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  // Внутренний пунктир для декора.
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = 'rgba(201,161,74,0.3)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // Глиф зодиака.
  ctx.fillStyle = PALETTE.goldWarm;
  ctx.font = '110px "Cormorant Garamond", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(201,161,74,0.6)';
  ctx.shadowBlur = 18;
  ctx.fillText(symbol, cx, cy - 8);
  ctx.shadowBlur = 0;
  ctx.restore();
  // Подпись имени знака под кругом.
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '24px "Cinzel", serif';
  ctx.textBaseline = 'top';
  drawSpacedText(ctx, label.toUpperCase(), cx, cy + radius + 18, 24, 4);
}

/** Раскладка слотов для N карт. Возвращает координаты в исходной системе 1080×1350. */
function layoutCards(count: number, startY: number): CardSlot[] {
  if (count <= 3) {
    const cardW = 240;
    const cardH = 384;
    const gap = 30;
    const totalW = cardW * count + gap * (count - 1);
    const startX = (W - totalW) / 2;
    return Array.from({ length: count }, (_, i) => ({
      x: startX + i * (cardW + gap),
      y: startY,
      w: cardW,
      h: cardH,
    }));
  }
  if (count <= 6) {
    const cardW = 150;
    const cardH = 240;
    const gap = 22;
    const totalW = cardW * count + gap * (count - 1);
    const startX = Math.max(60, (W - totalW) / 2);
    return Array.from({ length: count }, (_, i) => ({
      x: startX + i * (cardW + gap),
      y: startY + 80,
      w: cardW,
      h: cardH,
    }));
  }
  // 7-12: две строки
  const perRow = Math.ceil(count / 2);
  const cardW = 130;
  const cardH = 208;
  const gap = 14;
  const totalW = cardW * perRow + gap * (perRow - 1);
  const startX = Math.max(40, (W - totalW) / 2);
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    return {
      x: startX + col * (cardW + gap),
      y: startY + 40 + row * (cardH + 36),
      w: cardW,
      h: cardH,
    };
  });
}

interface ShareOptions {
  fileName?: string;
  /** Заголовок share-листа (показывают не все приложения). */
  title?: string;
  /** Тело сообщения. URL добавь сюда же отдельной строкой — НЕ передавай в `url`,
   *  иначе Telegram/iOS-share выбирают между файлом и ссылкой и теряют картинку. */
  text?: string;
  /** Ссылка, которая будет дописана к {@link text} новой строкой. Сохранять
   *  отдельным аргументом ради читаемости callsite — внутри всё равно склеиваем. */
  url?: string;
}

export type ShareResult = 'shared' | 'shared-link' | 'downloaded';

export async function sharePostcard(
  blob: Blob,
  options: ShareOptions = {}
): Promise<ShareResult> {
  const fileName = options.fileName ?? 'luna-tarot.png';
  const file = new File([blob], fileName, { type: 'image/png' });
  const nav = navigator as Navigator & {
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data: ShareData) => boolean;
  };
  // Склеиваем text + url в одну подпись. Передавать `url` отдельным полем
  // вместе с `files` — плохая идея: на iOS / в Telegram WebView приложение
  // часто берёт только что-то одно и в нашем случае съедало картинку.
  const baseText = options.text ?? 'Заглянул в Зеркало Луны — вот что увидел.';
  const fullText = options.url ? `${baseText}\n${options.url}` : baseText;

  // Главный путь: системный navigator.share с файлом. В свежем Telegram WebView
  // (iOS/Android) он работает и доставляет картинку с подписью — а это
  // именно то, что просит пользователь. Никаких прокси через t.me/share/url:
  // открытка важнее, без неё шаринг теряет смысл.
  const shareData: ShareData = {
    files: [file],
    title: options.title ?? 'Luna · мой расклад',
    text: fullText,
  };
  if (nav.share && nav.canShare && nav.canShare(shareData)) {
    try {
      await nav.share(shareData);
      return 'shared';
    } catch (e) {
      const err = e as { name?: string };
      if (err.name === 'AbortError') return 'shared';
      // Иначе провалимся в скачивание ниже.
    }
  }

  // Фолбэк — скачивание/превью. На десктопе скачается реально; в очень старом
  // TG WebView откроется inline-превью с «Закрыть». Это не идеально, но
  // пользователь хотя бы получит картинку, которую сможет переслать вручную.
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 0);
  return 'downloaded';
}

// ── helpers ───────────────────────────────────────────────────

function waitForFonts(): Promise<void> {
  if (!document.fonts || !document.fonts.ready) return Promise.resolve();
  return document.fonts.ready.then(() => undefined);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
      'image/png',
    );
  });
}

function drawStars(ctx: CanvasRenderingContext2D) {
  const rng = (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  };
  const r = rng(42);
  ctx.fillStyle = 'rgba(255,236,200,.55)';
  for (let i = 0; i < 80; i++) {
    const x = r() * W;
    const y = r() * H;
    const radius = r() * 1.6 + 0.4;
    const op = 0.25 + r() * 0.6;
    ctx.globalAlpha = op;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  _fontSize: number,
  letterSpacing: number,
) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + letterSpacing * (text.length - 1);
  let x = cx - total / 2;
  ctx.textAlign = 'left';
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], x, y);
    x += widths[i] + letterSpacing;
  }
  ctx.textAlign = 'center';
}

function drawOrnamentDivider(ctx: CanvasRenderingContext2D, cx: number, y: number, width: number) {
  const half = width / 2;
  const lg = ctx.createLinearGradient(cx - half, y, cx, y);
  lg.addColorStop(0, 'rgba(138,106,47,0)');
  lg.addColorStop(1, PALETTE.goldDeep);
  ctx.strokeStyle = lg;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - half, y);
  ctx.lineTo(cx - 24, y);
  ctx.stroke();
  const rg = ctx.createLinearGradient(cx, y, cx + half, y);
  rg.addColorStop(0, PALETTE.goldDeep);
  rg.addColorStop(1, 'rgba(138,106,47,0)');
  ctx.strokeStyle = rg;
  ctx.beginPath();
  ctx.moveTo(cx + 24, y);
  ctx.lineTo(cx + half, y);
  ctx.stroke();
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '24px "Cinzel", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦', cx, y);
  ctx.textBaseline = 'top';
}

function drawCardFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#0a0613';
  roundedRectPath(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(201,161,74,0.35)';
  ctx.lineWidth = 2;
  roundedRectPath(ctx, x, y, w, h, 14);
  ctx.stroke();
  ctx.restore();
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  ctx.textAlign = 'center';
  lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineHeight));
}
