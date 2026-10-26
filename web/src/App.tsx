import { useEffect, useState } from "react";
import { ExampleScreen } from "./Examples";
import { Chat } from "./Chat";
import { Playground } from "./Playground";
import { Components } from "./Components";
import { Mark } from "./Mark";
import { brandVars, cornerVars, DEFAULT_THEME, type Theme } from "./brand";

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
  useTheme(theme);
  // "system" follows the computer; the button then switches to the other one for good.
  const dark = theme.scheme === "dark" || (theme.scheme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  return (
    <>
      {/* One width on every tab, so the tab bar never moves; only the content below changes width. */}
      <header className="header">
        <div className="header-inner">
        <a href="#/" className="brand" aria-label="Prism, home">
          <Mark className="brand-mark" />
          <span className="brand-word">prism</span>
        </a>
        <nav>
          <a href="#/components" className={tab === "components" ? "active" : ""}>Components</a>
          <a href="#/playground" className={tab === "playground" ? "active" : ""}>Playground</a>
          <a href="#/chat" className={tab === "chat" ? "active" : ""}>Chat</a>
        </nav>
        <button className="mode-toggle" onClick={() => setTheme({ ...theme, scheme: dark ? "light" : "dark" })}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}>
          {dark ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" />
              <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" /></svg>
          )}
        </button>
        </div>
      </header>
      <div className={tab === "components" ? "app app-wide" : tab === "playground" ? "app app-full" : "app"}>
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
