// The Components page: every part the AI can write, drawn live by the real runtime, with
// example screens from a teaching + agentic chat (core/showcase/*.prism) and the part's inputs
// (core/catalog.json). The theme bar changes the brand the same way an app would.
import { useState } from "react";
import { Highlight } from "./Highlight";
import showcaseJson from "../../core/dist/showcase.json";
import catalogJson from "../../core/catalog.json";
import { PrismWidget } from "./Widget";
import { DEFAULT_THEME, type Scheme, type Theme } from "./brand";
import type { Envelope } from "./types";

type Shot = { id: string; part: string; title: string; ask: string; source: string; envelope: Envelope };
type PropSpec = { type?: unknown; required?: boolean; hidden?: boolean; default?: unknown; description?: string; min?: number; max?: number };
type PartSpec = { description: string; children?: unknown; props?: Record<string, PropSpec>; sameAs?: string; hidden?: boolean };

const shots = showcaseJson as unknown as Shot[];
const catalog = catalogJson as unknown as { parts: Record<string, PartSpec>; blocks: Record<string, { props: Record<string, PropSpec> }> };

// Grouped by the job the part does in a chat (PARTS.md section 2).
const GROUPS: { name: string; blurb: string; parts: string[] }[] = [
  { name: "Explain", blurb: "Teach something and make it clear.", parts: ["Text", "Steps", "Flow", "Code", "Reveal", "Callout", "Chart"] },
  { name: "Show facts", blurb: "Numbers, summaries and side-by-side choices.", parts: ["Field", "Stat", "Compare", "Badge", "Card"] },
  { name: "Ask the user", blurb: "Quick answers, with native controls.", parts: ["Options", "Form", "Choice", "Slider", "Switch", "Input", "Select", "Button"] },
  { name: "Act", blurb: "An agent shows its plan, asks before acting, and says where facts came from.", parts: ["Plan", "Confirm", "Sources"] },
  { name: "Check understanding", blurb: "See what stuck, show how far along.", parts: ["Quiz", "Progress"] },
  { name: "Keep talking", blurb: "Lead to the next question.", parts: ["FollowUps", "Carousel"] },
  { name: "Layout", blurb: "Put parts in a column or side by side.", parts: ["Row"] },
];

// Not built yet (PARTS.md section 7).
const PLANNED: { name: string; group: string; text: string }[] = [
  { name: "Flashcard", group: "Check", text: "A card to flip: the question on the front, the answer on the back." },
  { name: "Term", group: "Explain", text: "A word you can tap to see what it means." },
  { name: "Activity", group: "Act", text: "One live line while the agent works: searching, reading 3 pages…" },
];

const ACCENTS: { name: string; value: string | null; corners?: string }[] = [
  { name: "Coral", value: "#FF5A4E" },
  { name: "Azure", value: "#4C8DFF" },
  { name: "Mint", value: "#3DDC97" },
];

const partShots = (part: string) => shots.filter((s) => s.part === part);
/** The first sentence: catalog descriptions go on with rules for the AI, which a tile doesn't need. */
const firstSentence = (text: string) => (text.match(/^.*?[.:](\s|$)/)?.[0] ?? text).trim().replace(/:$/, ".");
const groupOf = (part: string) => GROUPS.find((g) => g.parts.includes(part));

export function Components({ part, theme, setTheme }: { part: string | null; theme: Theme; setTheme: (t: Theme) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const match = (name: string) => !q || name.toLowerCase().includes(q);
  return (
    <div className="cl">
      <aside className="cl-side">
        <input className="cl-search" placeholder="Search parts" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search parts" />
        <a href="#/components" className={"cl-nav-item" + (part ? "" : " active")}>Overview</a>
        {GROUPS.map((g) => {
          const items = g.parts.filter(match);
          if (!items.length) return null;
          return (
            <div key={g.name} className="cl-nav-group">
              <div className="cl-nav-title">{g.name}</div>
              {items.map((p) => (
                <a key={p} href={`#/components/${p}`} className={"cl-nav-item" + (part === p ? " active" : "")}>{p}</a>
              ))}
            </div>
          );
        })}
        {PLANNED.some((p) => match(p.name)) && (
          <div className="cl-nav-group">
            <div className="cl-nav-title">Planned</div>
            {PLANNED.filter((p) => match(p.name)).map((p) => (
              <span key={p.name} className="cl-nav-item planned">{p.name}<span className="cl-pill">soon</span></span>
            ))}
          </div>
        )}
      </aside>
      <section className="cl-main">
        <ThemeBar theme={theme} setTheme={setTheme} />
        {part && catalog.parts[part] ? <PartPage part={part} /> : <Overview />}
      </section>
    </div>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: T[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="cl-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o} role="radio" aria-checked={value === o} className={value === o ? "on" : ""} onClick={() => onChange(o)}>
          {o[0].toUpperCase() + o.slice(1)}
        </button>
      ))}
    </div>
  );
}

