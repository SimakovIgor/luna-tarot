-- Ежедневный гороскоп — один текст на (user, дата). idempotent fetch.
-- Не пересоздаётся в течение суток: открыл утром — тот же текст вечером.

CREATE TABLE daily_horoscopes (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL,
    horo_date  DATE        NOT NULL,
    text       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_daily_horoscopes_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_daily_horoscopes_user_date UNIQUE (user_id, horo_date)
);

CREATE INDEX idx_daily_horoscopes_user_date ON daily_horoscopes (user_id, horo_date DESC);
