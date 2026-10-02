/* SIMG v5: gallery-only lossless placement. Header lives on the textured
   bottom scanline; ciphertext uses only the picture's predefined regions.
   Old formats continue to be decoded by the existing application. */
function galleryRegion(id, x, y) {
  const variant = (id - 1) % 3;
  return y >= .75 || (variant !== 1 && x < .125) || (variant !== 0 && x >= .875);
}
function gallerySlots(image, id) {
  if (!Number.isInteger(id) || id < 1 || id > 30) throw new Error("Unknown gallery picture.");
  const slots = [];
  for (let y = 0; y < image.height - 1; y++) {
    for (let x = 0; x < image.width; x++) {
      if (!galleryRegion(id, (x + .5) / image.width, (y + .5) / image.height)) continue;
      const p = (y * image.width + x) * 4;
      slots.push(p, p + 1, p + 2);
    }
  }
  return slots;
}
function galleryCapacity(image, id) {
  return Math.max(0, Math.floor(gallerySlots(image, id).length / 8) - 16);
}
function galleryHeaderSlot(image, slot) {
  return ((image.height - 1) * image.width + Math.floor(slot / 3)) * 4 + slot % 3;
}
async function embedGallery(image, packet, secret, id) {
  const header = concat(Uint8Array.from([0x53, 0x49, 0x4d, 0x47, 5, id]), packet.header);
  const hb = bytesToBits(header), slots = gallerySlots(image, id), bits = bytesToBits(packet.cipher);
  if (hb.length > image.width * 3 || bits.length > slots.length) throw new Error("This picture cannot hold this message.");
  for (let i = 0; i < hb.length; i++) {
    const p = galleryHeaderSlot(image, i);
    image.data[p] = (image.data[p] & 254) | hb[i];
  }
  const seed = await placementSeed(secret, packet.header.slice(12, 28), `SIMG5 gallery ${id}`);
  const perm = affineParams(seed, slots.length);
  for (let i = 0; i < bits.length; i++) {
    const p = slots[affineAt(i, slots.length, perm)];
    image.data[p] = (image.data[p] & 254) | bits[i];
  }
}
async function extractGallery(image, secret) {
  const count = (6 + V2_HEADER_LEN) * 8;
  if (image.width * 3 < count || image.height < 2) return null;
  const hb = new Uint8Array(count);
  for (let i = 0; i < count; i++) hb[i] = image.data[galleryHeaderSlot(image, i)] & 1;
  const header = bitsToBytes(hb);
  if (![0x53, 0x49, 0x4d, 0x47, 5].every((v, i) => header[i] === v)) return null;
  const id = header[5];
  const meta = parseV2Header(header.slice(6));
  if (!meta || meta.mode !== MODE_LOSSLESS) throw new Error("The secret picture header is damaged.");
  const slots = gallerySlots(image, id);
  if (meta.cipherLength < 16 || meta.cipherLength * 8 > slots.length) throw new Error("The secret picture is incomplete or damaged.");
  const seed = await placementSeed(secret, meta.salt, `SIMG5 gallery ${id}`), perm = affineParams(seed, slots.length);
  const bits = new Uint8Array(meta.cipherLength * 8);
  for (let i = 0; i < bits.length; i++) bits[i] = image.data[slots[affineAt(i, slots.length, perm)]] & 1;
  return {plain: await decryptV2(meta, bitsToBytes(bits), secret), mode: "Gallery / Discreet PNG", corrected: 0, meta: {...meta, galleryId: id}};
}

// The v3 header carries this map, so the receiver needs neither the original
// picture nor the gallery. Keep the subject protected; use textured lower
// regions and side edges for the error-corrected frequency-domain payload.
function galleryRobustMap(id) {
  if (!Number.isInteger(id) || id < 1 || id > 30) throw new Error("Unknown gallery picture.");
  return Uint8Array.from({length:48}, (_,i) => {
    const x=i%8,y=Math.floor(i/8);
    return galleryRegion(id,(x+.5)/8,(y+.5)/6) ? 1 : 3;
  });
}
