import { motion } from 'framer-motion';
import styles from './OrbitalLoader.module.css';

/**
 * Два пунктирных орбитальных кольца с золотыми точками крутятся
 * вокруг центрального ✦. Используется как универсальный «лоадер»
 * для тяжёлых LLM-вызовов (расклад / совместимость).
 */
export function OrbitalLoader() {
  return (
    <div className={styles.orbital} aria-hidden="true">
      <span className={styles.orbitCenter}>✦</span>
      <motion.span
        className={styles.orbitDotA}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, ease: 'linear', repeat: Infinity }}
      />
      <motion.span
        className={styles.orbitDotB}
        animate={{ rotate: -360 }}
        transition={{ duration: 8, ease: 'linear', repeat: Infinity }}
      />
    </div>
  );
}
