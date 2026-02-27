import { Pool } from 'pg';

export function createDbPool(env = process.env) {
  const connectionString = env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for postgres auth store');
  }

  return new Pool({
    connectionString,
    max: Number(env.DB_POOL_MAX || 10)
  });
}
