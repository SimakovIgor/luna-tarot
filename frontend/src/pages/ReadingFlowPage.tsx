import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ScreenContainer } from '@/components/ScreenContainer/ScreenContainer';
import { GoldButton } from '@/components/GoldButton/GoldButton';
import { CardBack } from '@/components/TarotCard/CardBack';
import { OrnamentalDivider } from '@/components/OrnamentalDivider/OrnamentalDivider';
import { BackButton } from '@/components/BackButton/BackButton';
import { RichText } from '@/components/RichText/RichText';
import { cardImageUrl, createReading, type Reading } from '@/api/reading';
import { track, reportError } from '@/observability';
import { haptic } from '@/telegram/webapp';
// postcard.ts весит ~30 KB (canvas-рендер, шрифты, helpers). Загружаем динамически
// в момент клика по «Поделиться» — initial bundle не несёт этот вес.
import { buildShareText } from '@/util/shareText';
import { BOT_URL } from '@/config';
import { getSpread, type SpreadId, type SpreadDescriptor } from '@/spreads/catalog';
import { FinalLayout } from '@/spreads/FinalLayout';
import styles from './ReadingFlowPage.module.css';

interface ReadingFlowPageProps {
  spreadId: SpreadId;
  onClose: () => void;
}

type Stage =
  | 'question'
  | 'draw'      // объединённая шафл+веер+пик сцена; API летит параллельно
  | 'final';    // финальная раскладка с морфом из веера + auto-reveal

const FAN_CARDS = 22;
const SHUFFLE_DURATION_MS = 1700;
const SHUFFLE_FAN_COUNT = 7;
const DEFAULT_QUESTION = 'Что мне важно увидеть сегодня?';
const MIN_Q = 3;
const MAX_Q = 500;

