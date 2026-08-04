import { HttpRequestError } from "./json.mjs";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const REMOTE_API_PATHS = new Set([
  "/api/health",
  "/api/providers/diagnostics",
  "/api/recognize",
  "/api/analyze",
]);

export function createRequestPolicy(env = process.env) {
  const publicHosts = new Set(parseList(env.SETSCOPE_PUBLIC_HOSTS).map(normalizeHost).filter(Boolean));
  const allowedOrigins = new Set(parseList(env.SETSCOPE_ALLOWED_ORIGINS).map(normalizeOrigin).filter(Boolean));
  const trustProxy = env.SETSCOPE_TRUST_PROXY === "1";

  function assertRequest(request, url) {
    const host = normalizeHost(request.headers.host);
    if (!LOCAL_HOSTS.has(host) && !publicHosts.has(host)) {
      throw new HttpRequestError(403, "allowed_host_required");
    }
    const origin = normalizeOrigin(request.headers.origin);
    if (!origin) return;
    const originHost = normalizeHost(new URL(origin).hostname);
    const localOrigin = LOCAL_HOSTS.has(originHost);
    if (!localOrigin && !allowedOrigins.has(origin)) {
      throw new HttpRequestError(403, "allowed_origin_required");
    }
    if (!localOrigin && !REMOTE_API_PATHS.has(url.pathname)) {
      throw new HttpRequestError(403, "remote_route_not_available");
    }
  }

  function applyCors(request, response) {
    const origin = normalizeOrigin(request.headers.origin);
    if (!origin || !allowedOrigins.has(origin)) return;
    response.setHeader("access-control-allow-origin", origin);
    response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
    response.setHeader("access-control-allow-headers", [
      "content-type",
      "authorization",
      "x-setscope-cursor",
      "x-setscope-request-id",
      "x-setscope-session-id",
      "x-setscope-set-elapsed-ms",
      "x-setscope-window-ms",
      "x-setscope-demo",
      "x-setscope-client-platform",
    ].join(", "));
    response.setHeader("access-control-max-age", "600");
    response.setHeader("vary", "Origin");
  }

  function clientKey(request) {
    if (trustProxy) {
      const forwarded = String(request.headers["x-forwarded-for"] || "").split(",", 1)[0].trim();
      if (forwarded) return forwarded;
    }
    return request.socket?.remoteAddress || "anonymous";
  }

  function requiresAuthentication(request, url) {
    const origin = normalizeOrigin(request.headers.origin);
    const originHost = origin ? normalizeHost(new URL(origin).hostname) : "";
    const requestHost = normalizeHost(request.headers.host);
    const remoteClient = !LOCAL_HOSTS.has(requestHost) || (originHost && !LOCAL_HOSTS.has(originHost));
    return Boolean(remoteClient && ["/api/recognize", "/api/analyze"].includes(url.pathname));
  }

  return {
    applyCors,
    assertRequest,
    bindHost: String(env.SETSCOPE_BIND_HOST || "127.0.0.1"),
    clientKey,
    requiresAuthentication,
  };
}

function parseList(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function normalizeHost(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "";
  try {
    return new URL(`http://${text}`).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function normalizeOrigin(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return "";
    return url.origin;
  } catch {
    return "";
  }
}
