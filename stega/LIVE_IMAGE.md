# Live Image architecture

## Deployment shape

The existing InkWhack site is GitHub Pages and cannot run an upload API. Live Image therefore uses:

- GitHub Pages for `/stega/` and the browser-only encrypt/decrypt application.
- A Cloudflare Worker routed over `/stega/api/live*` and `/stega/live/*`.
- One private Cloudflare R2 bucket named `inkwhack-stega-live`.

The UI health-checks `/stega/api/live/health`. It does not claim that Live Image is active until the Worker responds.

## Stored data

Each `live/{publicId}` R2 object contains the current encrypted JPEG or PNG. R2 custom metadata contains only:

- SHA-256 owner-token hash
- creation and update timestamps
- optional expiry
- version number
- content type
- non-secret SIMG mode label

Updates replace the object. No history is retained. Plaintext, passphrases, derived keys and raw owner tokens are rejected and never stored.

## Endpoints

- `POST /stega/api/live`
- `GET /stega/api/live/{publicId}`
- `GET /stega/api/live/{publicId}/image`
- `PUT /stega/api/live/{publicId}` with `Authorization: Bearer {ownerToken}`
- `DELETE /stega/api/live/{publicId}` with the same authorization
- `GET /stega/live/{publicId}`

## Operational settings

- Maximum upload: 10 MiB.
- Public identifier: 128 random bits, base64url.
- Owner token: 256 random bits, base64url; only its SHA-256 hash is stored.
- Create rate: 10/IP/minute.
- Update/delete rate: 30/IP/minute.
- Read rate: 120/IP/minute.
- Raw images return versioned ETags, `X-Live-Image-Version`, and `Cache-Control: public, max-age=0, must-revalidate, no-cache`.
- Allowed browser origins: `https://inkwhack.co.uk`, `https://www.inkwhack.co.uk`, and local-file origin `null`.

See `worker/README.md` for deployment instructions.
