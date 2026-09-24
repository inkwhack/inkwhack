# Secret Image formats

All multi-byte integers are unsigned big-endian. All message bytes are UTF-8.

## Shared cryptography

- PBKDF2-HMAC-SHA-256, 210,000 iterations, random 16-byte salt
- AES-256-GCM, random 12-byte IV, 128-bit authentication tag
- The ciphertext field is `AES-GCM(UTF-8 plaintext)`, including the GCM tag.
- Salt, IV, mode, and ciphertext length are framing data. No plaintext metadata is stored.

## Legacy SIMG v1 (decode only)

RGB channels are visited from the first pixel in R/G/B order. One LSB is read per channel.

```text
outer length       4 bytes
magic              4 bytes   "SIMG"
version            1 byte    0x01
salt              16 bytes
IV                 12 bytes
ciphertext+tag      N bytes
```

The outer length covers everything after the length field. This decoder remains unchanged in behavior.

## SIMG v2 locator header

Both new modes use this fixed 42-byte header:

```text
offset  size  field
0       4     magic = "SIMG"
4       1     version = 0x02
5       1     mode: 0x01 Lossless, 0x02 Social
6       1     robustness: 0 Standard, 1 Strong, 2 Maximum
7       1     flags (currently zero)
8       4     AES-GCM ciphertext+tag length
12      16    PBKDF2 salt
28      12    AES-GCM IV
40      2     CRC-16/CCITT over bytes 0..39
```

CRC is framing/damage detection, not cryptographic authentication. AES-GCM authenticates the message.

## Lossless / Invisible

- Output: PNG.
- The 42-byte locator is placed in the first 336 RGB LSB channel slots so the decoder can identify the mode and obtain the salt.
- Ciphertext bits use one RGB LSB each.
- Placement is an affine full-cycle permutation over every remaining RGB channel slot. Its coprime multiplier and offset come from `SHA-256("SIMG2 lossless" || NUL || passphrase || salt)`.
- Alpha is not modified.
- Plaintext capacity in bytes is `floor((3 * pixels - 336) / 8) - 16`. The final 16 bytes are reserved for the AES-GCM tag.

## Social / Robust

- Output: JPEG quality 94.
- The longer edge is normalized to 1024 pixels; both dimensions are rounded to multiples of 8. Proportional downstream resizing is normalized back to this grid while decoding.
- One coded bit is embedded per 8x8 block.
- The carrier is the sign of a mid-frequency separable cosine coefficient `(u=2, v=3)`. The encoder moves the coefficient to a positive or negative target magnitude. This is frequency-domain coefficient modulation, not RGB LSB.
- Target magnitudes are 42 (Standard), 54 (Strong), and 68 (Maximum).
- Error correction is standard Hamming(12,8), followed by repetition/majority coding: 3 copies (Standard), 5 (Strong), or 7 (Maximum).
- A public dimension-derived full-cycle permutation spreads repeated header codewords across the image. Ciphertext codewords are interleaved through a second passphrase/salt-derived permutation over the remaining blocks.
- The decoder tries Strong, Standard, then Maximum header framing and automatically selects the mode/strength whose magic, version, mode, and CRC validate.
- Plaintext capacity in bytes is:

```text
blocks = floor(width / 8) * floor(height / 8)
header_blocks = 42 * 12 * repetition
capacity = floor((blocks - header_blocks) / (12 * repetition)) - 16
```

## SIMG v3 smart placement

New Social images use a 59-byte self-describing bootstrap:

```text
offset  size  field
0       40    SIMG base fields through IV (version = 0x03)
40      1     placement: 0 Auto, 1 Selected Areas, 2 Border
41      1     border width: 0 Thin, 1 Medium, 2 Thick
42      1     border style id
43      1     map width = 8
44      1     map height = 6
45      12    packed 2-bit-per-cell placement map
57      2     CRC-16/CCITT over bytes 0..56
```

Map cell values are 0 ordinary/automatic, 1 preferred, 2 low suitability, and 3 protected. The bootstrap is Hamming(12,8)-protected, embedded at elevated coefficient strength, and distributed through normalized outer regions. It is deliberately passphrase-independent so a recipient can recover the salt and placement description. Ciphertext codewords remain passphrase/salt-permuted.

Auto scores each coarse cell using luminance variance, local luminance changes, darkness, and distance from the image centre. The top-scoring cells are preferred and the lowest-scoring cells are avoided. This is visual-quality analysis only, not part of the security model.

Selected Areas stores the 8x6 two-bit editor mask in the bootstrap. The recipient therefore needs only the image and passphrase. Mask overlays exist only in the editor canvas and are never composited into the exported image.

Border adds a new decorative raster around the photograph before normalization. Payload candidates are blocks whose normalized centres fall within the selected 6%, 10%, or 14% outer band. DCT modulation, Hamming coding, repetition, and passphrase-derived placement are unchanged. All four sides participate; no individual side contains a required standalone packet.

SIMG v3 plaintext capacity is:

```text
eligible = preferred + ordinary blocks - bootstrap blocks
capacity = floor(eligible / (12 * robustness_repetition)) - 16
```

## Limitations

- Social mode is designed for proportional resizing and JPEG recompression, not cropping, rotation, screenshots, heavy filters, or extreme compression.
- The decoder attempts normal alignment plus 1%, 2%, and 5% symmetric crop-padding reconstruction. Current simulated Border crop tests still fail at all three crop levels; this is reported rather than presented as crop resistance.
- A Selected Areas mask applies strictly to ciphertext payload blocks. The self-describing Hamming-protected locator uses a reserved normalized outer bootstrap region and can modify blocks there; the Encoding Map displays those blocks in yellow. This bootstrap exception is required so recipients do not need the sender's mask.
- A wrong passphrase and damage beyond ECC repair both end at AES-GCM authentication failure. They cannot always be distinguished safely.
- The local simulation uses browser Canvas in the app and System.Drawing in the repository test harness. Neither exactly reproduces WhatsApp. Use **Create Test Image** and import the actually processed image for real-service diagnostics.
- Social capacity is intentionally much lower than Lossless capacity.
