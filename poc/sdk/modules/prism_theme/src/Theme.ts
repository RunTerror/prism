// prism_theme: the design tokens for drawing (colours, spacing, type, radii), from
// poc/core/dist/tokens.json. Like Valdi's valdi_ui_theme. No drawing here.
//
// The rest of the SDK never types a colour or a size: it asks the theme.
//   const theme = themeFor('dark');
//   theme.space.md                       -> 12
//   toneColors(theme, 'success').soft    -> '#15301F'
//   textStyle(theme, 'lg', 'bold')       -> { font, lineHeight }   (spread onto a <label>)
import { TOKENS } from './TokensSource';

export type ColorScheme = 'light' | 'dark';
export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type TextTone = Tone | 'muted';
export type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

/** The four colours of one tone (DESIGN-SYSTEM.md section 6). */
export interface ToneColors {
  /** Filled backgrounds: solid button, solid badge, progress bar, control tint. */
  solid: string;
  /** Text and icons on `solid`. */
  onSolid: string;
  /** Tinted backgrounds: soft badge, Callout. */
  soft: string;
  /** Text and icons in that tone, on the page or on `soft`. */
  text: string;
}

export interface Palette {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  tone: { [tone: string]: ToneColors };
}

/** Everything a part needs to draw itself, for one colour scheme. */
export interface Theme {
  scheme: ColorScheme;
  color: Palette;
  space: { [name: string]: number };
  radius: { [name: string]: number };
  text: { [size: string]: { size: number; lineHeight: number } };
  title: { [size: string]: { size: number; lineHeight: number; weight: number } };
  controlHeight: { [size: string]: number };
  iconSize: { [size: string]: number };
  /** Ready-made values per part, already resolved to numbers: component.card.radius -> 14. */
  component: typeof TOKENS.component;
  /** The app's own font names per weight (Brand.font); missing ones use the system font. */
  fonts?: BrandFont;
}

function build(scheme: ColorScheme): Theme {
  return {
    scheme,
    color: TOKENS.color[scheme] as Palette,
    space: TOKENS.space,
    radius: TOKENS.radius,
    text: TOKENS.font.text,
    title: TOKENS.font.title,
    controlHeight: TOKENS.control.height,
    iconSize: TOKENS.icon.size,
    component: TOKENS.component,
  };
}

// Two themes, made once.
const THEMES: { [scheme: string]: Theme } = { light: build('light'), dark: build('dark') };

/**
 * The app's brand (DESIGN-SYSTEM.md section 3): one accent colour, and optionally the chat's own
 * background and text colours. `...Dark` values are for dark mode; when missing, dark mode works
 * them out from the light ones. Colours are "#RRGGBB".
 */
export interface Brand {
  /** "rounded" (default), "square" or "pill": the corner style of cards, buttons and fields. */
  corners?: string;
  /** The app's font, by weight. Each is a font name the app has, e.g. "Inter-SemiBold". */
  font?: BrandFont;
  accent?: string;
  accentDark?: string;
  background?: string;
  backgroundDark?: string;
  text?: string;
  textDark?: string;
}

export interface BrandFont {
  regular?: string;
  medium?: string;
  semibold?: string;
  bold?: string;
}

const branded: { [key: string]: Theme } = {};

/** Corner sizes for a corner style. "rounded" is the tokens as they are. */
function cornersFor(style: string | undefined, base: Theme): Pick<Theme, 'radius' | 'component'> {
  if (style !== 'square' && style !== 'pill') return { radius: base.radius, component: base.component };
  const square = style === 'square';
  const radius: { [name: string]: number } = square ? { ...base.radius, sm: 2, md: 4, lg: 6 } : { ...base.radius, sm: 8, md: 14, lg: 20 };
  const c = base.component;
  const component = {
    ...c,
    card: { ...c.card, radius: radius.lg },
    button: { ...c.button, radius: square ? radius.md : radius.full },
    input: { ...c.input, radius: radius.md },
    callout: { ...c.callout, radius: radius.md },
    badge: { ...c.badge, radius: square ? radius.sm : radius.full },
    progress: { ...c.progress, radius: square ? radius.sm : radius.full },
    image: { ...c.image, radius: radius.md },
    chart: { ...c.chart, radius: radius.sm },
  } as typeof c;
  return { radius, component };
}

/**
 * The theme for "light" or "dark" (anything else gives light), with the app's brand applied
 * (`brandJson`: a Brand as JSON, from the host app). The accent replaces the "primary" colours.
 */
export function themeFor(scheme: string | undefined, brandJson?: string): Theme {
  const base = scheme === 'dark' ? THEMES.dark : THEMES.light;
  if (!brandJson) return base;
  const key = base.scheme + brandJson;
  if (branded[key]) return branded[key];
  let brand: Brand;
  try {
    brand = JSON.parse(brandJson) as Brand;
  } catch (e) {
    return base;
  }
  const dark = base.scheme === 'dark';
  const color: Palette = { ...base.color, tone: { ...base.color.tone } };
  const background = dark ? brand.backgroundDark : brand.background;
  const text = dark ? brand.textDark : brand.text;
  if (isHex(background)) color.background = background!;
  if (isHex(text)) color.text = text!;
  const accent = dark ? (isHex(brand.accentDark) ? brand.accentDark : brand.accent) : brand.accent;
  if (isHex(accent)) color.tone.primary = accentColors(accent!, color.surface, dark);
  const fonts = brand.font && typeof brand.font === 'object' ? brand.font : undefined;
  return (branded[key] = { ...base, ...cornersFor(brand.corners, base), color, fonts });
}

