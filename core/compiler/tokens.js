// Turns tokens.json into files each platform can use directly. See DESIGN-SYSTEM.md.
//   resolveTokens(tokens) -> plain numbers and colours (component tokens like radius: "lg" become 14)
//   tokensCss(tokens)     -> CSS variables for the web drawer, light and dark
//   dtcgTokens(tokens)    -> W3C Design Tokens format, for design tools

const kebab = (s) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

/** Component tokens refer to the scales by name. This swaps each name for its value. */
function resolveComponent(tokens, key, value) {
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveComponent(tokens, key, v)]));
  }
  if (typeof value !== "string") return value;
  if (key === "radius") return tokens.radius[value];
  if (key === "pad" || key === "padX" || key === "padY" || key === "gap") return tokens.space[value];
  if (key === "titleStyle" || key === "valueStyle") return resolveTitle(tokens, value);
  if (key === "textSize") return tokens.font.text[value];
  if (key === "weight") return tokens.font.weight[value];
  return value;
}

function resolveTitle(tokens, name) {
  const s = tokens.font.title[name];
  return { size: s.size, lineHeight: s.lineHeight, weight: tokens.font.weight[s.weight] };
}

export function resolveTokens(tk) {
  const component = {};
  for (const [part, values] of Object.entries(tk.component)) {
    component[part] = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, resolveComponent(tk, k, v)]));
  }
  return {
    space: tk.space,
    radius: tk.radius,
    font: {
      family: tk.font.family,
      weight: tk.font.weight,
      text: tk.font.text,
      title: Object.fromEntries(Object.keys(tk.font.title).map((k) => [k, resolveTitle(tk, k)]))
    },
    control: tk.control,
    icon: tk.icon,
    component,
    color: tk.color
  };
}

function colorVars(c) {
  const lines = [];
  for (const [k, v] of Object.entries(c)) {
    if (k === "tone") {
      for (const [tone, set] of Object.entries(v)) {
        for (const [role, hex] of Object.entries(set)) lines.push(`--tone-${tone}-${kebab(role)}: ${hex};`);
      }
    } else {
      lines.push(`--c-${kebab(k)}: ${v};`);
    }
  }
  return lines;
}

export function tokensCss(tokens) {
  const t = resolveTokens(tokens);
  const vars = [];
  for (const [k, v] of Object.entries(t.space)) vars.push(`--space-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(t.radius)) vars.push(`--radius-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(t.font.weight)) vars.push(`--weight-${k}: ${v};`);
  for (const [k, v] of Object.entries(t.font.text)) vars.push(`--text-${k}-size: ${v.size}px;`, `--text-${k}-line: ${v.lineHeight}px;`);
  for (const [k, v] of Object.entries(t.font.title)) {
    vars.push(`--title-${k}-size: ${v.size}px;`, `--title-${k}-line: ${v.lineHeight}px;`, `--title-${k}-weight: ${v.weight};`);
  }
  for (const [k, v] of Object.entries(t.control.height)) vars.push(`--control-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(t.icon.size)) vars.push(`--icon-${k}: ${v}px;`);
  const flat = (prefix, obj) => {
    for (const [k, v] of Object.entries(obj)) {
      const name = `${prefix}-${kebab(k)}`;
      // Weights and ratios are plain numbers; everything else is a size in pixels.
      if (typeof v === "number") vars.push(`--${name}: ${v}${/weight$|-ratio-/.test(name) ? "" : "px"};`);
      else if (v && typeof v === "object") flat(name, v);
    }
  };
  for (const [part, values] of Object.entries(t.component)) flat(part, values);

  const light = colorVars(t.color.light);
  const dark = colorVars(t.color.dark);
  const indent = (lines, n) => lines.map((l) => " ".repeat(n) + l).join("\n");
  return `/* GENERATED from core/tokens.json by \`npm run build\`. Do not edit. */
:root {
${indent(vars, 2)}
${indent(light, 2)}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${indent(dark, 4)}
  }
}

:root[data-theme="dark"] {
${indent(dark, 2)}
}
`;
}

/**
 * The same tokens in the W3C Design Tokens format (designtokens.org), so design tools (Figma
 * plugins, Style Dictionary, Tokens Studio) can read them. Every value is a { $type, $value } leaf:
 * colours, dimensions in px, font weights and typography (size, line height, weight).
 */
export function dtcgTokens(tokens) {
  const t = resolveTokens(tokens);
  const dims = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, { $type: "dimension", $value: `${v}px` }]));
  const colors = (palette) => {
    const out = {};
    for (const [k, v] of Object.entries(palette)) {
      if (k === "tone") {
        out.tone = Object.fromEntries(Object.entries(v).map(([tone, set]) =>
          [tone, Object.fromEntries(Object.entries(set).map(([role, hex]) => [role, { $type: "color", $value: hex }]))]));
      } else out[k] = { $type: "color", $value: v };
    }
    return out;
  };
  const type = (style) => ({
    $type: "typography",
    $value: { fontFamily: "system-ui", fontSize: `${style.size}px`, lineHeight: `${style.lineHeight}px`, fontWeight: style.weight ?? 400 }
  });
  return {
    $description: "Prism design tokens, generated from core/tokens.json (scripts/build.mjs). Do not edit.",
    color: { light: colors(t.color.light), dark: colors(t.color.dark) },
    space: dims(t.space),
    radius: dims(t.radius),
    control: { height: dims(t.control.height) },
    font: {
      weight: Object.fromEntries(Object.entries(t.font.weight).map(([k, v]) => [k, { $type: "fontWeight", $value: v }])),
      text: Object.fromEntries(Object.entries(t.font.text).map(([k, v]) => [k, type(v)])),
      title: Object.fromEntries(Object.entries(t.font.title).map(([k, v]) => [k, type(v)]))
    }
  };
}
