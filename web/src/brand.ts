// The app's brand on the web (DESIGN-SYSTEM.md section 3): one accent colour becomes the four
// "primary" colours for light and dark, readable on cards. Same maths as the phone
// (sdk/modules/prism_theme/src/Theme.ts, accentColors).

const SURFACE = { light: "#FFFFFF", dark: "#18181D" };

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex = (c: number[]) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix = (a: string, b: string, t: number) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const luminance = (c: string) => {
  const [r, g, b] = rgb(c).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const readable = (c: string, on: string, to: string, ratio: number) => {
  let out = c;
  for (let t = 0.05; contrast(out, on) < ratio && t <= 1; t += 0.05) out = mix(c, to, t);
  return out;
};

/** Corner sizes per corner style ("rounded" keeps the tokens). */
const CORNERS: Record<string, Record<string, string>> = {
  square: { "--radius-sm": "2px", "--radius-md": "4px", "--radius-lg": "6px", "--card-radius": "6px", "--button-radius": "4px",
    "--input-radius": "4px", "--callout-radius": "4px", "--badge-radius": "2px", "--progress-radius": "2px", "--image-radius": "4px" },
  pill: { "--radius-sm": "8px", "--radius-md": "14px", "--radius-lg": "20px", "--card-radius": "20px", "--button-radius": "999px",
    "--input-radius": "14px", "--callout-radius": "14px", "--image-radius": "14px" },
};

/** The CSS variables a corner style sets (empty for rounded). */
export function cornerVars(corners: string | undefined): Record<string, string> {
  return CORNERS[corners || ""] || {};
}

/** CSS variables that replace the primary colours with the brand accent, for one scheme. */
export function brandVars(accent: string, scheme: "light" | "dark"): Record<string, string> {
  const dark = scheme === "dark";
  const surface = SURFACE[scheme];
  const solid = dark ? readable(accent, surface, "#FFFFFF", 3) : accent;
  return {
    "--tone-primary-solid": solid,
    // Text on the accent is bold (buttons), so white is readable from contrast 3 (WCAG large text).
    "--tone-primary-on-solid": contrast("#FFFFFF", solid) >= 3 ? "#FFFFFF" : "#111111",
    "--tone-primary-soft": mix(accent, surface, dark ? 0.78 : 0.88),
    "--tone-primary-text": readable(accent, surface, dark ? "#FFFFFF" : "#000000", 4.5),
  };
}

/** What the page is showing: the brand an app would set, plus light/dark ("system" follows the computer). */
export type Scheme = "system" | "light" | "dark";
export type Theme = { accent: string | null; corners: string; font: string; scheme: Scheme };
/** What the page opens with (and Reset goes back to): purple, dark. */
export const DEFAULT_THEME: Theme = { accent: "#7048E8", corners: "rounded", font: "", scheme: "dark" };
