import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export function createJournalStore(root) {
  const journalPath = join(root, "docs", "DEV_JOURNAL.md");

  async function loadJournal() {
    return readFile(journalPath, "utf8");
  }

  async function saveJournal(markdown) {
    await mkdir(join(root, "docs"), { recursive: true });
    await writeFile(journalPath, markdown.endsWith("\n") ? markdown : `${markdown}\n`);
  }

  return { loadJournal, saveJournal };
}
