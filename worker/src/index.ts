/**
 * src/index.ts — cyber-drill key-gated SPA host (CF Worker).
 *
 * Flow:
 *   1. GET /?key=sk_drill_… → validate against KV → mint HMAC session
 *      cookie → 302 to / (without ?key, so the key isn't sticky in history).
 *   2. GET /__unlock                → unlock page (or 401 fallback).
 *   3. GET /__logout                → clear cookie → 302 to /__unlock.
 *   4. Any other path:
 *        - cookie valid → env.ASSETS.fetch(request) (serves the SPA).
 *        - cookie missing/invalid → 302 to /__unlock.
 *
 * The SPA itself (./svelte/build) is opaque to the Worker; the Worker
 * only gates entry.
 */

import {
  lookupKey, keyKid, mintSession, verifySession,
  cookieValue, readCookie,
  type SessionPayload,
} from './auth.js';
import { unlockPageHtml } from './unlock-page.js';

export interface Env {
  ASSETS: Fetcher;
  DRILL_KEYS: KVNamespace;
  SESSION_SECRET: string;
  COOKIE_NAME: string;
  SESSION_TTL_HOURS: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cookieName = env.COOKIE_NAME || 'cyber_drill_session';
    const ttlHours = Math.max(1, Number(env.SESSION_TTL_HOURS ?? '24'));

    // ── 1. Key submission via ?key= ─────────────────────────────────────
    const submittedKey = url.searchParams.get('key');
    if (submittedKey) {
      if (!env.SESSION_SECRET) return _500('SESSION_SECRET not configured');
      const meta = await lookupKey(env.DRILL_KEYS, submittedKey);
      if (!meta) {
        return _htmlResp(401, unlockPageHtml({ error: 'キーが無効か期限切れです。' }));
      }
      const now = Math.floor(Date.now() / 1000);
      const payload: SessionPayload = {
        tenant: meta.tenant,
        iat: now,
        exp: now + ttlHours * 3600,
        kid: await keyKid(submittedKey),
      };
      const token = await mintSession(env.SESSION_SECRET, payload);
      // Redirect to the same path WITHOUT the key so it doesn't stick in history.
      const target = new URL(url);
      target.searchParams.delete('key');
      return new Response(null, {
        status: 302,
        headers: {
          'location': target.pathname + target.search + target.hash,
          // no-cookie: allow existing key-gated drill session flow; migration to passkey/localStorage is out of scope for this rename.
          'set-cookie': cookieValue(cookieName, token, ttlHours),
          'cache-control': 'no-store',
        },
      });
    }

    // ── 2. /__unlock — public landing page ──────────────────────────────
    if (url.pathname === '/__unlock') {
      return _htmlResp(200, unlockPageHtml());
    }

    // ── 3. /__logout — clear cookie ─────────────────────────────────────
    if (url.pathname === '/__logout') {
      return new Response(null, {
        status: 302,
        headers: {
          'location': '/__unlock',
          // no-cookie: allow clearing the existing key-gated drill session cookie during logout.
          'set-cookie': `${cookieName}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
          'cache-control': 'no-store',
        },
      });
    }

    // ── 4. Gated paths — every other route requires a valid cookie ─────
    const cookie = readCookie(request, cookieName);
    const session = await verifySession(env.SESSION_SECRET, cookie);
    if (!session) {
      // Send unlock page directly so the user can act in one tap.
      return _htmlResp(401, unlockPageHtml({ error: cookie ? 'セッションが切れました。再度キーを入力してください。' : undefined }));
    }

    // Valid session — forward to the static SPA bundle.
    const assetResp = await env.ASSETS.fetch(request);
    // Re-attach `cache-control: private` so intermediaries don't cache
    // gated content. ASSETS may set its own; we override only `private`.
    const headers = new Headers(assetResp.headers);
    if (!headers.has('cache-control')) headers.set('cache-control', 'private, max-age=60');
    headers.set('x-cyber-drill-tenant', session.tenant);
    return new Response(assetResp.body, { status: assetResp.status, headers });
  },
} satisfies ExportedHandler<Env>;

// ─────────────────────────────────────────────────────────────────────────

function _htmlResp(status: number, html: string): Response {
  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

function _500(msg: string): Response {
  return new Response(msg, { status: 500, headers: { 'content-type': 'text/plain' } });
}
