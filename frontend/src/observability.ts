/**
 * Observability: Sentry (ошибки JS) + PostHog (продуктовая аналитика).
 *
 * Оба SDK Cloud-only (хосты EU для GDPR), на нашем VPS ничего не жрут.
 * Ключи — публичные client-side (Sentry DSN специально дизайнится как
 * embedded-в-бандл, PostHog «Project token» помечен в их UI как
 * «Safe to use in public apps»), поэтому hardcoded без env-обвязки.
 *
 * Используем как:
 *   import { initObservability, identify, track } from '@/observability';
 *   // на старте App:
 *   initObservability();
 *   // после auth:
 *   identify(me.id, { name: me.name, zodiac: me.zodiac });
 *   // в любом месте:
 *   track('spread_completed', { spread_id: 'YES_NO' });
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
