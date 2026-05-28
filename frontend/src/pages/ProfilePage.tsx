import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ScreenContainer } from '@/components/ScreenContainer/ScreenContainer';
import { MoonBackground } from '@/components/MoonBackground/MoonBackground';
import { OrnamentalDivider } from '@/components/OrnamentalDivider/OrnamentalDivider';
import { GoldButton } from '@/components/GoldButton/GoldButton';
import { type MeResponse, type Gender, updateMe } from '@/api/me';
import { haptic } from '@/telegram/webapp';
import { describeLunarPhase } from '@/util/format';
import styles from './ProfilePage.module.css';

interface ProfilePageProps {
  me: MeResponse;
  onClose: () => void;
  onMeUpdated: (me: MeResponse) => void;
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
  UNSPECIFIED: 'Не указан',
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

export function ProfilePage({ me, onClose, onMeUpdated }: ProfilePageProps) {
  const [editing, setEditing] = useState(false);
  const initial = (me.name?.trim()?.[0] ?? '·').toUpperCase();
  const zodiacInfo = me.zodiac ? ZODIAC_RU[me.zodiac] : null;

  return (
    <ScreenContainer>
      <MoonBackground />
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <button type="button" className={styles.back} onClick={onClose}>← Назад</button>
          <span className={styles.topTitle}>профиль</span>
          <span style={{ width: 50 }} />
        </div>

        <div className={styles.heroBlock}>
          <div className={styles.avatar} aria-hidden="true">
            <span className={styles.avatarInitial}>{initial}</span>
          </div>
          <h1 className={styles.name}>{me.name || 'Без имени'}</h1>
          <p className={styles.subline}>
            {me.birthDate ? formatBirthDateRu(me.birthDate) : 'дата рождения не указана'}
          </p>
        </div>

        <OrnamentalDivider label="эзо-профиль" />

        <div className={styles.fields}>
          <Field
            kicker="Знак"
            value={zodiacInfo ? `${zodiacInfo.symbol}  ${zodiacInfo.sign}` : '—'}
            hint="зодиак по дате рождения"
          />
          <Field
            kicker="Число судьбы"
            value={me.lifePathNumber ? `${me.lifePathNumber}` : '—'}
            hint={me.lifePathNumber ? (LIFE_PATH_MEANING[me.lifePathNumber] ?? '') : 'нумерология по ДР'}
          />
          <Field
            kicker="Лунная фаза"
            value={describeLunarPhase(me.lunarPhase)}
            hint="фаза Луны в момент твоего рождения"
          />
          <Field
            kicker="Пол"
            value={GENDER_RU[me.gender]}
            hint="нужен только для согласования родов в текстах Луны"
          />
        </div>

        <button type="button" className={styles.editCta} onClick={() => { haptic('light'); setEditing(true); }}>
          ✦ изменить данные
        </button>

        <OrnamentalDivider label="о Луне" />

        <details className={styles.faq}>
          <summary>Что такое перевёрнутая карта?</summary>
          <p>
            Когда карта выпадает «вверх ногами», её смысл смещается: прямое значение приглушается,
            проявляется теневая сторона или внутреннее препятствие. Это не «плохо» — это другая грань той же энергии.
          </p>
        </details>
        <details className={styles.faq}>
          <summary>Как Луна выбирает карту дня?</summary>
          <p>
            Карта на день одна и та же для тебя в течение суток. Завтра она сменится. Утром в 08:00 (МСК)
            Луна напоминает в чате: «вот твоя карта на сегодня».
          </p>
        </details>
        <details className={styles.faq}>
          <summary>Можно ли удалить расклад?</summary>
          <p>
            Пока — нет. Дневник хранит всё, что Луна тебе показывала. Если очень нужно — напиши автору.
          </p>
        </details>
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

interface FieldProps {
  kicker: string;
  value: string;
  hint?: string;
}

function Field({ kicker, value, hint }: FieldProps) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldKicker}>{kicker}</div>
      <div className={styles.fieldValue}>{value}</div>
      {hint && <div className={styles.fieldHint}>{hint}</div>}
    </div>
  );
}

// ── Edit sheet ───────────────────────────────────────────────────────────

interface EditSheetProps {
  me: MeResponse;
  onClose: () => void;
  onSaved: (me: MeResponse) => void;
}

function EditSheet({ me, onClose, onSaved }: EditSheetProps) {
  const [name, setName] = useState(me.name || '');
  const [gender, setGender] = useState<Gender>(me.gender);
  // type="date" даёт ISO yyyy-MM-dd напрямую — никакой ручной парсинг не нужен.
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
      const updated = await updateMe({ name: trimmedName, gender, birthDate });
      haptic('medium');
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <motion.div
        key="backdrop"
        className={styles.backdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
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
        transition={{ duration: 0.35, ease: [0.22, 0.85, 0.3, 1] }}
      >
        <button type="button" className={styles.sheetHandle} onClick={busy ? undefined : onClose} aria-label="Закрыть" />
        <div className={styles.sheetBody}>
          <OrnamentalDivider label="изменить" />

          <label className={styles.sheetField}>
            <span className={styles.fieldKicker}>Имя</span>
            <input
              className={styles.sheetInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={64}
              disabled={busy}
            />
          </label>

          <label className={styles.sheetField}>
            <span className={styles.fieldKicker}>Дата рождения</span>
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
            <span className={styles.fieldKicker}>Пол</span>
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

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.sheetActions}>
            <GoldButton variant="ghost" onClick={onClose} disabled={busy}>Отмена</GoldButton>
            <GoldButton onClick={handleSave} disabled={busy}>
              {busy ? 'сохраняю…' : 'Сохранить'}
            </GoldButton>
          </div>
        </div>
      </motion.div>
    </>
  );
}

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatBirthDateRu(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `родился ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
