# cyber-drill worker — key-gated SPA host

Vendor-private CF Worker that serves `../svelte/build` (the Svelte SPA)
gated by a per-customer access key. Deployed to **workers.dev** (no
custom domain) — final URL pattern:

```
https://cyber-drill-vendor.<your-account>.workers.dev/?key=sk_drill_…
```

## Architecture (one-paragraph)

The Worker runs first on every request. Three paths matter:

1. `GET /?key=sk_drill_…` — looks up `key:<sha256(key)>` in the
   `DRILL_KEYS` KV namespace. If present + not expired, the Worker
   mints an HMAC-SHA256-signed session token, drops it as an HttpOnly
   `cyber_drill_session` cookie, and 302s back to `/` (without the
   `?key=` so it doesn't pollute history). 24 h TTL.
2. `GET /__unlock` (or any path with no/invalid cookie) — serves a
   401 + a minimal HTML form to enter a key.
3. Any other path with a valid cookie — forwarded to
   `env.ASSETS.fetch(request)`, which serves the static Svelte bundle.

## One-time setup

```sh
cd 60-apps/etzhayyim-project-cyber-drill/worker

# 1. Install Worker deps (wrangler etc.)
pnpm install

# 2. Build the SPA so `../svelte/build` exists.
pnpm run build:assets

# 3. Authenticate with Cloudflare.
npx wrangler login

# 4. Create the KV namespace. Paste the printed `id` into
#    wrangler.jsonc's `kv_namespaces[0].id`.
npx wrangler kv namespace create DRILL_KEYS

# 5. Mint a session-signing secret (random 32+ bytes).
openssl rand -base64 32 | npx wrangler secret put SESSION_SECRET

# 6. Deploy.
npx wrangler deploy
```

The first deploy returns the worker URL — e.g. `cyber-drill-vendor.you.workers.dev`.

## Issuing a key to a customer

```sh
node scripts/gen-key.mjs --tenant=acme-jp --days=30 --notes="2026 Q2 PoC"
```

The script prints:
- The key to hand the customer (e.g. `sk_drill_abc…`).
- The full URL with `?key=…` baked in.
- The `npx wrangler kv key put` command you run to register it in CF KV.

Run that wrangler command, then send the URL to the customer. They click
once, the cookie is set, and the key is no longer needed on the URL.

## Revoking a key

```sh
npx wrangler kv key delete --binding=DRILL_KEYS --remote "key:<sha256hex>"
```

Sessions already minted continue working until their 24 h expiry — set
`SESSION_TTL_HOURS` shorter in `wrangler.jsonc` if you need faster cutoff.

## Local dev

```sh
pnpm run dev    # wrangler dev — uses --remote KV by default
```

Visit `http://localhost:8787/?key=…` (after registering a key in remote KV).

## File layout

```
worker/
├── README.md            (this file)
├── package.json
├── wrangler.jsonc       CF config
├── tsconfig.json
├── src/
│   ├── index.ts         main fetch handler
│   ├── auth.ts          KV lookup + HMAC session
│   └── unlock-page.ts   the 401 HTML form
└── scripts/
    └── gen-key.mjs      mints + prints kv:key put command
```

## Boundary

cyber-drill is vendor-only per **ADR-2605172400** (3-axis split:
liability / custody / settlement all vendor). This worker MUST NOT be
mirrored to `etzhayyim/root`. It's also explicitly excluded from
`etzhayyim deploy` style account-level worker conventions because it isn't
hosted at `*.etzhayyim.com`; the workers.dev URL keeps customer-facing
infrastructure cleanly separated from the etzhayyim public footprint.

Authoritative: `90-docs/adr/2605211800-cyber-drill-webvr-spark-effects.md`.
