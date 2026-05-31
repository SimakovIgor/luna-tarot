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
import { CONSTELLATIONS } from '@/zodiac/constellations';
import type { ZodiacSign } from '@/api/horoscope';

// 9:16 — соотношение Instagram/Telegram Stories. Совпадает с шейр-открыткой
// из дизайн-handoff (320×569).
const W = 1080;
const H = 1920;
const LOGO_URL = '/app/luna-logo.png';
// PNG логотипа ~1181×1181 (квадратный). Размещаем 380×380 по центру.
const LOGO_W = 380;
const LOGO_H = 380;
const LOGO_Y = 50;
const FALLBACK_LABELS = ['ПРОШЛОЕ', 'НАСТОЯЩЕЕ', 'ГРЯДУЩЕЕ'];

const PALETTE = {
  bgTop: '#2a1d52',
  bgBottom: '#0a0618',
  ink: '#ece6f5',
  inkDim: 'rgba(236,230,245,.55)',
  inkFaint: 'rgba(236,230,245,.32)',
  goldWarm: '#d9b878',
  goldHi: '#f2dca0',
  gold: '#d9b878',
  goldDim: 'rgba(217,184,120,.55)',
  goldFaint: 'rgba(217,184,120,.30)',
  goldDeep: '#8a6a2f',
};

interface CardSlot {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Шеринг-открытка расклада по дизайну ShareCardImproved из handoff'а.
 * Принцип «curiosity gap»: показываем карты + ОДНУ острую фразу-крючок,
 * остальное прячем за плашкой «🔒 Луна сказала кое-что ещё…» — друг идёт
 * за полным разбором в бот.
 */
export async function generatePostcard(reading: Reading, positionLabels?: string[]): Promise<Blob> {
  await waitForFonts();

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');

  drawPostcardBackground(ctx);

  // Лого Luna — единый PNG из Mini App.
  await drawLogoHeader(ctx);

  ctx.font = '600 32px "Cormorant Garamond", serif';
  ctx.fillStyle = PALETTE.goldDim;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  drawSpacedText(ctx, 'ЛУНА · ТАРО', W / 2, 450, 32, 10);

  // ─── Карты + подписи позиций ───────────────────────────────
  const cardsStartY = 560;
  const cardSlots = layoutCards(reading.cards.length, cardsStartY);
  const cardImages = await Promise.all(
    reading.cards.map((c) => loadImage(cardImageUrl(c.card) ?? '')),
  );
  const labels = positionLabels ?? FALLBACK_LABELS;

  let lastCardBottomY = cardsStartY;
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
    lastCardBottomY = Math.max(lastCardBottomY, slot.y + slot.h);
  }

  // Подписи позиций под картами (только для коротких раскладов).
  const showLabels = reading.cards.length <= 6;
  if (showLabels) {
    ctx.font = '500 26px "Cormorant Garamond", serif';
    ctx.fillStyle = PALETTE.goldDim;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i < reading.cards.length; i++) {
      const slot = cardSlots[i];
      const labelText = (labels[i] ?? `${i + 1}`).toUpperCase();
      drawSpacedText(ctx, labelText, slot.x + slot.w / 2, slot.y + slot.h + 26, 26, 4);
    }
    lastCardBottomY += 70;
  }

  // ─── HOOK — острая цитата (первое предложение) ──────────────
  // По дизайну ShareCardImproved это «THE HOOK» в goldHi 21px Cormorant,
  // с text-shadow. Здесь рисуем поярче, кавычки «...».
  const quote = extractFirstSentence(reading.interpretation || '');
  const quoteTrimmed = quote.length > 110 ? quote.slice(0, 107).trimEnd() + '…' : quote;
  const hookY = lastCardBottomY + 70;
  ctx.save();
  ctx.shadowColor = 'rgba(217,184,120,.35)';
  ctx.shadowBlur = 24;
  ctx.font = '500 56px "Cormorant Garamond", serif';
  ctx.fillStyle = PALETTE.goldHi;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const hookLines = wrapText(ctx, '«' + quoteTrimmed + '»', W / 2, hookY, W - 200, 72);
  ctx.restore();
  const hookBottomY = hookY + Math.max(2, hookLines) * 72;

  // ─── 🔒 Locked teaser pill ─────────────────────────────────
  const teaserText = 'Луна сказала кое-что ещё…';
  const teaserY = hookBottomY + 30;
  drawPill(ctx, W / 2, teaserY, {
    text: '🔒  ' + teaserText,
    font: '500 30px "Cormorant Garamond", serif',
    color: PALETTE.goldDim,
    border: PALETTE.goldFaint,
    background: 'rgba(217,184,120,.06)',
    paddingX: 38,
    paddingY: 20,
  });

  // ─── Footer ─────────────────────────────────────────────────
  drawShareFooter(ctx, 'А что Луна скажет тебе?');

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

  drawPostcardBackground(ctx);

  // Лого Luna — единый PNG.
  await drawLogoHeader(ctx);

  ctx.font = '600 32px "Cormorant Garamond", serif';
  ctx.fillStyle = PALETTE.goldDim;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  drawSpacedText(ctx, 'СОВМЕСТИМОСТЬ', W / 2, 450, 32, 10);

  // Два круга-знака + процент посередине
  const ringY = 900;
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

  // Footer с CTA «Спросить Луну» — единый паттерн с reading postcard.
  drawShareFooter(ctx, 'А что Луна скажет о вас?');

  return canvasToBlob(canvas);
}

