// Launches the Electron app once, checks the page and the compiler bridge, saves a screenshot.
import { _electron as electron } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
mkdirSync(root + "screenshots", { recursive: true });
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures++;
};

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE; // some editors set this; it turns Electron into plain Node
const app = await electron.launch({ args: [root], env });
const page = await app.firstWindow();
page.on("pageerror", (e) => check(false, `page error: ${e.message}`));
page.on("console", (m) => m.type() === "error" && console.log(`  console error: ${m.text()}`));

await page.locator("[data-example]").first().waitFor();
const expected = JSON.parse(readFileSync(new URL("../../core/dist/examples.json", import.meta.url), "utf8")).length;
check((await page.locator("[data-example]").count()) === expected, `gallery lists all ${expected} examples`);
check(await page.evaluate(() => typeof window.require === "undefined" && typeof window.process === "undefined"), "no Node in the renderer");
check(await page.evaluate(() => typeof window.prismHost?.compile === "function"), "prismHost.compile is exposed");

await page.click('[data-example="02-counter"]');
await page.locator(".prism-widget").waitFor();
await page.getByRole("button", { name: "+1" }).click();
await page.waitForTimeout(150);
check((await page.locator(".p-title").innerText()) === "1", "counter works (sandboxed runtime runs)");
check(await page.evaluate(() => { const f = document.querySelectorAll("iframe"); return f.length === 1 && f[0].getAttribute("sandbox") === "allow-scripts" && !f[0].contentDocument; }),
  "runtime runs in one locked sandbox iframe");
await page.screenshot({ path: root + "screenshots/counter.png" });

await page.evaluate(() => (location.hash = "#/example/06-broken"));
await page.locator(".prism-widget").waitFor();
await page.getByRole("button", { name: "Run an endless loop" }).click();
await page.getByText("Everything else still works.").waitFor({ timeout: 5000 });
check((await page.evaluate(() => 1 + 1)) === 2, "endless loop does not freeze the window");

await page.evaluate(() => (location.hash = "#/playground"));
await page.getByRole("button", { name: "Compile" }).click();
await page.locator(".block .prism-widget").waitFor({ timeout: 10000 });
check((await page.locator(".tree-json").innerText()).includes('"Card"'), "playground compiles through IPC");
await page.screenshot({ path: root + "screenshots/playground.png" });

await app.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
