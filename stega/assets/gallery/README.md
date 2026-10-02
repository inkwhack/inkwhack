# Stega gallery

30 pictures generated with the built-in image-generation tool. The subjects and each picture's fixed encoding regions are listed in `catalog.js`.

Final prompt template (one request per subject):

> One standalone square photographic image of {subject}. Calm beautiful realistic editorial photography for a gallery. Main focal detail centred in upper half. Fill bottom quarter and BOTH side edges with dense detailed natural texture appropriate to the scene (gravel, foliage, stone, wood grain or reflections), suitable to disguise small pixel changes. Textured outer edges too. No people, text, logos, codes, borders, watermarks or message symbols.

The first three requests use the same composition brief, with the subjects mossy forest stream, pebble beach at dusk and rainy cobblestone lane. They specify subdued natural colours and a densely textured lower quarter with textured side edges.

The generated pictures are exported as 1024px WebP assets and 240px thumbnails for faster gallery browsing. The browser draws the selected asset to a canvas and saves a robust JPG for photo sharing. The original PNG is not needed.

## Current photo-sharing format (SIMG v3)

New messages use the existing frequency-domain encoder with Hamming error correction and fivefold payload repetition. The embedded map confines payload to the gallery picture's textured lower quarter and selected side edges. The bootstrap header occupies outer edge blocks. The central subject is protected from payload changes.

The decoder normalizes image size and recovers the placement map from the embedded header. It needs the received JPG and shared passphrase; neither the original image nor the gallery is required. Capacity is calculated before generation, and overlong messages are rejected. Stronger visible pixel changes than the former lossless mode are necessary to survive JPEG processing.

Browser tests on all 30 real pictures passed 120 cases: saved JPG, JPEG quality 80, resizing to 70% at JPEG quality 90, and resizing to 80% at JPEG quality 80. These are local browser simulations, not end-to-end WhatsApp verification. Heavy cropping, filters, screenshots with borders, or extreme compression are not guaranteed.

Run `node gallery_photo_tests.cjs` from `stega` with Playwright available and the local site running at port 8765 (or set `STEGA_URL`).

## Previous gallery PNG format (SIMG v5), still readable

- AES-256-GCM ciphertext uses the existing PBKDF2 key derivation and random salt/IV.
- A six-byte wrapper (`SIMG`, version 5, picture ID) precedes the existing lossless v2 header, stored in RGB least-significant bits on the final scanline.
- Ciphertext is scattered with a passphrase-derived permutation within the lower quarter and the left, right, or both side edges (12.5% wide), depending on picture ID.
- The last scanline is excluded from the ciphertext pool. Alpha and all pixels outside the fixed regions are unchanged. Each modified RGB value differs by at most one.
- Decode recovers picture ID and placement without needing the original gallery file. Existing v1–v4 decoding remains available.
- Camouflage reduces visible changes; it does not guarantee resistance to statistical steganalysis. PNG recompression without pixel changes is fine; cropping, resizing, screenshots and lossy compression are unsupported.

Run `node gallery_tests.js` from the `stega` folder to verify all 30 placement maps, message round trips, wrong-passphrase rejection, pixel invariants, capacity handling and old lossless compatibility.
