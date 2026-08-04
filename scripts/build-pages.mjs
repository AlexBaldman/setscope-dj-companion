import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { publicPageFiles } from "../src/product-manifest.js";
import { normalizeRuntimeConfig } from "../src/runtime-config.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const output = join(root, "dist");
const publicDirectories = ["src", "assets"];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of publicPageFiles) {
  await cp(join(root, file), join(output, file));
}
for (const directory of publicDirectories) {
  await cp(join(root, directory), join(output, directory), { recursive: true });
}

await mkdir(join(output, "docs"), { recursive: true });
await cp(join(root, "docs", "DEV_JOURNAL.md"), join(output, "docs", "DEV_JOURNAL.md"));
await writeFile(join(output, "runtime-config.json"), `${JSON.stringify(
  normalizeRuntimeConfig({ apiBaseUrl: process.env.SETSCOPE_API_BASE_URL }),
  null,
  2,
)}\n`);
await rm(join(output, "assets", ".DS_Store"), { force: true });
await writeFile(join(output, ".nojekyll"), "");

console.log(`GitHub Pages artifact ready: ${output}`);
