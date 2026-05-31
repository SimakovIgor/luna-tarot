import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ScreenContainer } from '@/components/ScreenContainer/ScreenContainer';
import { BrandMark } from '@/components/BrandMark/BrandMark';
import { GoldButton } from '@/components/GoldButton/GoldButton';
import { WhisperText } from '@/components/WhisperText/WhisperText';
import { OrnamentalDivider } from '@/components/OrnamentalDivider/OrnamentalDivider';
import { updateMe, type Gender, type MeResponse } from '@/api/me';
import type { ZodiacSign } from '@/api/horoscope';
import { ZODIAC_INFO } from '@/zodiac';
import { describeLunarPhase } from '@/util/format';
import { haptic } from '@/telegram/webapp';
import styles from './OnboardingPage.module.css';

import { track } from '@/observability';

interface OnboardingPageProps {
  /** Колбэк: онбординг успешно завершён, перейти на Hub. */
  onComplete: (me: MeResponse) => void;
}

type Step = 'welcome' | 'name' | 'gender' | 'birth' | 'reveal' | 'tour';

const STEPS_PROGRESS: Step[] = ['name', 'gender', 'birth'];

const LIFE_PATH_MEANING: Record<number, string> = {
  1:  'лидер, первопроходец',
  2:  'хранитель равновесия',
  3:  'творец, голос',
  4:  'опора, основание',
  5:  'свобода и перемены',
  6:  'забота, дом',
  7:  'искатель тайн',
  8:  'сила, материя',
  9:  'служение, мудрость',
  11: 'мастер интуиции',
  22: 'мастер-строитель',
  33: 'мастер любви',
};

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  // type="date" даёт ISO yyyy-MM-dd напрямую — никаких ручных масок и разных полей.
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);

  const stepIndex = STEPS_PROGRESS.indexOf(step);

  const goNext = (next: Step) => {
    haptic('light');
    setError(null);
    setStep(next);
  };

  const handleNameSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 60) {
      setError('Имя — от 2 до 60 символов');
      return;
    }
    setName(trimmed);
    goNext('gender');
  };

  const handleGenderPick = (g: Gender) => {
    setGender(g);
    haptic('light');
    setTimeout(() => goNext('birth'), 120);
  };

  const handleBirthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!gender) {
      setError('Не выбран пол — вернись на шаг назад.');
      return;
    }
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      setError('Выбери дату рождения');
      return;
    }
    const picked = new Date(birthDate);
    if (picked > new Date()) {
      setError('Дата не может быть в будущем');
      return;
    }
    if (picked.getFullYear() < 1900) {
      setError('Странная дата — проверь год');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await updateMe({ name, gender, birthDate });
      haptic('medium');
      setMe(updated);
      goNext('reveal');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Что-то пошло не так. Попробуй ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      

      <div className={styles.shell}>
        {STEPS_PROGRESS.includes(step) && (
          <div className={styles.progress} aria-hidden="true">
            {STEPS_PROGRESS.map((s, i) => (
              <span
                key={s}
                className={`${styles.progressDot} ${i <= stepIndex ? styles.progressDotActive : ''}`}
              />
            ))}
          </div>
        )}

        {step !== 'tour' && (
          <div className={styles.brand}>
            <BrandMark size="s" subline={null} />
          </div>
        )}

        <div className={styles.stepArea}>
          <AnimatePresence mode="wait">
            {step === 'welcome' && (
              <motion.div
                key="welcome"
                className={styles.stepInner}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.6 }}
              >
                {/* Тонкий лунный полумесяц — намёк, не «вау-сфера».
                    SVG, лёгкое серебристое свечение, мягкое дыхание. */}
                <motion.div
                  className={styles.welcomeMoon}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1.2, ease: [0.22, 0.85, 0.3, 1] }}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 100 100" width="80" height="80">
                    <defs>
                      <radialGradient id="welcome-moon-grad" cx="55%" cy="45%" r="55%">
                        <stop offset="0%"   stopColor="#fff7e0" stopOpacity="0.95" />
                        <stop offset="60%"  stopColor="#d9b876" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#8a6a2f" stopOpacity="0.55" />
                      </radialGradient>
                    </defs>
                    {/* Полумесяц: круг + вычитающий круг */}
                    <mask id="welcome-moon-mask">
                      <rect width="100" height="100" fill="white" />
                      <circle cx="62" cy="42" r="36" fill="black" />
                    </mask>
                    <circle cx="50" cy="50" r="40" fill="url(#welcome-moon-grad)" mask="url(#welcome-moon-mask)" />
                    {/* Лёгкая «звёздная пыль» — 3 точки рядом */}
                    <circle cx="84" cy="22" r="0.9" fill="#fff7e0" opacity="0.7" />
                    <circle cx="92" cy="48" r="0.7" fill="#fff7e0" opacity="0.55" />
                    <circle cx="78" cy="78" r="0.8" fill="#fff7e0" opacity="0.6" />
                  </svg>
                </motion.div>
                <OrnamentalDivider />
                <h1 className={styles.title}>Я — Луна.<br/>Я говорю с тобой через карты.</h1>
                <p className={styles.subtitle}>
                  Чтобы расклады были личными, расскажи о себе. Это займёт минуту.
                </p>
              </motion.div>
            )}

            {step === 'name' && (
              <motion.form
                key="name"
                onSubmit={handleNameSubmit}
                className={styles.stepInner}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.45 }}
              >
                <h1 className={styles.title}>Как тебя зовут?</h1>
                <p className={styles.subtitle}>именем я буду называть тебя в раскладах</p>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="text"
                  autoComplete="given-name"
                  placeholder="Например, Алиса"
                  value={name}
                  onChange={(e) => { setError(null); setName(e.target.value); }}
                  autoFocus
                  maxLength={60}
                />
                <div className={styles.error}>{error}</div>
                <input type="submit" hidden />
              </motion.form>
            )}

            {step === 'gender' && (
              <motion.div
                key="gender"
                className={styles.stepInner}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.45 }}
              >
                <h1 className={styles.title}>Чтобы я обращалась к тебе правильно…</h1>
                <p className={styles.subtitle}>я согласую род в разговоре с тобой</p>
                <div className={styles.genderRow}>
                  <button
                    type="button"
                    className={`${styles.genderTile} ${gender === 'MALE' ? styles.selected : ''}`}
                    onClick={() => handleGenderPick('MALE')}
                  >
                    <span className={styles.genderGlyph}>♂</span>
                    мужчина
                  </button>
                  <button
                    type="button"
                    className={`${styles.genderTile} ${gender === 'FEMALE' ? styles.selected : ''}`}
                    onClick={() => handleGenderPick('FEMALE')}
                  >
                    <span className={styles.genderGlyph}>♀</span>
                    женщина
                  </button>
                  <button
                    type="button"
                    className={`${styles.genderTile} ${styles.third} ${gender === 'UNSPECIFIED' ? styles.selected : ''}`}
                    onClick={() => handleGenderPick('UNSPECIFIED')}
                  >
                    не указывать
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'birth' && (
              <motion.form
                key="birth"
                onSubmit={handleBirthSubmit}
                className={styles.stepInner}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.45 }}
              >
                <h1 className={styles.title}>Когда ты появился(-ась) на свет?</h1>
                <p className={styles.subtitle}>дата раскроет твой эзотерический профиль</p>
                <input
                  type="date"
                  className={`${styles.input} ${styles.dateInput}`}
                  value={birthDate}
                  onChange={(e) => { setError(null); setBirthDate(e.target.value); }}
                  max={new Date().toISOString().slice(0, 10)}
                  min="1900-01-01"
                  autoFocus
                />
                <div className={styles.error}>{error}</div>
                <input type="submit" hidden />
              </motion.form>
            )}

            {step === 'reveal' && me && (
              <RevealStep me={me} onContinue={() => goNext('tour')} />
            )}

            {step === 'tour' && me && (
              <TourStep onFinish={() => { track('onboarding_completed', { zodiac: me.zodiac }); onComplete(me); }} />
            )}
          </AnimatePresence>
        </div>

        <div className={styles.bottom}>
          {step === 'welcome' && (
            <GoldButton onClick={() => goNext('name')}>
              Начать
            </GoldButton>
          )}
          {step === 'name' && (
            <GoldButton onClick={handleNameSubmit as unknown as () => void}>
              Дальше
            </GoldButton>
          )}
          {step === 'birth' && (
            <GoldButton
              onClick={handleBirthSubmit as unknown as () => void}
              disabled={submitting}
            >
              {submitting ? 'Звучит…' : 'Открыть мне Луну'}
            </GoldButton>
          )}
        </div>

        {step === 'welcome' && (
          <WhisperText size="s" tone="faint">
            мы не делимся твоими данными ни с кем · только Луна слышит
          </WhisperText>
        )}
      </div>
    </ScreenContainer>
  );
}

