#!/usr/bin/env node
/**
 * scripts/gen-key.mjs — Mint a cyber-drill access key.
 *
 * Generates a random `sk_drill_<32 chars>` key, computes its SHA-256
 * hash, and prints both the key (handed to the customer) and the
 * `wrangler kv:key put` command that registers it in the DRILL_KEYS
 * namespace.
 *
 * Usage:
 *   node scripts/gen-key.mjs --tenant=acme-jp [--days=30] [--notes="..."]
 *
 * Pipe stdout to a file (`> key.txt`) and hand it to the customer.
 * Run the printed wrangler command yourself to register the key.
 */

import { createHash, randomBytes } from 'node:crypto';

const args = parseArgs(process.argv.slice(2));
if (!args.tenant) {
  console.error('Usage: node scripts/gen-key.mjs --tenant=<name> [--days=N] [--notes="..."] [--len=8]');
  process.exit(2);
}

// Crockford-style confusion-free alphabet (no 0, 1, I, L, O).
// 31 chars × 8 chars ≈ 40 bits of entropy — sufficient for a
// KV-gated drill (every guess hits a remote roundtrip; brute-force
// at 100 req/s ≈ 270 years).
const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789';
const KEY_LEN = Math.max(6, Math.min(16, Number(args.len ?? 8)));
const key = _randAlpha(KEY_LEN);
const hash = createHash('sha256').update(key).digest('hex');
const issuedAt = new Date().toISOString();
const expiresAt = args.days
  ? new Date(Date.now() + Number(args.days) * 86400_000).toISOString()
  : undefined;

const meta = {
  tenant: args.tenant,
  issuedAt,
  ...(expiresAt ? { expiresAt } : {}),
  ...(args.notes ? { notes: args.notes } : {}),
};

const kvKey = `key:${hash}`;
const kvValue = JSON.stringify(meta);

console.log('============ cyber-drill access key ============');
console.log('  KEY (give to customer):  ' + key);
console.log('  tenant:                  ' + meta.tenant);
console.log('  issuedAt:                ' + meta.issuedAt);
if (expiresAt) console.log('  expiresAt:               ' + expiresAt);
if (args.notes) console.log('  notes:                   ' + args.notes);
console.log('  kid (first 16 of hash):  ' + hash.slice(0, 16));
console.log('');
console.log('Hand the customer this URL (replace WORKER_HOST):');
console.log('  https://WORKER_HOST/?key=' + key);
console.log('');
console.log('Register the key in CF KV by running ONE of:');
console.log('  # wrangler v3 (current local copy in node_modules):');
console.log('  npx wrangler kv:key put --binding=DRILL_KEYS \\');
console.log('    "' + kvKey + '" \\');
console.log('    \'' + kvValue + '\'');
console.log('  # wrangler v4 (global / npx default):');
console.log('  npx wrangler kv key put --binding=DRILL_KEYS --remote \\');
console.log('    "' + kvKey + '" \\');
console.log('    \'' + kvValue + '\'');
console.log('');
console.log('To revoke later:');
console.log('  npx wrangler kv:key delete --binding=DRILL_KEYS "' + kvKey + '"      # v3');
console.log('  npx wrangler kv key delete --binding=DRILL_KEYS --remote "' + kvKey + '"   # v4');
console.log('================================================');

// ─────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (!m) continue;
    out[m[1]] = m[2] ?? true;
  }
  return out;
}

function _randAlpha(n) {
  // Reject-sample with crypto bytes so the distribution is uniform.
  const max = Math.floor(256 / ALPHA.length) * ALPHA.length;
  let out = '';
  while (out.length < n) {
    const buf = randomBytes(n * 2);
    for (let i = 0; i < buf.length && out.length < n; i++) {
      if (buf[i] < max) out += ALPHA[buf[i] % ALPHA.length];
    }
  }
  return out;
}
