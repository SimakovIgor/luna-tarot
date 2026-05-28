import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ScreenContainer } from '@/components/ScreenContainer/ScreenContainer';
import { MoonBackground } from '@/components/MoonBackground/MoonBackground';
import { GoldButton } from '@/components/GoldButton/GoldButton';
import { TarotCard } from '@/components/TarotCard/TarotCard';
import { CardBack } from '@/components/TarotCard/CardBack';
import { OrnamentalDivider } from '@/components/OrnamentalDivider/OrnamentalDivider';
import { WhisperText } from '@/components/WhisperText/WhisperText';
import { OrbitalLoader } from '@/components/OrbitalLoader/OrbitalLoader';
import { RichText } from '@/components/RichText/RichText';
import { cardImageUrl, createReading, type Reading } from '@/api/reading';
import { haptic } from '@/telegram/webapp';
import { generatePostcard, sharePostcard } from '@/util/postcard';
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
  | 'draw'      // объединённая шафл+веер сцена, одна группа карт
  | 'loading'
  | 'ready'     // расклад получен — спросить как раскрыть (по одной / все сразу)
  | 'reveal'
  | 'final';

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
  const [reading, setReading] = useState<Reading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealIndex, setRevealIndex] = useState(0);
  // Режим раскрытия — выбирается на стадии 'ready'. Для больших раскладов
  // ручной режим скрыт (10/12 рубашек тапать — мучение), для 3/5 — на выбор.
  const [autoReveal, setAutoReveal] = useState(false);

  useEffect(() => {
    if (stage !== 'loading') return;
    let alive = true;
    const effectiveQuestion = question.trim() || DEFAULT_QUESTION;
    createReading(spreadId, effectiveQuestion)
      .then((r) => {
        if (!alive) return;
        setReading(r);
        haptic('medium');
        setStage('ready');
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'Не удалось получить расклад');
        setStage('draw');
      });
    return () => { alive = false; };
  }, [stage, question, spreadId]);

  return (
    <ScreenContainer>
      <MoonBackground />
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <button type="button" className={styles.back} onClick={onClose}>← Назад</button>
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
              <h1 className={styles.title}>О чём твоё сердце сейчас?</h1>
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
                  placeholder='можно "Что мне сейчас важно увидеть?"'
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
              picked={picked}
              onPick={(idx) => {
                if (picked.includes(idx) || picked.length >= spread.cardCount) return;
                haptic('light');
                const next = [...picked, idx];
                setPicked(next);
                if (next.length === spread.cardCount) {
                  setTimeout(() => setStage('loading'), 500);
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
                // Длинная пауза, чтобы пользователь увидел, какие именно карты
                // подсветились в веере, прежде чем уйти в loading.
                setTimeout(() => setStage('loading'), 1400);
              }}
              error={error}
            />
          )}

          {stage === 'loading' && (
            <motion.div
              key="loading"
              className={styles.center}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className={styles.loadingStage}>
                <OrbitalLoader />
                <WhisperText size="m" tone="dim">
                  Луна слышит. Карты идут к свету.
                </WhisperText>
              </div>
            </motion.div>
          )}

          {stage === 'ready' && reading && (
            <ReadyStage
              key="ready"
              spread={spread}
              onManual={() => {
                haptic('light');
                setAutoReveal(false);
                setStage('reveal');
              }}
              onAuto={() => {
                haptic('medium');
                setAutoReveal(true);
                setStage('final');
              }}
            />
          )}

          {stage === 'reveal' && reading && (
            <RevealStage
              key={`reveal-${revealIndex}`}
              reading={reading}
              spread={spread}
              index={revealIndex}
              onNext={() => {
                if (revealIndex < reading.cards.length - 1) {
                  setRevealIndex(revealIndex + 1);
                  haptic('light');
                } else {
                  setStage('final');
                  haptic('light');
                }
              }}
              onPrev={() => {
                if (revealIndex > 0) {
                  setRevealIndex(revealIndex - 1);
                  haptic('light');
                }
              }}
              onSkipToAll={() => {
                haptic('medium');
                setAutoReveal(true);
                setStage('final');
              }}
            />
          )}

          {stage === 'final' && reading && (
            <FinalStage
              key="final"
              reading={reading}
              spread={spread}
              autoReveal={autoReveal}
              onClose={onClose}
              onAgain={() => {
                setStage('question');
                setQuestion('');
                setPicked([]);
                setReading(null);
                setRevealIndex(0);
                setAutoReveal(false);
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
              Дальше
            </GoldButton>
          </div>
        )}
      </div>
    </ScreenContainer>
  );
}

