/**
 * Comments feature module (A8) — REQUIREMENTS §7.
 *
 * Append-only ticket comments:
 *   - GET  /:ticketId/comments  (listComments)  — chronological, oldest-first.
 *   - POST /:ticketId/comments  (createComment) — body non-empty; author is the
 *     authenticated user; createdAt is server-set UTC.
 *
 * Comments are immutable in scope (no edit/delete). Adding a comment inserts a
 * `comment` row ONLY and never writes the parent `ticket` row, so the ticket's
 * `modifiedAt` (Prisma `@updatedAt`) is left untouched — the no-bump guarantee
 * (§7; the ticket-update path is A7's).
 *
 * Contracts: default-export `FastifyPluginAsync` mounted at `/api/tickets`
 * (ADR-0005); DB via the frozen `{ prisma }` singleton (ADR-0002); domain errors
 * via `backend/src/core/errors` (ADR-0003); auth is global (ADR-0004) — the
 * handler reads `request.authUser`. Request/response validation is delegated to
 * the shared, contract-generated `schemas[operationId]` (ADR-0006), so an empty
 * body is rejected with 400 by Ajv before the handler runs.
 */
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from 'backend/src/db';
import { NotFoundError, ValidationError } from 'backend/src/core/errors';
import { schemas } from '@app/shared';

interface CommentParams {
  ticketId: string;
}

interface CommentCreateBody {
  body: string;
}

/** A `comment` row as returned by Prisma, narrowed to the wire fields. */
interface CommentRow {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  createdAt: Date;
}

/** Serialize a stored comment to the OpenAPI `Comment` shape (ISO-8601 UTC). */
function toWire(row: CommentRow) {
  return {
    id: row.id,
    ticketId: row.ticketId,
    authorId: row.authorId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

/** 404 TICKET_NOT_FOUND (ADR-0003) unless the parent ticket exists. */
async function assertTicketExists(ticketId: string): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true },
  });
  if (!ticket) {
    throw new NotFoundError('TICKET_NOT_FOUND', 'Ticket does not exist');
  }
}

const commentsModule: FastifyPluginAsync = async (app) => {
  // List a ticket's comments, oldest-first (createdAt asc; id asc as a stable
  // tie-breaker for comments sharing the same millisecond timestamp).
  app.get<{ Params: CommentParams }>(
    '/:ticketId/comments',
    { schema: schemas.listComments },
    async (request) => {
      const { ticketId } = request.params;
      await assertTicketExists(ticketId);

      const comments = await prisma.comment.findMany({
        where: { ticketId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      return comments.map(toWire);
    },
  );

  // Add a comment. Author = authenticated user; createdAt is server-set (DB
  // default now(), UTC). Inserts the comment row only — the parent ticket is
  // never updated, so ticket.modifiedAt does not advance (§7 no-bump).
  app.post<{ Params: CommentParams; Body: CommentCreateBody }>(
    '/:ticketId/comments',
    { schema: schemas.createComment },
    async (request, reply) => {
      const { ticketId } = request.params;
      // Auth is global (ADR-0004): a business route always has authUser set.
      const authUser = request.authUser!;

      // Ajv (schema minLength: 1) already rejects an absent/empty body with 400.
      // Guard whitespace-only input too, so a "non-empty" body is meaningful (§7).
      if (request.body.body.trim().length === 0) {
        throw new ValidationError('COMMENT_BODY_REQUIRED', 'Comment body must not be empty');
      }

      await assertTicketExists(ticketId);

      const comment = await prisma.comment.create({
        data: {
          ticketId,
          authorId: authUser.id,
          body: request.body.body,
        },
      });

      reply.code(201);
      return toWire(comment);
    },
  );
};

export default commentsModule;
