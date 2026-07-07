import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { dbDescribe, getHarness } from './helpers/harness';

/** Epics CRUD + team immutability + reference integrity (REQUIREMENTS §5). DB-gated. */
dbDescribe('epics (integration)', () => {
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

  it('creates an epic within a team (201)', async () => {
    const res = await h.api
      .post('/api/epics')
      .set(...auth)
      .send({ teamId, title: '  Onboarding  ', description: 'desc' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Onboarding');
    expect(res.body.teamId).toBe(teamId);
  });

  it('rejects an epic for a non-existent team (404 TEAM_NOT_FOUND)', async () => {
    const res = await h.api
      .post('/api/epics')
      .set(...auth)
      .send({ teamId: '00000000-0000-0000-0000-000000000000', title: 'X' });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('TEAM_NOT_FOUND');
  });

  it('the update body cannot change the team (immutable, §5) — 400', async () => {
    const epic = (
      await h.api.post('/api/epics').set(...auth).send({ teamId, title: 'E' })
    ).body;
    const other = (await h.api.post('/api/teams').set(...auth).send({ name: 'Other' })).body;
    const res = await h.api
      .patch(`/api/epics/${epic.id}`)
      .set(...auth)
      .send({ teamId: other.id });
    expect(res.status).toBe(400); // additionalProperties:false rejects teamId
  });

  it('cannot delete an epic referenced by a ticket (409 EPIC_REFERENCED)', async () => {
    const epic = (
      await h.api.post('/api/epics').set(...auth).send({ teamId, title: 'Referenced' })
    ).body;
    await h.api
      .post('/api/tickets')
      .set(...auth)
      .send({ teamId, type: 'bug', title: 'T', body: 'B', epicId: epic.id });
    const del = await h.api.delete(`/api/epics/${epic.id}`).set(...auth);
    expect(del.status).toBe(409);
    expect(del.body.code).toBe('EPIC_REFERENCED');
  });

  it('lists epics scoped to a team (?teamId=)', async () => {
    await h.api.post('/api/epics').set(...auth).send({ teamId, title: 'A' });
    const other = (await h.api.post('/api/teams').set(...auth).send({ name: 'Other' })).body;
    await h.api.post('/api/epics').set(...auth).send({ teamId: other.id, title: 'B' });
    const scoped = await h.api.get('/api/epics').query({ teamId }).set(...auth);
    expect(scoped.body).toHaveLength(1);
    expect(scoped.body[0].title).toBe('A');
  });
});
