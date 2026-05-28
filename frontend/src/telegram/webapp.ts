/**
 * Тонкая обёртка над window.Telegram.WebApp.
 * В dev (вне Telegram) — initData пустой, можно подменить через VITE_DEV_TG_INIT_DATA.
 */

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  };
  themeParams: Record<string, string>;
  colorScheme: 'light' | 'dark';
  ready: () => void;
  expand: () => void;
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  /** Открывает любой t.me/... URL внутри Telegram (а не во внешнем браузере). */
  openTelegramLink?: (url: string) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function getInitData(): string {
  const tg = getTelegramWebApp();
  const real = tg?.initData ?? '';
  if (real) return real;
  // dev fallback: можно прокинуть свою валидную строку для локального теста
  return (import.meta as { env?: Record<string, string> }).env?.VITE_DEV_TG_INIT_DATA ?? '';
}

export function getTgUser(): TelegramWebApp['initDataUnsafe']['user'] | null {
  return getTelegramWebApp()?.initDataUnsafe?.user ?? null;
}

export function ready(): void {
  const tg = getTelegramWebApp();
  tg?.ready();
  tg?.expand();
  tg?.setHeaderColor?.('#08050f');
  tg?.setBackgroundColor?.('#08050f');
}

export function haptic(kind: 'light' | 'medium' | 'heavy' = 'light'): void {
  getTelegramWebApp()?.HapticFeedback?.impactOccurred(kind);
}

/** true если мы внутри Telegram-WebView (а не в обычном браузере). */
export function isInTelegram(): boolean {
  return !!getTelegramWebApp();
}

/**
 * Открывает нативный share-диалог Telegram: выбор чата + ввод сопроводительного
 * текста. Текст и ссылка — единственное, что можно передать (Mini App SDK не
 * умеет прикреплять Blob к share-листу). Возвращает true если вызов сработал.
 */
export function shareViaTelegram(text: string, url: string): boolean {
  const tg = getTelegramWebApp();
  if (!tg || !tg.openTelegramLink) {
    return false;
  }
  const encoded = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  tg.openTelegramLink(encoded);
  return true;
}
