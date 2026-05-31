import { api } from './client';

export type DonationAmount = 20 | 50 | 150;

interface InvoiceResponse {
  slug: string;
}

/**
 * Получить slug Stars-инвойса от бэкенда. Дальше его нужно передать в
 * Telegram.WebApp.openInvoice(slug, cb).
 */
export function createDonationInvoice(stars: DonationAmount): Promise<InvoiceResponse> {
  return api<InvoiceResponse>('/donate/invoice', {
    method: 'POST',
    body: { stars },
  });
}

export type InvoiceStatus = 'paid' | 'cancelled' | 'failed' | 'pending';

/**
 * Открывает инвойс через Telegram WebApp API. Промис резолвится со статусом из
 * openInvoice-колбэка. На устройствах без WebApp API — резолвится 'failed'.
 */
export function openInvoice(slug: string): Promise<InvoiceStatus> {
  return new Promise((resolve) => {
    const tg = window.Telegram?.WebApp;
    if (!tg || typeof tg.openInvoice !== 'function') {
      resolve('failed');
      return;
    }
    try {
      tg.openInvoice(slug, (status: string) => resolve(status as InvoiceStatus));
    } catch {
      resolve('failed');
    }
  });
}
