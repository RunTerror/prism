// Builds the AI instructions from catalog.json, so the prompt always matches what the compiler accepts.
//   buildPrompt(catalog, { mode, packs })  -> Markdown text for the system prompt
//     packs: the part packs this app turns on, like ["teach", "ask"] (default: all; catalog.json "packs")
//     library: the part library version the app draws with (default: newest); newer parts are left out
//     mode "block" (default): the model writes ```prism blocks in its reply
//     mode "tool": the model calls the show_screen tool (see tool.js)
//   imagesPrompt(appData)  -> the images the server approved for one reply, and how to show them
//
// Parts and props marked "hidden" in catalog.json still work, but the AI isn't taught them.

import { defaultCatalog, typeOf, childrenOf, forApp } from "./catalog.js";

const RULES = `You can answer with an interactive screen. Write it in a \`\`\`prism block inside your normal Markdown reply.

## How to write a prism block

1. Setup lines first, then one screen.
   - State: \`const [count, setCount] = useState(0)\`. The start value must be plain data (numbers, text, true/false, lists, objects). Each useState is its own line at the top.
   - Worked-out values: \`const done = tasks.filter(t => t.done).length\`. Plain \`if\`/\`else\`, \`switch\` and loops are fine too.
   - Helpers: \`function total(items) { ... }\`
2. The screen is JSX that starts on a line beginning with \`<\`. Use only the parts listed below.
3. Lists: \`items.map(item => <Row key={item.id}>...</Row>)\`. Show or hide: \`cond && <Part />\` or \`cond ? <A /> : <B />\`.
4. Change state only with its setter: \`setCount(count + 1)\`, \`setTasks([...tasks, item])\`, \`setTasks(tasks.map(t => t.id === id ? { ...t, done: v } : t))\`.
5. Events: \`onPress={() => ...}\` for taps. \`onChange={v => ...}\` gets the new value directly (not an event), so \`onChange={setName}\` works.
6. Only meaning, never looks: no colours, sizes, spacing or fonts. The app's design decides how it looks.
7. Only useState. No other hooks, no fetch, no timers, no window or document. Screens can't count time: for a timer, stopwatch or live clock, say so in your text and offer what works (like a button that asks you to remind them). Never draw a timer that doesn't run.
8. To act outside the screen use P: \`P.ask("text")\` sends a message as the user, \`P.open(url)\`, \`P.copy(text)\`, \`P.toast(text)\`.
9. Charts: \`<Chart data={[...]} labels={[...]} />\` for a few numbers to compare or follow over time. Use <Field> lines when exact values matter more than the shape.
10. No pictures unless the reply comes with "Images for this reply". Never type a web address.

## How it should look

Screens sit inside a chat, so they are calm and simple. The parts already look right; just pick the right ones.

- Chat parts first: <Steps> for a process, <Quiz> to check understanding, <Choice> for tabs or switching views, <Field> for label and value lines, <Carousel> for options to browse, <FollowUps> for next questions.
- One main action per screen: <Button main>. Other buttons are plain <Button>; <Button danger> deletes or loses something.
- status="good" / "warning" / "bad" only for a real state (healthy, low stock, over budget). Everything else stays grey.
- The key number goes in <Stat>. <Text secondary> for hints and captions, <Text strong> for emphasis.
- Lists come from data: \`items.map(...)\`, not the same markup written many times.
- Fewer, bigger parts: no Badge on every line, no Card inside a Card.
- Only the parts listed below, only their props. No HTML (<div>, <br>, <strong>, <span>).

## Examples

A calculator:

\`\`\`prism
const [amount, setAmount] = useState(500000)
const [years, setYears] = useState(5)
const monthly = Math.round(amount * 0.0085 / (1 - Math.pow(1.0085, -years * 12)))

<Card title="Loan payment">
  <Slider label="Amount (₹)" value={amount} min={50000} max={2000000} step={10000} onChange={setAmount} />
  <Slider label="Years" value={years} min={1} max={20} onChange={setYears} />
  <Stat label="Every month" value={"₹" + monthly.toLocaleString("en-IN")} />
  <Field label="Total paid" value={"₹" + (monthly * years * 12).toLocaleString("en-IN")} />
  <Button main onPress={() => P.ask("Show me a cheaper option")}>Find a cheaper option</Button>
</Card>
\`\`\`

Part of a lesson (the explanation itself goes in your text, around the screen):

\`\`\`prism
<Stack>
  <Steps>
    <Step title="Split">The text is cut into tokens.</Step>
    <Step title="Predict">The model guesses the next token, again and again.</Step>
  </Steps>
  <Quiz question="What does the model predict?" options={["The next token", "The whole answer at once"]} answer={0}
    explain="It writes one token at a time." />
  <FollowUps items={["How is it trained?", "Why does it make mistakes?"]} />
</Stack>
\`\`\`
\`\`\``;

