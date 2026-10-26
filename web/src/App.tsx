import { useEffect, useState } from "react";
import { ExampleScreen } from "./Examples";
import { Chat } from "./Chat";
import { Playground } from "./Playground";
import { Components } from "./Components";
import { brandVars, cornerVars, DEFAULT_THEME, type Theme } from "./brand";

// Try a brand: the app sets one accent colour (and optionally corners and font); Prism works out the
// rest (DESIGN-SYSTEM.md section 3).

const BRANDS: Record<string, Partial<Theme>> = {
  Azure: { accent: "#4C8DFF" },
  Coral: { accent: "#FF5A4E", corners: "pill" },
  Mint: { accent: "#3DDC97", corners: "square", font: "Georgia, serif" },
};
const BRAND_VARS = ["--tone-primary-solid", "--tone-primary-on-solid", "--tone-primary-soft", "--tone-primary-text",
  ...Object.keys(cornerVars("square")), ...Object.keys(cornerVars("pill"))];

/** Applies the theme as CSS variables on the page, for the current light/dark mode. */
function useTheme(theme: Theme) {
  useEffect(() => {
    const root = document.documentElement;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      for (const name of new Set(BRAND_VARS)) root.style.removeProperty(name);
      if (theme.scheme === "system") root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", theme.scheme);
      // The app's font is for Prism parts only (.prism-widget), never the page around them.
      if (theme.font) root.style.setProperty("--prism-font", theme.font);
      else root.style.removeProperty("--prism-font");
      const dark = theme.scheme === "dark" || (theme.scheme === "system" && media.matches);
      const vars = { ...(theme.accent ? brandVars(theme.accent, dark ? "dark" : "light") : {}), ...cornerVars(theme.corners) };
      for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
}

// Hash routes: #/ (= components)  #/components[/<Part>]  #/example/<id>  #/chat  #/playground
function useRoute() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const onChange = () => setHash(location.hash);
    addEventListener("hashchange", onChange);
    return () => removeEventListener("hashchange", onChange);
  }, []);
  return hash.replace(/^#\/?/, "");
}

export function App() {
  const route = useRoute();
  const example = route.match(/^example\/(.+)$/);
  const part = route.match(/^components\/(.+)$/);
  const tab = route.startsWith("playground") ? "playground" : route.startsWith("chat") ? "chat"
    : example ? "example" : "components";
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [brand, setBrand] = useState("Azure"); // matches DEFAULT_THEME
  useTheme(theme);
  const pickBrand = (name: string) => {
    setBrand(name);
    setTheme({ ...DEFAULT_THEME, ...BRANDS[name], scheme: theme.scheme });
  };
  return (
    <>
      {/* One width on every tab, so the tab bar never moves; only the content below changes width. */}
      <header className="header">
        <div className="header-inner">
        <a href="#/" className="brand" aria-label="Prism, home">
          {/* The logo mark (brand/): three glass panes. Colours come from the --pr-mark-* variables. */}
          <svg className="brand-mark" viewBox="8 6 104 108" aria-hidden="true">
            <rect x="12" y="10" width="58" height="72" rx="12" fill="var(--pr-mark-a)" />
            <rect x="31" y="24" width="58" height="72" rx="12" fill="var(--pr-mark-b)" />
            <rect x="50" y="38" width="58" height="72" rx="12" fill="var(--pr-mark-c)" />
          </svg>
          <span className="brand-word">prism</span>
        </a>
        <nav>
          <a href="#/components" className={tab === "components" ? "active" : ""}>Components</a>
          <a href="#/chat" className={tab === "chat" ? "active" : ""}>Chat</a>
          <a href="#/playground" className={tab === "playground" ? "active" : ""}>Playground</a>
        </nav>
        {/* Components has its own theme bar: the picker keeps its place but hides there. */}
        <select className="brand-pick" aria-label="Brand colour" value={brand} onChange={(e) => pickBrand(e.target.value)}
          style={tab === "components" ? { visibility: "hidden" } : undefined} tabIndex={tab === "components" ? -1 : undefined}>
          {Object.keys(BRANDS).map((b) => <option key={b}>{b}</option>)}
        </select>
        </div>
      </header>
      <div className={tab === "components" ? "app app-wide" : "app"}>
      <main>
        {tab === "chat" ? <Chat />
          : tab === "playground" ? <Playground />
          : example ? <ExampleScreen id={decodeURIComponent(example[1])} />
          : <Components part={part ? decodeURIComponent(part[1]) : null} theme={theme} setTheme={setTheme} />}
      </main>
      </div>
    </>
  );
}
