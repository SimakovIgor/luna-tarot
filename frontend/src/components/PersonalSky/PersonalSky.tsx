import { Constellation } from '@/components/Constellation/Constellation';
import { ZODIAC_INFO } from '@/zodiac';
import type { ZodiacSign } from '@/api/horoscope';
import styles from './PersonalSky.module.css';

interface PersonalSkyProps {
  zodiac: ZodiacSign;
  /** Поэтичная строка под картой — генерируется из эзо-профиля. */
  poeticLine: string;
  /** Колбэк по нажатию на кнопку «Поделиться своим небом». */
  onShare: () => void;
}

/**
 * Блок «Твоё небо» в профиле — круглая зодиакальная карта с созвездием,
 * поэтичная строка под ней и кнопка шеринга.
 *
 * Делается из ДАННЫХ КОТОРЫЕ УЖЕ ЕСТЬ — никакой бэк-работы:
 *  • zodiac знак → SVG-созвездие из {@link CONSTELLATIONS}
 *  • lifePathNumber, lunarPhase, name, birthDate — используются в поэтической
 *    строке (формируется в @/util/poeticSky).
 */
export function PersonalSky({ zodiac, poeticLine, onShare }: PersonalSkyProps) {
  return (
    <div className={styles.card}>
      <div className={styles.discWrap}>
        <div className={styles.disc}>
          {/* Зодиакальное кольцо — пунктир. */}
          <div className={styles.ringDashed} />
          {/* Внутренний контур. */}
          <div className={styles.ringInner} />
          {/* 12 спиц через каждые 30°. */}
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              className={styles.spoke}
              style={{ transform: `rotate(${i * 30}deg)` }}
              aria-hidden="true"
            />
          ))}
          {/* Само созвездие в центре. */}
          <div className={styles.constellationStage}>
            <Constellation zodiac={zodiac} size={118} />
          </div>
        </div>
      </div>

      <p className={styles.poetic}>{poeticLine}</p>

      <button type="button" className={styles.shareBtn} onClick={onShare}>
        Поделиться своим небом
      </button>

      <p className={styles.hint}>{ZODIAC_INFO[zodiac].sign}, твой узор</p>
    </div>
  );
}
