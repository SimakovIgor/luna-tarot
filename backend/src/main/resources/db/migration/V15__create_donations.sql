-- Telegram Stars donations.
-- Юзер тапает «Поддержать Луну» → backend генерит invoice → юзер платит →
-- Telegram присылает successful_payment update → бот сохраняет сюда.
CREATE TABLE donations (
    id BIGSERIAL PRIMARY KEY,
    tg_user_id BIGINT NOT NULL REFERENCES users(tg_user_id) ON DELETE CASCADE,
    stars INTEGER NOT NULL CHECK (stars > 0),
    telegram_payment_charge_id TEXT NOT NULL,
    provider_payment_charge_id TEXT,
    payload TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_donations_tg_user_id ON donations(tg_user_id);
CREATE INDEX idx_donations_created_at ON donations(created_at);

-- telegram_payment_charge_id уникален в рамках Telegram'а — защита от двойной
-- записи если update'ы вдруг приходят дважды (бывает на retry).
CREATE UNIQUE INDEX uq_donations_telegram_payment_charge_id ON donations(telegram_payment_charge_id);

COMMENT ON COLUMN donations.stars IS 'Сколько Telegram Stars пользователь задонатил';
COMMENT ON COLUMN donations.payload IS 'Наш custom payload из invoice (donate-{userId}-{stars})';
