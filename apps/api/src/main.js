import { createServer } from './server.js';
import { createAuthService } from './auth/service.js';
import { InMemoryAuthStore } from './auth/store.js';
import { PostgresAuthStore } from './auth/postgres-store.js';
import { createDbPool } from './db/pool.js';
import { createKycService } from './identity/kyc-service.js';
import { createObjectStorageFromEnv } from './identity/object-storage.js';
import { createLogger } from './observability/logger.js';
import { createPostgresJobsService } from './jobs/postgres-service.js';
import { createPostgresFeedService } from './feed/postgres-service.js';
import { bootstrapAdminAccount } from './auth/bootstrap-admin.js';

async function createAuthStoreFromEnv(env = process.env) {
  const mode = String(env.AUTH_STORE || 'memory').trim().toLowerCase();

  if (mode === 'memory') {
    return {
      mode,
      store: new InMemoryAuthStore(),
      close: async () => {}
    };
  }

  if (mode === 'postgres') {
    const pool = createDbPool(env);
    await pool.query('SELECT 1');
    return {
      mode,
      store: new PostgresAuthStore({ pool }),
      close: async () => {
        await pool.end();
      }
    };
  }

  throw new Error(`Unsupported AUTH_STORE value: ${mode}`);
}

async function main() {
  const logger = createLogger({ env: process.env, service: 'api' });
  const port = Number(process.env.API_PORT || 4000);
  const authStore = await createAuthStoreFromEnv(process.env);
  const objectStorage = await createObjectStorageFromEnv(process.env);
  const authService = createAuthService({ store: authStore.store, env: process.env });
  const kycService = createKycService({
    store: authStore.store,
    objectStorage: objectStorage.storage,
    env: process.env,
    logger
  });

  await bootstrapAdminAccount({
    env: process.env,
    store: authStore.store,
    logger
  });

  let jobsService;
  let feedService;

  if (authStore.mode === 'postgres') {
    jobsService = await createPostgresJobsService({ pool: authStore.store.pool });
    feedService = await createPostgresFeedService({ pool: authStore.store.pool });
  }

  const server = createServer({ authService, kycService, jobsService, feedService });

  server.listen(port, () => {
    logger.info('api.started', {
      port,
      authStore: authStore.mode,
      objectStorage: objectStorage.mode
    });
  });

  async function gracefulShutdown(signal) {
    logger.info('api.shutdown.started', { signal });

    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });

    await authStore.close();
    await objectStorage.close();
    logger.info('api.shutdown.completed', { signal });
    process.exit(0);
  }

  process.on('SIGINT', () => {
    gracefulShutdown('SIGINT').catch((error) => {
      console.error(`Shutdown error: ${error.message}`);
      process.exit(1);
    });
  });

  process.on('SIGTERM', () => {
    gracefulShutdown('SIGTERM').catch((error) => {
      console.error(`Shutdown error: ${error.message}`);
      process.exit(1);
    });
  });
}

main().catch((error) => {
  console.error(`Startup failed: ${error.message}`);
  process.exit(1);
});
