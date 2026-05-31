import { useEffect, useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScreenContainer } from '@/components/ScreenContainer/ScreenContainer';
import { OrnamentalDivider } from '@/components/OrnamentalDivider/OrnamentalDivider';
import { GoldButton } from '@/components/GoldButton/GoldButton';
import { BackButton } from '@/components/BackButton/BackButton';
import { RichText } from '@/components/RichText/RichText';
import { Orb } from '@/components/Orb/Orb';
// postcard.ts ленится — load по клику «Поделиться» (см. CompatShareButton).
import { buildCompatibilityShareText } from '@/util/shareText';
import { BOT_URL } from '@/config';
import { extractFirstSentence } from '@/util/text';
import {
  acceptCompatibilityInvite,
  calculateCompatibility,
  createCompatibilityInvite,
  fetchCompatibilityInvite,
  type CompatibilityInviteInfo,
  type CompatibilityInviteResponse,
  type CompatibilityResponse,
} from '@/api/compatibility';
import { ZODIAC_INFO } from '@/zodiac';
import { haptic, isInTelegram, shareViaTelegram } from '@/telegram/webapp';
import { track } from '@/observability';
import styles from './CompatibilityPage.module.css';

interface CompatibilityPageProps {
  onClose: () => void;
  pendingInviteSlug?: string | null;
  /** Имя текущего юзера — для буквы в орбе. */
  myName?: string;
}

type Stage =
  | 'invite'         // главный экран приглашения (два орба + CTA)
  | 'form'           // solo: ввод имени/ДР партнёра
  | 'invite-create'  // лоадер пока бэк генерит ссылку
  | 'invite-sent'    // ссылка готова, ждём друга
  | 'invitee'        // friend увидел приглашение
  | 'loading'        // «Луна сверяет»
  | 'result';        // общий результат

