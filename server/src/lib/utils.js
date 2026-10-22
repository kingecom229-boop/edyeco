import { query } from '../db/pool.js';
import { money, parsePagination, slugify, toCsv } from './text.js';

export { money, parsePagination, slugify, toCsv };

export async function logAudit(req, action, entity = '', entityId = '', meta = {}) {
  try {
    await query(
      'INSERT INTO audit_log (user_id, action, entity, entity_id, meta, ip) VALUES ($1,$2,$3,$4,$5::jsonb,$6)',
      [req.user?.id ?? null, action, entity, String(entityId ?? ''), JSON.stringify(meta), req.ip || '']
    );
  } catch (err) {
    console.error('[audit]', err.message);
  }
}


