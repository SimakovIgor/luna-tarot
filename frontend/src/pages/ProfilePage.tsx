import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ScreenContainer } from '@/components/ScreenContainer/ScreenContainer';
import { GoldButton } from '@/components/GoldButton/GoldButton';
import { RichText } from '@/components/RichText/RichText';
import { type MeResponse, type Gender, updateMe, fetchMe } from '@/api/me';
import { ZODIAC_INFO } from '@/zodiac';
import { haptic } from '@/telegram/webapp';
import { describeLunarPhase } from '@/util/format';
import styles from './ProfilePage.module.css';

interface ProfilePageProps {
  me: MeResponse;
  onClose: () => void;
  onMeUpdated: (me: MeResponse) => void;
  /** Гороскоп показывается в самом низу профиля (перехал с CardOfDay). */
  horoscope: import('@/api/horoscope').HoroscopeResponse | null;
  horoscopeError: string | null;
  /**
   * Открыть экран поддержки. Карточка «Свет для Луны» — это вход
   * на отдельный экран, а не bottom-sheet. Если родитель не передал
   * колбэк, кнопка отрабатывает haptic и тихо ничего не делает.
   */
  onTapSupport?: () => void;
}

const ZODIAC_RU: Record<string, { sign: string; symbol: string }> = {
  ARIES:       { sign: 'Овен',       symbol: '♈' },
  TAURUS:      { sign: 'Телец',      symbol: '♉' },
  GEMINI:      { sign: 'Близнецы',   symbol: '♊' },
  CANCER:      { sign: 'Рак',        symbol: '♋' },
  LEO:         { sign: 'Лев',        symbol: '♌' },
  VIRGO:       { sign: 'Дева',       symbol: '♍' },
  LIBRA:       { sign: 'Весы',       symbol: '♎' },
  SCORPIO:     { sign: 'Скорпион',   symbol: '♏' },
  SAGITTARIUS: { sign: 'Стрелец',    symbol: '♐' },
  CAPRICORN:   { sign: 'Козерог',    symbol: '♑' },
  AQUARIUS:    { sign: 'Водолей',    symbol: '♒' },
  PISCES:      { sign: 'Рыбы',       symbol: '♓' },
};

const GENDER_RU: Record<Gender, string> = {
  MALE: 'Мужской',
  FEMALE: 'Женский',
  UNSPECIFIED: '—',
};

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

