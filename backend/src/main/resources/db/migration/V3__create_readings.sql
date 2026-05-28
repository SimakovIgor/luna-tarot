CREATE TABLE readings (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT      NOT NULL,
    type            VARCHAR(32) NOT NULL,
    question        TEXT        NULL,
    interpretation  TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_readings_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_readings_user_id ON readings (user_id);
CREATE INDEX idx_readings_user_id_created_at ON readings (user_id, created_at DESC);

CREATE TABLE reading_cards (
    reading_id BIGINT   NOT NULL,
    position   SMALLINT NOT NULL,
    card_id    BIGINT   NOT NULL,
    PRIMARY KEY (reading_id, position),
    CONSTRAINT fk_reading_cards_reading_id FOREIGN KEY (reading_id) REFERENCES readings (id) ON DELETE CASCADE,
    CONSTRAINT fk_reading_cards_card_id FOREIGN KEY (card_id) REFERENCES tarot_cards (id)
);

CREATE INDEX idx_reading_cards_card_id ON reading_cards (card_id);
