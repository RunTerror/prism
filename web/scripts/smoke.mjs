// Headless smoke test for the web client. Start the dev server first (npm run dev -- --port 5199),
// then: node scripts/smoke.mjs [baseUrl]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.argv[2] || "http://localhost:5199/";
const shots = new URL("../screenshots/", import.meta.url).pathname;
mkdirSync(shots, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures++;
};

const browser = await chromium.launch();

async function openPage(colorScheme) {
  const page = await browser.newPage({ colorScheme, viewport: { width: 760, height: 900 } });
  page.on("pageerror", (e) => check(false, `page error: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && console.log(`  console error: ${m.text()}`));
  await page.goto(base);
  return page;
}

const go = async (page, hash) => {
  await page.evaluate((h) => (location.hash = h), hash);
  await page.waitForTimeout(50);
};
const widget = (page) => page.locator(".prism-widget");

// ---------- Light: full interaction pass ----------
const page = await openPage("light");
// Every example has its own page (#/example/<id>); the home page is the Components page.
const ids = (await import("../../core/dist/examples.json", { with: { type: "json" } })).default.map((e) => e.id);
check(await page.getByRole("heading", { name: "Components" }).isVisible(), "home page is the Components page");

for (const id of ids) {
  await go(page, `#/example/${id}`);
  await widget(page).waitFor();
  await page.getByLabel("Source").check();
  check(await page.locator("pre.code").isVisible(), `${id}: draws and shows source`);
  await page.getByLabel("Source").uncheck();
  await page.screenshot({ path: shots + `${id}-light.png`, fullPage: true });
  await page.click("text=Reset");
  await widget(page).waitFor();
}

// Counter: +1 twice
await go(page, "#/example/02-counter");
await widget(page).waitFor();
await page.getByRole("button", { name: "+1" }).click();
await page.getByRole("button", { name: "+1" }).click();
await page.waitForTimeout(100);
check((await page.locator('.p-text[data-role="number"]').innerText()) === "2", "counter shows 2 after two taps");
await page.click("text=Reset");
await page.waitForTimeout(100);
check((await page.locator('.p-text[data-role="number"]').innerText()) === "0", "Reset loads the counter again (0)");

// Tasks: tick one, type one (with a mid-text edit to test the cursor), add it
await go(page, "#/example/03-tasks");
await widget(page).waitFor();
await page.locator(".p-check input").nth(1).click();
await page.waitForTimeout(100);
check(await page.getByText("2 of 3 done").isVisible(), "ticking a task updates the count");
const input = page.getByPlaceholder("New task");
await input.click();
await input.pressSequentially("Wrte tests", { delay: 20 });
await input.evaluate((el) => el.setSelectionRange(2, 2));
await input.pressSequentially("i", { delay: 20 });
await page.waitForTimeout(100);
check((await input.inputValue()) === "Write tests", `typing in the middle keeps the cursor ("${await input.inputValue()}")`);
await page.getByRole("button", { name: "Add" }).click();
await page.waitForTimeout(150);
check(await page.getByText("Write tests", { exact: true }).isVisible(), "added task appears");
check(await page.getByText("2 of 4 done").isVisible(), "count shows 2 of 4");
check((await input.inputValue()) === "", "input is cleared after Add");
await page.screenshot({ path: shots + "03-tasks-after-light.png", fullPage: true });

// Settings: switch and slider
await go(page, "#/example/04-settings");
await widget(page).waitFor();
await page.getByRole("switch").first().click();
await page.waitForTimeout(100);
check(await page.getByText("Notifications are off.").isVisible(), "switch turns notifications off");
const slider = page.locator(".p-slider");
await slider.focus();
for (let i = 0; i < 5; i++) await slider.press("ArrowRight");
// Each press is a round trip to the sandbox: wait for the last answer, not a fixed time.
await page.getByText("85%").waitFor({ timeout: 2000 }).catch(() => {});
check(await page.getByText("85%").isVisible(), "slider moves volume to 85%");
check(await page.getByText("That's loud!").isVisible(), "loud warning appears");
await page.screenshot({ path: shots + "04-settings-after-light.png", fullPage: true });

// Broken: endless loop must not freeze the page
await go(page, "#/example/06-broken");
await widget(page).waitFor();
const t0 = Date.now();
await page.getByRole("button", { name: "Run an endless loop" }).click();
await page.waitForTimeout(100);
const alive = await page.evaluate(() => 1 + 1);
await page.getByText("Everything else still works.").waitFor({ timeout: 5000 });
check(alive === 2, `page stays alive after endless loop (${Date.now() - t0} ms)`);
await go(page, "#/example/02-counter");
await widget(page).waitFor();
await page.getByRole("button", { name: "+1" }).click();
await page.waitForTimeout(100);
check((await page.locator('.p-text[data-role="number"]').innerText()) === "1", "other widgets still work after the loop");

// Sandbox: one hidden iframe with only allow-scripts; the page can't look inside it
const frames = await page.evaluate(() =>
  [...document.querySelectorAll("iframe")].map((f) => ({ sandbox: f.getAttribute("sandbox"), hidden: f.style.display, open: !!f.contentDocument })));
check(frames.length === 1 && frames[0].sandbox === "allow-scripts" && frames[0].hidden === "none" && !frames[0].open,
  `one locked, hidden sandbox iframe (${JSON.stringify(frames)})`);

// Another widget hangs: the sandbox is replaced and the counter loads again with its saved state
const counterId = await widget(page).getAttribute("data-instance");
page.evaluate(() => window.__prismRuntime.debugHang("someone-else#1"));
await page.waitForTimeout(3600);
await widget(page).waitFor();
check((await page.locator('.p-text[data-role="number"]').innerText()) === "1", "counter keeps its value after another widget hung");
await page.getByRole("button", { name: "+1" }).click();
await page.waitForTimeout(100);
check((await page.locator('.p-text[data-role="number"]').innerText()) === "2", "counter still works in the new sandbox");

// The counter itself hangs: it is set aside, and "Load again" starts it fresh
page.evaluate((id) => window.__prismRuntime.debugHang(id), counterId);
await page.getByText("This screen stopped responding.").waitFor({ timeout: 5000 });
check(true, "a widget that hangs is set aside");
await page.getByRole("button", { name: "Load again" }).click();
await widget(page).waitFor();
await page.getByRole("button", { name: "+1" }).click();
await page.waitForTimeout(100);
check((await page.locator('.p-text[data-role="number"]').innerText()) === "1", "Load again starts it fresh and it works");

// Charts: 7 bars, and a 2-series line chart with a legend
await go(page, "#/example/09-charts");
await widget(page).waitFor();
const firstChart = page.locator(".p-chart").first();
check(await firstChart.locator(".p-chart-bar").count() === 7, "bar chart draws 7 bars");
check((await firstChart.getAttribute("aria-label")).includes("Mon: 4200"), "chart reads its values to screen readers");
const heights = await firstChart.locator(".p-chart-bar").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
check(heights[3] === Math.max(...heights) && heights[5] === Math.min(...heights), `tallest bar is Thu, shortest Sat (${heights.map(Math.round)})`);
check(await page.locator(".p-chart").nth(1).locator("polyline").count() === 2, "line chart draws 2 series");
check(await page.locator(".p-chart-legend").count() === 1, "legend only for several series");
await page.screenshot({ path: shots + "09-charts-checked-light.png", fullPage: true });

// Product: the approved photo loads, nothing else does
await go(page, "#/example/10-product");
await widget(page).waitFor();
const img = page.locator(".p-image img");
await img.waitFor({ timeout: 10000 });
check((await img.getAttribute("src")).startsWith("https://images.unsplash.com/"), "image uses the approved address");
check(await img.getAttribute("alt") === "Headphones on a yellow background", "image has its alt text");
await page.waitForFunction(() => document.querySelector(".p-image img")?.complete, null, { timeout: 15000 }).catch(() => {});
check(await img.evaluate((el) => el.naturalWidth > 0), "photo actually loaded");
await page.screenshot({ path: shots + "10-product-loaded-light.png", fullPage: true });

// Chat: a saved reply streams in as text, a "Building" card, then a live widget (needs server/ on 8787)
const chatUp = await page.evaluate(() => fetch("/health").then((r) => r.ok, () => false));
if (!chatUp) console.log("SKIP  chat checks: the chat server is not running (node server/server.mjs from the repo root)");
else {
  await go(page, "#/chat");
  await page.getByLabel("Saved reply").selectOption("haiku-slim-a.md#1");
  await page.getByRole("button", { name: "Play" }).click();
  check(await page.locator(".chat-user").innerText() === "Tip calculator: bill, tip and people sliders", "chat shows the chosen reply's description");
  await page.locator(".chat-building").waitFor({ timeout: 5000 });
  check(true, "a Building card shows while the screen is written");
  await page.locator(".chat-meta").waitFor({ timeout: 30000 });
  const chatWidget = page.locator(".chat-assistant .prism-widget");
  check(await chatWidget.count() === 1 && await page.locator(".chat-building").count() === 0, "the finished reply shows one live widget");
  check((await page.locator(".chat-assistant .md").first().innerText()).length > 20, "reply text is shown as Markdown");
  const before = await chatWidget.innerText();
  // Use whatever control the screen has: a button, else a slider
  if (await chatWidget.getByRole("button").count()) await chatWidget.getByRole("button").first().click();
  else await chatWidget.getByRole("slider").first().press("ArrowRight");
  await page.waitForTimeout(150);
  check(await chatWidget.innerText() !== before, "the widget in the chat responds to a tap");
  await page.screenshot({ path: shots + "chat-light.png", fullPage: true });
  // Stop in the middle of a reply
  await page.getByRole("button", { name: "Play" }).click();
  await page.getByRole("button", { name: "Stop" }).click();
  await page.getByRole("button", { name: "Play" }).waitFor({ timeout: 3000 });
  await page.waitForTimeout(300);
  check(await page.locator(".chat-assistant").count() === 2, "Stop ends a reply early, without starting another");
  await page.getByRole("button", { name: "New chat" }).click();
  check(await page.locator(".chat-user").count() === 0, "New chat clears the conversation");
}

// Playground: Markdown message with a prism block
await go(page, "#/playground");
await page.locator(".pg-block .prism-widget").waitFor();
check(await page.locator(".pg-prose").first().isVisible(), "playground shows the Markdown parts");
check(await page.locator(".code-editor-view .hl-t").count() > 0, "playground colours the code");
check((await page.locator(".tree-json").textContent()).includes('"t": "box"'), "playground shows the screen tree (built from blocks)");
await page.locator(".pg-block").getByRole("button", { name: "+1" }).click();
await page.waitForTimeout(100);
check((await page.locator(".tree-json").textContent()).includes('"1"'), "tree JSON updates after an event");
await page.screenshot({ path: shots + "playground-light.png", fullPage: true });

// Playground: raw block with a problem
await page.locator(".code-editor-input").fill('<Card title="Raw">\n  <Text>Hi</Text>\n  <Gauge />\n</Card>\n');
await page.getByRole("button", { name: "Compile" }).click();
const diag = page.locator(".diagnostics li", { hasText: "Unknown part <Gauge>" });
await diag.waitFor({ timeout: 5000 }).catch(() => {});
check(await diag.count() === 1, "raw block compiles and lists diagnostics");
await page.screenshot({ path: shots + "playground-raw-light.png", fullPage: true });

// Playground: an Image the server didn't approve never reaches the page
await page.locator(".code-editor-input").fill('<Stack>\n  <Image src="https://evil.example/x.png" alt="x" />\n  <Text>ok</Text>\n</Stack>\n');
await page.getByRole("button", { name: "Compile" }).click();
await page.locator(".diagnostics li", { hasText: "is not an image supplied" }).waitFor({ timeout: 5000 }).catch(() => {});
check(await page.locator(".pg-block .p-image").count() === 0, "an unapproved image address is dropped");

await page.close();

// ---------- Dark: screenshots ----------
const dark = await openPage("dark");
await dark.screenshot({ path: shots + "components-dark.png", fullPage: true });
for (const id of ids) {
  await go(dark, `#/example/${id}`);
  await widget(dark).waitFor();
  await dark.screenshot({ path: shots + `${id}-dark.png`, fullPage: true });
}
const bg = await dark.evaluate(() => getComputedStyle(document.body).backgroundColor);
check(bg === "rgb(5, 5, 6)", `dark mode background (brand ink #050506) (${bg})`);
await dark.close();

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
