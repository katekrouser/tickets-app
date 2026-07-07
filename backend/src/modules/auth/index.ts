/**
 * Auth module (A5) — mounted at prefix `/api/auth` by A4 (ADR-0005).
 *
 * Routes only; a default-export FastifyPluginAsync. Request/response validation
 * uses `schemas[operationId]` from @app/shared (ADR-0006). Auth is enforced
 * globally by A4 (ADR-0004): signup/login/verify-email/resend-verification are
 * in PUBLIC_ROUTES (public); logout is authenticated. Errors are raised as
 * DomainError (ADR-0003) inside the service and mapped by A4's central handler.
 */
import type { FastifyPluginAsync } from 'fastify';
import { schemas } from '@app/shared';
import { getConfig } from 'backend/src/core/config';
import * as authService from './service.js';

interface Credentials {
  email: string;
  password: string;
}

const authModule: FastifyPluginAsync = async (app) => {
  // POST /api/auth/signup — create an unverified account + send verification email. No auto-login.
  app.post<{ Body: Credentials }>('/signup', { schema: schemas['signup'] }, async (request, reply) => {
    await authService.signup(request.body.email, request.body.password, request.log);
    reply.code(201);
    return { message: 'Account created. Check your email to verify your address.' };
  });

  // POST /api/auth/login — verify credentials and issue a bearer token.
  app.post<{ Body: Credentials }>('/login', { schema: schemas['login'] }, async (request) => {
    return authService.login(request.body.email, request.body.password);
  });

  // POST /api/auth/logout — bearer-authenticated; stateless JWT (client discards the token).
  app.post('/logout', { schema: schemas['logout'] }, async (_request, reply) => {
    return reply.code(204).send();
  });

  // GET /api/auth/verify-email?token=… — consume the single-use token, then 302 → login (no auto-login).
  app.get<{ Querystring: { token: string } }>(
    '/verify-email',
    { schema: schemas['verifyEmail'] },
    async (request, reply) => {
      await authService.verifyEmail(request.query.token);
      const { appBaseUrl } = getConfig();
      return reply.redirect(`${appBaseUrl}/login`, 302);
    },
  );

  // POST /api/auth/resend-verification — always 202 (no account enumeration).
  app.post<{ Body: { email: string } }>(
    '/resend-verification',
    { schema: schemas['resendVerification'] },
    async (request, reply) => {
      await authService.resendVerification(request.body.email, request.log);
      reply.code(202);
      return { message: 'If an unverified account exists for that address, a verification email has been sent.' };
    },
  );
};

export default authModule;
