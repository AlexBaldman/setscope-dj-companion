import { readJson, sendJson } from "./json.mjs";
import {
  analyzeTracks,
  getRecognitionDiagnostics,
  getRecognitionProviderLabel,
  getRecognitionProviderStatus,
  recognizeAudioWindow,
} from "./recognition-provider.mjs";

export function createApiRouter({ archiveStore, journalStore }) {
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
      const body = await readJson(request);
      sendJson(response, 200, await recognizeAudioWindow({
        cursor: body.cursor,
        audio: body.audio,
        metadata: {
          tracks: body.tracks,
          windowSeconds: body.windowSeconds,
        },
      }));
      return;
    }

    if (url.pathname === "/api/analyze" && request.method === "POST") {
      const body = await readJson(request);
      const tracks = Array.isArray(body.tracks) ? body.tracks : [];
      sendJson(response, 200, analyzeTracks(tracks));
      return;
    }

    if (url.pathname === "/api/journal" && request.method === "GET") {
      sendJson(response, 200, { markdown: await journalStore.loadJournal() });
      return;
    }

    if (url.pathname === "/api/journal" && request.method === "POST") {
      const body = await readJson(request);
      if (typeof body.markdown !== "string") {
        sendJson(response, 400, { error: "markdown_required" });
        return;
      }
      await journalStore.saveJournal(body.markdown);
      sendJson(response, 200, { ok: true, updatedAt: new Date().toISOString() });
      return;
    }

    if (url.pathname === "/api/sets" && request.method === "GET") {
      sendJson(response, 200, { sets: await archiveStore.listSets() });
      return;
    }

    if (url.pathname === "/api/sets" && request.method === "POST") {
      const body = await readJson(request);
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
