/**
 * src/auth.ts — Key validation + session-cookie minting / verification.
 *
 * Keys (`sk_drill_<random>`) live in the `DRILL_KEYS` KV namespace under
 * `key:<sha256hex>`, value = JSON metadata. Validating a key reads the
 * KV; once validated, the Worker mints an HMAC-SHA256-signed session
 * token and drops it as an HttpOnly cookie. Subsequent requests carry
 * the cookie and skip the KV roundtrip.
 *
 * Key revocation = delete the KV entry. The active cookie continues
 * working until expiry — acceptable for a short 24h TTL.
 */

export interface KeyMetadata {
  tenant: string;
  issuedAt: string;        // ISO 8601
  expiresAt?: string;      // ISO 8601, optional
  notes?: string;
}

export interface SessionPayload {
  tenant: string;
  /** Seconds since epoch. */
  exp: number;
  /** Issued-at, seconds since epoch. */
  iat: number;
  /** First 16 hex of the key sha256 — for revocation trace. */
  kid: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Key validation

export async function lookupKey(
  kv: KVNamespace,
  key: string,
): Promise<KeyMetadata | null> {
  const hash = await sha256Hex(key);
  const json = await kv.get(`key:${hash}`, 'json') as KeyMetadata | null;
  if (!json) return null;
  if (json.expiresAt && Date.parse(json.expiresAt) < Date.now()) return null;
  return json;
}

export async function keyKid(key: string): Promise<string> {
  return (await sha256Hex(key)).slice(0, 16);
}

// ─────────────────────────────────────────────────────────────────────────
// Session cookie (HMAC-SHA256 signed)
//
// Token format: base64url(JSON payload) + '.' + base64url(HMAC).

export async function mintSession(secret: string, payload: SessionPayload): Promise<string> {
  const body = b64uEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmacSha256(secret, body);
  return body + '.' + b64uEncode(sig);
}

export async function verifySession(secret: string, token: string | null | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  let sig: Uint8Array;
  try { sig = b64uDecode(sigB64); } catch { return null; }
  const expected = await hmacSha256(secret, body);
  if (!constantTimeEq(sig, expected)) return null;
  let payload: SessionPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64uDecode(body))) as SessionPayload;
  } catch { return null; }
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function cookieValue(name: string, token: string, ttlHours: number): string {
  const maxAge = ttlHours * 3600;
  return [
    `${name}=${token}`,
    `Path=/`,
    `Max-Age=${maxAge}`,
    `HttpOnly`,
    `Secure`,
    `SameSite=Lax`,
  ].join('; ');
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const k = part.slice(0, eq).trim();
    if (k === name) return part.slice(eq + 1).trim();
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// Primitives

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return new Uint8Array(sig);
}

function b64uEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64uDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function constantTimeEq(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i]! ^ b[i]!;
  return d === 0;
}
