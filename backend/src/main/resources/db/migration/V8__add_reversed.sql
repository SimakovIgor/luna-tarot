ALTER TABLE tarot_cards
    ADD COLUMN reversed_meaning TEXT NULL;

ALTER TABLE reading_cards
    ADD COLUMN reversed BOOLEAN NOT NULL DEFAULT FALSE;
