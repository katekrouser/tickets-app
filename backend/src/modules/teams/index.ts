/**
 * Teams feature module (A6) — REQUIREMENTS §4.
 *
 * Team CRUD: list, create, view, rename, delete. Mounted by A4 at prefix
 * `/api/teams` (ADR-0005). Auth is applied globally (ADR-0004) — routes read
 * `request.authUser`; all verified users manage all teams (no ownership).
 *
 * Contracts honoured:
 *   - DB via the frozen singleton `{ prisma }` (ADR-0002); never a new client.
 *   - Domain outcomes thrown as DomainError subclasses (ADR-0003); status is
 *     never set manually. The core error handler maps them to the wire body.
 *   - Request validation + response serialization via `schemas[operationId]`
 *     from `@app/shared` (ADR-0006) attached per route.
 *
 * Rules (§4):
 *   - Name trimmed, non-empty after trim, unique case-insensitively (DB `citext`,
 *     A3 handoff) → duplicate any-case rejected with 409 TEAM_NAME_TAKEN.
 *   - Deleting a team that still has tickets OR epics → 409 TEAM_HAS_DEPENDENTS
 *     (no cascade; FK RESTRICT, A3 handoff).
 *   - `createdAt` / `modifiedAt` are server-set UTC by the DB (schema defaults /
 *     `@updatedAt`); the API never accepts them from the client.
 */
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { Prisma, type Team, type Epic } from '@prisma/client';
import { prisma } from 'backend/src/db';
import { ConflictError, NotFoundError, ValidationError } from 'backend/src/core/errors';
import { schemas } from '@app/shared';

/** Wire shape of a Team (OpenAPI `Team`): timestamps as ISO-8601 UTC strings. */
interface TeamDTO {
  id: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
}

function toTeamDTO(team: Team): TeamDTO {
  return {
    id: team.id,
    name: team.name,
    createdAt: team.createdAt.toISOString(),
    modifiedAt: team.modifiedAt.toISOString(),
  };
}

/** Wire shape of an Epic (OpenAPI `Epic`), used by the team-scoped epic listing. */
interface EpicDTO {
  id: string;
  teamId: string;
  title: string;
  description: string | null;
  createdAt: string;
  modifiedAt: string;
}

function toEpicDTO(epic: Epic): EpicDTO {
  return {
    id: epic.id,
    teamId: epic.teamId,
    title: epic.title,
    description: epic.description,
    createdAt: epic.createdAt.toISOString(),
    modifiedAt: epic.modifiedAt.toISOString(),
  };
}

/**
 * Trim per §4 and reject an empty result. Schema `minLength: 1` only guards the
 * raw string, so a whitespace-only name (e.g. `" "`) passes validation but is
 * empty after trim — caught here as 400 VALIDATION_ERROR.
 */
function normalizeName(raw: string): string {
  const name = raw.trim();
  if (name.length === 0) {
    throw new ValidationError('VALIDATION_ERROR', 'Team name must not be empty after trimming whitespace.');
  }
  return name;
}

/** Map a Prisma write error on a name (unique) constraint → 409 TEAM_NAME_TAKEN. */
function throwOnNameConflict(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    throw new ConflictError('TEAM_NAME_TAKEN', 'A team with this name already exists.');
  }
  throw err;
}

/** Map a "row not found" Prisma error (P2025) on get/update/delete → 404. */
function throwIfNotFound(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    throw new NotFoundError('TEAM_NOT_FOUND', 'Team not found.');
  }
  throw err;
}

const teamsModule: FastifyPluginAsync = async (app) => {
  // GET /api/teams — list all teams, ordered by name (contract).
  app.get('/', { schema: schemas['listTeams'] }, async () => {
    const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } });
    return teams.map(toTeamDTO);
  });

  // POST /api/teams — create a team. 201; 409 TEAM_NAME_TAKEN (any case).
  app.post<{ Body: { name: string } }>(
    '/',
    { schema: schemas['createTeam'] },
    async (request, reply: FastifyReply) => {
      const name = normalizeName(request.body.name);
      try {
        const team = await prisma.team.create({ data: { name } });
        reply.code(201);
        return toTeamDTO(team);
      } catch (err) {
        throwOnNameConflict(err);
      }
    },
  );

  // GET /api/teams/:teamId — single team; 404 if absent.
  app.get<{ Params: { teamId: string } }>(
    '/:teamId',
    { schema: schemas['getTeam'] },
    async (request) => {
      const team = await prisma.team.findUnique({ where: { id: request.params.teamId } });
      if (!team) {
        throw new NotFoundError('TEAM_NOT_FOUND', 'Team not found.');
      }
      return toTeamDTO(team);
    },
  );

  // GET /api/teams/:teamId/epics — team-scoped epic listing (source for the
  // ticket epic dropdown; same-team only). 404 if the team is absent.
  // Reads prisma.epic directly (DB boundary, ADR-0002) — no cross-module import.
  app.get<{ Params: { teamId: string } }>(
    '/:teamId/epics',
    { schema: schemas['listTeamEpics'] },
    async (request) => {
      const { teamId } = request.params;
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) {
        throw new NotFoundError('TEAM_NOT_FOUND', 'Team not found.');
      }
      const epics = await prisma.epic.findMany({ where: { teamId }, orderBy: { title: 'asc' } });
      return epics.map(toEpicDTO);
    },
  );

  // PATCH /api/teams/:teamId — rename. 404 if absent; 409 TEAM_NAME_TAKEN.
  app.patch<{ Params: { teamId: string }; Body: { name: string } }>(
    '/:teamId',
    { schema: schemas['updateTeam'] },
    async (request) => {
      const name = normalizeName(request.body.name);
      try {
        const team = await prisma.team.update({ where: { id: request.params.teamId }, data: { name } });
        return toTeamDTO(team);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
          throwIfNotFound(err);
        }
        throwOnNameConflict(err);
      }
    },
  );

  // DELETE /api/teams/:teamId — 204; 404 if absent; 409 TEAM_HAS_DEPENDENTS
  // when the team still owns tickets or epics (no cascade).
  app.delete<{ Params: { teamId: string } }>(
    '/:teamId',
    { schema: schemas['deleteTeam'] },
    async (request, reply: FastifyReply) => {
      const { teamId } = request.params;

      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) {
        throw new NotFoundError('TEAM_NOT_FOUND', 'Team not found.');
      }

      const [ticketCount, epicCount] = await Promise.all([
        prisma.ticket.count({ where: { teamId } }),
        prisma.epic.count({ where: { teamId } }),
      ]);
      if (ticketCount > 0 || epicCount > 0) {
        throw new ConflictError('TEAM_HAS_DEPENDENTS', 'This team has tickets or epics and cannot be deleted.');
      }

      try {
        await prisma.team.delete({ where: { id: teamId } });
      } catch (err) {
        // Safety net for a concurrent insert between the count check and delete:
        // FK RESTRICT surfaces as P2003/P2014 → still 409; a vanished row → 404.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          (err.code === 'P2003' || err.code === 'P2014')
        ) {
          throw new ConflictError('TEAM_HAS_DEPENDENTS', 'This team has tickets or epics and cannot be deleted.');
        }
        throwIfNotFound(err);
      }

      return reply.code(204).send();
    },
  );
};

export default teamsModule;
