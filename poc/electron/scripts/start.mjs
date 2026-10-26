// Builds the web app if needed, then launches Electron.
// ELECTRON_RUN_AS_NODE is removed because some editors set it, which makes Electron act as plain Node.
import "./ensure-web.mjs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const electronPath = createRequire(import.meta.url)("electron");
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electronPath, [fileURLToPath(new URL("..", import.meta.url))], { stdio: "inherit", env });
child.on("exit", (code) => process.exit(code ?? 0));
