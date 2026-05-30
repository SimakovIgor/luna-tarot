import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  /**
   * Режим:
   *   false (default) — fixed-overlay для splash. position:fixed + portal в body.
   *   true            — inline-блок в потоке HubPage. Скроллится вместе со
   *                     страницей, никакого position:fixed.
   */
  inline?: boolean;
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
export function DayCard({ cardOfDay, flipped, onFlip, spinning, interactive, inline = false }: DayCardProps) {
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

  // ── Inline-режим (внутри HubPage): просто блок в потоке, без position:fixed.
  // Карта скроллится вместе с остальным контентом — никаких WKWebView-багов
  // с containing block нет, потому что нет fixed позиционирования.
  // Inviting — карта готова к тапу (загружена, settled, не флипнута) → усиленное
  // золотое свечение зовёт коснуться.
  const isInviting = inline && spinSettled && !!cardOfDay && !flipped && interactive;
  const baseClass = inline
    ? styles.slotInline
    : !interactive
      ? `${styles.slot} ${styles.elevated}`
      : styles.slot;
  const slotClass = isInviting ? `${baseClass} ${styles.inviting}` : baseClass;

  const content = (
    <div className={slotClass}>
      <span className={styles.glow} aria-hidden="true" />
      {(!cardOfDay || !spinSettled) ? (
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

  // Inline — никакого портала, рендерим напрямую.
  // Fixed-режим — портал в body, чтобы containing block был viewport.
  return inline ? content : createPortal(content, document.body);
}
