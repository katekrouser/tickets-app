import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { dbDescribe, getHarness } from './helpers/harness';

/** Teams CRUD + integrity (REQUIREMENTS §4, §9). DB-gated. */
dbDescribe('teams (integration)', () => {
  const { h, init } = getHarness();
  let auth: [string, string];

  beforeAll(async () => {
    await init();
  });
  beforeEach(async () => {
    await h.reset();
    const { token } = await h.createVerifiedUser('owner@example.com');
    auth = h.bearer(token);
  });
  afterAll(async () => {
    await h.close();
  });

  it('creates, lists, renames and deletes a team', async () => {
    const created = await h.api.post('/api/teams').set(...auth).send({ name: '  Platform  ' });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe('Platform'); // trimmed

    const list = await h.api.get('/api/teams').set(...auth);
    expect(list.body).toHaveLength(1);

    const renamed = await h.api
      .patch(`/api/teams/${created.body.id}`)
      .set(...auth)
      .send({ name: 'Platform Team' });
    expect(renamed.body.name).toBe('Platform Team');

    const del = await h.api.delete(`/api/teams/${created.body.id}`).set(...auth);
    expect(del.status).toBe(204);
  });

  it('rejects a whitespace-only name after trim (400)', async () => {
    const res = await h.api.post('/api/teams').set(...auth).send({ name: '   ' });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate name case-insensitively (409 TEAM_NAME_TAKEN)', async () => {
    await h.api.post('/api/teams').set(...auth).send({ name: 'Alpha' });
    const dup = await h.api.post('/api/teams').set(...auth).send({ name: 'ALPHA' });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('TEAM_NAME_TAKEN');
  });

  it('cannot delete a team that still owns an epic (409 TEAM_HAS_DEPENDENTS)', async () => {
    const team = (await h.api.post('/api/teams').set(...auth).send({ name: 'HasEpic' })).body;
    await h.api.post('/api/epics').set(...auth).send({ teamId: team.id, title: 'E1' });
    const del = await h.api.delete(`/api/teams/${team.id}`).set(...auth);
    expect(del.status).toBe(409);
    expect(del.body.code).toBe('TEAM_HAS_DEPENDENTS');
  });

  it('cannot delete a team that still owns a ticket (409)', async () => {
    const team = (await h.api.post('/api/teams').set(...auth).send({ name: 'HasTicket' })).body;
    await h.api
      .post('/api/tickets')
      .set(...auth)
      .send({ teamId: team.id, type: 'bug', title: 'T', body: 'B' });
    const del = await h.api.delete(`/api/teams/${team.id}`).set(...auth);
    expect(del.status).toBe(409);
  });

  it('404s on an unknown team', async () => {
    const res = await h.api
      .get('/api/teams/00000000-0000-0000-0000-000000000000')
      .set(...auth);
    expect(res.status).toBe(404);
  });
});