function ThemeBar({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const set = (patch: Partial<Theme>) => setTheme({ ...theme, ...patch });
  const custom = theme.accent && !ACCENTS.some((a) => a.value === theme.accent);
  return (
    <div className="cl-themebar">
      <div className="cl-field">
        <span className="cl-label">Brand colour</span>
        <div className="cl-swatches">
          {ACCENTS.map((a) => (
            <button key={a.name} title={a.name} aria-label={a.name}
              className={"cl-swatch" + (theme.accent === a.value ? " on" : "")}
              style={{ background: a.value ?? "#FF5A4E" }} onClick={() => set({ accent: a.value })} />
          ))}
          <label className={"cl-swatch cl-swatch-custom" + (custom ? " on" : "")} title="Your own colour"
            style={custom ? { background: theme.accent! } : undefined}>
            <input type="color" value={theme.accent ?? "#FF5A4E"} onChange={(e) => set({ accent: e.target.value.toUpperCase() })} />
          </label>
        </div>
      </div>
      <div className="cl-field">
        <span className="cl-label">Corners</span>
        <Segmented label="Corners" value={theme.corners} options={["rounded", "square", "pill"]} onChange={(corners) => set({ corners })} />
      </div>
      <div className="cl-field">
        <span className="cl-label">Mode</span>
        <Segmented<Scheme> label="Mode" value={theme.scheme} options={["system", "light", "dark"]} onChange={(scheme) => set({ scheme })} />
      </div>
      <button className="cl-reset" onClick={() => setTheme(DEFAULT_THEME)}>Reset</button>
    </div>
  );
}

function Overview() {
  const built = GROUPS.flatMap((g) => g.parts).length;
  return (
    <div className="cl-overview">
      <div className="cl-hero">
        <svg className="cl-hero-mark" viewBox="8 6 104 108" aria-hidden="true">
          <defs>
            <linearGradient id="hero-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FF5A4E" stopOpacity="0.9" /><stop offset="1" stopColor="#FFB38A" stopOpacity="0.6" /></linearGradient>
            <linearGradient id="hero-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3DDC97" stopOpacity="0.8" /><stop offset="1" stopColor="#3CC8E0" stopOpacity="0.5" /></linearGradient>
            <linearGradient id="hero-c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E7E5E4" stopOpacity="0.7" /><stop offset="0.5" stopColor="#A9C6FF" stopOpacity="0.35" /><stop offset="1" stopColor="#4C8DFF" stopOpacity="0.35" /></linearGradient>
          </defs>
          <rect x="12" y="10" width="58" height="72" rx="12" fill="url(#hero-a)" />
          <rect x="31" y="24" width="58" height="72" rx="12" fill="url(#hero-b)" />
          <rect x="50" y="38" width="58" height="72" rx="12" fill="url(#hero-c)" />
          <rect x="50.5" y="38.5" width="57" height="71" rx="11.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth="1.1" />
        </svg>
        <h1>Components</h1>
        <p>
          The parts an AI can use in a Prism chat. The AI only says what each thing <em>means</em>. The part decides
          how it looks, and the app's brand gives the colour. Change the brand above and every part follows.
        </p>
        <div className="cl-facts">
          <span><strong>{built}</strong> built</span>
          <span><strong>{PLANNED.length}</strong> planned</span>
          <span><strong>0</strong> colours picked by the AI</span>
        </div>
      </div>
      {GROUPS.map((g) => (
        <section key={g.name} className="cl-group">
          <div className="cl-group-head">
            <h2>{g.name}</h2>
            <p>{g.blurb}</p>
          </div>
          <div className="cl-grid">
            {g.parts.map((p) => <Tile key={p} part={p} />)}
          </div>
        </section>
      ))}
      <section className="cl-group">
        <div className="cl-group-head">
          <h2>Planned</h2>
          <p>Next in the library (PARTS.md). Not drawn yet.</p>
        </div>
        <div className="cl-grid">
          {PLANNED.map((p) => (
            <div key={p.name} className="cl-tile planned">
              <div className="cl-tile-body">
                <div className="cl-tile-name">{p.name}<span className="cl-pill">{p.group}</span></div>
                <div className="cl-tile-text">{p.text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Tile({ part }: { part: string }) {
  const shot = partShots(part)[0];
  return (
    <a className="cl-tile" href={`#/components/${part}`}>
      <div className="cl-tile-preview" inert>
        {shot && <PrismWidget envelope={shot.envelope} />}
      </div>
      <div className="cl-tile-body">
        <div className="cl-tile-name">{part}<span className="cl-count">{partShots(part).length} example{partShots(part).length === 1 ? "" : "s"}</span></div>
        <div className="cl-tile-text">{firstSentence(catalog.parts[part].description)}</div>
      </div>
    </a>
  );
}

function PartPage({ part }: { part: string }) {
  const spec = catalog.parts[part];
  const group = groupOf(part);
  return (
    <div className="cl-part">
      <div className="cl-crumbs"><a href="#/components">Components</a> / {group?.name}</div>
      <h1>{part}</h1>
      <p className="cl-lead">{spec.description}</p>
      {partShots(part).map((s) => <ShotRow key={s.id} shot={s} />)}
      <Inputs part={part} spec={spec} />
    </div>
  );
}

function ShotRow({ shot }: { shot: Shot }) {
  const [round, setRound] = useState(0);
  return (
    <section className="cl-shot">
      <div className="cl-shot-head">
        <h3>{shot.title}</h3>
        <button className="cl-reset" onClick={() => setRound((r) => r + 1)}>Reset</button>
      </div>
      <div className="cl-shot-body">
        <div className="cl-phone">
          {shot.ask && <div className="cl-user">{shot.ask}</div>}
          <div className="cl-assistant">
            <PrismWidget key={round} envelope={shot.envelope} />
          </div>
        </div>
        <div className="cl-source">
          <div className="cl-source-head">What the AI wrote</div>
          <pre><Highlight code={shot.source.trim()} /></pre>
        </div>
      </div>
    </section>
  );
}

function typeText(t: unknown): string {
  if (typeof t === "string") return t;
  if (t && typeof t === "object" && Array.isArray((t as { enum?: string[] }).enum)) return (t as { enum: string[] }).enum.join(" | ");
  return "value";
}

function Inputs({ part, spec }: { part: string; spec: PartSpec }) {
  const props = spec.props ?? (spec.sameAs ? catalog.blocks[spec.sameAs]?.props : undefined) ?? {};
  const rows = Object.entries(props).filter(([, p]) => !p.hidden);
  const inside = typeof spec.children === "string" ? spec.children
    : spec.children && typeof spec.children === "object" ? `only ${((spec.children as { only?: string[] }).only ?? []).join(", ")}` : "";
  return (
    <section className="cl-inputs">
      <h2>Inputs</h2>
      {inside && inside !== "none" && <p className="cl-muted">Inside {part}: {inside}.</p>}
      {rows.length === 0 ? <p className="cl-muted">No inputs. The AI just writes the part.</p> : (
        <table>
          <thead><tr><th>Input</th><th>Type</th><th>What it does</th></tr></thead>
          <tbody>
            {rows.map(([name, p]) => (
              <tr key={name}>
                <td><code>{name}</code>{p.required && <span className="cl-req" title="Required">required</span>}</td>
                <td><span className="cl-type">{typeText(p.type)}</span></td>
                <td>{p.description}{p.default !== undefined && p.default !== false && <span className="cl-muted"> Default: {String(p.default)}.</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
