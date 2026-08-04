import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { createArchiveStore } from "./server/archive-store.mjs";
import { createSetScopeDatabase } from "./server/database.mjs";
import { loadLocalEnv } from "./server/env.mjs";
import { createJournalStore } from "./server/journal-store.mjs";
import { createRecognitionStore } from "./server/recognition-store.mjs";
import { HttpRequestError, sendError } from "./server/json.mjs";
import { createApiRouter } from "./server/routes.mjs";
import { serveStatic } from "./server/static.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
await loadLocalEnv(root);
const port = Number(process.env.PORT || 5173);

const database = createSetScopeDatabase(root);
const recognitionStore = createRecognitionStore(root, { database });
const archiveStore = createArchiveStore(root, { database });
const routeApi = createApiRouter({
  archiveStore,
  journalStore: createJournalStore(root),
  recognitionStore,
});

const server = createServer(async (request, response) => {
  try {
    assertLocalRequest(request);
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await routeApi(url, request, response);
      return;
    }
    await serveStatic(root, url, response);
  } catch (error) {
    if (!error?.statusCode || error.statusCode >= 500) console.error(error);
    sendError(response, error);
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`SetScope running at http://127.0.0.1:${port}/`);
});

function assertLocalRequest(request) {
  const host = String(request.headers.host || "").toLowerCase();
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host)) {
    throw new HttpRequestError(403, "local_host_required");
  }
  const origin = String(request.headers.origin || "");
  if (!origin) return;
  let originHost = "";
  try {
    originHost = new URL(origin).hostname.toLowerCase();
  } catch {
    throw new HttpRequestError(403, "local_origin_required");
  }
  if (!["localhost", "127.0.0.1", "::1"].includes(originHost)) {
    throw new HttpRequestError(403, "local_origin_required");
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    server.close(() => {
      database.close();
      process.exit(0);
    });
  });
}
