# InkWhack Stega Live Image Worker

Cloudflare Worker backend for `/stega/api/live*` and `/stega/live/*`. It stores only encrypted PNG/JPEG objects and operational metadata in a private R2 bucket.

## Deploy

1. Install dependencies with `npm install` in this directory.
2. Authenticate with `npx wrangler login` if the workstation is not already authenticated.
3. Create the private bucket: `npx wrangler r2 bucket create inkwhack-stega-live`.
4. Confirm `inkwhack.co.uk` is proxied through the same Cloudflare account and zone.
5. Deploy: `npm run deploy`.
6. Verify both Worker routes exist:
   - `inkwhack.co.uk/stega/api/live*`
   - `inkwhack.co.uk/stega/live/*`
7. Publish the updated static `stega/index.html` through the existing GitHub Pages workflow.

The R2 bucket must remain private. The Worker is the only public access path.

## Security settings

- Maximum image size: 10 MiB.
- Accepted media: signature-checked PNG and JPEG plus `SIMG-social` or `SIMG-lossless` client format metadata.
- Public IDs: 128 random bits, base64url encoded.
- Owner tokens: 256 random bits. Only SHA-256 hashes are stored in R2 custom metadata.
- Create: 10 requests/IP/minute.
- Update/delete: 30 requests/IP/minute.
- Lookup/image: 120 requests/IP/minute.
- Images use `max-age=0, must-revalidate, no-cache`, versioned ETags, and an `X-Live-Image-Version` response header.
- Updates replace the existing R2 object; no history is retained.
