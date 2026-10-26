// Draws a Prism screen tree with React. The part library turns every part into basic blocks
// (box, text, button...), so this draws the 15 blocks only (ARCHITECTURE.md section 9).
// Props arrive complete and checked by the runtime, so blocks only map values to tokens (core/dist/tokens.css).
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { PNode } from "./types";

export type Send = (handlerId: string, value?: unknown) => void;
type PartProps = { node: PNode; send: Send };

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

// Token lookups. The runtime already checked every value, so these only build variable names.
const space = (v: unknown) => `var(--space-${str(v) || "none"})`;
const toneVar = (tone: unknown, role: "solid" | "on-solid" | "soft" | "text") => `var(--tone-${str(tone) || "neutral"}-${role})`;
const font = (kind: "text" | "title", size: unknown): CSSProperties => ({
  fontSize: `var(--${kind}-${str(size) || "md"}-size)`,
  lineHeight: `var(--${kind}-${str(size) || "md"}-line)`,
  ...(kind === "title" ? { fontWeight: `var(--title-${str(size) || "md"}-weight)` as unknown as number } : {}),
});

/** Text children (plain strings) of a text part. */
const text = (node: PNode) => (node.c || []).filter((c) => typeof c === "string").join("");

/** Child nodes; identity is id + k because ids repeat inside lists. */
function kids(node: PNode, send: Send): ReactNode[] {
  return (node.c || []).map((c, i) =>
    typeof c === "string" ? null : <Node key={`${c.id}:${c.k ?? "#" + i}`} node={c} send={send} />
  );
}

const ALIGN: Record<string, string> = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" };
const JUSTIFY: Record<string, string> = { start: "flex-start", center: "center", end: "flex-end", between: "space-between" };
const TEXT_ALIGN: Record<string, CSSProperties["textAlign"]> = { start: "start", center: "center", end: "end" };

// ---------- Drawn the same way as a block of the same name ----------

/** Across by default; `vertical` goes down and fills the height its box gives it. */
const Divider = ({ node }: PartProps) => <div className={node.p?.vertical ? "p-divider is-vertical" : "p-divider"} />;
const Spacer = () => <div className="p-spacer" />;

type Series = { name: string; values: (number | null)[]; tone: string };
const seriesColor = (t: string) => toneVar(t, "solid");

/**
 * Bars are boxes (so they get round tops); lines and areas are one SVG stretched to the box,
 * with strokes that keep their width. Values below zero are drawn from the zero line down.
 */
