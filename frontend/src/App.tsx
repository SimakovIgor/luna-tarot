import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getInitData, getTgUser, getStartParam, ready as tgReady } from './telegram/webapp';
import { loginWithTgInit } from './api/auth';
import { fetchMe, type MeResponse } from './api/me';
import { DesignReviewPage, OnboardingDemoPage, ReadingDemoPage, DiaryDemoPage } from './pages/DesignReviewPage';
import { HubPage } from './pages/HubPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { IntroSplash } from './components/IntroSplash/IntroSplash';
import { StarField } from './components/StarField/StarField';
import { useCardOfDay } from './hooks/useCardOfDay';
import { useHoroscope } from './hooks/useHoroscope';
import { identify } from './observability';
import './App.css';

type AppState =
  | { kind: 'loading' }
  | { kind: 'no-telegram' }
  | { kind: 'auth-failed'; reason: string }
  | { kind: 'ready'; me: MeResponse };

export function App() {
  const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isDesignReview = query?.has('design') ?? false;
  const isOnboardingDemo = query?.has('onboarding') ?? false;
  const isReadingDemo = query?.has('reading') ?? false;
  const isDiaryDemo = query?.has('diary') ?? false;

  const [state, setState] = useState<AppState>({ kind: 'loading' });
  const [splashGone, setSplashGone] = useState(false);
  const [dayFlipped, setDayFlipped] = useState(false);
  // Hub-уровневая навигация: на каком sub-экране юзер сейчас. Нужно App,
  // чтобы скрывать DayCard когда юзер ушёл с хаба (Profile/Reading/Diary).
  const [activeSubView, setActiveSubView] = useState<'hub' | 'other'>('hub');
  // Скорость звёздного фона. 0 = splash (быстрый разлёт), 1 = home (почти покой).
  // Mutable ref, чтобы StarField менял скорость без перерендера canvas.
  const calmRef = useRef(0);

  useEffect(() => {
    tgReady();
    if (isDesignReview || isOnboardingDemo || isReadingDemo || isDiaryDemo) return;
    void bootstrap().then((next) => {
      setState(next);
      // Сразу как только auth прошёл — биндим Telegram user id к Sentry+PostHog
      // событиям. Дальше funnel/retention/ошибки видны per-user.
      if (next.kind === 'ready') {
        identify(next.me.tgUserId, {
          name: next.me.name,
          zodiac: next.me.zodiac,
          conversationState: next.me.conversationState,
        });
      }
    });
  }, [isDesignReview, isOnboardingDemo, isReadingDemo, isDiaryDemo]);

  // Прелоад ВСЕЙ колоды (78 карт + рубашка) на старте приложения. Cache-Control
  // на бэке = immutable/1 year, поэтому после первой загрузки картинки лежат
  // в браузере вечно — никаких повторных запросов при каждом раскладе. Грузим
  // батчами по 6 во время idle, чтобы не мешать первичной отрисовке.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { default: manifest } = await import('./cardManifest.json');
      const list = manifest as string[];
      const idle: (cb: () => void) => void = ('requestIdleCallback' in window)
        ? (cb) => (window as Window & { requestIdleCallback: (fn: () => void, opts?: object) => void }).requestIdleCallback(cb, { timeout: 1500 })
        : (cb) => window.setTimeout(cb, 250);
      const preloadBatch = (idx: number) => {
        if (cancelled || idx >= list.length) return;
        const end = Math.min(idx + 6, list.length);
        for (let i = idx; i < end; i++) {
          const img = new Image();
          img.src = `/app/cards/${list[i]}`;
        }
        idle(() => preloadBatch(end));
      };
      idle(() => preloadBatch(0));
    })();
    return () => { cancelled = true; };
  }, []);

  const isDemo = isDesignReview || isOnboardingDemo || isReadingDemo || isDiaryDemo;
  const showSplash = !isDemo && !splashGone;
  const hubReady = state.kind === 'ready' && state.me.conversationState === 'READY';

  // Карту дня тянем только после успешного auth (иначе 401 → cardOfDay навсегда null).
  // Пока auth идёт — DayCard показывает рубашку как fallback.
  const { cardOfDay } = useCardOfDay(hubReady);
  const { horoscope, error: horoscopeError } = useHoroscope(hubReady);

  if (isDesignReview) {
    return <DesignReviewPage />;
  }
  if (isOnboardingDemo) {
    return <OnboardingDemoPage />;
  }
  if (isReadingDemo) {
    return <ReadingDemoPage />;
  }
  if (isDiaryDemo) {
    return <DiaryDemoPage />;
  }
  // По новому дизайну DayCard на splash НЕ рендерится — splash чистый,
  // только полумесяц + лого + капс. Карта дня живёт только внутри HubPage.
  void activeSubView;
  void hubReady;

  return (
    <>
      {/* Единственный StarField на всё приложение — position: fixed на весь
          viewport, никогда не перемонтируется. При смене страниц звёзды
          продолжают свой полёт без скачка. */}
      <StarField calmRef={calmRef} />

      {showSplash && (
        <IntroSplash
          calmRef={calmRef}
          onSettleCard={() => {
            // Плавный ramp скорости звёзд 0→1 за 1.2с — переход от
            // динамичного разлёта на splash к спокойному дрейфу на hub.
            const start = performance.now();
            const ramp = () => {
              const e = Math.min((performance.now() - start) / 1200, 1);
              calmRef.current = e;
              if (e < 1) requestAnimationFrame(ramp);
            };
            requestAnimationFrame(ramp);
          }}
          onDone={() => setSplashGone(true)}
        />
      )}
      {/* Fade между состояниями (loading → onboarding → hub) — без скачка.
          Wrapper position:absolute inset:0 — каждый state занимает весь
          экран, AnimatePresence плавно меняет их по opacity. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={bodyKey(state)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 0.85, 0.3, 1] }}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {renderBody(state, (me) => setState({ kind: 'ready', me }), {
            cardOfDay,
            dayFlipped,
            onDayFlip: setDayFlipped,
            reveal: splashGone,
            onSubViewChange: setActiveSubView,
            horoscope,
            horoscopeError,
            calmRef,
          })}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

/** Стабильный ключ для AnimatePresence: одно состояние = один key, без re-mount при me-update. */
function bodyKey(state: AppState): string {
  if (state.kind === 'ready') {
    return state.me.conversationState === 'READY' ? 'hub' : 'onboarding';
  }
  return state.kind;
}

interface BodyProps {
  cardOfDay: ReturnType<typeof useCardOfDay>['cardOfDay'];
  dayFlipped: boolean;
  onDayFlip: (v: boolean) => void;
  /** true когда splash отыграл и можно триггерить fade-in ритуалов. */
  reveal: boolean;
  /** Hub сообщает App когда юзер уходит на под-экран (чтобы скрыть DayCard). */
  onSubViewChange: (view: 'hub' | 'other') => void;
  /** Гороскоп тоже живёт на App-level — нужен и на хабе, и на CardOfDay. */
  horoscope: ReturnType<typeof useHoroscope>['horoscope'];
  horoscopeError: ReturnType<typeof useHoroscope>['error'];
  /** Общий со StarField ref скорости звёзд (0=splash, 1=home). */
  calmRef: MutableRefObject<number>;
}

function renderBody(
  state: AppState,
  onMeUpdated: (me: MeResponse) => void,
  body: BodyProps,
) {
  if (state.kind === 'loading') {
    // Никакого «Luna»-текста — IntroSplash сам показывает полумесяц + PNG-лого.
    // Дублирующий SplashLoading удалён, чтобы не было двух лого одновременно.
    return null;
  }
  if (state.kind === 'no-telegram') {
    return <NoTelegramHint />;
  }
  if (state.kind === 'auth-failed') {
    return <ErrorHint reason={state.reason} />;
  }
  if (state.me.conversationState !== 'READY') {
    return <OnboardingPage onComplete={onMeUpdated} />;
  }
  // Если Mini App открыли по invite-deeplink (?startapp=compat_xxx),
  // забираем slug и передаём в Hub — он сразу откроет CompatibilityPage
  // в режиме invitee.
  const compatInviteSlug = getStartParam('compat_');
  return (
    <HubPage
      me={state.me}
      onMeUpdated={onMeUpdated}
      cardOfDay={body.cardOfDay}
      dayFlipped={body.dayFlipped}
      onDayFlip={body.onDayFlip}
      horoscope={body.horoscope}
      horoscopeError={body.horoscopeError}
      reveal={body.reveal}
      onSubViewChange={body.onSubViewChange}
      calmRef={body.calmRef}
      initialCompatInviteSlug={compatInviteSlug}
    />
  );
}

async function bootstrap(): Promise<AppState> {
  const initData = getInitData();
  if (!initData) {
    return { kind: 'no-telegram' };
  }
  try {
    await loginWithTgInit(initData);
    const me = await fetchMe();
    return { kind: 'ready', me };
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'unknown';
    return { kind: 'auth-failed', reason };
  }
}

function NoTelegramHint() {
  const tgUser = getTgUser();
  return (
    <div className="splash">
      <div className="splash-wordmark">Luna</div>
      <p className="splash-text">
        Это приложение открывается из Telegram — внутри @luna_taro_card_bot.
      </p>
      {tgUser ? null : (
        <p className="splash-faint">
          Локально открой <code>?design</code> или <code>?onboarding</code> чтобы посмотреть экраны.
        </p>
      )}
    </div>
  );
}

function ErrorHint({ reason }: { reason: string }) {
  return (
    <div className="splash">
      <div className="splash-wordmark">Luna</div>
      <p className="splash-text">Не удалось войти.</p>
      <p className="splash-faint">{reason}</p>
    </div>
  );
}
