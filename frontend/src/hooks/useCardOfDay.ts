import { useEffect, useState } from 'react';
import { fetchCardOfDay, type Reading } from '@/api/reading';

interface UseCardOfDayResult {
  cardOfDay: Reading | null;
  error: string | null;
}

/**
 * Тянет карту дня. Запускается ТОЛЬКО когда {@code enabled} становится true
 * (после успешной авторизации). До этого hook никуда не ходит — иначе словит 401
 * и cardOfDay навсегда останется null.
 */
export function useCardOfDay(enabled: boolean): UseCardOfDayResult {
  const [cardOfDay, setCardOfDay] = useState<Reading | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetchCardOfDay()
      .then((r) => { if (alive) setCardOfDay(r); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'error'); });
    return () => { alive = false; };
  }, [enabled]);

  return { cardOfDay, error };
}