export function ProfilePage({
  me,
  onClose,
  onMeUpdated,
  horoscope,
  horoscopeError,
  onTapSupport,
}: ProfilePageProps) {
  const [editing, setEditing] = useState(false);
  const initial = (me.name?.trim()?.[0] ?? '·').toUpperCase();
  const zodiacInfo = me.zodiac ? ZODIAC_RU[me.zodiac] : null;
  const horoZodiac = me.zodiac && me.zodiac in ZODIAC_INFO
    ? ZODIAC_INFO[me.zodiac as keyof typeof ZODIAC_INFO]
    : null;
  const bornLabel = me.gender === 'FEMALE' ? 'родилась' : 'родился';

  return (
    <ScreenContainer>
      <div className={styles.shell}>
        {/* Top bar — кнопка «Назад» pill + капс «Профиль» справа. */}
        <div className={styles.topbar}>
          <button
            type="button"
            className={styles.backPill}
            onClick={() => { haptic('light'); onClose(); }}
          >
            ← Назад
          </button>
          <span className={styles.topTitle}>Профиль</span>
          {/* Пустой spacer чтобы grid 1fr auto 1fr центрировал «Профиль» симметрично. */}
          <span aria-hidden="true" />
        </div>

        {/* Identity */}
        <div className={styles.identity}>
          <div className={styles.avatar} aria-hidden="true">
            <span className={styles.avatarInitial}>{initial}</span>
          </div>
          <h1 className={styles.name}>{me.name || 'Без имени'}</h1>
          <p className={styles.subline}>
            {me.birthDate ? `${bornLabel} ${formatBirthDateRu(me.birthDate)}` : 'дата рождения не указана'}
          </p>
        </div>

        {/* Эзо-профиль */}
        <SectionLabel>Эзо-профиль</SectionLabel>
        <div className={styles.ezoGrid}>
          <EzoCell
            label="Знак"
            glyph={zodiacInfo?.symbol}
            value={zodiacInfo?.sign ?? '—'}
            hint="по дате рождения"
          />
          <EzoCell
            label="Число судьбы"
            value={me.lifePathNumber ? `${me.lifePathNumber}` : '—'}
            hint={me.lifePathNumber ? (LIFE_PATH_MEANING[me.lifePathNumber] ?? 'нумерология по ДР') : 'нумерология по ДР'}
          />
          <EzoCell
            label="Лунная фаза"
            value={lunarPhaseShort(me.lunarPhase)}
            hint="фаза при рождении"
          />
          <EzoCell
            label="Пол"
            value={GENDER_RU[me.gender]}
            hint="для текстов Луны"
          />
        </div>

        <div className={styles.editBtnWrap}>
          <GoldButton full onClick={() => { haptic('light'); setEditing(true); }}>
            ✦ Изменить данные
          </GoldButton>
        </div>

        {/* Свет для Луны — открывает отдельный экран через onTapSupport. */}
        <SectionLabel>Свет для Луны</SectionLabel>
        <button
          type="button"
          className={styles.supportRow}
          onClick={() => { haptic('light'); onTapSupport?.(); }}
        >
          <span className={styles.supportGlyph} aria-hidden="true">✦</span>
          <span className={styles.supportText}>
            <span className={styles.supportTitle}>Поддержать Луну</span>
            <span className={styles.supportSub}>звёзды для Луны</span>
          </span>
          <span className={styles.supportArrow} aria-hidden="true">→</span>
        </button>

        {/* Гороскоп */}
        <SectionLabel>Гороскоп на сегодня</SectionLabel>
        <div className={styles.horoBlock}>
          {horoZodiac && (
            <div className={styles.horoHeader}>
              <span className={styles.horoSymbol}>{horoZodiac.symbol}</span>
              <span className={styles.horoName}>{horoZodiac.sign.toUpperCase()}</span>
            </div>
          )}
          <div className={styles.horoBody}>
            {horoscope ? (
              <RichText source={horoscope.text} />
            ) : horoscopeError ? (
              <span className={styles.horoMuted}>гороскоп не загрузился</span>
            ) : (
              <span className={styles.horoMuted}>Луна шепчет твой день…</span>
            )}
          </div>
        </div>

        {/* О Луне */}
        <SectionLabel>О Луне</SectionLabel>
        <div className={styles.faqList}>
          <FaqItem
            q="Что такое перевёрнутая карта?"
            a="Когда карта выпадает «вверх ногами», её смысл смещается: прямое значение приглушается, проявляется теневая сторона или внутреннее препятствие. Это не «плохо» — это другая грань той же энергии."
          />
          <FaqItem
            q="Как Луна выбирает карту дня?"
            a="Карта на день одна и та же для тебя в течение суток. Завтра она сменится. Утром в 08:00 (МСК) Луна напоминает в чате: «вот твоя карта на сегодня»."
          />
          <FaqItem
            q="Можно ли удалить расклад?"
            a="Пока — нет. Дневник хранит всё, что Луна тебе показывала. Если очень нужно — напиши автору."
          />
        </div>
      </div>

      <AnimatePresence>
        {editing && (
          <EditSheet
            me={me}
            onClose={() => setEditing(false)}
            onSaved={(updated) => {
              onMeUpdated(updated);
              setEditing(false);
            }}
          />
        )}
      </AnimatePresence>
    </ScreenContainer>
  );
}

// ── Label («— Эзо-профиль —») с тонкими рамками по бокам. ────────

interface SectionLabelProps {
  children: string;
}

function SectionLabel({ children }: SectionLabelProps) {
  return (
    <div className={styles.sectionLabel} aria-hidden="false">
      <span className={styles.sectionLine} />
      <span className={styles.sectionLabelText}>{children}</span>
      <span className={styles.sectionLine} />
    </div>
  );
}

// ── Эзо-ячейка (2×2 grid) ───────────────────────────────────────

interface EzoCellProps {
  label: string;
  glyph?: string;
  value: string;
  hint: string;
}

function EzoCell({ label, glyph, value, hint }: EzoCellProps) {
  return (
    <div className={styles.ezoCell}>
      <div className={styles.ezoLabel}>{label}</div>
      <div className={styles.ezoValueRow}>
        {glyph && <span className={styles.ezoGlyph}>{glyph}</span>}
        <span className={styles.ezoValue}>{value}</span>
      </div>
      <div className={styles.ezoHint}>{hint}</div>
    </div>
  );
}