// ── Reveal: показываем посчитанный эзо-профиль ────────────────────────────

function RevealStep({ me, onContinue }: { me: MeResponse; onContinue: () => void }) {
  const zodiac = me.zodiac as ZodiacSign | null;
  const z = zodiac ? ZODIAC_INFO[zodiac] : null;
  const lifeMeaning = me.lifePathNumber ? LIFE_PATH_MEANING[me.lifePathNumber] : null;

  return (
    <motion.div
      key="reveal"
      className={styles.stepInner}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <OrnamentalDivider label="твой профиль" />
      <motion.h1
        className={styles.revealName}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        {me.name},<br/>вот что Луна видит в тебе
      </motion.h1>

      <div className={styles.revealStack}>
        {z && (
          <motion.div
            className={styles.revealCard}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <span className={styles.revealSymbol}>{z.symbol}</span>
            <div className={styles.revealField}>
              <div className={styles.revealKicker}>зодиак</div>
              <div className={styles.revealValue}>{z.sign}</div>
            </div>
          </motion.div>
        )}

        {me.lifePathNumber && (
          <motion.div
            className={styles.revealCard}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.95 }}
          >
            <span className={styles.revealSymbol}>{me.lifePathNumber}</span>
            <div className={styles.revealField}>
              <div className={styles.revealKicker}>число судьбы</div>
              <div className={styles.revealValue}>{lifeMeaning ?? '—'}</div>
            </div>
          </motion.div>
        )}

        {me.lunarPhase && (
          <motion.div
            className={styles.revealCard}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.3 }}
          >
            <span className={styles.revealSymbol}>☾</span>
            <div className={styles.revealField}>
              <div className={styles.revealKicker}>лунная фаза при рождении</div>
              <div className={styles.revealValue}>{describeLunarPhase(me.lunarPhase)}</div>
            </div>
          </motion.div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.7 }}
        className={styles.revealBottom}
      >
        <GoldButton onClick={onContinue}>дальше</GoldButton>
      </motion.div>
    </motion.div>
  );
}

