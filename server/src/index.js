import config from './config.js';
import { createApp } from './app.js';
import { getPool, query, closePool } from './db/pool.js';
import { runMigrations } from './db/migrate.js';
import { seed } from './db/seed.js';

async function markAbandonedCarts() {
  try {
    await query(`
      UPDATE carts SET status = 'abandoned', updated_at = now()
      WHERE status = 'active' AND last_activity_at < now() - interval '45 minutes'
        AND EXISTS (SELECT 1 FROM cart_items ci WHERE ci.cart_id = carts.id)
    `);
  } catch (err) {
    console.error('[cron] paniers abandonnés:', err.message);
  }
}

async function main() {
  await getPool();
  if (config.dbAutoMigrate) await runMigrations();
  if (config.dbAutoSeed) await seed({ silent: false });

  const app = createApp();
  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`[edyeco] API prête sur http://localhost:${config.port} (${config.env})`);
    if (!config.isProd) console.log(`[edyeco] CORS autorisé pour : ${config.clientOrigins.join(', ')}`);
  });

  const timer = setInterval(markAbandonedCarts, 5 * 60 * 1000);
  timer.unref();
  markAbandonedCarts();

  const shutdown = async (signal) => {
    console.log(`\n[edyeco] ${signal} reçu, arrêt propre...`);
    clearInterval(timer);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[edyeco] démarrage impossible:', err);
  process.exit(1);
});
