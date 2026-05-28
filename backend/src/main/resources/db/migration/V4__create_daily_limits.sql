CREATE TABLE daily_limits (
    user_id        BIGINT NOT NULL,
    day            DATE   NOT NULL,
    readings_count INT    NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day),
    CONSTRAINT fk_daily_limits_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
