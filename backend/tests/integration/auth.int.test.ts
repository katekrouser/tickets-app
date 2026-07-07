import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { dbDescribe, getHarness } from './helpers/harness';

/**
 * Auth + email-verification flow (REQUIREMENTS §3). Execute in CI/Docker against
 * a migrated Postgres; self-skips without DATABASE_URL.
 */
dbDescribe('auth flow (integration)', () => {
  const { h, init } = getHarness();

  beforeAll(async () => {
    await init();
  });
  beforeEach(async () => {
    await h.reset();
  });
  afterAll(async () => {
    await h.close();
  });

  it('signup creates an UNVERIFIED account (201), no auto-login', async () => {
    const res = await h.api.post('/api/auth/signup').send({
      email: 'Alice@Example.com',
      password: 'password12345',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeUndefined(); // no auto-login
    const user = await h.prisma.user.findFirst({ where: { email: 'alice@example.com' } });
    expect(user.emailVerified).toBe(false); // email normalized + unverified
  });

  it('rejects a duplicate email case-insensitively (409 EMAIL_TAKEN)', async () => {
    await h.api.post('/api/auth/signup').send({ email: 'bob@example.com', password: 'password12345' });
    const dup = await h.api
      .post('/api/auth/signup')
      .send({ email: 'BOB@EXAMPLE.COM', password: 'password12345' });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('EMAIL_TAKEN');
  });

  it('blocks login for an unverified account (403 EMAIL_NOT_VERIFIED)', async () => {
    await h.api.post('/api/auth/signup').send({ email: 'carol@example.com', password: 'password12345' });
    const res = await h.api
      .post('/api/auth/login')
      .send({ email: 'carol@example.com', password: 'password12345' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('returns 401 INVALID_CREDENTIALS for wrong password AND unknown email (indistinguishable)', async () => {
    const { user } = await h.createVerifiedUser('dave@example.com', 'password12345');
    expect(user.emailVerified).toBe(true);
    const wrong = await h.api
      .post('/api/auth/login')
      .send({ email: 'dave@example.com', password: 'wrongpassword' });
    const unknown = await h.api
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password12345' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.code).toBe('INVALID_CREDENTIALS');
    expect(unknown.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('logs in a verified user and issues a usable bearer token (200)', async () => {
    await h.createVerifiedUser('erin@example.com', 'password12345');
    const res = await h.api
      .post('/api/auth/login')
      .send({ email: 'erin@example.com', password: 'password12345' });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe('erin@example.com');
    // token works against a protected route
    const teams = await h.api.get('/api/teams').set(...h.bearer(res.body.token));
    expect(teams.status).toBe(200);
  });

  it('verifies a valid token, then rejects re-use (single-use) and expired tokens', async () => {
    await h.api.post('/api/auth/signup').send({ email: 'frank@example.com', password: 'password12345' });
    const user = await h.prisma.user.findFirst({ where: { email: 'frank@example.com' } });
    const tok = await h.prisma.verificationToken.findFirst({ where: { userId: user.id } });

    const ok = await h.api.get('/api/auth/verify-email').query({ token: tok.token }).redirects(0);
    expect(ok.status).toBe(302); // → login (no auto-login)
    const verified = await h.prisma.user.findUnique({ where: { id: user.id } });
    expect(verified.emailVerified).toBe(true);

    const reuse = await h.api.get('/api/auth/verify-email').query({ token: tok.token }).redirects(0);
    expect(reuse.status).toBe(400);
    expect(reuse.body.code).toBe('TOKEN_USED');

    const bad = await h.api.get('/api/auth/verify-email').query({ token: 'deadbeef' }).redirects(0);
    expect(bad.body.code).toBe('TOKEN_INVALID');
  });

  it('resend invalidates prior unused tokens (new token supersedes old)', async () => {
    await h.api.post('/api/auth/signup').send({ email: 'grace@example.com', password: 'password12345' });
    const user = await h.prisma.user.findFirst({ where: { email: 'grace@example.com' } });
    const first = await h.prisma.verificationToken.findFirst({ where: { userId: user.id } });

    const resend = await h.api
      .post('/api/auth/resend-verification')
      .send({ email: 'grace@example.com' });
    expect(resend.status).toBe(202);

    // Prior token is gone; the old link no longer verifies.
    const oldUse = await h.api.get('/api/auth/verify-email').query({ token: first.token }).redirects(0);
    expect(oldUse.body.code).toBe('TOKEN_INVALID');
  });

  it('rejects an EXPIRED verification token (400 TOKEN_EXPIRED)', async () => {
    const { user } = await h.createVerifiedUser('heidi@example.com');
    // Insert a token that already expired.
    await h.prisma.verificationToken.create({
      data: {
        token: 'expired-token-value',
        userId: user.id,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    const res = await h.api
      .get('/api/auth/verify-email')
      .query({ token: 'expired-token-value' })
      .redirects(0);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });

  it('resend for an unknown/verified address still answers 202 (no enumeration)', async () => {
    const res = await h.api
      .post('/api/auth/resend-verification')
      .send({ email: 'ghost@example.com' });
    expect(res.status).toBe(202);
  });
});
