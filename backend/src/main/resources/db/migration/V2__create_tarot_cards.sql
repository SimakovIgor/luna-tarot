CREATE TABLE tarot_cards (
    id              BIGSERIAL PRIMARY KEY,
    arcana          VARCHAR(16) NOT NULL,
    numeral         SMALLINT    NOT NULL,
    name_ru         VARCHAR(64) NOT NULL,
    name_en         VARCHAR(64) NOT NULL,
    keywords        JSONB       NOT NULL,
    upright_meaning TEXT        NOT NULL,
    image_path      VARCHAR(255) NULL
);

CREATE UNIQUE INDEX uq_tarot_cards_arcana_numeral ON tarot_cards (arcana, numeral);
