import { Fragment } from 'react';
import styles from './RichText.module.css';

interface RichTextProps {
  /** Сырой LLM-вывод. Может содержать **жирный** (markdown) и переводы строк. */
  source: string;
  /** Доп. класс на корневой span. */
  className?: string;
}

interface Part {
  text: string;
  bold: boolean;
}

function splitBold(input: string): Part[] {
  const out: Part[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) {
    if (match.index > lastIndex) {
      out.push({ text: input.slice(lastIndex, match.index), bold: false });
    }
    out.push({ text: match[1], bold: true });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < input.length) {
    out.push({ text: input.slice(lastIndex), bold: false });
  }
  return out.length > 0 ? out : [{ text: input, bold: false }];
}

/**
 * Превращает текст LLM-ответа в React-узлы:
 *  - `**жирный**` → `<strong>жирный</strong>`
 *  - переносы строк сохраняются (через white-space:pre-wrap на родителе)
 *
 * Без зависимостей и DOM-санитайзера: парсим только пары `**`. Если модель вернёт
 * несимметричные `**` — оставим как текст.
 */
export function RichText({ source, className }: RichTextProps) {
  const parts = splitBold(source);
  return (
    <span className={[styles.root, className].filter(Boolean).join(' ')}>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part.bold ? <strong className={styles.bold}>{part.text}</strong> : part.text}
        </Fragment>
      ))}
    </span>
  );
}
