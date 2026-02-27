import { createServer } from './server.js';
import { createAuthService } from './auth/service.js';
import { InMemoryAuthStore } from './auth/store.js';
import { PostgresAuthStore } from './auth/postgres-store.js';
import { createDbPool } from './db/pool.js';
import { createKycService } from './identity/kyc-service.js';
import { createObjectStorageFromEnv } from './identity/object-storage.js';

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
  const port = Number(process.env.API_PORT || 4000);
  const authStore = await createAuthStoreFromEnv(process.env);
  const objectStorage = await createObjectStorageFromEnv(process.env);
  const authService = createAuthService({ store: authStore.store, env: process.env });
  const kycService = createKycService({
    store: authStore.store,
    objectStorage: objectStorage.storage,
    env: process.env
  });
  const server = createServer({ authService, kycService });

  server.listen(port, () => {
    console.log(
      `API listening on http://localhost:${port} (authStore=${authStore.mode}, objectStorage=${objectStorage.mode})`
    );
  });

  async function gracefulShutdown(signal) {
    console.log(`${signal} received, shutting down API`);

    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });

    await authStore.close();
    await objectStorage.close();
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
