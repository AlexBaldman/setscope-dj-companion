import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export function createArchiveStore(root) {
  const archivePath = join(root, "data", "sets.json");

  async function listSets() {
    const archive = await loadArchive();
    return archive.sets.map((set) => ({
      id: set.id,
      name: set.name,
      updatedAt: set.updatedAt,
      trackCount: set.tracks?.length || 0,
    }));
  }

  async function saveSet(incoming) {
    const archive = await loadArchive();
    const id = incoming.id || createId();
    const now = new Date().toISOString();
    const saved = {
      ...incoming,
      id,
      savedAt: incoming.savedAt || now,
      updatedAt: now,
    };
    const index = archive.sets.findIndex((set) => set.id === id);
    if (index >= 0) archive.sets[index] = saved;
    else archive.sets.unshift(saved);
    await saveArchive(archive);
    return {
      id: saved.id,
      name: saved.name,
      updatedAt: saved.updatedAt,
      trackCount: saved.tracks?.length || 0,
    };
  }

  async function getSet(id) {
    const archive = await loadArchive();
    return archive.sets.find((item) => item.id === id);
  }

  async function loadArchive() {
    try {
      const content = await readFile(archivePath, "utf8");
      const archive = JSON.parse(content);
      return Array.isArray(archive.sets) ? archive : { sets: [] };
    } catch {
      return { sets: [] };
    }
  }

  async function saveArchive(archive) {
    await mkdir(join(root, "data"), { recursive: true });
    await writeFile(archivePath, `${JSON.stringify(archive, null, 2)}\n`);
  }

  return { getSet, listSets, saveSet };
}

function createId() {
  return `set_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