// ---------- Colour maths for the brand (readability: WCAG contrast) ----------

function isHex(c: string | undefined): boolean {
  return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
}

function rgb(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function hex(c: number[]): string {
  return '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** a mixed toward b: t = 0 gives a, t = 1 gives b. */
function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return hex(x.map((v, i) => v + (y[i] - v) * t));
}

function luminance(c: string): number {
  const [r, g, b] = rgb(c).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Moves `c` toward `to` in small steps until it reaches `ratio` against `on`. */
function readable(c: string, on: string, to: string, ratio: number): string {
  let out = c;
  for (let t = 0.05; contrast(out, on) < ratio && t <= 1; t += 0.05) out = mix(c, to, t);
  return out;
}

/** The four accent colours from one brand colour, readable on `surface` (cards). */
function accentColors(accent: string, surface: string, dark: boolean): ToneColors {
  const solid = dark ? readable(accent, surface, '#FFFFFF', 3) : accent;
  // Text on the accent is bold (buttons), so white is readable from contrast 3 (WCAG large text).
  const onSolid = contrast('#FFFFFF', solid) >= 3 ? '#FFFFFF' : '#111111';
  return {
    solid,
    onSolid,
    soft: mix(accent, surface, dark ? 0.78 : 0.88),
    text: readable(accent, surface, dark ? '#FFFFFF' : '#000000', 4.5),
  };
}

/** The four colours of a tone. Unknown tones fall back to neutral. */
export function toneColors(theme: Theme, tone: string): ToneColors {
  return theme.color.tone[tone] ?? theme.color.tone.neutral;
}

/** Text colour for a text tone: neutral -> text, muted -> textMuted, any other tone -> its `text`. */
export function textColor(theme: Theme, tone: string): string {
  if (tone === 'neutral') return theme.color.text;
  if (tone === 'muted') return theme.color.textMuted;
  return toneColors(theme, tone).text;
}

/**
 * The font at a size and weight: the app's own font when its brand names one for that weight
 * (else its regular one), otherwise the system font. Valdi scales both with the phone's text-size
 * setting.
 */
export function fontFor(size: number, weight: number | string, fonts?: BrandFont): string {
  const w = typeof weight === 'number' ? weight : TOKENS.font.weight[weight as Weight] ?? 400;
  return `${fontName(w, fonts)} ${size} body ${size * MAX_TEXT_SCALE}`;
}

// The words after the size make the text follow the phone's text size setting:
//   "system 15 body 30"  ->  15pt normally, grows like body text, never past 30pt.
// Without "body", iOS keeps 15pt whatever the setting. Android scales either way (and ignores the cap).
const MAX_TEXT_SCALE = 2;

function fontName(w: number, fonts?: BrandFont): string {
  if (fonts) {
    const name = w >= 700 ? fonts.bold ?? fonts.semibold : w >= 600 ? fonts.semibold ?? fonts.bold : w >= 500 ? fonts.medium : undefined;
    const pick = name ?? (w < 600 ? fonts.regular : undefined);
    if (pick && /^[\w.-]+$/.test(pick)) return pick;
  }
  if (w >= 700) return 'system-bold';
  if (w >= 600) return 'system-semibold';
  if (w >= 500) return 'system-medium';
  return 'system';
}

// Valdi labels have two line-height props:
//   lineHeightAbsolute (points)  -> Valdi measures the label WITHOUT it, so the last line gets cut ("...").
//   lineHeight (a multiplier of the font's natural line height, about 1.2 x the font size) -> measured right.
// So we turn our token (points) into a multiplier: 21pt for a 15pt font -> 21 / (15 x 1.2) = 1.17.
const NATURAL_LINE = 1.2;
function lineMultiplier(size: number, lineHeight: number): number {
  return Math.round((lineHeight / (size * NATURAL_LINE)) * 100) / 100;
}

/** Label attributes for body text: size sm / md / lg. Spread onto a label: <label {...textStyle(theme, 'md')} />. */
export function textStyle(theme: Theme, size: string, weight: string = 'regular'): { font: string; lineHeight: number } {
  const t = theme.text[size] ?? theme.text.md;
  return { font: fontFor(t.size, weight, theme.fonts), lineHeight: lineMultiplier(t.size, t.lineHeight) };
}

/** Label attributes for a title: size sm / md / lg / xl (the weight comes from the token). */
export function titleStyle(theme: Theme, size: string): { font: string; lineHeight: number } {
  const t = theme.title[size] ?? theme.title.md;
  return { font: fontFor(t.size, t.weight, theme.fonts), lineHeight: lineMultiplier(t.size, t.lineHeight) };
}
