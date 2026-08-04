import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { createArchiveStore } from "./server/archive-store.mjs";
import { createSetScopeDatabase } from "./server/database.mjs";
import { loadLocalEnv } from "./server/env.mjs";
import { createJournalStore } from "./server/journal-store.mjs";
import { createOidcAuthenticator } from "./server/oidc-auth.mjs";
import { createRecognitionStore } from "./server/recognition-store.mjs";
import { sendError } from "./server/json.mjs";
import { createFixedWindowRateLimiter } from "./server/rate-limit.mjs";
import { createRequestPolicy } from "./server/request-policy.mjs";
import { createApiRouter } from "./server/routes.mjs";
import { serveStatic } from "./server/static.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
await loadLocalEnv(root);
const port = Number(process.env.PORT || 5173);
const requestPolicy = createRequestPolicy(process.env);
const remoteAuthenticator = createOidcAuthenticator(process.env);

const database = createSetScopeDatabase(root);
const recognitionStore = createRecognitionStore(root, { database });
const archiveStore = createArchiveStore(root, { database });
const routeApi = createApiRouter({
  archiveStore,
  journalStore: createJournalStore(root),
  recognitionStore,
  recognitionLimiter: createFixedWindowRateLimiter({
    limit: process.env.SETSCOPE_RECOGNITION_LIMIT,
  }),
  recognitionClientKey: requestPolicy.clientKey,
});

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://localhost");
    requestPolicy.assertRequest(request, url);
    requestPolicy.applyCors(request, response);
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }
    request.setscopePrincipal = requestPolicy.requiresAuthentication(request, url)
      ? await remoteAuthenticator.authenticate(request)
      : { userId: "local", tenantId: "local", plan: "local", platform: "local" };
    if (url.pathname.startsWith("/api/")) {
      await routeApi(url, request, response);
      return;
    }
    await serveStatic(root, url, response);
  } catch (error) {
    if (!error?.statusCode || error.statusCode >= 500) console.error(error);
    sendError(response, error);
  }
}).listen(port, requestPolicy.bindHost, () => {
  console.log(`SetScope running at http://${requestPolicy.bindHost}:${port}/`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    server.close(() => {
      database.close();
      process.exit(0);
    });
  });
}
