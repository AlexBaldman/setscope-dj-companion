import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { createArchiveStore } from "./server/archive-store.mjs";
import { loadLocalEnv } from "./server/env.mjs";
import { createJournalStore } from "./server/journal-store.mjs";
import { sendJson } from "./server/json.mjs";
import { createApiRouter } from "./server/routes.mjs";
import { serveStatic } from "./server/static.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
await loadLocalEnv(root);
const port = Number(process.env.PORT || 5173);

const routeApi = createApiRouter({
  archiveStore: createArchiveStore(root),
  journalStore: createJournalStore(root),
});

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await routeApi(url, request, response);
      return;
    }
    await serveStatic(root, url, response);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "internal_error" });
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`SetScope running at http://127.0.0.1:${port}/`);
});