function Chart({ node }: PartProps) {
  const p = node.p || {};
  const series = (Array.isArray(p.data) ? p.data : []) as Series[];
  const labels = (Array.isArray(p.labels) ? p.labels : []) as string[];
  const kind = str(p.kind) || "bar";
  const count = Math.max(0, ...series.map((s) => s.values.length));
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const hi = Math.max(0, ...all);
  const lo = Math.min(0, ...all);
  const range = hi - lo || 1;
  const pct = (v: number) => ((v - lo) / range) * 100; // 0 at the bottom, 100 at the top
  const zero = pct(0);
  const spoken = (p.label ? p.label + ". " : "") +
    Array.from({ length: count }, (_, i) =>
      `${labels[i] || i + 1}: ${series.map((s) => s.values[i] ?? "no value").join(", ")}`).join("; ");

  const plot =
    kind === "bar" ? (
      <div className="p-chart-bars">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="p-chart-group">
            {series.map((s, j) => {
              const v = s.values[i];
              const up = v === null || v === undefined || v >= 0;
              return (
                <div key={j} className="p-chart-lane">
                  {v !== null && v !== undefined && (
                    <div className={"p-chart-bar" + (up ? "" : " is-down")} style={{
                      background: seriesColor(s.tone),
                      bottom: `${up ? zero : pct(v)}%`,
                      height: `${Math.abs(pct(v) - zero)}%`,
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    ) : (
      <svg className="p-chart-svg" viewBox={`0 0 ${Math.max(count - 1, 1)} 100`} preserveAspectRatio="none">
        {series.map((s, j) => {
          // A gap (null) breaks the line into pieces.
          const pieces: [number, number][][] = [[]];
          s.values.forEach((v, i) => {
            if (v === null) pieces.push([]);
            else pieces[pieces.length - 1].push([count === 1 ? 0.5 : i, 100 - pct(v)]);
          });
          return pieces.filter((pc) => pc.length).map((pc, k) => {
            const line = pc.map(([x, y]) => `${x},${y}`).join(" ");
            return (
              <g key={`${j}-${k}`}>
                {kind === "area" && (
                  <polygon points={`${pc[0][0]},${100 - zero} ${line} ${pc[pc.length - 1][0]},${100 - zero}`}
                    fill={seriesColor(s.tone)} opacity={0.18} />
                )}
                <polyline points={line} fill="none" stroke={seriesColor(s.tone)} strokeWidth="var(--chart-line-width)"
                  strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </g>
            );
          });
        })}
      </svg>
    );

  return (
    <div className="p-chart" role="img" aria-label={spoken}>
      {series.length > 1 && (
        <div className="p-chart-legend">
          {series.map((s, j) => (
            <span key={j}><i style={{ background: seriesColor(s.tone) }} />{s.name || `Series ${j + 1}`}</span>
          ))}
        </div>
      )}
      <div className="p-chart-plot" style={{ height: `var(--chart-height-${str(p.height) || "md"})` }}>
        <span className="p-chart-max">{hi.toLocaleString()}</span>
        <div className="p-chart-top" />
        <div className="p-chart-zero" style={{ bottom: `${zero}%` }} />
        {plot}
      </div>
      {labels.length > 0 && (
        <div className={"p-chart-labels" + (kind === "bar" ? "" : " is-points")}>
          {Array.from({ length: count }, (_, i) => <span key={i}>{labels[i] ?? ""}</span>)}
        </div>
      )}
    </div>
  );
}

/** The approved images of the envelope being drawn: name -> https address. */
export const ImagesContext = createContext<Record<string, string>>({});

/** Only loads an address from the envelope's appData; a name it doesn't know shows the grey box. */
function Image({ node }: PartProps) {
  const p = node.p || {};
  const images = useContext(ImagesContext);
  const url = images[str(p.src)];
  const [failed, setFailed] = useState(false);
  const alt = str(p.alt);
  return (
    <div className="p-image" style={{ aspectRatio: `var(--image-ratio-${str(p.ratio) || "wide"})` }}>
      {url && !failed ? (
        <img src={url} alt={alt} loading="lazy" referrerPolicy="no-referrer"
          style={{ objectFit: p.fit === "contain" ? "contain" : "cover" }}
          onError={() => setFailed(true)} />
      ) : (
        <span className="p-image-alt">{alt}</span>
      )}
    </div>
  );
}

function Checkbox({ node, send }: PartProps) {
  const p = node.p || {};
  const change = node.on?.change;
  return (
    <label className={"p-check" + (p.disabled ? " is-disabled" : "")}>
      <input type="checkbox" checked={!!p.value} disabled={!!p.disabled}
        onChange={() => change && send(change, !p.value)} />
      {str(p.label) && <span>{str(p.label)}</span>}
    </label>
  );
}

function Switch({ node, send }: PartProps) {
  const p = node.p || {};
  const change = node.on?.change;
  // The browser's own control: a checkbox drawn as a switch (`switch` attribute: Safari; others style it in CSS).
  return (
    <label className={"p-switch-row" + (p.disabled ? " is-disabled" : "")}>
      <span>{str(p.label)}</span>
      <input type="checkbox" role="switch" {...{ switch: "" }} className="p-switch" checked={!!p.value}
        disabled={!!p.disabled} onChange={() => change && send(change, !p.value)} />
    </label>
  );
}

/** Keeps its own text while focused so the cursor never jumps; takes the tree's value otherwise. */
function Input({ node, send }: PartProps) {
  const p = node.p || {};
  const isNumber = p.kind === "number";
  const value = typeof p.value === "number" ? String(p.value) : str(p.value);
  const [local, setLocal] = useState(value);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing && value !== local) setLocal(value);
  }, [value, editing]); // eslint-disable-line react-hooks/exhaustive-deps
  // `number` sends a number, or null when empty (CLIENTS.md section 4).
  const out = (raw: string) => (isNumber ? (raw.trim() === "" || isNaN(Number(raw)) ? null : Number(raw)) : raw);
  const { change, submit } = node.on || {};
  const shared = {
    className: "p-input",
    value: local,
    placeholder: str(p.placeholder) || undefined,
    disabled: !!p.disabled,
    "aria-label": str(p.label) || str(p.placeholder) || undefined,
    onFocus: () => setEditing(true),
    onBlur: () => setEditing(false),
    onChange: (e: { target: { value: string } }) => {
      setLocal(e.target.value);
      if (change) send(change, out(e.target.value));
    },
  };
  const field = p.multiline ? (
    <textarea {...shared} rows={3} />
  ) : (
    <input {...shared} type={isNumber ? "text" : p.kind === "email" ? "email" : "text"}
      inputMode={isNumber ? "decimal" : undefined}
      onKeyDown={(e) => e.key === "Enter" && submit && send(submit, out(local))} />
  );
  return (
    <label className="p-field">
      {str(p.label) && <span className="p-field-label">{str(p.label)}</span>}
      {field}
    </label>
  );
}

/** Same idea as Input: the thumb follows the hand while dragging, then the tree. */
function Slider({ node, send }: PartProps) {
  const p = node.p || {};
  const min = num(p.min, 0);
  const max = num(p.max, 100);
  const step = num(p.step, 1);
  const value = num(p.value, min);
  const [local, setLocal] = useState(value);
  const dragging = useRef(false);
  useEffect(() => {
    if (!dragging.current) setLocal(value);
  }, [value]);
  const change = node.on?.change;
  return (
    <label className="p-field">
      {str(p.label) && <span className="p-field-label">{str(p.label)}</span>}
      <input type="range" className="p-slider" min={min} max={max} step={step === 0 ? "any" : step} value={local}
        disabled={!!p.disabled}
        onPointerDown={() => (dragging.current = true)}
        onPointerUp={() => (dragging.current = false)}
        onBlur={() => (dragging.current = false)}
        onChange={(e) => {
          const v = Number(e.target.value);
          setLocal(v);
          if (change) send(change, v);
        }} />
    </label>
  );
}

/** The browser's own menu. Shows the placeholder while `value` matches no option. */
function Select({ node, send }: PartProps) {
  const p = node.p || {};
  const options = (Array.isArray(p.options) ? p.options : []) as { label: string; value: string }[];
  const value = str(p.value);
  const known = options.some((o) => o.value === value);
  const change = node.on?.change;
  return (
    <label className="p-field">
      {str(p.label) && <span className="p-field-label">{str(p.label)}</span>}
      <select className="p-select" value={known ? value : ""} disabled={!!p.disabled}
        onChange={(e) => change && send(change, e.target.value)}>
        {!known && <option value="" disabled>{str(p.placeholder) || "Choose…"}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

// ---------- Basic blocks (ARCHITECTURE.md section 9) ----------
// The part library builds every part from these. Blocks carry roles and status, never colours.
// Until the theme speaks in roles (DESIGN-SYSTEM.md), they map onto today's tones:
// accent = primary, good = success, warning = warning, bad = danger.

const STATUS_TONE: Record<string, string> = { good: "success", warning: "warning", bad: "danger" };
const statusTone = (s: unknown) => STATUS_TONE[str(s)] || "";
const ARIA_ROLE: Record<string, string> = { group: "group", list: "list", item: "listitem", header: "heading" };

/** box: layout, plus the look of its surface (card, sunk, note, pill). */
function BoxBlock({ node, send }: PartProps) {
  const p = node.p || {};
  const row = p.dir === "row";
  const tone = statusTone(p.status);
  const tint = tone ? toneVar(tone, "soft") : "var(--c-surface-muted)";
  const surface: Record<string, CSSProperties> = {
    card: { background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: "var(--card-radius)" },
    sunk: { background: "var(--c-surface-muted)", borderRadius: "var(--radius-md)" },
    note: { background: tint, borderRadius: "var(--callout-radius)" },
    // A pill has its own padding (badge tokens), whatever `pad` says: less above and below, more at the sides.
    pill: { background: tint, borderRadius: "var(--badge-radius)", alignSelf: "flex-start", width: "fit-content",
      padding: "var(--badge-pad-y) var(--badge-pad-x)", flexShrink: 0 },
  };
  const press = node.on?.press;
  const style: CSSProperties = {
    gap: space(p.gap), padding: space(p.pad),
    alignItems: ALIGN[str(p.align)], justifyContent: JUSTIFY[str(p.justify)],
    flexWrap: p.wrap ? "wrap" : "nowrap",
    ...(p.grow ? { flex: "1 1 0" } : {}),
    ...(surface[str(p.surface)] || {}),
    ...(press ? { cursor: "pointer" } : {}),
  };
  const role = press ? "button" : ARIA_ROLE[str(p.role)];
  return (
    <div className={row ? "p-row" : "p-stack"} style={style} role={role} aria-level={role === "heading" ? 3 : undefined}
      aria-label={str(p.label) || undefined} tabIndex={press ? 0 : undefined}
      onClick={press ? () => send(press) : undefined}
      onKeyDown={press ? (e) => { if (e.key === "Enter" || e.key === " ") send(press); } : undefined}>
      {kids(node, send)}
    </div>
  );
}

/** text: words styled by role (title, body, secondary, number, label). */
function TextBlock({ node }: PartProps) {
  const p = node.p || {};
  const roles: Record<string, CSSProperties> = {
    title: { ...font("title", "md"), color: "var(--c-text)" },
    body: { ...font("text", "md"), color: "var(--c-text)" },
    secondary: { ...font("text", "sm"), color: "var(--c-text-muted)" },
    number: { ...font("title", "lg"), color: "var(--c-text)", fontVariantNumeric: "tabular-nums" },
    label: { ...font("text", "sm"), color: "var(--c-text)", fontWeight: "var(--weight-semibold)" as unknown as number },
    // Code: the code font, kept exactly as written; long lines scroll sideways instead of wrapping.
    code: {
      fontFamily: "var(--font-mono)", fontSize: "var(--text-sm-size)", lineHeight: "var(--text-sm-line)",
      color: "var(--c-text)", whiteSpace: "pre", overflowX: "auto", overflowWrap: "normal", tabSize: 4,
    },
    // A short number or letter in a circle (steps, answers): accent tint, or the status tint.
    count: {
      ...font("text", "sm"), fontWeight: "var(--weight-semibold)" as unknown as number,
      width: "var(--count-size)", height: "var(--count-size)", flexShrink: 0, borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: toneVar("primary", "soft"), color: toneVar("primary", "text"),
    },
  };
  const tone = statusTone(p.status);
  const lines = num(p.lines, 0);
  const style: CSSProperties = {
    ...(roles[str(p.role)] || roles.body),
    ...(p.strong ? { fontWeight: "var(--weight-semibold)" as unknown as number } : {}),
    ...(tone ? { color: toneVar(tone, "text") } : {}),
    ...(tone && p.role === "count" ? { background: toneVar(tone, "solid"), color: toneVar(tone, "on-solid") } : {}),
    textAlign: TEXT_ALIGN[str(p.align)],
    textDecoration: p.strike ? "line-through" : undefined,
    ...(lines ? { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" } : {}),
  };
  return <div className="p-text" data-role={str(p.role) || "body"} style={style}>{text(node)}</div>;
}

/** button: main (accent fill), quiet, danger, plain; selected for choices and tabs. */
function ButtonBlock({ node, send }: PartProps) {
  const p = node.p || {};
  const kinds: Record<string, CSSProperties> = {
    main: { background: toneVar("primary", "solid"), color: toneVar("primary", "on-solid"), borderColor: toneVar("primary", "solid") },
    quiet: { background: "var(--c-surface-muted)", color: toneVar("primary", "text"), borderColor: "transparent" },
    danger: { background: "var(--c-surface-muted)", color: toneVar("danger", "text"), borderColor: "transparent" },
    plain: { background: "transparent", color: toneVar("primary", "text"), borderColor: "transparent" },
  };
  const selected: CSSProperties = p.selected && p.kind !== "main"
    ? { background: toneVar("primary", "soft"), borderColor: toneVar("primary", "solid") } : {};
  const style: CSSProperties = {
    height: "var(--control-md)", padding: "0 var(--button-pad-x-md)", ...font("text", "md"),
    ...(kinds[str(p.kind)] || kinds.quiet), ...selected,
    ...(p.full ? { width: "100%" } : {}),
  };
  const press = node.on?.press;
  return (
    <button className="p-button" style={style} disabled={!!p.disabled} aria-pressed={p.selected ? true : undefined}
      aria-label={str(p.label) || undefined} onClick={() => press && !p.disabled && send(press)}>
      {text(node)}
    </button>
  );
}

/** progress: a bar from 0 to 1; the accent, or a status colour. */
function ProgressBlock({ node }: PartProps) {
  const p = node.p || {};
  const value = Math.max(0, Math.min(1, num(p.value, 0)));
  const tone = statusTone(p.status) || "primary";
  return (
    <div className="p-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)} aria-label={str(p.label) || undefined}>
      <div className="p-progress-fill" style={{ width: `${value * 100}%`, background: toneVar(tone, "solid") }} />
    </div>
  );
}

/** pager: swipe sideways; card-width pages that peek, or full-width pages that snap. */
function PagerBlock({ node, send }: PartProps) {
  const p = node.p || {};
  return (
    <div className={`p-pager${p.peek === false ? " p-pager-full" : ""}`} style={{ gap: space(p.gap) }}>
      {kids(node, send)}
    </div>
  );
}

/** collapse: its children, only when open. */
function CollapseBlock({ node, send }: PartProps) {
  return node.p?.open ? <div className="p-stack">{kids(node, send)}</div> : null;
}

const BLOCKS: Record<string, (props: PartProps) => ReactNode> = {
  box: BoxBlock, text: TextBlock, button: ButtonBlock, progress: ProgressBlock, pager: PagerBlock, collapse: CollapseBlock,
  divider: Divider, spacer: Spacer,
  // Same inputs as the parts of the same name, so the same drawing.
  image: (props) => <Image {...props} />, chart: (props) => <Chart {...props} />,
  checkbox: (props) => <Checkbox {...props} />, switch: (props) => <Switch {...props} />,
  slider: (props) => <Slider {...props} />, input: (props) => <Input {...props} />, select: (props) => <Select {...props} />,
};

/** Draws one basic block. Unknown names draw nothing. */
export function Node({ node, send }: PartProps) {
  const Part = BLOCKS[node.t];
  return Part ? <Part node={node} send={send} /> : null;
}