// ── FAQ-аккордеон ───────────────────────────────────────────────

interface FaqItemProps {
  q: string;
  a: string;
}

function FaqItem({ q, a }: FaqItemProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.faqItem}>
      <button
        type="button"
        className={styles.faqHeader}
        onClick={() => { haptic('light'); setOpen((v) => !v); }}
        aria-expanded={open}
      >
        <span className={styles.faqQ}>{q}</span>
        <span className={`${styles.faqPlus} ${open ? styles.faqPlusOpen : ''}`} aria-hidden="true">+</span>
      </button>
      {open && <div className={styles.faqA}>{a}</div>}
    </div>
  );
}

// ── Edit sheet ──────────────────────────────────────────────────

interface EditSheetProps {
  me: MeResponse;
  onClose: () => void;
  onSaved: (me: MeResponse) => void;
}

function EditSheet({ me, onClose, onSaved }: EditSheetProps) {
  const [name, setName] = useState(me.name || '');
  const [gender, setGender] = useState<Gender>(me.gender);
  const [birthDate, setBirthDate] = useState(me.birthDate ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setError(null);
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Имя — минимум 2 символа');
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
    setBusy(true);
    try {
      await updateMe({ name: trimmedName, gender, birthDate });
      // Защита от рассинхрона: вторым запросом перечитываем профиль,
      // чтобы UI гарантированно показывал актуальный zodiac/lifePath/lunarPhase.
      const fresh = await fetchMe();
      haptic('medium');
      onSaved(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  // Sheet рендерим через React Portal в body, чтобы ScreenContainer
  // (со своим overflow и max-width) не обрезал и не центрировал шит.
  const content = (
    <>
      <motion.div
        key="backdrop"
        className={styles.sheetBackdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={busy ? undefined : onClose}
        aria-hidden="true"
      />
      <motion.div
        key="sheet"
        className={styles.sheet}
        role="dialog"
        aria-label="Изменить данные"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.34, ease: [0.22, 0.85, 0.3, 1] }}
      >
        <button
          type="button"
          className={styles.sheetHandle}
          onClick={busy ? undefined : onClose}
          aria-label="Закрыть"
        />
        <div className={styles.sheetBody}>
          <div className={styles.sheetTitle}>Изменить данные</div>

          <label className={styles.sheetField}>
            <span className={styles.sheetFieldLabel}>Имя</span>
            <input
              className={styles.sheetInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={64}
              disabled={busy}
            />
          </label>

          <label className={styles.sheetField}>
            <span className={styles.sheetFieldLabel}>Дата рождения</span>
            <input
              type="date"
              className={`${styles.sheetInput} ${styles.dateInput}`}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              min="1900-01-01"
              disabled={busy}
            />
          </label>

          <div className={styles.sheetField}>
            <span className={styles.sheetFieldLabel}>Пол</span>
            <div className={styles.genderRow}>
              {(['MALE', 'FEMALE', 'UNSPECIFIED'] as Gender[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`${styles.genderBtn} ${gender === g ? styles.genderBtnActive : ''}`}
                  onClick={() => { haptic('light'); setGender(g); }}
                  disabled={busy}
                >
                  {GENDER_RU[g]}
                </button>
              ))}
            </div>
          </div>

          {error && <p className={styles.sheetError}>{error}</p>}

          <div className={styles.sheetActions}>
            <GoldButton variant="ghost" onClick={onClose} disabled={busy}>
              Отмена
            </GoldButton>
            <GoldButton onClick={handleSave} disabled={busy}>
              {busy ? 'сохраняю…' : 'Сохранить'}
            </GoldButton>
          </div>
        </div>
      </motion.div>
    </>
  );

  return createPortal(content, document.body);
}

// ── helpers ─────────────────────────────────────────────────────

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatBirthDateRu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const LUNAR_PHASE_SHORT: Record<string, string> = {
  NEW:    'Новая',
  WAXING: 'Растущая',
  FULL:   'Полная',
  WANING: 'Убывающая',
};

function lunarPhaseShort(phase: string | null): string {
  if (!phase) return describeLunarPhase(phase);
  return LUNAR_PHASE_SHORT[phase] ?? describeLunarPhase(phase);
}