// ──────────────────────────────────────────────────────────────
// Sky postcard — для шеринга «Твоего неба» из профиля.
// ──────────────────────────────────────────────────────────────

export interface SkyPostcardInput {
  zodiac: ZodiacSign;
  /** «Рыбы», «Овен», ... */
  signLabel: string;
  /** Имя пользователя для подписи «Небо {name}». */
  name: string;
  /** ISO yyyy-MM-dd. Если есть — подпись «· 16 марта 1995». */
  birthDate?: string | null;
  /** Поэтическая строка, которая показывается в карточке профиля. */
  poeticLine: string;
}

/**
 * PNG-открытка «Твоё небо» (1080×1350) для шеринга в TG/IG.
 * Композиция повторяет SkyShareCard из ProfilePage:
 * лого Luna + ЛУНА·ТАРО + круглый диск со зодиакальным кольцом
 * и созвездием + знак + подпись + поэтичная строка + CTA + бот.
 */
export async function generateSkyPostcard(input: SkyPostcardInput): Promise<Blob> {
  await waitForFonts();

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');

  drawPostcardBackground(ctx);

  // Лого Luna — единый PNG.
  await drawLogoHeader(ctx);

  ctx.font = '600 32px "Cormorant Garamond", serif';
  ctx.fillStyle = PALETTE.goldDim;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  drawSpacedText(ctx, 'ЛУНА · ТАРО', W / 2, 450, 32, 10);

  // Круглый диск со зодиакальным кольцом + созвездием.
  const discCx = W / 2;
  const discCy = 870;
  const discR = 260;
  drawSkyDisc(ctx, discCx, discCy, discR, input.zodiac);

  // Название знака.
  ctx.fillStyle = PALETTE.goldHi;
  ctx.font = '600 88px "Cormorant Garamond", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(217,184,120,0.45)';
  ctx.shadowBlur = 22;
  ctx.fillText(input.signLabel, W / 2, discCy + discR + 40);
  ctx.shadowBlur = 0;

  // Подпись «Небо Игоря · 16 марта 1995».
  ctx.font = '500 32px "Cormorant Garamond", serif';
  ctx.fillStyle = PALETTE.inkDim;
  const birthSuffix = input.birthDate ? ' · ' + formatBirthRu(input.birthDate) : '';
  ctx.fillText('Небо ' + (input.name || '—') + birthSuffix, W / 2, discCy + discR + 150);

  // Поэтичная строка — крупная цитата как HOOK.
  const trimmedPoetic = input.poeticLine.length > 140
    ? input.poeticLine.slice(0, 137).trimEnd() + '…'
    : input.poeticLine;
  ctx.save();
  ctx.shadowColor = 'rgba(217,184,120,.3)';
  ctx.shadowBlur = 22;
  ctx.font = '500 44px "Cormorant Garamond", serif';
  ctx.fillStyle = PALETTE.goldHi;
  wrapText(ctx, '«' + trimmedPoetic + '»', W / 2, discCy + discR + 220, W - 180, 58);
  ctx.restore();

  // Footer с CTA «Спросить Луну» — единый паттерн.
  drawShareFooter(ctx, 'А какое небо у тебя?');

  return canvasToBlob(canvas);
}

/**
 * Рисует круглый «диск неба»: тёмный фон, золотое кольцо + пунктир внутри,
 * 12 спиц через 30°, в центре — созвездие знака.
 */
