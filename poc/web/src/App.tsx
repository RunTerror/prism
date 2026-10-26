import { useEffect, useState } from "react";
import { ExampleScreen, Gallery } from "./Gallery";
import { Chat } from "./Chat";
import { Playground } from "./Playground";
import { Components } from "./Components";
import { brandVars, cornerVars, DEFAULT_THEME, type Theme } from "./brand";

// Try a brand: the app sets one accent colour (and optionally corners and font); Prism works out the
// rest (DESIGN-SYSTEM.md section 3).

const BRANDS: Record<string, Partial<Theme>> = {
  Default: { accent: null },
  Orange: { accent: "#E8590C", corners: "pill" },
  Green: { accent: "#0A8F5B", corners: "square", font: "Georgia, serif" },
  Purple: { accent: "#7048E8" },
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

// Hash routes: #/  #/example/<id>  #/components[/<Part>]  #/chat  #/playground
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
    : route.startsWith("components") ? "components" : "gallery";
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [brand, setBrand] = useState("Purple"); // matches DEFAULT_THEME
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
        <span className="brand">Prism</span>
        <nav>
          <a href="#/" className={tab === "gallery" ? "active" : ""}>Gallery</a>
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
          : tab === "components" ? <Components part={part ? decodeURIComponent(part[1]) : null} theme={theme} setTheme={setTheme} />
          : example ? <ExampleScreen id={decodeURIComponent(example[1])} /> : <Gallery />}
      </main>
      </div>
    </>
  );
}
