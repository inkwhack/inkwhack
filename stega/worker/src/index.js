const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ID_BYTES = 16;
const TOKEN_BYTES = 32;
const ALLOWED_ORIGINS = new Set(["https://inkwhack.co.uk", "https://www.inkwhack.co.uk", "null"]);

function cors(request) {
  const origin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://inkwhack.co.uk",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
    "Access-Control-Expose-Headers": "ETag,X-Live-Image-Version,Last-Modified",
    Vary: "Origin",
  };
}

function json(request, value, status = 200, extra = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors(request), ...extra },
  });
}

function randomBase64Url(bytes) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function sha256Hex(value) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

function liveKey(id) { return `live/${id}`; }
function validId(id) { return /^[A-Za-z0-9_-]{22}$/.test(id); }
function bearer(request) {
  const match = request.headers.get("Authorization")?.match(/^Bearer ([A-Za-z0-9_-]{40,128})$/);
  return match?.[1] || null;
}

function expiryDate(value, now = Date.now()) {
  if (!value || value === "never") return null;
  const durations = { "1h": 3600e3, "24h": 86400e3, "7d": 7 * 86400e3 };
  if (durations[value]) return new Date(now + durations[value]).toISOString();
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || parsed <= now || parsed > now + 365 * 86400e3) throw new Error("Invalid expiry.");
  return new Date(parsed).toISOString();
}

function expired(metadata) { return metadata?.expiresAt && Date.parse(metadata.expiresAt) <= Date.now(); }

async function checkImage(file, format) {
  if (!(file instanceof Blob)) throw new Error("An encrypted Secret Image is required.");
  if (file.size < 128 || file.size > MAX_IMAGE_BYTES) throw new Error("Secret Images must be between 128 bytes and 10 MB.");
  if (file.type !== "image/png" && file.type !== "image/jpeg") throw new Error("Only PNG and JPEG Secret Images are accepted.");
  if (format !== "SIMG-lossless" && format !== "SIMG-social") throw new Error("Unsupported Secret Image format metadata.");
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47;
  const jpeg = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  if ((file.type === "image/png" && !png) || (file.type === "image/jpeg" && !jpeg)) throw new Error("The uploaded file signature does not match its image type.");
}

async function rateLimit(binding, request) {
  if (!binding) return true;
  const key = request.headers.get("CF-Connecting-IP") || "unknown";
  return (await binding.limit({ key })).success;
}

function publicRecord(env, id, object) {
  const m = object.customMetadata || {};
  return {
    publicId: id,
    url: `${env.PUBLIC_ORIGIN}/stega/live/${id}`,
    imageUrl: `${env.PUBLIC_ORIGIN}/stega/api/live/${id}/image`,
    status: "active",
    version: Number(m.version || 1),
    contentType: object.httpMetadata?.contentType || m.contentType,
    bytes: object.size,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    expiresAt: m.expiresAt || null,
  };
}

async function liveObject(env, id) {
  const object = await env.LIVE_IMAGES.head(liveKey(id));
  if (!object) return { error: 404 };
  if (expired(object.customMetadata)) {
    await env.LIVE_IMAGES.delete(liveKey(id));
    return { error: 410 };
  }
  return { object };
}

async function requireOwner(request, object) {
  const token = bearer(request);
  if (!token) return false;
  return safeEqual(await sha256Hex(token), object.customMetadata?.ownerHash || "");
}

async function createLive(request, env) {
  if (!await rateLimit(env.CREATE_LIMIT, request)) return json(request, { error: "Too many Live Images created. Try again later." }, 429);
  let form;
  try { form = await request.formData(); } catch { return json(request, { error: "Expected a multipart image upload." }, 400); }
  for (const forbidden of ["message", "plaintext", "passphrase", "password", "key", "encryptionKey"]) if (form.has(forbidden)) return json(request, { error: "Plaintext, passphrases and keys must never be uploaded." }, 400);
  const image = form.get("image"), format = String(form.get("format") || "");
  let expiresAt;
  try { await checkImage(image, format); expiresAt = expiryDate(String(form.get("expiry") || "never")); }
  catch (error) { return json(request, { error: error.message }, 400); }
  const now = new Date().toISOString(), ownerToken = randomBase64Url(TOKEN_BYTES), ownerHash = await sha256Hex(ownerToken);
  let publicId;
  for (let attempt = 0; attempt < 4; attempt++) {
    const candidate = randomBase64Url(ID_BYTES);
    if (!await env.LIVE_IMAGES.head(liveKey(candidate))) { publicId = candidate; break; }
  }
  if (!publicId) return json(request, { error: "Could not allocate a Live Image identifier." }, 503);
  const metadata = { ownerHash, createdAt: now, updatedAt: now, expiresAt: expiresAt || "", version: "1", format, contentType: image.type };
  await env.LIVE_IMAGES.put(liveKey(publicId), image.stream(), { httpMetadata: { contentType: image.type }, customMetadata: metadata });
  const object = await env.LIVE_IMAGES.head(liveKey(publicId));
  return json(request, { ...publicRecord(env, publicId, object), ownerToken }, 201);
}

async function getMetadata(request, env, id) {
  if (!await rateLimit(env.READ_LIMIT, request)) return json(request, { error: "Too many requests. Try again shortly." }, 429);
  const result = await liveObject(env, id);
  if (result.error) return json(request, { error: result.error === 410 ? "This Live Image has expired." : "Live Image not found." }, result.error);
  return json(request, publicRecord(env, id, result.object), 200, { ETag: `"live-${id}-v${result.object.customMetadata.version}"` });
}

