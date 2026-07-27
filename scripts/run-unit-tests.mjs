import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";

const scriptsDirectory = join(process.cwd(), "scripts");
const testFiles = (await readdir(scriptsDirectory))
  .filter((file) => file.endsWith(".test.mjs") && !file.endsWith(".browser.test.mjs"))
  .sort();

for (const file of testFiles) {
  await runTest(join(scriptsDirectory, file));
}

console.log(`Fast test suite passed for ${testFiles.length} test files`);

async function runTest(file) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file], {
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${file} failed${signal ? ` (${signal})` : ""}`));
    });
  });
}