export function ReadingFlowPage({ spreadId, onClose }: ReadingFlowPageProps) {
  const spread = getSpread(spreadId);
  const [stage, setStage] = useState<Stage>('question');
  const [question, setQuestion] = useState('');
  const [picked, setPicked] = useState<number[]>([]); // позиции карт в веере
  const [picksReady, setPicksReady] = useState(false); // выбор закончен + кор. пауза
  const [reading, setReading] = useState<Reading | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── API fetch — параллельно с draw-анимацией для ВСЕХ раскладов ─────
  // Принцип: пока пользователь смотрит шафл, видит веер и тыкает карты —
  // бэкенд уже считает. К моменту окончания выбора расклад почти всегда
  // готов. Экран «Луна слышит» убран полностью, нет визуального разрыва
  // между ручным выбором карт в веере и финальной раскладкой.
  useEffect(() => {
    if (stage !== 'draw') return;
    let alive = true;
    const effectiveQuestion = question.trim() || DEFAULT_QUESTION;
    track('spread_started', { spread_id: spreadId, has_question: effectiveQuestion !== DEFAULT_QUESTION });
    createReading(spreadId, effectiveQuestion)
      .then((r) => {
        if (!alive) return;
        setReading(r);
        haptic('medium');
        // Транзишн в final триггерится эффектом ниже, когда И picksReady, И reading.
      })
      .catch((e) => {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : 'Не удалось получить расклад';
        setError(msg);
        reportError(e, { spread_id: spreadId, phase: 'createReading' });
      });
    return () => { alive = false; };
  }, [stage, question, spreadId]);

  // Переход в final — когда выбор завершён И ответ получен. Если ответ
  // придёт раньше выбора (типично для глубоких раскладов) — ждём пика.
  // Если выбор раньше ответа (быстрый YES_NO) — ждём ответ.
  useEffect(() => {
    if (stage === 'draw' && picksReady && reading) {
      setStage('final');
      track('spread_completed', { spread_id: spreadId });
    }
  }, [stage, picksReady, reading, spreadId]);

  // Преlazyload картинок карт — как только reading приходит, фоном тянем все
  // лицевые картинки. К моменту флипа в FinalLayout они уже в кэше браузера,
  // никакой «прорисовки с задержкой».
  useEffect(() => {
    if (!reading) return;
    reading.cards.forEach((rc) => {
      const url = cardImageUrl(rc.card);
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [reading]);

  return (
    <ScreenContainer>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <BackButton onClick={onClose} />
          <span className={styles.stepLabel}>{stageLabel(stage, spread)}</span>
          <span style={{ width: 50 }} />
        </div>

        <AnimatePresence mode="wait">
          {stage === 'question' && (
            <motion.div
              key="question"
              className={styles.center}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5 }}
            >
              <OrnamentalDivider label={spread.displayName.toLowerCase()} />
              <h1 className={styles.title}>Задай свой вопрос</h1>
              <p className={styles.subtitle}>{spread.longHint}</p>
              <form
                className={styles.questionArea}
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  const t = question.trim();
                  if (t && (t.length < MIN_Q || t.length > MAX_Q)) {
                    setError(`Вопрос — от ${MIN_Q} до ${MAX_Q} символов`);
                    return;
                  }
                  setError(null);
                  haptic('light');
                  setStage('draw');
                }}
              >
                <textarea
                  className={styles.questionInput}
                  placeholder='Например: "Что мне сейчас важно увидеть?"'
                  value={question}
                  onChange={(e) => { setError(null); setQuestion(e.target.value); }}
                  rows={3}
                  maxLength={MAX_Q}
                  autoFocus
                />
                <div className={styles.questionMeta}>
                  <span>{error ?? ''}</span>
                  <span>{question.length}/{MAX_Q}</span>
                </div>
                <input type="submit" hidden />
              </form>
            </motion.div>
          )}

          {stage === 'draw' && (
            <DrawStage
              key="draw"
              spread={spread}
              autoFlow={spreadId === 'YES_NO'}
              picked={picked}
              onPick={(idx) => {
                if (picked.includes(idx) || picked.length >= spread.cardCount) return;
                haptic('light');
                const next = [...picked, idx];
                setPicked(next);
                if (next.length === spread.cardCount) {
                  // 1950мс: hold 0.35s + полёт 1.2s + ~400мс на видимость
                  // лоадера. Если API готов — стейдж сменится после паузы,
                  // иначе лоадер продолжит крутиться до reading.
                  setTimeout(() => setPicksReady(true), 1950);
                }
              }}
              onAutoPick={() => {
                if (picked.length >= spread.cardCount) return;
                haptic('medium');
                const available: number[] = [];
                for (let i = 0; i < FAN_CARDS; i++) {
                  if (!picked.includes(i)) {
                    available.push(i);
                  }
                }
                // Fisher-Yates shuffle, забираем недостающее количество.
                for (let i = available.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [available[i], available[j]] = [available[j], available[i]];
                }
                const need = spread.cardCount - picked.length;
                const next = [...picked, ...available.slice(0, need)];
                setPicked(next);
                // 1850мс — hold + полёт + чуть лоадера.
                setTimeout(() => setPicksReady(true), 1850);
              }}
              error={error}
            />
          )}

          {stage === 'final' && reading && (
            <FinalStage
              key="final"
              reading={reading}
              spread={spread}
              onClose={onClose}
              onAgain={() => {
                setStage('question');
                setQuestion('');
                setPicked([]);
                setPicksReady(false);
                setReading(null);
              }}
            />
          )}
        </AnimatePresence>

        {stage === 'question' && (
          <div className={styles.bottom}>
            <GoldButton variant="ghost" onClick={() => {
              setQuestion('');
              haptic('light');
              setStage('draw');
            }}>
              Общий
            </GoldButton>
            <GoldButton onClick={() => {
              const t = question.trim();
              if (t && (t.length < MIN_Q || t.length > MAX_Q)) {
                setError(`Вопрос — от ${MIN_Q} до ${MAX_Q} символов`);
                return;
              }
              haptic('light');
              setStage('draw');
            }}>
              {spreadId === 'YES_NO' ? 'Спросить' : 'Дальше'}
            </GoldButton>
          </div>
        )}
      </div>
    </ScreenContainer>
  );
}

function stageLabel(stage: Stage, spread: SpreadDescriptor): string {
  const isAutoFlow = spread.id === 'YES_NO';
  switch (stage) {
    case 'question': return 'Шаг 1';
    case 'draw':     return isAutoFlow ? 'Луна слышит' : 'Шаг 2';
    case 'final':    return 'Совет Луны';
  }
}

/* ── ReadyStage / RevealStage удалены ─────────────────────────
 * После loading сразу идём в final с auto-reveal — пользователь видит
 * stagger-анимацию выкладывания всех карт + итог. Экран «по одной / все
 * сразу» убран по UX-запросу: лишний клик без ценности. */

