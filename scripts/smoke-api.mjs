import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 5187;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["server.mjs"], {
  env: {
    ...process.env,
    PORT: String(port),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

try {
  await waitForServer(baseUrl);

  const health = await getJson(`${baseUrl}/api/health`);
  assert.equal(health.ok, true);
  assert.equal(typeof health.recognition.activeProvider, "string");

  const diagnostics = await getJson(`${baseUrl}/api/providers/diagnostics`);
  assert.equal(diagnostics.ok, true);
  assert.equal(diagnostics.checks.some((check) => check.id === "capture-window"), true);

  const recognition = await postJson(`${baseUrl}/api/recognize`, {
    cursor: 0,
    audio: {
      dataUrl: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=",
      durationMs: 8000,
      mimeType: "audio/wav",
      size: 44,
    },
    windowSeconds: 8,
  });
  assert.equal(recognition.audio.hasData, true);
  assert.equal(recognition.match.raw.audio.dataUrl, undefined);
  assert.equal(typeof recognition.match.title, "string");

  const analysis = await postJson(`${baseUrl}/api/analyze`, {
    tracks: [recognition.match],
  });
  assert.equal(analysis.trackCount, 1);

  console.log("API smoke checks passed");
} finally {
  server.kill();
}

async function waitForServer(url) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 5000) {
    try {
      await getJson(`${url}/api/health`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }
  throw new Error("server_start_timeout");
}

async function getJson(url) {
  const response = await fetch(url);
  assert.equal(response.ok, true);
  return response.json();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(response.ok, true);
  return response.json();
}
