import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { sendJson } from "./json.mjs";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

export async function serveStatic(root, url, response) {
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const path = normalize(join(root, pathname));
  if (!path.startsWith(root)) {
    sendJson(response, 403, { error: "forbidden" });
    return;
  }
  try {
    const content = await readFile(path);
    response.writeHead(200, {
      "content-type": mimeTypes[extname(path)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(content);
  } catch {
    sendJson(response, 404, { error: "not_found" });
  }
}
