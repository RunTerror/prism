// Code colouring for prism code (JavaScript + JSX), used on the Components page and in the
// Playground. Plain regular expressions: good enough for short screen code, no editor library.
import { useMemo, useRef, type ReactNode } from "react";

// Order matters: comments and strings first, so a keyword inside a string stays a string.
const TOKENS = new RegExp([
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/.source,                       // 1 comment
  /("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)/.source, // 2 string
  /(<\/?[A-Za-z][\w.]*|\/?>)/.source,                           // 3 tag
  /(\b[A-Za-z_][\w]*(?==))/.source,                              // 4 attribute name
  /(\b(?:const|let|var|function|return|if|else|for|of|in|new|true|false|null|undefined|useState|P)\b)/.source, // 5 keyword
  /(\b\d+(?:\.\d+)?\b)/.source,                                  // 6 number
  /(=>|[{}])/.source,                                            // 7 punctuation that shapes JSX
].join("|"), "g");
const CLASS = ["", "c", "s", "t", "a", "k", "n", "p"];

/** Coloured spans for one piece of code. */
function colour(code: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0, i = 0, m: RegExpExecArray | null;
  TOKENS.lastIndex = 0;
  while ((m = TOKENS.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const group = m.findIndex((g, n) => n > 0 && g !== undefined);
    out.push(<span key={`${key}-${i++}`} className={"hl-" + CLASS[group]}>{m[0]}</span>);
    last = m.index + m[0].length;
  }
  out.push(code.slice(last));
  return out;
}

/**
 * A whole text: code is coloured; in a Markdown reply only what is inside ```prism blocks is,
 * and the words around it stay plain.
 */
function colourText(text: string): ReactNode[] {
  if (!/```prism/.test(text)) return colour(text, "c");
  const out: ReactNode[] = [];
  const re = /(```prism[^\n]*\n)([\s\S]*?)(```|$)/g;
  let last = 0, i = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<span key={`t${i}`} className="hl-prose">{text.slice(last, m.index)}</span>);
    out.push(<span key={`o${i}`} className="hl-fence">{m[1]}</span>, ...colour(m[2], `b${i}`));
    if (m[3]) out.push(<span key={`e${i}`} className="hl-fence">{m[3]}</span>);
    last = m.index + m[0].length;
    i++;
    if (m[0].length === 0) break;
  }
  if (last < text.length) out.push(<span key="end" className="hl-prose">{text.slice(last)}</span>);
  return out;
}

/** Read-only coloured code. */
export function Highlight({ code }: { code: string }) {
  const parts = useMemo(() => colourText(code), [code]);
  return <code>{parts}</code>;
}

/**
 * An editable code box with colours and line numbers. The coloured copy is drawn underneath and a
 * see-through textarea sits exactly on top, so typing, pasting and selecting work as in any text
 * box. Lines don't wrap: long lines scroll sideways, and the copy and the numbers follow.
 *   marks: line numbers (from 1) to flag in the margin, e.g. where the compiler found a problem.
 */
export function CodeEditor({ value, onChange, label, marks = [] }:
  { value: string; onChange: (v: string) => void; label: string; marks?: number[] }) {
  const view = useRef<HTMLPreElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const parts = useMemo(() => colourText(value), [value]);
  const lines = value.split("\n").length;
  const marked = new Set(marks);
  return (
    <div className="code-editor">
      <div className="code-editor-gutter" aria-hidden="true">
        <div ref={gutter}>
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} className={marked.has(i + 1) ? "is-marked" : undefined}>{i + 1}</div>
          ))}
        </div>
      </div>
      <div className="code-editor-body">
        {/* The trailing newline keeps the last empty line as tall as the textarea's. */}
        <pre ref={view} className="code-editor-view" aria-hidden="true"><code>{parts}{"\n"}</code></pre>
        <textarea className="code-editor-input" value={value} aria-label={label} spellCheck={false}
          wrap="off" autoCapitalize="off" autoCorrect="off"
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => {
            const { scrollTop, scrollLeft } = e.currentTarget;
            if (view.current) view.current.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
            if (gutter.current) gutter.current.style.transform = `translateY(${-scrollTop}px)`;
          }} />
      </div>
    </div>
  );
}

// JSON: keys, text values, numbers and true/false/null each get their own colour.
const JSON_TOKENS = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|\b(true|false|null)\b/gi;

/** Read-only coloured JSON, for any value. */
export function JsonView({ value, className }: { value: unknown; className?: string }) {
  const text = JSON.stringify(value, null, 2) ?? "";
  const parts = useMemo(() => {
    const out: ReactNode[] = [];
    let last = 0, i = 0, m: RegExpExecArray | null;
    JSON_TOKENS.lastIndex = 0;
    while ((m = JSON_TOKENS.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      if (m[1] && m[2]) out.push(<span key={i++} className="hl-key">{m[1]}</span>, m[2]);
      else if (m[1]) out.push(<span key={i++} className="hl-s">{m[1]}</span>);
      else out.push(<span key={i++} className={m[3] ? "hl-n" : "hl-k"}>{m[0]}</span>);
      last = m.index + m[0].length;
    }
    out.push(text.slice(last));
    return out;
  }, [text]);
  return <pre className={"json-view " + (className ?? "")}><code>{parts}</code></pre>;
}
