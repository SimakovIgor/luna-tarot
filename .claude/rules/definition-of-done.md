# Definition of Done

Перед тем как считать задачу завершённой, выполнить все пункты ниже **в этом порядке**.

## 1. Форматирование по `.editorconfig`

Перед билдом переформатировать **только изменённые файлы** (не весь проект):

- **IntelliJ IDEA**: Code → Reformat Code (с «Optimize imports», «Cleanup») на изменённых файлах.
- Не коммитить чужие переформатирования — это раздувает diff и затрудняет ревью.

## 2. Полный билд + статические анализаторы

```bash
cd backend && ./gradlew clean build
```

- Не пушим красный билд.
- Предупреждения Checkstyle / PMD / SpotBugs **фиксим**, а не подавляем через `@SuppressWarnings`
  (политика — см. `code-style.md`: сначала рефакторить, suppress только при техническом false-positive).
- Упавший тест из-за нашего изменения — чиним по сути. `@Disabled` только с обоснованием и ссылкой на тикет.

## 3. Покрытие тестами + Jacoco

```bash
cd backend && ./gradlew jacocoTestReport jacocoTestCoverageVerification
```

Текущие пороги (`backend/build.gradle.kts`) — стартовые, повышаем по мере роста кодовой базы:

| Метрика  | Минимум |
|----------|---------|
| Lines    | 60%     |
| Branches | 50%     |
| Methods  | 65%     |

- Новые классы/методы покрываем тестами — не опускаем общий coverage ниже порогов.
- Если новые тесты **повысили** coverage — актуализировать пороги в `build.gradle.kts`, чтобы откат был невозможен.
- Снижать пороги нельзя без явной договорённости и комментария в PR.

## 4. Mini App (когда появится Phase 5)

Для изменений в `frontend/`:

```bash
cd frontend && npm run lint && npm run typecheck && npm run build
```

Все три зелёные перед push.

## Чек-лист перед `git push`

- [ ] Изменённые файлы отформатированы по `.editorconfig` (сначала).
- [ ] `./gradlew clean build` — зелёный.
- [ ] Checkstyle / PMD / SpotBugs — без новых предупреждений.
- [ ] Jacoco прогнан, пороги при необходимости повышены.
- [ ] (Если есть изменения во frontend) `npm run lint && npm run typecheck && npm run build` — зелёные.
- [ ] В диффе нет мусора: лишних реформатирований, закомментированного кода, отладочных `println`.
