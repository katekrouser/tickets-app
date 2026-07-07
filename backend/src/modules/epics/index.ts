/**
 * Epics feature module (A15) — REQUIREMENTS §5.
 *
 * Epic CRUD + team scoping. Mounted by A4 at prefix `/api/epics` (ADR-0005).
 * Auth is applied globally (ADR-0004) — routes read `request.authUser`; all
 * verified users manage all epics (no ownership, per §5/§4).
 *
 * Contracts honoured:
 *   - DB via the frozen singleton `{ prisma }` (ADR-0002); never a new client.
 *   - Domain outcomes thrown as DomainError subclasses (ADR-0003); status is
 *     never set manually on an error path. The core handler maps them to wire.
 *   - Request validation + response serialization via `schemas[operationId]`
 *     from `@app/shared` (ADR-0006), attached per route.
 *
 * Rules (§5):
 *   - Each epic belongs to exactly one team, chosen at creation and IMMUTABLE.
 *     The `updateEpic` body schema (`additionalProperties: false`, no `teamId`)
 *     rejects any attempt to change the team with 400 VALIDATION_ERROR — so
 *     immutability is enforced at the contract boundary; there is no code path
 *     here that ever writes `teamId` after creation.
 *   - Title non-empty after trim; optional description.
 *   - `createdAt` / `modifiedAt` are server-set UTC by the DB (schema default /
 *     `@updatedAt`); the API never accepts them from the client.
 *   - Deleting an epic still referenced by any ticket → 409 EPIC_REFERENCED
 *     (no cascade; FK RESTRICT, A3 handoff).
 *
 * Team-scoped listing for the ticket epic dropdown: `GET /api/epics?teamId=X`
 * (operation `listEpics`, filtered by team). The sibling `listTeamEpics`
 * (`GET /api/teams/{teamId}/epics`) lives under the `/api/teams` prefix and is
 * therefore owned by the teams module (A6), not reachable from this plugin.
 */
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { Prisma, type Epic } from '@prisma/client';
import { prisma } from 'backend/src/db';
import { ConflictError, NotFoundError, ValidationError } from 'backend/src/core/errors';
import { schemas } from '@app/shared';

/** Wire shape of an Epic (OpenAPI `Epic`): timestamps as ISO-8601 UTC strings. */
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
 * Trim per §5 and reject an empty result. Schema `minLength: 1` only guards the
 * raw string, so a whitespace-only title (e.g. `" "`) passes validation but is
 * empty after trim — caught here as 400 VALIDATION_ERROR.
 */
function normalizeTitle(raw: string): string {
  const title = raw.trim();
  if (title.length === 0) {
    throw new ValidationError('VALIDATION_ERROR', 'Epic title must not be empty after trimming whitespace.');
  }
  return title;
}

/** Map a "row not found" Prisma error (P2025) on get/update/delete → 404. */
function throwEpicNotFound(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    throw new NotFoundError('EPIC_NOT_FOUND', 'Epic not found.');
  }
  throw err;
}

const epicsModule: FastifyPluginAsync = async (app) => {
  // GET /api/epics[?teamId=X] — list epics, optionally scoped to one team,
  // ordered by title (contract). The team-scoped form powers the ticket epic
  // dropdown (same-team epics only).
  app.get<{ Querystring: { teamId?: string } }>(
    '/',
    { schema: schemas['listEpics'] },
    async (request) => {
      const { teamId } = request.query;
      const epics = await prisma.epic.findMany({
        where: teamId ? { teamId } : undefined,
        orderBy: { title: 'asc' },
      });
      return epics.map(toEpicDTO);
    },
  );

  // POST /api/epics — create an epic within a team. 201; team validated
  // server-side → 404 TEAM_NOT_FOUND when absent. Team is fixed here forever.
  app.post<{ Body: { teamId: string; title: string; description?: string | null } }>(
    '/',
    { schema: schemas['createEpic'] },
    async (request, reply: FastifyReply) => {
      const { teamId } = request.body;
      const title = normalizeTitle(request.body.title);
      const description = request.body.description ?? null;

      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) {
        throw new NotFoundError('TEAM_NOT_FOUND', 'Team does not exist.');
      }

      try {
        const epic = await prisma.epic.create({ data: { teamId, title, description } });
        reply.code(201);
        return toEpicDTO(epic);
      } catch (err) {
        // Team deleted between the existence check and the insert: FK RESTRICT
        // surfaces as P2003 → the referenced team no longer exists (404).
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
          throw new NotFoundError('TEAM_NOT_FOUND', 'Team does not exist.');
        }
        throw err;
      }
    },
  );

  // GET /api/epics/:epicId — single epic; 404 if absent.
  app.get<{ Params: { epicId: string } }>(
    '/:epicId',
    { schema: schemas['getEpic'] },
    async (request) => {
      const epic = await prisma.epic.findUnique({ where: { id: request.params.epicId } });
      if (!epic) {
        throw new NotFoundError('EPIC_NOT_FOUND', 'Epic not found.');
      }
      return toEpicDTO(epic);
    },
  );

  // PATCH /api/epics/:epicId — update title/description only. 404 if absent.
  // The body schema forbids `teamId` (additionalProperties:false) → the team
  // association can never be changed (immutable, §5).
  app.patch<{ Params: { epicId: string }; Body: { title?: string; description?: string | null } }>(
    '/:epicId',
    { schema: schemas['updateEpic'] },
    async (request) => {
      const data: Prisma.EpicUpdateInput = {};
      if (request.body.title !== undefined) {
        data.title = normalizeTitle(request.body.title);
      }
      if (request.body.description !== undefined) {
        data.description = request.body.description;
      }

      try {
        const epic = await prisma.epic.update({ where: { id: request.params.epicId }, data });
        return toEpicDTO(epic);
      } catch (err) {
        throwEpicNotFound(err);
      }
    },
  );

  // DELETE /api/epics/:epicId — 204; 404 if absent; 409 EPIC_REFERENCED when
  // any ticket still references the epic (no cascade; FK RESTRICT).
  app.delete<{ Params: { epicId: string } }>(
    '/:epicId',
    { schema: schemas['deleteEpic'] },
    async (request, reply: FastifyReply) => {
      const { epicId } = request.params;

      const epic = await prisma.epic.findUnique({ where: { id: epicId } });
      if (!epic) {
        throw new NotFoundError('EPIC_NOT_FOUND', 'Epic not found.');
      }

      const ticketCount = await prisma.ticket.count({ where: { epicId } });
      if (ticketCount > 0) {
        throw new ConflictError('EPIC_REFERENCED', 'This epic is referenced by tickets and cannot be deleted.');
      }

      try {
        await prisma.epic.delete({ where: { id: epicId } });
      } catch (err) {
        // Safety net for a ticket inserted between the count check and delete:
        // FK RESTRICT surfaces as P2003/P2014 → still 409; a vanished row → 404.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          (err.code === 'P2003' || err.code === 'P2014')
        ) {
          throw new ConflictError('EPIC_REFERENCED', 'This epic is referenced by tickets and cannot be deleted.');
        }
        throwEpicNotFound(err);
      }

      return reply.code(204).send();
    },
  );
};

export default epicsModule;
