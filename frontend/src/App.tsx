import { useEffect, useState } from 'react';
import { getInitData, getTgUser, ready as tgReady } from './telegram/webapp';
import { loginWithTgInit } from './api/auth';
import { fetchMe, type MeResponse } from './api/me';
import { DesignReviewPage, OnboardingDemoPage, ReadingDemoPage, DiaryDemoPage } from './pages/DesignReviewPage';
import { HubPage } from './pages/HubPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { IntroSplash } from './components/IntroSplash/IntroSplash';
import { DayCard } from './components/DayCard/DayCard';
import { useCardOfDay } from './hooks/useCardOfDay';
import { useHoroscope } from './hooks/useHoroscope';
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
  // Карта живёт ВСЁ время вверху App; splash управляет только её вращением через cardSpinning.
  const [cardSpinning, setCardSpinning] = useState(true);
  const [dayFlipped, setDayFlipped] = useState(false);
  // Hub-уровневая навигация: на каком sub-экране юзер сейчас. Нужно App,
  // чтобы скрывать DayCard когда юзер ушёл с хаба (Profile/Reading/Diary).
  const [activeSubView, setActiveSubView] = useState<'hub' | 'other'>('hub');

  useEffect(() => {
    tgReady();
    if (isDesignReview || isOnboardingDemo || isReadingDemo || isDiaryDemo) return;
    void bootstrap().then(setState);
  }, [isDesignReview, isOnboardingDemo, isReadingDemo, isDiaryDemo]);

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
  // DayCard видна в ДВУХ местах:
  //   1) splash — для всех (часть intro-эффекта);
  //   2) хаб — только когда юзер прошёл онбординг и реально на главном.
  // Онбординг, Profile, Reading, Diary — карты нет.
  // hubReady в условии гарантирует что карта не появится на онбординге
  // (там conversationState !== READY → hubReady=false → второй OR не сработает).
  const baseShow = !isDemo && state.kind !== 'no-telegram' && state.kind !== 'auth-failed';
  const showDayCard = baseShow && (showSplash || (hubReady && activeSubView === 'hub'));

  return (
    <>
      {showDayCard && (
        <DayCard
          cardOfDay={cardOfDay}
          flipped={dayFlipped}
          onFlip={setDayFlipped}
          spinning={cardSpinning}
          interactive={splashGone}
        />
      )}
      {showSplash && (
        <IntroSplash
          onSettleCard={() => setCardSpinning(false)}
          onDone={() => setSplashGone(true)}
        />
      )}
      {renderBody(state, (me) => setState({ kind: 'ready', me }), {
        cardOfDay,
        dayFlipped,
        onDayFlip: setDayFlipped,
        reveal: splashGone,
        onSubViewChange: setActiveSubView,
        horoscope,
        horoscopeError,
      })}
    </>
  );
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
}

function renderBody(
  state: AppState,
  onMeUpdated: (me: MeResponse) => void,
  body: BodyProps,
) {
  if (state.kind === 'loading') {
    return <SplashLoading />;
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
  return (
    <HubPage
      me={state.me}
      onMeUpdated={onMeUpdated}
      cardOfDay={body.cardOfDay}
      dayFlipped={body.dayFlipped}
      onDayFlip={body.onDayFlip}
      reveal={body.reveal}
      onSubViewChange={body.onSubViewChange}
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

function SplashLoading() {
  return (
    <div className="splash">
      <div className="splash-wordmark">Luna</div>
      <div className="splash-sub">зеркало пробуждается…</div>
    </div>
  );
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
