-- Дневник «как сбылось»: рефлексия пользователя по уже выполненному раскладу.
-- Все три поля nullable: до отметки outcome — расклад просто хранится как раньше.

ALTER TABLE readings
    ADD COLUMN outcome_status VARCHAR(16) NULL,
    ADD COLUMN outcome_note TEXT NULL,
    ADD COLUMN outcome_recorded_at TIMESTAMPTZ NULL;

-- Частичный индекс на ещё не помеченные расклады — пригодится для напоминалок
-- (raise: «у тебя 5 раскладов ждут, когда ты закроешь петлю»).
CREATE INDEX idx_readings_user_outcome_pending
    ON readings (user_id, created_at DESC)
    WHERE outcome_status IS NULL;
