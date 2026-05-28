ALTER TABLE users
    ADD COLUMN gender VARCHAR(16) NOT NULL DEFAULT 'UNSPECIFIED';

-- Старые записи (если есть) получают UNSPECIFIED — Luna будет говорить нейтрально.
