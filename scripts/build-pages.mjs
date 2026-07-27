import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const output = join(root, "dist");
const publicFiles = [
  "index.html",
  "pitch-gates.html",
  "audio-lab.html",
  "beat-school.html",
  "rhythm-roulette.html",
  "midi-playground.html",
  "journal.html",
  "design-system.html",
];
const publicDirectories = ["src", "assets"];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of publicFiles) {
  await cp(join(root, file), join(output, file));
}
for (const directory of publicDirectories) {
  await cp(join(root, directory), join(output, directory), { recursive: true });
}

await mkdir(join(output, "docs"), { recursive: true });
await cp(join(root, "docs", "DEV_JOURNAL.md"), join(output, "docs", "DEV_JOURNAL.md"));
await rm(join(output, "assets", ".DS_Store"), { force: true });
await writeFile(join(output, ".nojekyll"), "");

console.log(`GitHub Pages artifact ready: ${output}`);
