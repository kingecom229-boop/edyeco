import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, getPool, closePool } from './pool.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, 'migrations');

export async function runMigrations({ silent = false } = {}) {
  await getPool();
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  const { rows } = await query('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.name));

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    await query('BEGIN');
    try {
      await query(sql);
      await query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await query('COMMIT');
      if (!silent) console.log(`[db] migration appliquée : ${file}`);
    } catch (err) {
      await query('ROLLBACK');
      throw new Error(`Migration ${file} échouée : ${err.message}`);
    }
  }
  if (!silent) console.log(`[db] ${files.length} migration(s) à jour.`);
}

// Allow `npm run migrate` as a standalone command.
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  runMigrations()
    .then(() => closePool())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export default runMigrations;
