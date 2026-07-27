import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const roots = ["server.mjs", "server", "scripts", "src"];
const sourceFiles = [];

for (const entry of roots) {
  const path = join(root, entry);
  if (extname(path)) sourceFiles.push(path);
  else await collectSourceFiles(path, sourceFiles);
}

sourceFiles.sort();
for (const file of sourceFiles) {
  await runNodeCheck(file);
}

console.log(`Syntax checks passed for ${sourceFiles.length} source files`);

async function collectSourceFiles(directory, output) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collectSourceFiles(path, output);
    else if ([".js", ".mjs"].includes(extname(entry.name))) output.push(path);
  }
}

async function runNodeCheck(file) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--check", file], { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Syntax check failed for ${relative(root, file)}${signal ? ` (${signal})` : ""}`));
    });
  });
}
