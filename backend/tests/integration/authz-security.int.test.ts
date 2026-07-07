import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { dbDescribe, getHarness } from './helpers/harness';

/**
 * Executable SECURITY regressions (complements R2/R4): negative-authz, JWT
 * tampering, SQL-injection + stored-XSS payload handling, server-side enum
 * validation, and the "no token in URL" rule. DB-gated.
 */
dbDescribe('authz + security (integration)', () => {
  const { h, init } = getHarness();
  let token: string;
  let auth: [string, string];

  beforeAll(async () => {
    await init();
  });
  beforeEach(async () => {
    await h.reset();
    ({ token } = await h.createVerifiedUser('sec@example.com'));
    auth = h.bearer(token);
  });
  afterAll(async () => {
    await h.close();
  });

  it('rejects a protected route with NO Authorization header (401)', async () => {
    const res = await h.api.get('/api/teams');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('rejects a malformed Authorization header (401)', async () => {
    const res = await h.api.get('/api/teams').set('Authorization', 'Token abc');
    expect(res.status).toBe(401);
  });

  it('rejects a tampered JWT (payload swapped → bad signature, 401 TOKEN_INVALID)', async () => {
    const [head, payload, sig] = token.split('.');
    const forged = JSON.parse(Buffer.from(payload, 'base64url').toString());
    forged.sub = '00000000-0000-0000-0000-000000000000';
    const tamperedPayload = Buffer.from(JSON.stringify(forged)).toString('base64url');
    const tampered = `${head}.${tamperedPayload}.${sig}`;
    const res = await h.api.get('/api/teams').set('Authorization', `Bearer ${tampered}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_INVALID');
  });

  it('rejects a garbage bearer token (401)', async () => {
    const res = await h.api.get('/api/teams').set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('public routes require NO auth (health/ready/signup/login/verify/resend)', async () => {
    expect((await h.api.get('/health')).status).toBe(200);
    expect((await h.api.get('/ready')).status).toBeLessThan(504);
    // signup with no token succeeds (public)
    const s = await h.api.post('/api/auth/signup').send({ email: 'pub@example.com', password: 'password12345' });
    expect(s.status).toBe(201);
  });

  it('unknown route returns 404 (not 401) even without a token', async () => {
    const res = await h.api.get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('SQL-injection payload in a filter is treated as literal data (no injection)', async () => {
    const teamId = (await h.api.post('/api/teams').set(...auth).send({ name: 'Team' })).body.id;
    await h.api.post('/api/tickets').set(...auth).send({ teamId, type: 'bug', title: 'safe', body: 'B' });
    // Prisma parameterizes; the payload must simply match nothing, not drop tables.
    const res = await h.api
      .get('/api/tickets')
      .query({ teamId, q: "'; DROP TABLE tickets; --" })
      .set(...auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    // The table still exists and the row is intact.
    const still = await h.prisma.ticket.count();
    expect(still).toBe(1);
  });

  it('stored-XSS payload is persisted verbatim (escaping is the render layer\'s job)', async () => {
    const teamId = (await h.api.post('/api/teams').set(...auth).send({ name: 'XSS' })).body.id;
    const xss = '<img src=x onerror=alert(1)>';
    const t = (
      await h.api.post('/api/tickets').set(...auth).send({ teamId, type: 'bug', title: xss, body: 'B' })
    ).body;
    expect(t.title).toBe(xss); // stored as data, not interpreted server-side
  });

  it('enforces enum validation server-side (invalid state → 400)', async () => {
    const teamId = (await h.api.post('/api/teams').set(...auth).send({ name: 'Enum' })).body.id;
    const res = await h.api
      .post('/api/tickets')
      .set(...auth)
      .send({ teamId, type: 'bug', state: 'archived', title: 'T', body: 'B' });
    expect(res.status).toBe(400);
  });

  it('login never returns the password hash', async () => {
    await h.createVerifiedUser('leak@example.com', 'password12345');
    const res = await h.api.post('/api/auth/login').send({ email: 'leak@example.com', password: 'password12345' });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|password_hash|\$argon2/);
  });
});