// ── Tour: краткий 3-страничный intro в фичи ──────────────────────────────

interface TourStepProps {
  onFinish: () => void;
}

const TOUR_SLIDES = [
  {
    glyph: '🌙',
    title: 'Карта дня',
    body: 'Каждое утро Луна выбирает тебе одну карту. Прикоснись — она заговорит.',
  },
  {
    glyph: '🔮',
    title: 'Ритуалы и расклады',
    body: 'Когда есть вопрос — четыре расклада на выбор: от простого пути во времени до Кельтского креста.',
  },
  {
    glyph: '📜',
    title: 'Дневник',
    body: 'Все твои расклады остаются здесь. Возвращайся — отмечай, сбылось ли. Луна помнит.',
  },
];

function TourStep({ onFinish }: TourStepProps) {
  const [slide, setSlide] = useState(0);
  const last = slide === TOUR_SLIDES.length - 1;

  const next = () => {
    haptic('light');
    if (last) {
      onFinish();
    } else {
      setSlide(slide + 1);
    }
  };

  const current = TOUR_SLIDES[slide];

  return (
    <motion.div
      key="tour"
      className={styles.stepInner}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={slide}
          className={styles.tourCard}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.45 }}
        >
          <span className={styles.tourGlyph}>{current.glyph}</span>
          <h2 className={styles.tourTitle}>{current.title}</h2>
          <p className={styles.tourBody}>{current.body}</p>
        </motion.div>
      </AnimatePresence>

      <div className={styles.tourDots} aria-hidden="true">
        {TOUR_SLIDES.map((_, i) => (
          <span
            key={i}
            className={`${styles.tourDot} ${i === slide ? styles.tourDotActive : ''}`}
          />
        ))}
      </div>

      <div className={styles.revealBottom}>
        <GoldButton onClick={next}>
          {last ? 'войти в Mini App' : 'дальше'}
        </GoldButton>
      </div>
    </motion.div>
  );
}