function stageLabel(stage: Stage, spread: SpreadDescriptor): string {
  switch (stage) {
    case 'question': return 'Шаг 1 · вопрос';
    case 'draw':     return `Шаг 2 · выбери ${spread.cardCount}`;
    case 'loading':  return 'Луна';
    case 'ready':    return 'Карты ждут';
    case 'reveal':   return 'Чтение';
    case 'final':    return 'Совет Луны';
  }
}

/* ── ReadyStage ──────────────────────────────────────────────
 * Промежуточный экран после loading. Юзер выбирает способ раскрытия:
 *   - «Раскрыть по одной» — медленный ритуал, флип каждой карты вручную
 *   - «Открыть все» — Луна сама показывает все карты разом с анимацией
 * Для больших раскладов (>5 карт) «по одной» скрываем — там это пытка. */

interface ReadyStageProps {
  spread: SpreadDescriptor;
  onManual: () => void;
  onAuto: () => void;
}

function ReadyStage({ spread, onManual, onAuto }: ReadyStageProps) {
  const showManual = spread.cardCount <= 5;
  return (
    <motion.div
      key="ready-content"
      className={styles.center}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <OrnamentalDivider label="карты ждут" />
      <h1 className={styles.title}>Колода готова.</h1>
      <p className={styles.subtitle}>
        Как ты хочешь, чтобы Луна показала {pluralCardsAccusative(spread.cardCount)}?
      </p>

      <div className={styles.readyChoice}>
        <button
          type="button"
          className={styles.readyTileAuto}
          onClick={onAuto}
        >
          <span className={styles.readyGlyph} aria-hidden="true">✦</span>
          <span className={styles.readyTitle}>Открыть все</span>
          <span className={styles.readyHint}>Луна раскроет карты разом</span>
        </button>

        {showManual && (
          <button
            type="button"
            className={styles.readyTileManual}
            onClick={onManual}
          >
            <span className={styles.readyGlyph} aria-hidden="true">☽</span>
            <span className={styles.readyTitle}>По одной</span>
            <span className={styles.readyHint}>сама касайся каждой карты</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}

function pluralCardsAccusative(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} карт`;
  if (mod10 === 1) return `${n} карту`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} карты`;
  return `${n} карт`;
}

/* ── DrawStage ──────────────────────────────────────────────────
 * ОДНА motion.div на карту во всех фазах — никаких remount.
 *   phase=idle:      стопка по центру, 7 видны, 15 скрыты в той же точке
 *   phase=shuffling: 7 центральных «дышат» в стопке (rotate keyframes)
 *   phase=fan:       все 22 плавно интерполируют к своим позициям веера
 * Переход shuffling→fan — БЕЗ скачка: keyframes заканчиваются на 0,
 * затем animate target меняется, framer-motion плавно интерполирует. */

interface DrawStageProps {
  spread: SpreadDescriptor;
  picked: number[];
  onPick: (idx: number) => void;
  onAutoPick: () => void;
  error: string | null;
}

type DrawPhase = 'idle' | 'shuffling' | 'fan';

const CENTER_START = Math.floor((FAN_CARDS - SHUFFLE_FAN_COUNT) / 2);

function DrawStage({ spread, picked, onPick, onAutoPick, error }: DrawStageProps) {
  const [phase, setPhase] = useState<DrawPhase>('idle');

  const handleTap = () => {
    if (phase !== 'idle') return;
    haptic('medium');
    setPhase('shuffling');
    setTimeout(() => setPhase('fan'), SHUFFLE_DURATION_MS);
  };

  const cards = useMemo(() => Array.from({ length: FAN_CARDS }, (_, i) => i), []);
  const isCenter = (i: number) =>
    i >= CENTER_START && i < CENTER_START + SHUFFLE_FAN_COUNT;

  const isFan = phase === 'fan';
  const remaining = spread.cardCount - picked.length;

  return (
    <motion.div
      className={styles.center}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <OrnamentalDivider label={isFan ? `выбери ${spread.cardCount}` : 'тасовка'} />
      <motion.h1
        className={styles.title}
        key={isFan ? 'fan-title' : 'idle-title'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
      >
        {isFan ? 'Слушай руку.' : 'Прикоснись к колоде.'}
      </motion.h1>
      <motion.p
        className={styles.subtitle}
        key={isFan ? 'fan-sub' : 'idle-sub'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.05 }}
      >
        {isFan
          ? remaining > 0
            ? `тронь ${remaining} ${pluralCards(remaining)} — те, к которым тянется взгляд`
            : 'Луна слышит…'
          : 'держи вопрос в сердце — и Луна помнит его за тебя'}
      </motion.p>
      {error && <p className={styles.subtitle} style={{ color: '#e87e7e' }}>{error}</p>}

      <div
        className={styles.drawArena}
        role={!isFan ? 'button' : undefined}
        tabIndex={!isFan ? 0 : -1}
        onClick={!isFan ? handleTap : undefined}
        onKeyDown={(e) => {
          if (isFan) return;
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTap(); }
        }}
        aria-label={isFan ? undefined : 'Перемешать колоду'}
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
          const liftY = isPicked ? -55 : 0;

          // ── Цель анимации ─────────────────────────────────────
          let animate: Record<string, number | number[]>;
          let transition: Record<string, unknown>;

          if (isFan) {
            animate = {
              x: fanX,
              y: fanY + liftY,
              rotate: fanAngle,
              scale: 1,
              opacity: 1,
            };
            // Карты разъезжаются с задержкой по позиции: чем дальше от центра — тем позже.
            const distFromCenter = Math.abs(i - (FAN_CARDS - 1) / 2);
            transition = {
              duration: 0.95,
              delay: distFromCenter * 0.04,
              ease: [0.22, 0.85, 0.3, 1],
            };
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
              duration: SHUFFLE_DURATION_MS / 1000,
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
              onClick={isFan ? () => onPick(i) : undefined}
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
          {phase === 'idle' ? '✦ коснись' : phase === 'shuffling' ? '✦ Луна тасует' : ''}
        </motion.span>
      </div>

      <div className={styles.fanPicker} aria-label="Выбранные карты">
        {spread.positions.map((_, slot) => (
          <div key={slot} className={`${styles.pickedSlot} ${picked[slot] !== undefined ? styles.filled : ''}`}>
            {picked[slot] !== undefined ? '✦' : '·'}
          </div>
        ))}
      </div>

      {isFan && remaining > 0 && (
        <motion.button
          type="button"
          className={styles.autoPickButton}
          onClick={onAutoPick}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          aria-label="Выбрать карты наугад"
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

/* ── RevealStage ────────────────────────────────────────────── */

interface RevealStageProps {
  reading: Reading;
  spread: SpreadDescriptor;
  index: number;
  onNext: () => void;
  onPrev: () => void;
  onSkipToAll: () => void;
}

function RevealStage({ reading, spread, index, onNext, onPrev, onSkipToAll }: RevealStageProps) {
  const card = reading.cards[index];
  const face = cardImageUrl(card.card);
  const [flipped, setFlipped] = useState(false);

  // При смене индекса карта вновь рубашкой
  useEffect(() => { setFlipped(false); }, [index]);

  const positionLabel = spread.positions[index]?.longLabel ?? spread.positions[index]?.label ?? `Карта ${index + 1}`;

  return (
    <motion.div
      className={`${styles.center} ${styles.revealStage}`}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.55 }}
    >
      <div className={styles.revealKicker}>
        {positionLabel} · {index + 1} из {reading.cards.length}
      </div>
      <TarotCard
        faceSrc={face ?? undefined}
        faceAlt={card.card.nameRu}
        reversed={card.reversed}
        flipped={flipped}
        onFlip={setFlipped}
        uid={`reveal-${index}`}
        size="m"
      />
      {flipped ? (
        <>
          <div className={styles.revealName}>
            {card.card.nameRu}{card.reversed ? ' (перевёрнута)' : ''}
          </div>
          <div className={styles.revealText}>
            {card.reversed && card.card.reversedMeaning
              ? card.card.reversedMeaning
              : card.card.uprightMeaning}
          </div>
        </>
      ) : (
        <WhisperText size="m" tone="dim">прикоснись к карте — она ответит</WhisperText>
      )}
      <div className={styles.revealNav}>
        <GoldButton variant="ghost" onClick={onPrev} disabled={index === 0}>← Назад</GoldButton>
        <GoldButton onClick={onNext} disabled={!flipped}>
          {index === reading.cards.length - 1 ? 'Совет Луны' : 'Дальше →'}
        </GoldButton>
      </div>
      {index < reading.cards.length - 1 && (
        <button type="button" className={styles.skipToAll} onClick={onSkipToAll}>
          ✦ открыть все сразу
        </button>
      )}
    </motion.div>
  );
}

/* ── FinalStage ─────────────────────────────────────────────── */

interface FinalStageProps {
  reading: Reading;
  spread: SpreadDescriptor;
  autoReveal: boolean;
  onClose: () => void;
  onAgain: () => void;
}

function FinalStage({ reading, spread, autoReveal, onClose, onAgain }: FinalStageProps) {
  // Карты появляются сразу (со своим stagger), под ними — итог Луны.
  // Текст итога ждёт пока ляжет последняя карта (~lastFlipMs), чтобы не отвлекать.
  const STAGGER_MS = 380;
  const FIRST_DELAY_MS = 250;
  const lastFlipMs = autoReveal
    ? FIRST_DELAY_MS + reading.cards.length * STAGGER_MS + 600
    : 400;

  return (
    <motion.div
      className={styles.finalStage}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.5 }}
    >
      <OrnamentalDivider label={autoReveal ? 'Луна раскрывает' : 'твоя раскладка'} />
      <FinalLayout cards={reading.cards} spread={spread} revealOnMount={autoReveal} />
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
        <div className={styles.finalActionsPrimary}>
          <ShareButton reading={reading} spread={spread} />
          <GoldButton onClick={onAgain}>Новый расклад</GoldButton>
        </div>
        <button type="button" className={styles.finalBackLink} onClick={onClose}>
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
    try {
      const labels = spread.positions.map((p) => p.label);
      const blob = await generatePostcard(reading, labels);
      const result = await sharePostcard(blob, {
        title: 'Luna · мой расклад',
        text: buildShareText(spread.id),
        url: BOT_URL,
      });
      // 'shared' и 'shared-link' оба означают «открылся share-диалог» — хинт не нужен.
      // 'downloaded' — фолбэк-скачивание; сообщаем пользователю.
      setHint(result === 'downloaded' ? 'открытка скачана' : null);
    } catch (e) {
      setHint(e instanceof Error ? e.message : 'не вышло');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <GoldButton onClick={handleClick} disabled={busy}>
        {busy ? 'Готовлю…' : 'Поделиться'}
      </GoldButton>
      {hint && (
        <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontStyle: 'italic' }}>{hint}</div>
      )}
    </div>
  );
}