async function getImage(request, env, id) {
  if (!await rateLimit(env.READ_LIMIT, request)) return json(request, { error: "Too many requests. Try again shortly." }, 429);
  const record = await liveObject(env, id);
  if (record.error) return json(request, { error: record.error === 410 ? "This Live Image has expired." : "Live Image not found." }, record.error);
  const version = record.object.customMetadata.version, etag = `"live-${id}-v${version}-${record.object.httpEtag || "current"}"`;
  if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers: { ...cors(request), ETag: etag, "Cache-Control": "public, max-age=0, must-revalidate, no-cache" } });
  const object = await env.LIVE_IMAGES.get(liveKey(id));
  return new Response(object.body, { headers: { ...cors(request), "Content-Type": object.httpMetadata?.contentType || "application/octet-stream", "Content-Length": String(object.size), "Cache-Control": "public, max-age=0, must-revalidate, no-cache", ETag: etag, "Last-Modified": object.customMetadata.updatedAt, "X-Live-Image-Version": version, "X-Content-Type-Options": "nosniff", "Content-Disposition": `inline; filename="live-${id}.${object.httpMetadata?.contentType === "image/png" ? "png" : "jpg"}"` } });
}

async function updateLive(request, env, id) {
  if (!await rateLimit(env.WRITE_LIMIT, request)) return json(request, { error: "Too many update attempts. Try again later." }, 429);
  const record = await liveObject(env, id);
  if (record.error) return json(request, { error: "Live Image not found." }, record.error);
  if (!await requireOwner(request, record.object)) return json(request, { error: "A valid owner token is required." }, 401);
  let form;
  try { form = await request.formData(); } catch { return json(request, { error: "Expected a multipart image upload." }, 400); }
  for (const forbidden of ["message", "plaintext", "passphrase", "password", "key", "encryptionKey"]) if (form.has(forbidden)) return json(request, { error: "Plaintext, passphrases and keys must never be uploaded." }, 400);
  const image = form.get("image"), format = String(form.get("format") || "");
  try { await checkImage(image, format); } catch (error) { return json(request, { error: error.message }, 400); }
  const old = record.object.customMetadata, updatedAt = new Date().toISOString(), version = String(Number(old.version || 1) + 1);
  await env.LIVE_IMAGES.put(liveKey(id), image.stream(), { httpMetadata: { contentType: image.type }, customMetadata: { ...old, updatedAt, version, format, contentType: image.type } });
  return json(request, publicRecord(env, id, await env.LIVE_IMAGES.head(liveKey(id))));
}

async function deleteLive(request, env, id) {
  if (!await rateLimit(env.WRITE_LIMIT, request)) return json(request, { error: "Too many delete attempts. Try again later." }, 429);
  const record = await liveObject(env, id);
  if (record.error) return json(request, { error: "Live Image not found." }, record.error);
  if (!await requireOwner(request, record.object)) return json(request, { error: "A valid owner token is required." }, 401);
  await env.LIVE_IMAGES.delete(liveKey(id));
  return new Response(null, { status: 204, headers: { ...cors(request), "Cache-Control": "no-store" } });
}

function publicPage(env, id) {
  const app = `${env.PUBLIC_ORIGIN}/stega/?live=${id}&embed=1`;
  const image = `${env.PUBLIC_ORIGIN}/stega/api/live/${id}/image`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Secret Image</title><style>body{margin:0;background:#090b10;color:#f4f6fb;font:16px system-ui;text-align:center}main{max-width:900px;margin:auto;padding:24px}img{max-width:100%;max-height:52vh;border-radius:14px;background:#05070b}iframe{width:100%;height:880px;border:0;margin-top:18px;border-radius:14px;background:#0b0d12}p{color:#aab2c2}</style></head><body><main><h1>Secret Image</h1><img src="${image}" alt="Current encrypted Secret Image"><p>This image contains an encrypted message. Enter the passphrase below to decode it locally in your browser.</p><iframe src="${app}" title="Local Secret Image decoder"></iframe></main></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'self'; img-src 'self'; frame-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
    const url = new URL(request.url), path = url.pathname.replace(/\/+$/, "");
    if (path === "/stega/api/live/health" && request.method === "GET") return json(request, { status: "ok", service: "inkwhack-stega-live" });
    const page = path.match(/^\/stega\/live\/([A-Za-z0-9_-]{22})$/);
    if (page && request.method === "GET") return publicPage(env, page[1]);
    if (path === "/stega/api/live" && request.method === "POST") return createLive(request, env);
    const match = path.match(/^\/stega\/api\/live\/([A-Za-z0-9_-]{22})(\/image)?$/);
    if (!match || !validId(match[1])) return json(request, { error: "Not found." }, 404);
    const [, id, imagePath] = match;
    if (imagePath && request.method === "GET") return getImage(request, env, id);
    if (!imagePath && request.method === "GET") return getMetadata(request, env, id);
    if (!imagePath && request.method === "PUT") return updateLive(request, env, id);
    if (!imagePath && request.method === "DELETE") return deleteLive(request, env, id);
    return json(request, { error: "Method not allowed." }, 405, { Allow: imagePath ? "GET" : "GET,PUT,DELETE" });
  },
};