/* ── DrawStage ──────────────────────────────────────────────────
 * ОДНА motion.div на карту во всех фазах — никаких remount.
 *   phase=idle:      стопка по центру, 7 видны, 15 скрыты в той же точке
 *   phase=shuffling: 7 центральных «дышат» в стопке (rotate keyframes)
 *   phase=fan:       все 22 плавно интерполируют к своим позициям веера
 * Переход shuffling→fan — БЕЗ скачка: keyframes заканчиваются на 0,
 * затем animate target меняется, framer-motion плавно интерполирует. */

interface DrawStageProps {
  spread: SpreadDescriptor;
  /** Если true — шафл и выбор карт идут автоматически без тапов. Для быстрого
   *  YES_NO: пользователь задал вопрос → одна кнопка «Спросить» → дальше всё
   *  происходит само. Для глубоких раскладов = false, ритуал выбора важен. */
  autoFlow: boolean;
  picked: number[];
  onPick: (idx: number) => void;
  onAutoPick: () => void;
  error: string | null;
}

type DrawPhase = 'idle' | 'shuffling' | 'fan';

const CENTER_START = Math.floor((FAN_CARDS - SHUFFLE_FAN_COUNT) / 2);
// AutoFlow: всё чуть быстрее, чтобы 4-5 секунд от тапа до текста, не 8-11.
const AUTO_FLOW_START_DELAY_MS = 250;
const AUTO_FLOW_PICK_DELAY_MS = 850;
const SHUFFLE_DURATION_AUTO_MS = 1100;

