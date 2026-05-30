import { useState } from 'react';
import { ScreenContainer } from '@/components/ScreenContainer/ScreenContainer';
import { MoonBackground } from '@/components/MoonBackground/MoonBackground';
import { StatusLine } from '@/components/StatusLine/StatusLine';
import { BrandMark } from '@/components/BrandMark/BrandMark';
import { OrnamentalDivider } from '@/components/OrnamentalDivider/OrnamentalDivider';
import { WhisperText } from '@/components/WhisperText/WhisperText';
import { GoldButton } from '@/components/GoldButton/GoldButton';
import { TarotCard } from '@/components/TarotCard/TarotCard';
import { MicroNav } from '@/components/MicroNav/MicroNav';
import { OnboardingPage } from './OnboardingPage';
import { ReadingFlowPage } from './ReadingFlowPage';
import { DiaryPage } from './DiaryPage';
import styles from './DesignReviewPage.module.css';

/**
 * Mock-обёртка вокруг OnboardingPage — позволяет посмотреть онбординг локально
 * без авторизации (бэк-вызов всё равно упадёт, но шаги пройти можно).
 */
export function OnboardingDemoPage() {
  return <OnboardingPage onComplete={() => window.location.reload()} />;
}

/** Mock-обёртка вокруг ReadingFlowPage. По умолчанию открывает классический 3-карточник;
 * добавь `?spread=LOVE` (или CELTIC_CROSS / YEAR_WHEEL) к URL чтобы посмотреть другой. */
export function ReadingDemoPage() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('spread')?.toUpperCase() ?? 'THREE_CARD';
  const allowed = ['THREE_CARD', 'LOVE', 'CELTIC_CROSS', 'YEAR_WHEEL'] as const;
  type Allowed = typeof allowed[number];
  const spreadId: Allowed = (allowed as readonly string[]).includes(raw) ? (raw as Allowed) : 'THREE_CARD';
  return <ReadingFlowPage spreadId={spreadId} onClose={() => window.location.reload()} />;
}

/** Mock-обёртка вокруг DiaryPage. Без auth работать не будет (пустой/error). */
export function DiaryDemoPage() {
  return <DiaryPage onClose={() => window.location.reload()} />;
}

/** Все компоненты дизайн-системы на одной странице. URL: /app/?design */
export function DesignReviewPage() {
  const [reversed, setReversed] = useState(false);

  return (
    <ScreenContainer>
      <MoonBackground />
      <StatusLine moonPhase="Луна растёт" dateLabel="16 мая" />

      <main className={styles.page}>
        <section className={styles.section}>
          <div className={styles.label}>brand · m</div>
          <div className={styles.center}><BrandMark size="m" /></div>
        </section>

        <section className={styles.section}>
          <div className={styles.label}>ornamental divider</div>
          <OrnamentalDivider />
          <OrnamentalDivider label="карта дня" />
        </section>

        <section className={styles.section}>
          <div className={styles.label}>whisper text</div>
          <WhisperText highlightEm>
            Здравствуй, <em>Алиса</em>. О чём твоё сердце сегодня?
          </WhisperText>
          <WhisperText size="s" tone="faint">прикоснись — и Луна покажет, что выбрала тебе на сегодня</WhisperText>
        </section>

        <section className={styles.section}>
          <div className={styles.label}>gold button</div>
          <div className={styles.row}>
            <GoldButton>Открыть путь</GoldButton>
            <GoldButton variant="ghost">Назад</GoldButton>
          </div>
          <GoldButton full>Поделиться раскладом</GoldButton>
        </section>

        <section className={styles.section}>
          <div className={styles.label}>tarot card (упр-е reversed: чекбокс ниже)</div>
          <div className={styles.center}>
            <TarotCard faceSrc="/app/cards/m02.jpg" faceAlt="Верховная Жрица" reversed={reversed} uid="demo" />
          </div>
          <label className={styles.note} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <input type="checkbox" checked={reversed} onChange={(e) => setReversed(e.target.checked)} />
            перевёрнутая (лицо повёрнуто на 180°)
          </label>
          <div className={styles.note}>тапни на карту — флип. Поводи мышкой — tilt и подъём угла.</div>
        </section>

        <section className={styles.section}>
          <div className={styles.label}>tarot card · sizes</div>
          <div className={styles.row} style={{ justifyContent: 'center' }}>
            <TarotCard faceSrc="/app/cards/m17.jpg" size="s" uid="size-s" />
            <TarotCard faceSrc="/app/cards/m18.jpg" size="m" uid="size-m" />
          </div>
        </section>

      </main>

      <MicroNav
        items={[
          { id: 'sound', label: 'Звук' },
          { id: 'profile', label: 'Профиль' },
          { id: 'help', label: 'Помощь' },
        ]}
      />
    </ScreenContainer>
  );
}
