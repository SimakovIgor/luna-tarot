/**
 * Рубашка карты Luna. Берётся из новой колоды (back.webp) — это та же графика,
 * которая используется на splash, hub day-card, fan-pickup, draw stack.
 *
 * uid prop оставлен для обратной совместимости (раньше использовался для
 * SVG <defs id="...">, чтобы при нескольких рубашках в DOM не пересекались
 * градиенты). С image-рубашкой uid не нужен, но менять сигнатуру нет смысла.
 */
interface CardBackProps {
  uid?: string;
}

export function CardBack({ uid: _uid = 'def' }: CardBackProps) {
  void _uid;
  return (
    <img
      src="/app/cards/back.jpg?v=4"
      alt=""
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
      draggable={false}
    />
  );
}