export function CompatibilityPage({ onClose, pendingInviteSlug, myName }: CompatibilityPageProps) {
  const [stage, setStage] = useState<Stage>(pendingInviteSlug ? 'invitee' : 'invite');
  const [partnerName, setPartnerName] = useState('');
  const [partnerDate, setPartnerDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompatibilityResponse | null>(null);
  const [invite, setInvite] = useState<CompatibilityInviteResponse | null>(null);
  const [inviteInfo, setInviteInfo] = useState<CompatibilityInviteInfo | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!pendingInviteSlug) return;
    let alive = true;
    fetchCompatibilityInvite(pendingInviteSlug)
      .then((info) => { if (alive) setInviteInfo(info); })
      .catch((e) => {
        if (alive) {
          setError(e instanceof Error ? e.message : 'Приглашение не найдено');
          setStage('invite');
        }
      });
    return () => { alive = false; };
  }, [pendingInviteSlug]);

  const myInitial = (myName?.trim()?.[0] ?? '·').toUpperCase();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = partnerName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 64) {
      setError('Имя — от 1 до 64 символов');
      return;
    }
    if (!partnerDate || !/^\d{4}-\d{2}-\d{2}$/.test(partnerDate)) {
      setError('Выбери дату рождения');
      return;
    }
    const picked = new Date(partnerDate);
    if (picked > new Date()) {
      setError('Дата рождения не может быть в будущем');
      return;
    }
    if (picked.getFullYear() < 1900) {
      setError('Странная дата — проверь год');
      return;
    }
    setStage('loading');
    track('compat_solo_submitted');
    try {
      const res = await calculateCompatibility({ partnerName: trimmedName, partnerBirthDate: partnerDate });
      setResult(res);
      haptic('medium');
      setStage('result');
      track('compat_completed', { mode: 'solo', score: res.score });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'не вышло');
      setStage('form');
    }
  };

  const resetForNew = () => {
    setResult(null);
    setPartnerName('');
    setPartnerDate('');
    setError(null);
    setInvite(null);
    setInviteInfo(null);
    setLinkCopied(false);
    setStage('invite');
  };

  const handleCreateInvite = async () => {
    setError(null);
    setStage('invite-create');
    haptic('light');
    track('compat_invite_created');
    try {
      const created = await createCompatibilityInvite();
      setInvite(created);
      // Сразу копируем в буфер для удобства.
      const nav = navigator as Navigator & { clipboard?: { writeText: (s: string) => Promise<void> } };
      if (nav.clipboard) {
        nav.clipboard.writeText(created.shareUrl).catch(() => {});
      }
      setStage('invite-sent');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'не удалось создать ссылку');
      setStage('invite');
    }
  };

  const handleShareInvite = () => {
    if (!invite) return;
    haptic('medium');
    track('compat_invite_shared');
    const text = 'Пойдём, спросим у Луны? Открой ссылку — она посчитает нашу совместимость.';
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
      clipboard?: { writeText: (s: string) => Promise<void> };
    };
    if (isInTelegram() && shareViaTelegram(text, invite.shareUrl)) {
      // native share открыт
    } else if (nav.share) {
      nav.share({ title: 'Luna · совместимость', text, url: invite.shareUrl }).catch(() => {});
    } else if (nav.clipboard) {
      nav.clipboard.writeText(invite.shareUrl).then(
        () => setLinkCopied(true),
        () => setError('Не удалось скопировать'),
      );
    } else {
      setError('Скопируй ссылку вручную');
    }
  };

  const handleCopyInvite = async () => {
    if (!invite) return;
    haptic('light');
    const nav = navigator as Navigator & { clipboard?: { writeText: (s: string) => Promise<void> } };
    if (!nav.clipboard) { setError('Скопируй ссылку вручную'); return; }
    try {
      await nav.clipboard.writeText(invite.shareUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setError('Не удалось скопировать');
    }
  };

  const handleAcceptInvite = async () => {
    if (!pendingInviteSlug) return;
    setError(null);
    setStage('loading');
    haptic('medium');
    track('compat_invite_accepted');
    try {
      const res = await acceptCompatibilityInvite(pendingInviteSlug);
      setResult(res);
      setStage('result');
      track('compat_completed', { mode: 'invite', score: res.score });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'не вышло');
      setStage('invitee');
    }
  };

  const role: string | null =
    stage === 'invite' || stage === 'invite-create' || stage === 'invite-sent' || stage === 'form' ? 'Ты' :
    stage === 'invitee' ? 'Экран друга' :
    stage === 'result' ? 'Видят оба' :
    null;

  const inviterLetter = inviteInfo?.initiatorName?.trim()?.[0]?.toUpperCase() ?? '·';
  const partnerLetterForResult =
    result?.partnerName?.trim()?.[0]?.toUpperCase() ?? '·';

  return (
    <ScreenContainer>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <BackButton onClick={onClose} />
          <span className={styles.topTitle}>совместимость</span>
          {role
            ? <span className={styles.roleBadge}>{role}</span>
            : <span aria-hidden="true" />}
        </div>

        <AnimatePresence mode="wait">
          {/* ── STEP 1: invite ── */}
          {stage === 'invite' && (
            <motion.div
              key="invite"
              className={styles.formStage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
            >
              <div className={styles.heroText}>
                <h1 className={styles.heroTitle}>Позвать человека</h1>
                <p className={styles.heroSubtitle}>
                  Луна прочитает вас обоих и покажет, что связывает и что разводит.
                </p>
              </div>

              <div className={styles.orbsStage}>
                <div className={styles.orbCol}>
                  <Orb letter={myInitial} size={96} variant="gold" />
                  <span className={styles.orbCaption}>Ты</span>
                </div>
                <span className={styles.orbSpark}>✦</span>
                <div className={styles.orbCol}>
                  <Orb letter="?" size={96} variant="dashed" />
                  <span className={styles.orbCaptionFaint}>Кто-то близкий</span>
                </div>
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.formActions}>
                <GoldButton full onClick={handleCreateInvite}>
                  Создать ссылку-приглашение
                </GoldButton>
                <button
                  type="button"
                  className={styles.inviteLink}
                  onClick={() => { setError(null); setStage('form'); }}
                >
                  Или проверить самой →
                </button>
              </div>
            </motion.div>
          )}

          {/* ── form: solo — ввод имени/ДР ── */}
          {stage === 'form' && (
            <motion.div
              key="form"
              className={styles.formStage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
            >
              <OrnamentalDivider label="кого спросим у Луны" />
              <p className={styles.subtitle}>
                расскажи о ком хочешь спросить — Луна посмотрит на ваши знаки
              </p>

              <form className={styles.form} onSubmit={handleSubmit}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Имя</span>
                  <input
                    className={styles.input}
                    value={partnerName}
                    onChange={(e) => { setError(null); setPartnerName(e.target.value); }}
                    placeholder='напр. "Алина"'
                    maxLength={64}
                    autoFocus
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Дата рождения</span>
                  <input
                    type="date"
                    className={`${styles.input} ${styles.dateInput}`}
                    value={partnerDate}
                    onChange={(e) => { setError(null); setPartnerDate(e.target.value); }}
                    max={new Date().toISOString().slice(0, 10)}
                    min="1900-01-01"
                  />
                </label>
                {error && <p className={styles.error}>{error}</p>}
                <input type="submit" hidden />
              </form>

              <div className={styles.formActions}>
                <GoldButton full onClick={() => handleSubmit(new Event('submit') as unknown as FormEvent)}>
                  Спросить Луну
                </GoldButton>
                <button
                  type="button"
                  className={styles.inviteLink}
                  onClick={() => { setError(null); setStage('invite'); }}
                >
                  ← позвать человека
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2 (lite): invite-create — лоадер ── */}
          {stage === 'invite-create' && (
            <motion.div
              key="invite-create"
              className={styles.loadingStage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className={styles.waitingMoon} />
              <div className={styles.waitingCaption}>Луна готовит ссылку…</div>
            </motion.div>
          )}

          {/* ── STEP 2: invite-sent ── */}
          {stage === 'invite-sent' && invite && (
            <motion.div
              key="invite-sent"
              className={styles.formStage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
            >
              <div className={styles.heroText}>
                <h1 className={styles.heroTitleSm}>Ссылка готова</h1>
                <p className={styles.heroSubtitle}>
                  Отправь её близкому. Как только он войдёт — Луна сверит ваши энергии.
                </p>
              </div>

              <div className={styles.sentStage}>
                <div className={styles.sentOrbs}>
                  <Orb letter={myInitial} size={74} variant="gold" />
                  <span className={styles.sentDashLine} aria-hidden="true" />
                  <Orb letter="?" size={74} variant="dashed" />
                </div>

                <div className={styles.linkBox}>
                  <span className={styles.linkIcon}>🔗</span>
                  <div className={styles.linkText}>
                    <span className={styles.linkLabel}>
                      {linkCopied ? 'ССЫЛКА СКОПИРОВАНА' : 'ССЫЛКА-ПРИГЛАШЕНИЕ'}
                    </span>
                    <span className={styles.linkUrl}>{invite.shareUrl.replace('https://', '')}</span>
                  </div>
                  <span className={styles.linkCheck}>✓</span>
                </div>

                <div className={styles.waitingDot}>
                  <span className={styles.waitingDotPulse} />
                  ждём, пока друг откроет ссылку…
                </div>
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.formActions}>
                <GoldButton full onClick={handleShareInvite}>
                  Поделиться в Telegram
                </GoldButton>
                <button
                  type="button"
                  className={styles.inviteLink}
                  onClick={handleCopyInvite}
                >
                  {linkCopied ? '✓ скопировано' : 'Скопировать ссылку'}
                </button>
                <button
                  type="button"
                  className={styles.inviteSecondary}
                  onClick={() => setStage('invite')}
                >
                  ← назад
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: invitee ── */}
          {stage === 'invitee' && (
            <motion.div
              key="invitee"
              className={styles.formStage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
            >
              {inviteInfo ? (
                <>
                  <div className={styles.inviteeStage}>
                    <Orb letter={inviterLetter} size={84} variant="gold" />
                    <h1 className={styles.inviteeTitle}>
                      {inviteInfo.initiatorName} зовёт тебя<br />к Луне
                    </h1>
                    <p className={styles.heroSubtitle}>
                      Узнайте, что между вами. Луна сверит вас двоих — данные возьмёт из твоего профиля.
                    </p>
                  </div>

                  {error && <p className={styles.error}>{error}</p>}

                  <div className={styles.formActions}>
                    <GoldButton full onClick={handleAcceptInvite}>
                      Войти и сравнить
                    </GoldButton>
                    <button
                      type="button"
                      className={styles.inviteLink}
                      onClick={onClose}
                    >
                      В другой раз
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.loadingStage}>
                  <div className={styles.waitingMoon} />
                  <div className={styles.waitingCaption}>загружаю приглашение…</div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── STEP 4: loading ── */}
          {stage === 'loading' && (
            <motion.div
              key="loading"
              className={styles.loadingStage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className={styles.loadingOrbs}>
                <Orb letter={myInitial} size={64} variant="gold" />
                <span className={styles.loadingSpark}>✦</span>
                <Orb
                  letter={inviteInfo?.initiatorName?.[0]?.toUpperCase() ?? '?'}
                  size={64}
                  variant="purple"
                />
              </div>
              <div className={styles.waitingCaption}>Луна сверяет ваши энергии</div>
            </motion.div>
          )}

          {/* ── STEP 5: result ── */}
          {stage === 'result' && result && (
            <motion.div
              key="result"
              className={styles.resultStage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className={styles.resultHeader}>
                <Orb letter={myInitial} size={72} variant="gold" />
                <span className={styles.resultLink} aria-hidden="true" />
                <Orb letter={partnerLetterForResult} size={72} variant="purple" />
              </div>

              <div className={styles.resonance}>
                <span className={styles.resonanceValue}>{result.score}%</span>
                <span className={styles.resonanceLabel}>Резонанс</span>
                <span className={styles.resonanceSigns}>
                  {ZODIAC_INFO[result.myZodiac].sign} {ZODIAC_INFO[result.myZodiac].symbol}
                  {' · '}
                  {ZODIAC_INFO[result.partnerZodiac].sign} {ZODIAC_INFO[result.partnerZodiac].symbol}
                </span>
              </div>

              <OrnamentalDivider label="что говорит луна" />
              <div className={styles.resultText}>
                <RichText source={result.text} />
              </div>

              <div className={styles.finalActions}>
                <div className={styles.finalActionsPrimary}>
                  <CompatShareButton result={result} />
                  <button
                    type="button"
                    className={styles.againSquare}
                    onClick={resetForNew}
                    aria-label="Сравнить ещё кого-то"
                    title="Сравнить ещё кого-то"
                  >
                    ↺
                  </button>
                </div>
                <p className={styles.sharedNote}>Этот расклад виден вам обоим</p>
                <button type="button" className={styles.homeLink} onClick={onClose}>
                  ← на главную
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ScreenContainer>
  );
}

// ── CompatShareButton ─────────────────────────────────────────

function CompatShareButton({ result }: { result: CompatibilityResponse }) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    setHint(null);
    haptic('light');
    try {
      const me = ZODIAC_INFO[result.myZodiac];
      const partner = ZODIAC_INFO[result.partnerZodiac];
      const caption = extractFirstSentence(result.text);
      const { generateCompatibilityPostcard, sharePostcard } = await import('@/util/postcard');
      const blob = await generateCompatibilityPostcard({
        mySign: me.sign, mySymbol: me.symbol,
        partnerSign: partner.sign, partnerSymbol: partner.symbol,
        partnerName: result.partnerName, score: result.score, caption,
      });
      const shared = await sharePostcard(blob, {
        title: 'Luna · наша совместимость',
        text: buildCompatibilityShareText(result),
        url: BOT_URL,
        fileName: 'luna-compatibility.png',
      });
      setHint(shared === 'downloaded' ? 'открытка скачана' : null);
    } catch (e) {
      setHint(e instanceof Error ? e.message : 'не вышло');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.shareWrap}>
      <GoldButton onClick={handleClick} disabled={busy} full>
        {busy ? 'Готовлю…' : 'Поделиться'}
      </GoldButton>
      {hint && <div className={styles.shareHint}>{hint}</div>}
    </div>
  );
}
