/**
 * Tickets feature module (A7) — default-export FastifyPluginAsync (ADR-0005),
 * mounted by A4 at the frozen prefix `/api/tickets`. Routes are defined relative
 * to that prefix; the module never hard-codes the prefix, registers global hooks,
 * or handles auth (auth is global per ADR-0004 — handlers read `request.authUser`).
 *
 * Each route attaches its Ajv schema from `@app/shared` keyed by operationId
 * (ADR-0006), which enforces server-side enum + shape validation (invalid `type`
 * / `state` → 400 VALIDATION_ERROR) before the handler runs. Domain rules live in
 * ./service.ts and signal outcomes by throwing DomainError subclasses (ADR-0003).
 */
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { schemas } from '@app/shared';
import { UnauthorizedError } from 'backend/src/core/errors';
import type { components } from '@app/shared';
import {
  createTicket,
  deleteTicket,
  getTicket,
  listTickets,
  updateTicket,
  type ListTicketsQuery,
} from './service.js';

type TicketCreateBody = components['schemas']['TicketCreateRequest'];
type TicketUpdateBody = components['schemas']['TicketUpdateRequest'];
interface TicketIdParams {
  ticketId: string;
}

/** Read the verified identity set by the global auth guard (ADR-0004). */
function requireUserId(request: FastifyRequest): string {
  if (!request.authUser) {
    // Defensive: business routes are always behind the global guard, so this
    // should be unreachable — surfaced as 401 rather than a 500 if it ever is.
    throw new UnauthorizedError('UNAUTHORIZED', 'Authentication required.');
  }
  return request.authUser.id;
}

const ticketsModule: FastifyPluginAsync = async (app) => {
  // GET /api/tickets?teamId=&type=&epicId=&q= — board list (§8).
  app.get('/', { schema: schemas['listTickets'] }, async (request) => {
    const query = request.query as ListTicketsQuery;
    return listTickets(query);
  });

  // POST /api/tickets — create (§6). createdBy/timestamps server-set.
  app.post('/', { schema: schemas['createTicket'] }, async (request, reply) => {
    const ticket = await createTicket(request.body as TicketCreateBody, requireUserId(request));
    reply.code(201);
    return ticket;
  });

  // GET /api/tickets/:ticketId — full ticket.
  app.get('/:ticketId', { schema: schemas['getTicket'] }, async (request) => {
    const { ticketId } = request.params as TicketIdParams;
    return getTicket(ticketId);
  });

  // PATCH /api/tickets/:ticketId — partial update (persists drag-and-drop state).
  app.patch('/:ticketId', { schema: schemas['updateTicket'] }, async (request) => {
    const { ticketId } = request.params as TicketIdParams;
    return updateTicket(ticketId, request.body as TicketUpdateBody);
  });

  // DELETE /api/tickets/:ticketId — delete (cascades to comments).
  app.delete('/:ticketId', { schema: schemas['deleteTicket'] }, async (request, reply) => {
    const { ticketId } = request.params as TicketIdParams;
    await deleteTicket(ticketId);
    return reply.code(204).send();
  });
};

export default ticketsModule;
