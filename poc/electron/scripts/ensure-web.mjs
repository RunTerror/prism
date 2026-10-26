// Builds poc/web if its dist folder is missing.
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const web = fileURLToPath(new URL("../../web/", import.meta.url));
if (!existsSync(web + "dist/index.html")) {
  if (!existsSync(web + "node_modules")) execSync("npm install", { cwd: web, stdio: "inherit" });
  execSync("npm run build", { cwd: web, stdio: "inherit" });
}
