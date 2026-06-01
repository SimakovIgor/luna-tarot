import { api } from './client';
import type { ZodiacSign } from './horoscope';

export interface CompatibilityRequest {
  partnerName: string;
  /** ISO yyyy-MM-dd */
  partnerBirthDate: string;
}

export interface CompatibilityResponse {
  myZodiac: ZodiacSign;
  partnerZodiac: ZodiacSign;
  partnerName: string;
  /** 1..100 — процент совместимости, для шкалы. */
  score: number;
  text: string;
}

export function calculateCompatibility(body: CompatibilityRequest): Promise<CompatibilityResponse> {
  return api<CompatibilityResponse>('/compatibility', { method: 'POST', body });
}

/** Запись истории совместимости в Дневнике. */
export interface CompatibilityHistoryItem {
  id: number;
  /** «INITIATOR» — я её запустил, «PARTNER» — меня пригласили. */
  role: 'INITIATOR' | 'PARTNER';
  partnerName: string;
  myZodiac: ZodiacSign;
  partnerZodiac: ZodiacSign;
  score: number;
  text: string;
  /** ISO timestamp. */
  createdAt: string;
}

export function fetchCompatibilityHistory(): Promise<CompatibilityHistoryItem[]> {
  return api<CompatibilityHistoryItem[]>('/compatibility/history');
}

// ── Invite-flow ──────────────────────────────────────────────

export interface CompatibilityInviteResponse {
  slug: string;
  shareUrl: string;
}

export interface CompatibilityInviteInfo {
  slug: string;
  initiatorName: string;
  initiatorZodiac: ZodiacSign;
  /** «PENDING_INVITE» | «COMPLETED». */
  status: string;
  /**
   * Заполнен, если статус COMPLETED и текущий юзер — участник. В этом
   * случае фронт сразу показывает финальный экран без accept'а (кейс
   * «принял → свернул app → вернулся по ссылке»).
   */
  result: CompatibilityResponse | null;
}

/** Инициатор: создать invite-ссылку. */
export function createCompatibilityInvite(): Promise<CompatibilityInviteResponse> {
  return api<CompatibilityInviteResponse>('/compatibility/invite', { method: 'POST' });
}

/** Friend: посмотреть инфу о приглашении (для экрана с именем инициатора). */
export function fetchCompatibilityInvite(slug: string): Promise<CompatibilityInviteInfo> {
  return api<CompatibilityInviteInfo>(`/compatibility/invite/${slug}`);
}

/** Friend: принять приглашение, получить совместный результат. */
export function acceptCompatibilityInvite(slug: string): Promise<CompatibilityResponse> {
  return api<CompatibilityResponse>(`/compatibility/invite/${slug}/accept`, { method: 'POST' });
}

/** Pending-приглашение инициатора (друг ещё не вошёл). */
export interface CompatibilityPendingItem {
  id: number;
  slug: string;
  shareUrl: string;
  /** ISO timestamp. */
  createdAt: string;
}

/** Список моих pending-приглашений — для секции «ждут ответа» в Дневнике. */
export function fetchCompatibilityPending(): Promise<CompatibilityPendingItem[]> {
  return api<CompatibilityPendingItem[]>('/compatibility/pending');
}

/** Инициатор отменяет (удаляет) своё pending-приглашение. */
export function cancelCompatibilityInvite(slug: string): Promise<void> {
  return api<void>(`/compatibility/invite/${slug}`, { method: 'DELETE' });
}
