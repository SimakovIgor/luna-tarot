/**
 * Observability: Sentry (ошибки JS) + PostHog (продуктовая аналитика).
 *
 * Оба SDK Cloud-only, на нашем VPS ничего не жрут.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  TRACK-POINTS (используются для воронок в PostHog UI)        │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Лайфцикл:
 *  - app_opened              — каждое открытие Mini App (main.tsx)
 *  - onboarding_completed    { zodiac } — юзер дошёл до конца онбординга
 *
 * Расклады:
 *  - spread_started          { spread_id, has_question } — нажал «Дальше»
 *  - spread_completed        { spread_id } — все карты показаны
 *  - share_clicked           { spread_id } — тапнул «Поделиться»
 *  - share_completed         { spread_id, result } — share-диалог сработал
 *
 * Совместимость:
 *  - compat_solo_submitted   — отправил форму solo (имя+ДР партнёра)
 *  - compat_invite_created   — создал invite-ссылку
 *  - compat_invite_shared    — нажал «Поделиться в Telegram»
 *  - compat_invite_accepted  — friend принял приглашение
 *  - compat_completed        { mode: 'solo'|'invite', score } — результат показан
 *
 * Личное небо:
 *  - share_sky_clicked       { zodiac } — открыл share-sheet неба
 *  - share_sky_completed     { zodiac, result } — открытка отправлена
 *
 * Донат:
 *  - donate_initiated        { stars } — открыл invoice
 *  - donate_completed        { stars } — оплата прошла
 *  - donate_cancelled        { stars } — закрыл invoice
 *  - donate_failed           { stars, status } — ошибка платежа
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  ПРЕДЛАГАЕМЫЕ ВОРОНКИ В POSTHOG (Insights → Funnels)         │
 * └─────────────────────────────────────────────────────────────┘
 *
 *  1. Activation:      app_opened → onboarding_completed
 *  2. Engagement:      app_opened → spread_started → spread_completed
 *  3. Viral (расклад): spread_completed → share_clicked → share_completed
 *  4. Viral (небо):    app_opened → share_sky_clicked → share_sky_completed
 *  5. Viral (compat):  compat_invite_created → compat_invite_shared → compat_invite_accepted
 *  6. Donation:        app_opened → donate_initiated → donate_completed
 *  7. Compat solo:     app_opened → compat_solo_submitted → compat_completed
 *
 * Использование:
 *   import { initObservability, identify, track } from '@/observability';
 *   initObservability();                       // на старте App
 *   identify(me.id, { name, zodiac });         // после auth
 *   track('spread_completed', { spread_id }); // в любом месте
 */

import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';

const SENTRY_DSN = 'https://b6a1682efb884b623c9cdaa416ce216a@o4511477414035456.ingest.de.sentry.io/4511477420326992';
const POSTHOG_KEY = 'phc_wQHf5tV6CyjmWQxktJpvUAzhABi4RimrjZU32xb6GJco';
const POSTHOG_HOST = 'https://us.i.posthog.com';

let started = false;

export function initObservability(): void {
  if (started) return;
  started = true;

  // Не инициализируем на localhost (dev) — иначе будем засорять прод-проекты
  // ошибками с тестовой машины. Триггер: домен === lunatarot.duckdns.org.
  const isProd = typeof window !== 'undefined'
    && window.location.hostname.endsWith('lunatarot.duckdns.org');

  if (!isProd) {
    console.info('[observability] dev mode → Sentry/PostHog skipped');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    sendDefaultPii: true,
    // На бесплатном tier'е лимит 5K ошибок/мес — sampling низкий, чтобы не выгрести
    tracesSampleRate: 0.1,
    // Окружение для фильтра в дашборде
    environment: 'production',
  });

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Авто-собирать клики, page leaves, page views — нам это надо для funnel'а
    autocapture: true,
    capture_pageview: true,
    person_profiles: 'identified_only',
  });

  console.info('[observability] Sentry + PostHog initialized');
}

/** Привязываем все события к Telegram user id после успешного auth. */
export function identify(userId: string | number, traits?: Record<string, unknown>): void {
  if (!started) return;
  const id = String(userId);
  Sentry.setUser({ id });
  posthog.identify(id, traits);
}

/** Кастомное событие — для funnel'а и кoгорт. */
export function track(event: string, properties?: Record<string, unknown>): void {
  if (!started) return;
  posthog.capture(event, properties);
}

/** Ручной репорт ошибки (catch-блоки, где нужно зафиксировать) */
export function reportError(err: unknown, context?: Record<string, unknown>): void {
  if (!started) {
    console.error('[observability not started]', err, context);
    return;
  }
  Sentry.captureException(err, { extra: context });
}
