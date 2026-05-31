-- Совместимость в дневнике: каждая проверка сохраняется как запись.
--
-- Два режима:
--  1) Solo — заполняешь имя/ДР партнёра, partner_user_id=NULL.
--  2) Invite — отправляешь ссылку, друг входит и идентифицируется как user,
--     partner_user_id заполняется.
--
-- В обоих случаях после расчёта score+text сохраняется COMPLETED-запись,
-- видимая в Дневнике инициатора (а в режиме invite — и в дневнике партнёра).
CREATE TABLE compatibility_checks (
    id BIGSERIAL PRIMARY KEY,

    -- Кто инициировал проверку. Всегда не null — это «владелец» записи.
    initiator_user_id BIGINT NOT NULL,

    -- Партнёр-юзер для invite-flow. NULL для solo-режима.
    -- Соответствующее RESTRICT — нельзя удалить юзера, который участвовал
    -- в чужой совместимости (записи останутся как часть истории инициатора).
    partner_user_id BIGINT,

    -- Партнёр в solo-режиме: имя + ДР без идентификации.
    -- В invite-режиме partner_name дублируется именем из профиля партнёра
    -- (чтобы не делать join на users в каждом запросе истории).
    partner_name TEXT NOT NULL,
    partner_birth_date DATE,

    -- Снимок знаков обоих участников на момент проверки.
    initiator_zodiac TEXT NOT NULL,
    partner_zodiac TEXT NOT NULL,

    -- Результат генератора. score 1..100.
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 100),
    result_text TEXT NOT NULL,

    -- Invite-flow поля. Для solo-проверок NULL.
    invite_slug TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED'
        CHECK (status IN ('PENDING_INVITE', 'COMPLETED')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_compatibility_checks_initiator_user_id
        FOREIGN KEY (initiator_user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_compatibility_checks_partner_user_id
        FOREIGN KEY (partner_user_id) REFERENCES users (id) ON DELETE RESTRICT
);

-- Дневник инициатора: список своих проверок по дате.
CREATE INDEX idx_compatibility_checks_initiator_created
    ON compatibility_checks (initiator_user_id, created_at DESC);

-- Дневник партнёра (invite-flow): чтобы в Дневнике друга тоже была видна
-- эта совместимость. Частичный индекс — только записи где partner есть.
CREATE INDEX idx_compatibility_checks_partner_created
    ON compatibility_checks (partner_user_id, created_at DESC)
    WHERE partner_user_id IS NOT NULL;

-- Поиск pending-invite по slug (для friend'а который перешёл по ссылке).
-- Уникален в рамках pending — после COMPLETED slug нам не нужен.
CREATE UNIQUE INDEX uq_compatibility_checks_invite_slug
    ON compatibility_checks (invite_slug)
    WHERE invite_slug IS NOT NULL;

COMMENT ON COLUMN compatibility_checks.invite_slug
    IS 'Случайный slug для deeplink. После COMPLETED slug больше не используется (его можно держать null чтобы освободить unique index).';
COMMENT ON COLUMN compatibility_checks.status
    IS 'PENDING_INVITE = создана ссылка, ждём друга. COMPLETED = есть результат.';
