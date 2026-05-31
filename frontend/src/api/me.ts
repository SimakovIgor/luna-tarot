import { api } from './client';

export type Gender = 'MALE' | 'FEMALE' | 'UNSPECIFIED';

/** Натальная фаза Луны — рассчитывается из ДР, не меняется. */
export type LunarPhase =
  | 'NEW'
  | 'WAXING_CRESCENT'
  | 'FIRST_QUARTER'
  | 'WAXING_GIBBOUS'
  | 'FULL'
  | 'WANING_GIBBOUS'
  | 'LAST_QUARTER'
  | 'WANING_CRESCENT';

export type ConversationState =
  | 'NEW'
  | 'AWAITING_NAME'
  | 'AWAITING_GENDER'
  | 'AWAITING_BIRTH_DATE'
  | 'AWAITING_QUESTION'
  | 'READY';

export interface MeResponse {
  tgUserId: number;
  name: string;
  gender: Gender;
  birthDate: string | null;
  zodiac: string | null;
  lifePathNumber: number | null;
  lunarPhase: LunarPhase | null;
  conversationState: ConversationState;
  /** Сумма всех Telegram Stars донатов от пользователя. 0 если не донатил. */
  donatedStars: number;
}

export function fetchMe(): Promise<MeResponse> {
  return api<MeResponse>('/me');
}

export interface UpdateMePayload {
  name: string;
  gender: Gender;
  birthDate: string; // ISO yyyy-MM-dd
}

export function updateMe(body: UpdateMePayload): Promise<MeResponse> {
  return api<MeResponse>('/me', { method: 'PUT', body });
}