function propLine(catalog, name, prop) {
  const def = typeOf(catalog, prop);
  let kind;
  if (def && def.enum) kind = typeof prop.type === "string" ? prop.type : def.enum.map((v) => `"${v}"`).join(" | ");
  else if (prop.type === "number" && (prop.min !== undefined || prop.max !== undefined)) kind = `number ${prop.min ?? ""}..${prop.max ?? ""}`;
  else kind = prop.type;
  const notes = [];
  if (prop.required) notes.push("required");
  if (prop.default !== undefined) notes.push(`default ${JSON.stringify(prop.default)}`);
  return `- \`${name}\`: ${kind}${notes.length ? ` (${notes.join(", ")})` : ""}. ${prop.description}`;
}

/** The images list for one reply, with how to use <Image>. Empty when the server supplied none. */
export function imagesPrompt(appData, catalog = defaultCatalog) {
  const images = Object.entries((appData && appData.images) || {});
  if (!images.length) return "";
  const lines = images.map(([name, entry]) => {
    const about = entry && typeof entry === "object" && entry.description ? `: ${entry.description}` : "";
    return `- \`${name}\`${about}`;
  });
  return ["## Images for this reply", "", "Use these names in <Image src=\"...\">. Nothing else can be shown.", "", ...lines, "",
    ...partSection(catalog, "Image", catalog.parts.Image), ""].join("\n");
}

/** One part's section: heading, description, props and example. */
function partSection(catalog, name, part) {
  const { kind, only } = childrenOf(part);
  const inside = kind === "none" ? "no children" : kind === "text" ? "text inside" : only ? `only ${only.join(", ")} inside` : "parts inside";
  const out = [`### <${name}>  (${inside})`, part.description];
  if (part.parents) out.push(`Only inside ${part.parents.map((p) => `<${p}>`).join(" or ")}.`);
  for (const [propName, prop] of Object.entries(part.props)) if (!prop.hidden) out.push(propLine(catalog, propName, prop));
  out.push("```jsx", part.example, "```");
  return out;
}

/** The same rules, for a model that shows screens with the show_screen tool instead of blocks. */
function toolRules(rules) {
  return rules
    .replace("You can answer with an interactive screen. Write it in a \`\`\`prism block inside your normal Markdown reply.",
      "You can show an interactive screen by calling the `show_screen` tool. Its `code` is screen code, written as described here. Write your normal reply as text around the call.")
    .replace("## How to write a prism block", "## How to write screen code")
    .replaceAll("\`\`\`prism\n", "\`\`\`jsx\n");
}

export function buildPrompt(fullCatalog, { mode = "block", packs, library } = {}) {
  const catalog = forApp(fullCatalog, { packs, library });
  const out = [mode === "tool" ? toolRules(RULES) : RULES, "", "## Named values", ""];
  // Only the value lists the AI's inputs use (not old style ones like tone or size).
  const used = new Set();
  for (const part of Object.values(catalog.parts)) {
    if (part.hidden) continue;
    for (const prop of Object.values(part.props)) if (!prop.hidden && typeof prop.type === "string") used.add(prop.type);
  }
  for (const [name, type] of Object.entries(catalog.types)) {
    if (type.enum && used.has(name)) out.push(`- \`${name}\`: ${type.enum.join(", ")}. ${type.description}`);
  }

  // Chat parts first: made for answers in a chat, and built by the part library.
  const groups = { chat: "Chat parts (use these first)", layout: "Layout", content: "Content", control: "Controls" };
  for (const [group, heading] of Object.entries(groups)) {
    out.push("", `## ${heading}`);
    for (const [name, part] of Object.entries(catalog.parts)) {
      if (part.group !== group || part.hidden) continue;
      out.push("", ...partSection(catalog, name, part));
    }
  }
  return out.join("\n") + "\n";
}
