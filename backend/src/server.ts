/**
 * Backend entrypoint (A4 Backend Core).
 *
 * Boot order: validate env (fail-fast, ADR-0007) → build the app → listen on
 * BACKEND_PORT. Migrations are applied separately by A2's container entrypoint
 * (`npm run migrate`) before this process starts — not triggered here.
 */
import { loadConfig } from './core/config.js';
import { buildApp } from './app.js';

async function main(): Promise<void> {
  // Fail fast if any required environment variable is missing/invalid.
  const config = loadConfig();

  const app = buildApp();

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'shutting down');
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  try {
    // 0.0.0.0 so the container port is reachable from nginx/compose.
    await app.listen({ port: config.backendPort, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
