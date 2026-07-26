export class HttpRequestError extends Error {
  constructor(statusCode, code, details = undefined) {
    super(code);
    this.name = "HttpRequestError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export async function readJson(request, { maxBytes = 1024 * 1024, allowEmpty = false } = {}) {
  const declaredLength = Number(request.headers?.["content-length"] || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new HttpRequestError(413, "payload_too_large", { maxBytes });
  }

  const chunks = [];
  let receivedBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    receivedBytes += buffer.byteLength;
    if (receivedBytes > maxBytes) {
      throw new HttpRequestError(413, "payload_too_large", { maxBytes });
    }
    chunks.push(buffer);
  }
  if (!receivedBytes) {
    if (allowEmpty) return {};
    throw new HttpRequestError(400, "json_body_required");
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpRequestError(400, "invalid_json");
  }
}

export async function readBinary(request, { maxBytes = 12 * 1024 * 1024, allowEmpty = true } = {}) {
  const declaredLength = Number(request.headers?.["content-length"] || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new HttpRequestError(413, "payload_too_large", { maxBytes });
  }
  const contentType = String(request.headers?.["content-type"] || "application/octet-stream").split(";", 1)[0].trim();
  if (!contentType.startsWith("audio/") && contentType !== "application/octet-stream") {
    throw new HttpRequestError(415, "unsupported_audio_type");
  }
  const chunks = [];
  let receivedBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    receivedBytes += buffer.byteLength;
    if (receivedBytes > maxBytes) throw new HttpRequestError(413, "payload_too_large", { maxBytes });
    chunks.push(buffer);
  }
  if (!receivedBytes && !allowEmpty) throw new HttpRequestError(400, "audio_body_required");
  return { bytes: Buffer.concat(chunks), mimeType: contentType, size: receivedBytes };
}

export function sendJson(response, status, payload) {
  if (response.headersSent || response.writableEnded) return;
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

export function sendError(response, error) {
  const status = Number(error?.statusCode);
  const statusCode = Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
  const code = statusCode === 500 ? "internal_error" : error?.code || "request_failed";
  const payload = { error: code };
  if (error?.details !== undefined) payload.details = error.details;
  sendJson(response, statusCode, payload);
}
