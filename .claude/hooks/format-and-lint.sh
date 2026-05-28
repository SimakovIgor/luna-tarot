#!/usr/bin/env bash
# Post-edit hook: форматирование + статический анализ Java-файлов в backend/
# Запускается автоматически после каждого Edit/Write инструмента Claude.
# Не-Java файлы и файлы вне backend/src — пропускает (frontend, landing, docs).

FILE=$(echo "$CLAUDE_TOOL_INPUT" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file_path',''))" 2>/dev/null \
  || echo "")

# Обрабатываем только .java файлы внутри backend/src
if [[ "$FILE" != *.java ]]; then
  exit 0
fi
if [[ "$FILE" != */backend/src/* ]]; then
  exit 0
fi

# Найти корень репозитория (git, если есть) → потом backend/
REPO_ROOT="$(git -C "$(dirname "$FILE")" rev-parse --show-toplevel 2>/dev/null || echo "")"
if [[ -z "$REPO_ROOT" ]]; then
  REPO_ROOT="${FILE%%/backend/*}"
fi
BACKEND_DIR="$REPO_ROOT/backend"

if [[ ! -x "$BACKEND_DIR/gradlew" ]]; then
  echo "format-and-lint: gradlew не найден в $BACKEND_DIR — пропускаю."
  exit 0
fi

echo "========================================"
echo "  File: $(basename "$FILE")"
echo "========================================"

# --- 1. Форматирование через IntelliJ IDEA (опционально, если установлена) ---
IDEA_FORMAT=""
for candidate in \
    "$HOME/Applications/IntelliJ IDEA.app/Contents/bin/format.sh" \
    "/Applications/IntelliJ IDEA.app/Contents/bin/format.sh"; do
  if [[ -f "$candidate" ]]; then
    IDEA_FORMAT="$candidate"
    break
  fi
done

if [[ -n "$IDEA_FORMAT" ]]; then
  echo ""
  echo ">>> [1/3] Форматирование (IntelliJ)..."
  FORMAT_OUT=$("$IDEA_FORMAT" "$FILE" 2>&1)
  if echo "$FORMAT_OUT" | grep -q "Only one instance"; then
    echo "    IDE запущена — форматирование недоступно."
    echo "    Совет: включи Actions on Save → Reformat Code в IntelliJ."
  else
    echo "$FORMAT_OUT"
    echo "    Готово."
  fi
else
  echo ""
  echo ">>> [1/3] IntelliJ format.sh не найден — форматирование пропущено."
fi

# --- 2. Статический анализ ---
if [[ "$FILE" == */src/test/* ]]; then
  CS_TASK="checkstyleTest"
  PMD_TASK="pmdTest"
  SB_TASK="spotbugsTest"
else
  CS_TASK="checkstyleMain"
  PMD_TASK="pmdMain"
  SB_TASK="spotbugsMain"
fi

cd "$BACKEND_DIR" || exit 0

echo ""
echo ">>> [2/3] Checkstyle + PMD ($CS_TASK, $PMD_TASK)..."
./gradlew "$CS_TASK" "$PMD_TASK" --quiet --continue 2>&1 \
  | grep -v "^$" \
  | tail -60

echo ""
echo ">>> [3/3] SpotBugs ($SB_TASK)..."
./gradlew "$SB_TASK" --quiet --continue 2>&1 \
  | grep -v "^$" \
  | tail -40
echo "========================================"
echo "  Напоминание: перед завершением задачи запусти ./gradlew build"
echo "========================================"