function drawSkyDisc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  zodiac: ZodiacSign,
) {
  ctx.save();
  // Тёмный фон диска.
  const dg = ctx.createRadialGradient(cx, cy - r * 0.1, 0, cx, cy, r);
  dg.addColorStop(0, '#241a4e');
  dg.addColorStop(0.55, '#140d30');
  dg.addColorStop(1, '#0a0620');
  ctx.fillStyle = dg;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Бордер.
  ctx.strokeStyle = 'rgba(217,184,120,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // Внутренний пунктирный круг.
  ctx.setLineDash([5, 8]);
  ctx.strokeStyle = 'rgba(217,184,120,0.4)';
  ctx.beginPath();
  ctx.arc(cx, cy, r - 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // Очень тонкий внутренний кольцевой акцент.
  ctx.strokeStyle = 'rgba(217,184,120,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 36, 0, Math.PI * 2);
  ctx.stroke();
  // 12 спиц от центра.
  ctx.strokeStyle = 'rgba(217,184,120,0.18)';
  ctx.lineWidth = 1;
  const spokeLen = r * 0.78;
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 90) * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * spokeLen, cy + Math.sin(a) * spokeLen);
    ctx.stroke();
  }
  ctx.restore();

  // Созвездие в центре.
  drawConstellation(ctx, cx, cy, r * 0.85, zodiac);
}

/**
 * Рисует SVG-созвездие на canvas. Точки в системе 200×200 нормализуются
 * к {@link sizePx} и центрируются на ({@link cx}, {@link cy}).
 */
