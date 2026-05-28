import { useEffect, useState } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';
import { TarotCard } from '@/components/TarotCard/TarotCard';
import { CardBack } from '@/components/TarotCard/CardBack';
import type { Reading } from '@/api/reading';
import { cardImageUrl } from '@/api/reading';
import styles from './DayCard.module.css';

interface DayCardProps {
  /** Данные карты (или null если ещё грузится / нет авторизации). */
  cardOfDay: Reading | null;
  /** Состояние «перевёрнута» (контролируется родителем). */
  flipped: boolean;
  onFlip: (next: boolean) => void;
  /** Если true — карта медленно вращается (splash phase). */
  spinning: boolean;
  /** Можно ли тапать (false пока splash). */
  interactive: boolean;
}

/** Скорость бесконечного вращения, deg/sec. */
const SPIN_SPEED_DEG_PER_SEC = 60; // = 6с на оборот

/**
 * Карта дня — единый компонент, который живёт в App и не пересоздаётся
 * при смене splash/hub. Position:fixed → координаты viewport через CSS-vars.
 *
 * Вращение реализовано через useMotionValue + animate(): когда spinning
 * выключается, карта продолжает движение **всегда вперёд** до ближайшего
 * целого оборота. Никаких реверсов «карта пошла назад».
 */
export function DayCard({ cardOfDay, flipped, onFlip, spinning, interactive }: DayCardProps) {
  const rotateY = useMotionValue(0);
  const [spinSettled, setSpinSettled] = useState(false);
  const firstCard = cardOfDay?.cards?.[0];
  const faceSrc = firstCard ? cardImageUrl(firstCard.card) : null;
  const reversed = firstCard?.reversed ?? false;

  // ── Управление вращением ──────────────────────────────────
  // spinning=true → бесконечно forward со скоростью SPIN_SPEED_DEG_PER_SEC.
  // spinning=false → продолжить вперёд с **той же угловой скоростью** до ближайшего
  //                  выровненного 360n. Linear ease — никаких ускорений/замедлений,
  //                  юзер должен почувствовать единую скорость вращения.
  //                  Если карта уже выровнена (mod 360 ≈ 0) — не двигаем вообще.
  // spinSettled — ставится в true только когда settle-анимация завершилась.
  // Пока он false, рендерим .fallback (рубашка с обеих сторон) — иначе при rotateY≈180
  // мы успели бы переключиться на TarotCard и пользователь увидел бы лицо «вверх ногами».
  useEffect(() => {
    if (spinning) {
      setSpinSettled(false);
      const startAt = rotateY.get();
      const controls = animate(rotateY, startAt + 10 * 360, {
        duration: (10 * 360) / SPIN_SPEED_DEG_PER_SEC,
        ease: 'linear',
      });
      return () => controls.stop();
    }
    const current = rotateY.get();
    const mod = ((current % 360) + 360) % 360;
    // Уже выровнена (например, повторный mount после возврата с другого экрана) — ничего не делаем.
    if (mod < 0.5 || mod > 359.5) {
      setSpinSettled(true);
      return;
    }
    const distance = 360 - mod;
    const duration = distance / SPIN_SPEED_DEG_PER_SEC;
    const controls = animate(rotateY, current + distance, {
      duration,
      ease: 'linear',
      onComplete: () => setSpinSettled(true),
    });
    return () => controls.stop();
  }, [spinning, rotateY]);

  // Пока splash активен (interactive=false) — карта поверх splash bg (z-index 260).
  // Когда splash полностью ушёл (interactive=true) — карта опускается под UI.
  // Раньше переключали по spinning — но splash продолжает fade-out 850ms после
  // settle, в этот промежуток карта закрывалась splash bg.
  const slotClass = !interactive ? `${styles.slot} ${styles.elevated}` : styles.slot;

  return (
    <div className={slotClass}>
      <span className={styles.glow} aria-hidden="true" />
      {(!cardOfDay || !spinSettled) ? (
        // Рубашка с обеих сторон — пока не загружена карта дня ИЛИ пока крутящаяся
        // settle-анимация не доехала до целого 360°. Это закрывает дыру между моментом
        // spinning=false и моментом, когда rotateY реально остановился — раньше там
        // успевал мелькнуть TarotCard вверх ногами.
        <motion.div className={styles.fallback} style={{ rotateY }}>
          <div className={styles.fallbackFace}><CardBack uid="day-fallback" /></div>
          <div className={styles.fallbackBack}><CardBack uid="day-fallback-mirror" /></div>
        </motion.div>
      ) : (
        <motion.div className={styles.cardWrap} style={{ rotateY }}>
          <TarotCard
            faceSrc={faceSrc ?? undefined}
            faceAlt={firstCard ? firstCard.card.nameRu : 'Карта дня'}
            reversed={reversed}
            flipped={flipped}
            onFlip={onFlip}
            uid="day-card"
            size="s"
            interactive={interactive && !!faceSrc}
          />
        </motion.div>
      )}
    </div>
  );
}
