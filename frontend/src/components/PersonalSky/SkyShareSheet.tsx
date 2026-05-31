import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Constellation } from '@/components/Constellation/Constellation';
import { ZODIAC_INFO } from '@/zodiac';
import { haptic } from '@/telegram/webapp';
import { BOT_URL } from '@/config';
import { track, reportError } from '@/observability';
// postcard.ts грузим в момент клика «Поделиться» — initial bundle лёгкий.
import type { MeResponse } from '@/api/me';
import type { ZodiacSign } from '@/api/horoscope';
import styles from './SkyShareSheet.module.css';

interface SkyShareSheetProps {
  open: boolean;
  onClose: () => void;
  me: MeResponse;
  /** Та же строка, что показывается в блоке «Твоё небо» в профиле. */
  poeticLine: string;
}

/**
 * Bottom-sheet для шеринга «Твоего неба».
 *
 * В превью — открытка-плакат с созвездием знака, имени и поэтической
 * строки. Кнопка «Отправить в Telegram» → нативный share-диалог
 * Telegram (текст + ссылка на бота). PNG-генерация открытки не делается
 * на v1 — достаточно текстового шеринга, виральная петля та же.
 */
export function SkyShareSheet({ open, onClose, me, poeticLine }: SkyShareSheetProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!me.zodiac) return null;
  const zodiac = me.zodiac as ZodiacSign;
  const info = ZODIAC_INFO[zodiac];

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    haptic('medium');
    track('share_sky_clicked', { zodiac });

    const text = `${poeticLine}\n\n— моё небо ☽`;
    try {
      const { generateSkyPostcard, sharePostcard } = await import('@/util/postcard');
      const blob = await generateSkyPostcard({
        zodiac,
        signLabel: info.sign,
        name: me.name || '',
        birthDate: me.birthDate,
        poeticLine,
      });
      const result = await sharePostcard(blob, {
        title: 'Luna · моё небо',
        text,
        url: BOT_URL,
        fileName: 'luna-sky.png',
      });
      track('share_sky_completed', { zodiac, result });
      if (result === 'downloaded') {
        setError('открытка скачана');
      } else {
        onClose();
      }
    } catch (e) {
      reportError(e, { where: 'SkyShareSheet.share', zodiac });
      setError(e instanceof Error ? e.message : 'не вышло');
    } finally {
      setBusy(false);
    }
  };

  const content = (
    <AnimatePresence>
      {open && (
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
            aria-label="Поделиться своим небом"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.4, ease: [0.22, 0.85, 0.3, 1] }}
          >
            <button
              type="button"
              className={styles.handle}
              onClick={busy ? undefined : onClose}
              aria-label="Закрыть"
            />
            <div className={styles.body}>
              <h3 className={styles.title}>Поделиться небом</h3>
              <p className={styles.subtitle}>отправь свою звёздную открытку</p>

              {/* Превью открытки — мини-версия, ~37% масштаб. */}
              <div className={styles.previewWrap}>
                <div className={styles.previewScale}>
                  <SkyShareCard me={me} zodiac={zodiac} signLabel={info.sign} poeticLine={poeticLine} />
                </div>
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button
                type="button"
                className={styles.shareBtn}
                onClick={handleShare}
                disabled={busy}
              >
                {busy ? 'открываю…' : 'Отправить в Telegram'}
              </button>

              <button
                type="button"
                className={styles.laterBtn}
                onClick={onClose}
                disabled={busy}
              >
                Позже
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

interface SkyShareCardProps {
  me: MeResponse;
  zodiac: ZodiacSign;
  signLabel: string;
  poeticLine: string;
}

/**
 * Открытка 320×569 — формат полного скрина для шеринга.
 * Внутри: лого Luna, метка «Луна · Таро», созвездие, знак,
 * подпись «Небо {имя} · {дата}», поэтичная строка, CTA, ссылка на бот.
 */
function SkyShareCard({ me, zodiac, signLabel, poeticLine }: SkyShareCardProps) {
  return (
    <div className={styles.card}>
      <img
        src="/app/luna-logo.png"
        alt="Luna"
        className={styles.cardLogo}
        draggable={false}
      />
      <span className={styles.cardLabel}>Луна · Таро</span>

      <div className={styles.cardDiscWrap}>
        <div className={styles.cardDisc}>
          <div className={styles.cardRingDashed} />
          <div className={styles.cardConstellationStage}>
            <Constellation zodiac={zodiac} size={132} />
          </div>
        </div>
      </div>

      <div className={styles.cardSign}>{signLabel}</div>
      <div className={styles.cardSubline}>
        Небо {me.name || '—'}{me.birthDate ? ` · ${formatBirthShort(me.birthDate)}` : ''}
      </div>

      <p className={styles.cardPoetic}>«{poeticLine}»</p>

      <div className={styles.cardFooter}>
        <div className={styles.cardCta}>Узнать своё небо →</div>
        <div className={styles.cardBotLink}>T.ME/LUNA_TARO_CARD_BOT</div>
      </div>
    </div>
  );
}

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatBirthShort(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`;
}
