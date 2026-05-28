CREATE TABLE users (
    id                  BIGSERIAL PRIMARY KEY,
    tg_user_id          BIGINT       NOT NULL,
    name                VARCHAR(120) NOT NULL,
    birth_date          DATE         NULL,
    zodiac              VARCHAR(32)  NULL,
    life_path_number    SMALLINT     NULL,
    lunar_phase         VARCHAR(32)  NULL,
    conversation_state  VARCHAR(48)  NOT NULL DEFAULT 'NEW',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_users_tg_user_id ON users (tg_user_id);
CREATE INDEX idx_users_conversation_state ON users (conversation_state);