function DrawStage({ spread, autoFlow, picked, onPick, onAutoPick, error }: DrawStageProps) {
  const [phase, setPhase] = useState<DrawPhase>('idle');
  const shuffleMs = autoFlow ? SHUFFLE_DURATION_AUTO_MS : SHUFFLE_DURATION_MS;

  // Auto-flow: запускаем шафл сразу после mount (с лёгкой паузой, чтобы экран
  // спокойно открылся), потом разворачиваем веер. Никаких тапов.
  useEffect(() => {
    if (!autoFlow) return;
    const t1 = setTimeout(() => {
      haptic('medium');
      setPhase('shuffling');
    }, AUTO_FLOW_START_DELAY_MS);
    const t2 = setTimeout(
      () => setPhase('fan'),
      AUTO_FLOW_START_DELAY_MS + shuffleMs,
    );
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [autoFlow, shuffleMs]);

  // Auto-flow: после раскрытия веера выдёргиваем нужное число карт сами.
  useEffect(() => {
    if (!autoFlow || phase !== 'fan' || picked.length >= spread.cardCount) return;
    const t = setTimeout(() => onAutoPick(), AUTO_FLOW_PICK_DELAY_MS);
    return () => clearTimeout(t);
  }, [autoFlow, phase, picked.length, spread.cardCount, onAutoPick]);

  const handleTap = () => {
    if (autoFlow) return;
    if (phase !== 'idle') return;
    haptic('medium');
    setPhase('shuffling');
    setTimeout(() => setPhase('fan'), shuffleMs);
  };

  const cards = useMemo(() => Array.from({ length: FAN_CARDS }, (_, i) => i), []);
  const isCenter = (i: number) =>
    i >= CENTER_START && i < CENTER_START + SHUFFLE_FAN_COUNT;

  const isFan = phase === 'fan';
  const remaining = spread.cardCount - picked.length;
  const picksComplete = remaining === 0;

  return (
    <motion.div
      className={styles.center}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* OrnamentalDivider убран — дублировал stepLabel в топбаре («Шаг 2»)
          и h1 «Выбери карты», давая визуальную перегрузку.
          После первого пика гасим title/subtitle/autopick через opacity —
          из DOM не вынимаем, layout остаётся стабильным. */}
      <motion.h1
        className={styles.title}
        key={isFan ? 'fan-title' : 'idle-title'}
        initial={{ opacity: 0 }}
        animate={{ opacity: picked.length > 0 ? 0 : 1 }}
        transition={{ duration: 0.35 }}
      >
        {autoFlow ? 'Луна тасует' : isFan ? 'Выбери карты' : 'Нажми на колоду'}
      </motion.h1>
      <motion.p
        className={styles.subtitle}
        key={isFan ? 'fan-sub' : 'idle-sub'}
        initial={{ opacity: 0 }}
        animate={{ opacity: picked.length > 0 ? 0 : 1 }}
        transition={{ duration: 0.35, delay: 0.03 }}
      >
        {autoFlow
          ? isFan
            ? 'Карты ложатся…'
            : 'Расслабься, ответ уже идёт'
          : isFan
            ? remaining > 0
              ? `Коснись ${remaining} ${pluralCards(remaining)} — тех, к которым тянется взгляд`
              : 'Луна слышит…'
            : 'Коснись колоды — Луна перемешает карты'}
      </motion.p>
      {error && <p className={styles.subtitle} style={{ color: '#e87e7e' }}>{error}</p>}

      <div
        className={styles.drawArena}
        role={!autoFlow && !isFan ? 'button' : undefined}
        tabIndex={!autoFlow && !isFan ? 0 : -1}
        onClick={!autoFlow && !isFan ? handleTap : undefined}
        onKeyDown={(e) => {
          if (autoFlow || isFan) return;
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTap(); }
        }}
        aria-label={autoFlow ? 'Луна сама раскладывает карты' : isFan ? undefined : 'Перемешать колоду'}
      >
        <motion.span
          className={styles.drawAura}
          animate={{ opacity: isFan ? 0 : 0.55 }}
          transition={{ duration: 0.8 }}
          aria-hidden="true"
        />
        <span className={`${styles.shuffleFlash} ${phase === 'shuffling' ? styles.active : ''}`} aria-hidden="true" />

        {cards.map((i) => {
          const inCenter = isCenter(i);
          const centerIdx = i - CENTER_START;
          const fanAngle = (i / (FAN_CARDS - 1) - 0.5) * 110;
          const rad = (fanAngle * Math.PI) / 180;
          const fanX = Math.sin(rad) * 220 * 0.3;
          const fanY = -Math.cos(rad) * 12;
          const isPicked = picked.includes(i);

          // ── Цель анимации ─────────────────────────────────────
          let animate: Record<string, number | number[]>;
          let transition: Record<string, unknown>;

          if (isFan) {
            // Когда все выбраны (picksComplete) — picked-карты драматично
            // взмывают вверх и тают, unpicked — просто исчезают. Это и есть
            // визуальный «вылет из рукава» перед стейдж-транзишеном на final.
            // Иначе: picked поднимается на -55 (фидбек выбора), unpicked в фане.
            if (picksComplete && isPicked) {
              // Picked-карты улетают по лёгкой дуге наружу: дрейфуют чуть от
              // центра фана (fanX*1.25), уходят высоко вверх. delay 0.35s даёт
              // карте «зависнуть» в виде на треть секунды перед стартом отлёта.
              // Softer easeOut (cubic-bezier .16,1,.3,1) — нет резких ускорений.
              animate = {
                x: fanX * 1.25,
                y: fanY - 360,
                rotate: fanAngle * 0.85,
                scale: 0.58,
                opacity: 0,
              };
              transition = {
                duration: 1.2,
                delay: 0.35,
                ease: [0.16, 1, 0.3, 1],
              };
            } else if (picksComplete && !isPicked) {
              // Unpicked-карты тают на месте чуть позже, освобождая центр.
              animate = {
                x: fanX,
                y: fanY,
                rotate: fanAngle,
                scale: 0.9,
                opacity: 0,
              };
              transition = { duration: 0.6, delay: 0.2, ease: [0.4, 0, 0.2, 1] };
            } else {
              // Подъём выше (-100) + лёгкий scale 1.04 → ощущение «карта
              // вышла из рукава наружу», не просто «дёрнулась». Spring-feel
              // через cubic-bezier с долгим хвостом.
              const liftY = isPicked ? -100 : 0;
              animate = {
                x: fanX,
                y: fanY + liftY,
                rotate: fanAngle,
                scale: isPicked ? 1.04 : 1,
                opacity: 1,
              };
              const distFromCenter = Math.abs(i - (FAN_CARDS - 1) / 2);
              transition = {
                duration: isPicked ? 0.7 : 0.95,
                delay: isPicked ? 0 : distFromCenter * 0.04,
                ease: isPicked ? [0.16, 1, 0.3, 1] : [0.22, 0.85, 0.3, 1],
              };
            }
          } else if (phase === 'shuffling' && inCenter) {
            // Стопка вздрагивает: лёгкие keyframes rotate/scale, без разлёта
            const sign = centerIdx % 2 === 0 ? 1 : -1;
            animate = {
              x: 0,
              y: 0,
              rotate: [0, sign * 4, sign * -3, sign * 2, 0],
              scale: [1, 1.03, 1, 1.02, 1],
              opacity: 1,
            };
            transition = {
              duration: shuffleMs / 1000,
              times: [0, 0.25, 0.55, 0.8, 1],
              delay: centerIdx * 0.03,
              ease: 'easeInOut',
            };
          } else {
            // idle, либо shuffling для крайних карт (они невидимы в той же точке)
            animate = inCenter
              ? { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }
              : { x: 0, y: 0, rotate: 0, scale: 0.55, opacity: 0 };
            transition = { duration: 0.4, ease: [0.4, 0, 0.2, 1] };
          }

          // ── z-index ──────────────────────────────────────────
          const zIndex = isFan
            ? 50 + (isPicked ? 100 : 0)
            : (inCenter ? 90 - centerIdx : 0);

          return (
            <motion.div
              key={i}
              className={`${styles.drawCard} ${isFan && isPicked ? styles.picked : ''}`}
              animate={animate}
              transition={transition}
              style={{ zIndex }}
              onClick={!autoFlow && isFan ? () => onPick(i) : undefined}
            >
              <CardBack uid={`d-${i}`} />
            </motion.div>
          );
        })}

        <motion.span
          className={styles.drawHint}
          animate={{ opacity: isFan ? 0 : 1 }}
          transition={{ duration: 0.4 }}
        >
          {autoFlow
            ? phase === 'shuffling' ? '✦ Луна тасует' : ''
            : phase === 'idle' ? '✦ нажми сюда' : phase === 'shuffling' ? '✦ Луна тасует' : ''}
        </motion.span>

        {/* Магический лоадер — появляется на месте веера, когда все карты
            улетели. Орбитальные кольца + пульсирующий шёпот. Это даёт юзеру
            ощущение, что Луна что-то делает (а не пустота на 3 секунды).
            Появляется с задержкой 0.6с (карты сначала улетают), пульсирует
            до момента стейдж-транзишена на final. */}
        {picksComplete && (
          <motion.div
            className={styles.waitingOverlay}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            /* Дышащий золотой полумесяц + капс «ЛУНА РАСКРЫВАЕТ РАСКЛАД».
               По новому дизайну — простой, без орбиталей и эмодзи. */
            transition={{ delay: 1.05, duration: 0.7, ease: [0.22, 0.85, 0.3, 1] }}
            aria-hidden="true"
          >
            <div className={styles.waitingMoon} />
            <div className={styles.waitingCaption}>Луна раскрывает расклад</div>
          </motion.div>
        )}
      </div>

      {/* Кнопка «Выбрать наугад» — под колодой, перед dots-индикатором.
          Это явный CTA на «не хочу вручную выбирать» сразу после фана. */}
      {!autoFlow && isFan && (
        <motion.button
          type="button"
          className={styles.autoPickButton}
          onClick={onAutoPick}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: picked.length > 0 ? 0 : 1, y: 0 }}
          transition={{ duration: 0.35, delay: picked.length > 0 ? 0 : 0.2 }}
          style={{ pointerEvents: picked.length > 0 ? 'none' : 'auto' }}
          aria-label="Выбрать карты наугад"
          disabled={picked.length > 0}
        >
          <svg className={styles.autoPickIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
            <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
            <circle cx="8" cy="8" r="1.1" fill="currentColor" />
            <circle cx="16" cy="8" r="1.1" fill="currentColor" />
            <circle cx="12" cy="12" r="1.1" fill="currentColor" />
            <circle cx="8" cy="16" r="1.1" fill="currentColor" />
            <circle cx="16" cy="16" r="1.1" fill="currentColor" />
          </svg>
          <span className={styles.autoPickText}>Выбрать наугад</span>
        </motion.button>
      )}

      <div
        className={styles.fanPicker}
        aria-label="Выбранные карты"
        style={{
          opacity: picksComplete ? 0 : 1,
          transition: 'opacity 0.35s ease',
        }}
      >
        {spread.positions.map((_, slot) => (
          <div key={slot} className={`${styles.pickedSlot} ${picked[slot] !== undefined ? styles.filled : ''}`}>
            {picked[slot] !== undefined ? '✦' : '·'}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function pluralCards(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'карт';
  if (mod10 === 1) return 'карту';
  if (mod10 >= 2 && mod10 <= 4) return 'карты';
  return 'карт';
}

/* ── FinalStage ─────────────────────────────────────────────── */

interface FinalStageProps {
  reading: Reading;
  spread: SpreadDescriptor;
  onClose: () => void;
  onAgain: () => void;
}

function FinalStage({ reading, spread, onClose, onAgain }: FinalStageProps) {
  // Карты прилетают из DrawStage через layoutId-морф (~600мс), потом
  // последовательно флипаются. FIRST_DELAY_MS = время чтобы морф долетел,
  // STAGGER_MS = пауза между флипами карт в FinalLayout. Текст появляется
  // после последней карты, +600мс отдыха.
  const STAGGER_MS = 380;
  const FIRST_DELAY_MS = 250;
  const lastFlipMs = FIRST_DELAY_MS + reading.cards.length * STAGGER_MS + 600;

  return (
    <motion.div
      className={styles.finalStage}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.5 }}
    >
      <OrnamentalDivider label="Луна раскрывает" />
      <FinalLayout cards={reading.cards} spread={spread} revealOnMount={true} />

      {/* Подписи позиций под картами — только для коротких раскладов
          (3-5 карт). Для Кельтского креста с 10 позициями не помещается. */}
      {reading.cards.length <= 5 && (
        <motion.div
          className={styles.positionsRow}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: lastFlipMs / 1000, duration: 0.5 }}
        >
          {spread.positions.map((p, i) => (
            <span key={i} className={styles.positionLabel}>{p.label}</span>
          ))}
        </motion.div>
      )}

      <OrnamentalDivider label="итог луны" />
      <motion.div
        className={styles.finalReading}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: lastFlipMs / 1000, duration: 0.6 }}
      >
        <RichText source={reading.interpretation} />
      </motion.div>
      <motion.div
        className={styles.finalActions}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: (lastFlipMs + 300) / 1000, duration: 0.4 }}
      >
        {/* Главный CTA — Поделиться (full-width) + маленькая квадратная
            «↺» рядом для пере-раскладки. Тонкая текстовая ссылка «на главную»
            ниже — не главное действие, не нужна как кнопка. */}
        <div className={styles.finalActionsPrimary}>
          <ShareButton reading={reading} spread={spread} />
          <button
            type="button"
            className={styles.againSquare}
            onClick={onAgain}
            aria-label="Новый расклад"
            title="Новый расклад"
          >
            ↺
          </button>
        </div>
        <button type="button" className={styles.homeLink} onClick={onClose}>
          ← на главную
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ── ShareButton ────────────────────────────────────────────── */

function ShareButton({ reading, spread }: { reading: Reading; spread: SpreadDescriptor }) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    setHint(null);
    haptic('light');
    track('share_clicked', { spread_id: spread.id });
    try {
      const labels = spread.positions.map((p) => p.label);
      const { generatePostcard, sharePostcard } = await import('@/util/postcard');
      const blob = await generatePostcard(reading, labels);
      const result = await sharePostcard(blob, {
        title: 'Luna · мой расклад',
        text: buildShareText(spread.id),
        url: BOT_URL,
      });
      track('share_completed', { spread_id: spread.id, result });
      // 'shared' и 'shared-link' оба означают «открылся share-диалог» — хинт не нужен.
      // 'downloaded' — фолбэк-скачивание; сообщаем пользователю.
      setHint(result === 'downloaded' ? 'открытка скачана' : null);
    } catch (e) {
      setHint(e instanceof Error ? e.message : 'не вышло');
      reportError(e, { phase: 'share', spread_id: spread.id });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.shareWrap}>
      <GoldButton onClick={handleClick} disabled={busy} full>
        {busy ? 'Готовлю…' : 'Поделиться'}
      </GoldButton>
      {hint && <div className={styles.shareHint}>{hint}</div>}
    </div>
  );
}
