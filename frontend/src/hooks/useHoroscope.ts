import { useEffect, useState } from 'react';
import { fetchTodayHoroscope, type HoroscopeResponse } from '@/api/horoscope';

interface UseHoroscopeResult {
  horoscope: HoroscopeResponse | null;
  error: string | null;
}

/**
 * Тянет ежедневный гороскоп ОДИН раз после успешной авторизации (enabled=true).
 * До этого hook никуда не ходит — иначе словит 401 на старте.
 */
export function useHoroscope(enabled: boolean): UseHoroscopeResult {
  const [horoscope, setHoroscope] = useState<HoroscopeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetchTodayHoroscope()
      .then((h) => { if (alive) setHoroscope(h); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'error'); });
    return () => { alive = false; };
  }, [enabled]);

  return { horoscope, error };
}
