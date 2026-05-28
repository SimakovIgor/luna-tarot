-- 2026-05-18: state-machine онбординга удалён из бота (имя/ДР/пол собираются в Mini App).
-- Enum BotConversationState упрощён до {NEW, READY}. Старые значения нужно скхлопнуть в NEW,
-- иначе Hibernate валится при чтении строк с AWAITING_*.
UPDATE users
SET conversation_state = 'NEW'
WHERE conversation_state NOT IN ('NEW', 'READY');
