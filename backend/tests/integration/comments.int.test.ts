import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { dbDescribe, getHarness } from './helpers/harness';

/** Comments: append-only, chronological, no ticket modifiedAt bump (REQUIREMENTS §7). DB-gated. */
dbDescribe('comments (integration)', () => {
  const { h, init } = getHarness();
  let auth: [string, string];
  let ticketId: string;
  let ticketModifiedAt: string;

  beforeAll(async () => {
    await init();
  });
  beforeEach(async () => {
    await h.reset();
    const { token } = await h.createVerifiedUser('author@example.com');
    auth = h.bearer(token);
    const teamId = (await h.api.post('/api/teams').set(...auth).send({ name: 'Team' })).body.id;
    const t = (
      await h.api
        .post('/api/tickets')
        .set(...auth)
        .send({ teamId, type: 'bug', title: 'T', body: 'B' })
    ).body;
    ticketId = t.id;
    ticketModifiedAt = t.modifiedAt;
  });
  afterAll(async () => {
    await h.close();
  });

  it('adds a comment (201) with author + server-set createdAt', async () => {
    const res = await h.api.post(`/api/tickets/${ticketId}/comments`).set(...auth).send({ body: 'first' });
    expect(res.status).toBe(201);
    expect(res.body.authorId).toBeTruthy();
    expect(res.body.createdAt).toMatch(/\dT\d/);
  });

  it('rejects an empty / whitespace-only comment body (400)', async () => {
    const empty = await h.api.post(`/api/tickets/${ticketId}/comments`).set(...auth).send({ body: '' });
    const ws = await h.api.post(`/api/tickets/${ticketId}/comments`).set(...auth).send({ body: '   ' });
    expect(empty.status).toBe(400);
    expect(ws.status).toBe(400);
  });

  it('lists comments oldest-first', async () => {
    await h.api.post(`/api/tickets/${ticketId}/comments`).set(...auth).send({ body: 'one' });
    await new Promise((r) => setTimeout(r, 10));
    await h.api.post(`/api/tickets/${ticketId}/comments`).set(...auth).send({ body: 'two' });
    const list = await h.api.get(`/api/tickets/${ticketId}/comments`).set(...auth);
    expect(list.body.map((c: any) => c.body)).toEqual(['one', 'two']);
  });

  it('adding a comment does NOT advance the ticket modifiedAt (§7 no-bump)', async () => {
    await new Promise((r) => setTimeout(r, 25));
    await h.api.post(`/api/tickets/${ticketId}/comments`).set(...auth).send({ body: 'no bump' });
    const ticket = await h.api.get(`/api/tickets/${ticketId}`).set(...auth);
    expect(ticket.body.modifiedAt).toBe(ticketModifiedAt);
  });

  it('404s when commenting on a missing ticket', async () => {
    const res = await h.api
      .post('/api/tickets/00000000-0000-0000-0000-000000000000/comments')
      .set(...auth)
      .send({ body: 'x' });
    expect(res.status).toBe(404);
  });
});
