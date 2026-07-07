import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { dbDescribe, getHarness } from './helpers/harness';

/** Tickets CRUD, the modifiedAt invariant, epic-team rule, board query (REQUIREMENTS §6/§8). DB-gated. */
dbDescribe('tickets (integration)', () => {
  const { h, init } = getHarness();
  let auth: [string, string];
  let teamId: string;

  beforeAll(async () => {
    await init();
  });
  beforeEach(async () => {
    await h.reset();
    const { token } = await h.createVerifiedUser('owner@example.com');
    auth = h.bearer(token);
    teamId = (await h.api.post('/api/teams').set(...auth).send({ name: 'Team' })).body.id;
  });
  afterAll(async () => {
    await h.close();
  });

  async function makeTicket(over: Record<string, unknown> = {}) {
    const res = await h.api
      .post('/api/tickets')
      .set(...auth)
      .send({ teamId, type: 'bug', title: 'Ticket', body: 'Body', ...over });
    return res.body;
  }

  it('creates a ticket with server-set createdBy/createdAt and default state new', async () => {
    const t = await makeTicket();
    expect(t.state).toBe('new');
    expect(t.createdBy).toBeTruthy();
    expect(t.createdAt).toMatch(/\dT\d/); // ISO-8601
  });

  it('rejects an invalid enum value server-side (400 VALIDATION_ERROR)', async () => {
    const res = await h.api
      .post('/api/tickets')
      .set(...auth)
      .send({ teamId, type: 'not-a-type', title: 'T', body: 'B' });
    expect(res.status).toBe(400);
  });

  it('modifiedAt does NOT advance on a no-op save (§6)', async () => {
    const t = await makeTicket();
    const before = t.modifiedAt;
    await new Promise((r) => setTimeout(r, 25));
    const patched = await h.api
      .patch(`/api/tickets/${t.id}`)
      .set(...auth)
      .send({ title: 'Ticket', body: 'Body', type: 'bug' }); // identical values
    expect(patched.status).toBe(200);
    expect(patched.body.modifiedAt).toBe(before); // unchanged
  });

  it('modifiedAt DOES advance on a real change (drag state)', async () => {
    const t = await makeTicket();
    const before = t.modifiedAt;
    await new Promise((r) => setTimeout(r, 25));
    const patched = await h.api
      .patch(`/api/tickets/${t.id}`)
      .set(...auth)
      .send({ state: 'in_progress' });
    expect(patched.body.state).toBe('in_progress');
    expect(new Date(patched.body.modifiedAt).getTime()).toBeGreaterThan(
      new Date(before).getTime(),
    );
  });

  it('rejects an epic from a different team (400 EPIC_TEAM_MISMATCH)', async () => {
    const otherTeam = (await h.api.post('/api/teams').set(...auth).send({ name: 'Other' })).body;
    const foreignEpic = (
      await h.api.post('/api/epics').set(...auth).send({ teamId: otherTeam.id, title: 'E' })
    ).body;
    const res = await h.api
      .post('/api/tickets')
      .set(...auth)
      .send({ teamId, type: 'bug', title: 'T', body: 'B', epicId: foreignEpic.id });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('EPIC_TEAM_MISMATCH');
  });

  it('deleting a ticket cascades to its comments', async () => {
    const t = await makeTicket();
    await h.api.post(`/api/tickets/${t.id}/comments`).set(...auth).send({ body: 'hi' });
    const del = await h.api.delete(`/api/tickets/${t.id}`).set(...auth);
    expect(del.status).toBe(204);
    const remaining = await h.prisma.comment.count({ where: { ticketId: t.id } });
    expect(remaining).toBe(0);
  });

  it('board list is filtered (AND) and ordered most-recently-modified first', async () => {
    const a = await makeTicket({ title: 'Login bug' });
    const b = await makeTicket({ title: 'Logout bug' });
    // Touch A so it becomes most-recently-modified.
    await new Promise((r) => setTimeout(r, 25));
    await h.api.patch(`/api/tickets/${a.id}`).set(...auth).send({ state: 'done' });

    const all = await h.api.get('/api/tickets').query({ teamId }).set(...auth);
    expect(all.body[0].id).toBe(a.id); // newest-modified first

    const filtered = await h.api.get('/api/tickets').query({ teamId, q: 'logout' }).set(...auth);
    expect(filtered.body.map((t: any) => t.id)).toEqual([b.id]);
  });
});
