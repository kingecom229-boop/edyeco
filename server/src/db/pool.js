import fs from 'node:fs';
import pg from 'pg';
import config from '../config.js';

const { Pool } = pg;

/**
 * One shared pool for the whole process.
 *
 * Production target: managed PostgreSQL (Neon, Supabase, RDS...) via DATABASE_URL.
 * Zero-config local/demo target: PGlite, a real PostgreSQL build compiled to
 * WASM, exposed through the PostgreSQL wire protocol by pglite-socket. The
 * application code below is plain, portable PostgreSQL.
 */
let pool;
let embeddedServer;
let ready;

async function startEmbeddedPostgres() {
  const [{ PGlite }, { PGLiteSocketServer }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('@electric-sql/pglite-socket'),
  ]);

  fs.mkdirSync(config.pglite.dataDir, { recursive: true });
  const db = await PGlite.create({ dataDir: config.pglite.dataDir });
  const server = new PGLiteSocketServer({
    db,
    port: config.pglite.port,
    host: '127.0.0.1',
    maxConnections: 10,
  });
  await server.start();
  embeddedServer = { server, db };
  console.log(`[db] PGlite embarqué prêt sur 127.0.0.1:${config.pglite.port}`);
  return {
    host: '127.0.0.1',
    port: config.pglite.port,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
  };
}

async function buildPool() {
  if (config.databaseUrl) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      ssl: config.dbSsl ? { rejectUnauthorized: false } : false,
    });
    return;
  }

  const connection = await startEmbeddedPostgres();
  pool = new Pool({ ...connection, max: 10, idleTimeoutMillis: 30_000 });
}

export function getPool() {
  if (!ready) ready = buildPool();
  return ready.then(() => pool);
}

export async function query(text, params) {
  const p = await getPool();
  return p.query(text, params);
}

/** Run a function inside a transaction, rolling back on any error. */
export async function withTransaction(fn) {
  const p = await getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (pool) await pool.end().catch(() => {});
  if (embeddedServer) {
    await embeddedServer.server.stop().catch(() => {});
    await embeddedServer.db.close().catch(() => {});
  }
}

export default { query, getPool, withTransaction, closePool };
