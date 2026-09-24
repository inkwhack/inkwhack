import assert from "node:assert/strict";
import worker from "../src/index.js";

class MockR2 {
  constructor() { this.objects = new Map(); }
  async put(key, body, options = {}) {
    const bytes = new Uint8Array(await new Response(body).arrayBuffer());
    this.objects.set(key, { bytes, httpMetadata: options.httpMetadata || {}, customMetadata: { ...(options.customMetadata || {}) }, httpEtag: `etag-${bytes.length}` });
  }
  async head(key) {
    const item = this.objects.get(key);
    return item && { size: item.bytes.length, httpMetadata: item.httpMetadata, customMetadata: item.customMetadata, httpEtag: item.httpEtag };
  }
  async get(key) {
    const item = this.objects.get(key);
    return item && { body: item.bytes, size: item.bytes.length, httpMetadata: item.httpMetadata, customMetadata: item.customMetadata, httpEtag: item.httpEtag };
  }
  async delete(key) { this.objects.delete(key); }
}

const limiter = { async limit() { return { success: true }; } };
const env = { LIVE_IMAGES: new MockR2(), CREATE_LIMIT: limiter, WRITE_LIMIT: limiter, READ_LIMIT: limiter, PUBLIC_ORIGIN: "https://inkwhack.co.uk" };
const headers = { Origin: "https://inkwhack.co.uk", "CF-Connecting-IP": "203.0.113.9" };
function jpeg(seed) { const bytes = new Uint8Array(512);bytes.set([0xff,0xd8,0xff,0xe0]);for(let i=4;i<bytes.length;i++)bytes[i]=(i*seed)&255;return new Blob([bytes],{type:"image/jpeg"}); }
function upload(image, extra = {}) { const form = new FormData();form.append("image", image, "secret-image.jpg");form.append("format", "SIMG-social");form.append("expiry", "never");for(const [key,value] of Object.entries(extra))form.append(key,value);return form; }
async function call(path, init = {}) { return worker.fetch(new Request(`https://inkwhack.co.uk${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } }), env); }

const health = await call("/stega/api/live/health");
assert.equal(health.status, 200);

const rejectedPlaintext = await call("/stega/api/live", { method: "POST", body: upload(jpeg(1), { passphrase: "must-not-upload" }) });
assert.equal(rejectedPlaintext.status, 400);

const createdResponse = await call("/stega/api/live", { method: "POST", body: upload(jpeg(2)) });
assert.equal(createdResponse.status, 201);
const created = await createdResponse.json();
assert.match(created.publicId, /^[A-Za-z0-9_-]{22}$/);
assert.match(created.ownerToken, /^[A-Za-z0-9_-]{43}$/);
assert.equal(created.version, 1);
assert.equal(created.url, `https://inkwhack.co.uk/stega/live/${created.publicId}`);
assert(!created.url.includes(created.ownerToken));

const stored = env.LIVE_IMAGES.objects.get(`live/${created.publicId}`);
assert(stored.customMetadata.ownerHash);
assert(!Object.values(stored.customMetadata).includes(created.ownerToken));
assert(!("message" in stored.customMetadata) && !("passphrase" in stored.customMetadata));

const publicMetaResponse = await call(`/stega/api/live/${created.publicId}`);
assert.equal(publicMetaResponse.status, 200);
const publicMeta = await publicMetaResponse.json();
assert.equal(publicMeta.version, 1);
assert(!("ownerToken" in publicMeta));

const firstImage = await call(`/stega/api/live/${created.publicId}/image`);
assert.equal(firstImage.status, 200);
assert.equal(firstImage.headers.get("Cache-Control"), "public, max-age=0, must-revalidate, no-cache");
assert.deepEqual(new Uint8Array(await firstImage.arrayBuffer()), new Uint8Array(await jpeg(2).arrayBuffer()));

const updateWithoutToken = await call(`/stega/api/live/${created.publicId}`, { method: "PUT", body: upload(jpeg(3)) });
assert.equal(updateWithoutToken.status, 401);
const updateWrongToken = await call(`/stega/api/live/${created.publicId}`, { method: "PUT", headers: { Authorization: `Bearer ${"x".repeat(43)}` }, body: upload(jpeg(3)) });
assert.equal(updateWrongToken.status, 401);

const updatedResponse = await call(`/stega/api/live/${created.publicId}`, { method: "PUT", headers: { Authorization: `Bearer ${created.ownerToken}` }, body: upload(jpeg(4)) });
assert.equal(updatedResponse.status, 200);
const updated = await updatedResponse.json();
assert.equal(updated.publicId, created.publicId);
assert.equal(updated.url, created.url);
assert.equal(updated.version, 2);
const secondImage = await call(`/stega/api/live/${created.publicId}/image`);
assert.deepEqual(new Uint8Array(await secondImage.arrayBuffer()), new Uint8Array(await jpeg(4).arrayBuffer()));

const publicPage = await call(`/stega/live/${created.publicId}`);
assert.equal(publicPage.status, 200);
const publicHtml = await publicPage.text();
assert(publicHtml.includes(`/stega/?live=${created.publicId}&embed=1`));
assert(!publicHtml.includes(created.ownerToken));

const deleteWithoutToken = await call(`/stega/api/live/${created.publicId}`, { method: "DELETE" });
assert.equal(deleteWithoutToken.status, 401);
const deleteWrongToken = await call(`/stega/api/live/${created.publicId}`, { method: "DELETE", headers: { Authorization: `Bearer ${"y".repeat(43)}` } });
assert.equal(deleteWrongToken.status, 401);
const deleted = await call(`/stega/api/live/${created.publicId}`, { method: "DELETE", headers: { Authorization: `Bearer ${created.ownerToken}` } });
assert.equal(deleted.status, 204);
assert.equal((await call(`/stega/api/live/${created.publicId}`)).status, 404);
assert.equal((await call(`/stega/api/live/${created.publicId}/image`)).status, 404);

console.log("PASS create returns non-enumerable public ID and separate owner token");
console.log("PASS owner token stored only as SHA-256 hash");
console.log("PASS public metadata and image retrieval");
console.log("PASS update without/wrong token rejected");
console.log("PASS correct-token update preserves URL and increments version");
console.log("PASS latest image replaces previous image");
console.log("PASS public page contains local decoder and no owner token");
console.log("PASS delete without/wrong token rejected");
console.log("PASS correct-token delete removes metadata and image");
console.log("PASS plaintext/passphrase upload rejected");