function drawConstellation(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  sizePx: number,
  zodiac: ZodiacSign,
) {
  const shape = CONSTELLATIONS[zodiac];
  // 200×200 → sizePx, центр (100,100) на (cx,cy).
  const k = sizePx / 200;
  const tx = (x: number) => cx + (x - 100) * k;
  const ty = (y: number) => cy + (y - 100) * k;

  ctx.save();
  // Рёбра.
  ctx.strokeStyle = 'rgba(217,184,120,0.55)';
  ctx.lineWidth = 1.6;
  shape.edges.forEach(([a, b]) => {
    const [x1, y1] = shape.nodes[a];
    const [x2, y2] = shape.nodes[b];
    ctx.beginPath();
    ctx.moveTo(tx(x1), ty(y1));
    ctx.lineTo(tx(x2), ty(y2));
    ctx.stroke();
  });
  // Узлы — крупные точки с glow.
  shape.nodes.forEach((p, i) => {
    const radiusPx = (i % 3 === 0 ? 6 : 4) * (sizePx / 200);
    ctx.beginPath();
    ctx.fillStyle = '#f2dca0';
    ctx.shadowColor = 'rgba(242,220,160,0.85)';
    ctx.shadowBlur = 10;
    ctx.arc(tx(p[0]), ty(p[1]), radiusPx, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (i % 4 === 0) {
      ctx.strokeStyle = 'rgba(217,184,120,0.4)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(tx(p[0]), ty(p[1]), radiusPx * 2.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  ctx.restore();
}

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatBirthRu(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`;
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
  // 1-3 карты — крупные в один ряд.
  if (count <= 3) {
    const cardW = 270;
    const cardH = 432;
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
  // 4-5 — средние в один ряд (ещё помещаются по ширине).
  if (count <= 5) {
    const cardW = 180;
    const cardH = 288;
    const gap = 18;
    const totalW = cardW * count + gap * (count - 1);
    const startX = Math.max(40, (W - totalW) / 2);
    return Array.from({ length: count }, (_, i) => ({
      x: startX + i * (cardW + gap),
      y: startY,
      w: cardW,
      h: cardH,
    }));
  }
  // 6+ — две строки.
  const perRow = Math.ceil(count / 2);
  const cardW = 150;
  const cardH = 240;
  const gap = 14;
  const totalW = cardW * perRow + gap * (perRow - 1);
  const startX = Math.max(40, (W - totalW) / 2);
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    return {
      x: startX + col * (cardW + gap),
      y: startY + row * (cardH + 30),
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
  const baseText = options.text ?? 'Спросил у Луны — вот что она показала.';
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

/**
 * Загружает PNG-лого Luna один раз и кэширует в памяти модуля.
 * При повторной генерации открыток картинка не качается снова —
 * мгновенно используется тот же HTMLImageElement.
 */
let cachedLogo: HTMLImageElement | null = null;
async function loadLogoImage(): Promise<HTMLImageElement | null> {
  if (cachedLogo) return cachedLogo;
  const img = await loadImage(LOGO_URL);
  if (img) cachedLogo = img;
  return img;
}

/**
 * Рисует золотой лого Luna в шапке открытки с мягким glow.
 * Все три открытки (reading, compat, sky) используют одинаковую шапку.
 */
async function drawLogoHeader(ctx: CanvasRenderingContext2D): Promise<void> {
  const logo = await loadLogoImage();
  if (!logo) return;
  ctx.save();
  ctx.shadowColor = 'rgba(217, 184, 120, 0.55)';
  ctx.shadowBlur = 36;
  const x = (W - LOGO_W) / 2;
  ctx.drawImage(logo, x, LOGO_Y, LOGO_W, LOGO_H);
  ctx.restore();
}

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
): number {
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
  return lines.length;
}

/**
 * Единый footer всех share-открыток: тонкая золотая линия + строка-hook
 * + pill-кнопка «Спросить Луну →» + URL бота. Заменяет дублирование
 * на 3 открытках.
 */
function drawShareFooter(ctx: CanvasRenderingContext2D, hookHeadline: string): void {
  const footerTop = H - 380;
  ctx.strokeStyle = PALETTE.goldFaint;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(140, footerTop);
  ctx.lineTo(W - 140, footerTop);
  ctx.stroke();

  ctx.font = '600 48px "Cormorant Garamond", serif';
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(hookHeadline, W / 2, footerTop + 38);

  drawPill(ctx, W / 2, footerTop + 130, {
    text: 'СПРОСИТЬ ЛУНУ →',
    font: '600 32px "Cormorant Garamond", serif',
    color: PALETTE.goldHi,
    border: PALETTE.gold,
    background: 'linear',
    paddingX: 52,
    paddingY: 22,
    letterSpacing: 4,
  });

  ctx.font = '500 26px "Cormorant Garamond", serif';
  ctx.fillStyle = PALETTE.inkFaint;
  drawSpacedText(ctx, 'T.ME/LUNA_TARO_CARD_BOT', W / 2, H - 80, 26, 5);
}

/** Радиальный градиент-фон + редкие звёзды для всех открыток (9:16). */
function drawPostcardBackground(ctx: CanvasRenderingContext2D): void {
  const grad = ctx.createRadialGradient(W / 2, H * 0.18, 0, W / 2, H * 0.18, H * 0.85);
  grad.addColorStop(0, PALETTE.bgTop);
  grad.addColorStop(0.45, '#160d34');
  grad.addColorStop(1, PALETTE.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  drawStars(ctx);
}

interface PillOptions {
  text: string;
  font: string;
  color: string;
  border: string;
  /** 'linear' = золотой градиент primary, иначе CSS-цвет. */
  background: string;
  paddingX: number;
  paddingY: number;
  letterSpacing?: number;
}

/**
 * Рисует pill-кнопку по центру: фон, бордер, текст внутри.
 * Высоту берёт из font height + paddingY * 2, ширина — text width + paddingX * 2.
 */
function drawPill(ctx: CanvasRenderingContext2D, cx: number, topY: number, opt: PillOptions): void {
  ctx.font = opt.font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const ls = opt.letterSpacing ?? 0;
  const textW = ls > 0
    ? [...opt.text].reduce((acc, ch) => acc + ctx.measureText(ch).width, 0) + ls * (opt.text.length - 1)
    : ctx.measureText(opt.text).width;
  // Высота — приблизительно size в px (font format: '... NNpx ...').
  const fontMatch = opt.font.match(/(\d+)px/);
  const textH = fontMatch ? parseInt(fontMatch[1], 10) : 32;
  const pillW = textW + opt.paddingX * 2;
  const pillH = textH + opt.paddingY * 2;
  const x = cx - pillW / 2;
  // Background.
  ctx.save();
  if (opt.background === 'linear') {
    const g = ctx.createLinearGradient(x, topY, x, topY + pillH);
    g.addColorStop(0, 'rgba(217,184,120,.2)');
    g.addColorStop(1, 'rgba(217,184,120,.07)');
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = opt.background;
  }
  roundedRectPath(ctx, x, topY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.strokeStyle = opt.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // Текст.
  ctx.fillStyle = opt.color;
  ctx.font = opt.font;
  if (ls > 0) {
    let tx = cx - textW / 2;
    const ty = topY + opt.paddingY;
    for (let i = 0; i < opt.text.length; i++) {
      ctx.fillText(opt.text[i], tx, ty);
      tx += ctx.measureText(opt.text[i]).width + ls;
    }
  } else {
    ctx.textAlign = 'center';
    ctx.fillText(opt.text, cx, topY + opt.paddingY);
  }
}
