import { readBinary, readJson, sendJson } from "./json.mjs";
import {
  analyzeTracks,
  getRecognitionDiagnostics,
  getRecognitionProviderLabel,
  getRecognitionProviderStatus,
  recognizeAudioWindow,
} from "./recognition-provider.mjs";

export function createApiRouter({
  archiveStore,
  journalStore,
  recognitionStore,
  recognitionLimiter,
  recognitionClientKey = () => "anonymous",
}) {
  return async function routeApi(url, request, response) {
    if (url.pathname === "/api/health") {
      sendJson(response, 200, {
        ok: true,
        provider: getRecognitionProviderLabel(),
        recognition: getRecognitionProviderStatus(),
      });
      return;
    }

    if (url.pathname === "/api/providers/diagnostics") {
      sendJson(response, 200, getRecognitionDiagnostics());
      return;
    }

    if (url.pathname === "/api/recognize" && request.method === "POST") {
      const audio = await readBinary(request);
      const requestId = header(request, "x-setscope-request-id");
      const cursor = finiteHeader(request, "x-setscope-cursor");
      const sessionId = header(request, "x-setscope-session-id");
      const setElapsedMs = finiteHeader(request, "x-setscope-set-elapsed-ms");
      const windowMs = finiteHeader(request, "x-setscope-window-ms");
      const demoMode = header(request, "x-setscope-demo") === "1";
      const controller = new AbortController();
      request.once("aborted", () => controller.abort("client_aborted"));
      let rate = null;
      const principal = request.setscopePrincipal || { tenantId: "local" };
      const transaction = await recognitionStore.execute(requestId, async () => {
        rate = recognitionLimiter?.consume(principal.tenantId || recognitionClientKey(request));
        return recognizeAudioWindow({
          requestId,
          cursor,
          audio: { ...audio, durationMs: windowMs },
          signal: controller.signal,
          metadata: {
            sessionId,
            setElapsedMs,
            windowSeconds: Math.max(1, Math.round(windowMs / 1000)),
            demoMode,
          },
        });
      }, principal.tenantId);
      if (rate) {
        response.setHeader("x-ratelimit-limit", String(rate.limit));
        response.setHeader("x-ratelimit-remaining", String(rate.remaining));
        response.setHeader("x-ratelimit-reset", new Date(rate.resetAt).toISOString());
      }
      logRecognitionTransaction(transaction, requestId, principal);
      sendJson(response, 200, {
        ...transaction.value,
        transaction: {
          requestId,
          replayed: transaction.replayed,
        },
      });
      return;
    }

    if (url.pathname === "/api/analyze" && request.method === "POST") {
      const body = await readJson(request, { maxBytes: 1024 * 1024 });
      const tracks = Array.isArray(body.tracks) ? body.tracks : [];
      sendJson(response, 200, analyzeTracks(tracks));
      return;
    }

    if (url.pathname === "/api/journal" && request.method === "GET") {
      sendJson(response, 200, { markdown: await journalStore.loadJournal() });
      return;
    }

    if (url.pathname === "/api/journal" && request.method === "POST") {
      const body = await readJson(request, { maxBytes: 2 * 1024 * 1024 });
      if (typeof body.markdown !== "string") {
        sendJson(response, 400, { error: "markdown_required" });
        return;
      }
      await journalStore.saveJournal(body.markdown);
      sendJson(response, 200, { ok: true, updatedAt: new Date().toISOString() });
      return;
    }

    if (url.pathname === "/api/sets" && request.method === "GET") {
      const query = String(url.searchParams.get("q") || "").slice(0, 160);
      sendJson(response, 200, { query, sets: await archiveStore.listSets({ query }) });
      return;
    }

    if (url.pathname === "/api/sets" && request.method === "POST") {
      const body = await readJson(request, { maxBytes: 5 * 1024 * 1024 });
      const saved = await archiveStore.saveSet(body.set || body);
      sendJson(response, 200, { ok: true, set: saved });
      return;
    }

    if (url.pathname.startsWith("/api/sets/") && request.method === "GET") {
      const id = decodeURIComponent(url.pathname.slice("/api/sets/".length));
      const set = await archiveStore.getSet(id);
      if (!set) {
        sendJson(response, 404, { error: "set_not_found" });
        return;
      }
      sendJson(response, 200, { set });
      return;
    }

    sendJson(response, 404, { error: "not_found" });
  };
}

function header(request, name) {
  const value = request.headers?.[name];
  return Array.isArray(value) ? value[0] || "" : String(value || "");
}

function finiteHeader(request, name) {
  const parsed = Number(header(request, name));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function logRecognitionTransaction(transaction, requestId, principal = {}) {
  const observation = transaction.value?.observation || {};
  console.log(JSON.stringify({
    event: "recognition_transaction",
    requestId,
    observationId: observation.observationId || "",
    outcome: observation.outcome || "invalid",
    provider: observation.provider || "unknown-provider",
    latencyMs: observation.latencyMs || 0,
    replayed: transaction.replayed,
    tenantId: principal.tenantId || "local",
    plan: principal.plan || "local",
    platform: principal.platform || "unknown",
  }));
}
