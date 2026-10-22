export class HttpError extends Error {
  constructor(status, message, code = undefined, details = undefined) {
    super(message);
    this.status = status;
    this.code = code || `E${status}`;
    this.details = details;
  }
}

export const badRequest = (msg = 'Requête invalide', details) => new HttpError(400, msg, 'BAD_REQUEST', details);
export const unauthorized = (msg = 'Authentification requise') => new HttpError(401, msg, 'UNAUTHORIZED');
export const forbidden = (msg = 'Accès refusé') => new HttpError(403, msg, 'FORBIDDEN');
export const notFound = (msg = 'Ressource introuvable') => new HttpError(404, msg, 'NOT_FOUND');
export const conflict = (msg = 'Conflit de données') => new HttpError(409, msg, 'CONFLICT');

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(err, req, res, _next) {
  // Zod validation errors are client errors: expose field details, never a 500.
  if (err?.name === 'ZodError' && Array.isArray(err.issues)) {
    return res.status(400).json({
      error: {
        message: 'Merci de vérifier les champs du formulaire.',
        code: 'VALIDATION_ERROR',
        details: err.issues.map((i) => ({ field: (i.path || []).join('.'), message: i.message })),
      },
    });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Corps de requête JSON invalide.', code: 'BAD_JSON' } });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'Requête trop volumineuse.', code: 'PAYLOAD_TOO_LARGE' } });
  }
  // PostgreSQL error codes → client-safe HTTP responses (never leak SQL details).
  if (err?.code === '23505') {
    return res.status(409).json({ error: { message: 'Cette valeur est déjà utilisée.', code: 'DUPLICATE' } });
  }
  if (['22P02', '22003', '23502', '23514'].includes(err?.code)) {
    return res.status(400).json({ error: { message: 'Données invalides.', code: 'INVALID_DATA' } });
  }
  if (err?.code === '23503') {
    return res.status(409).json({ error: { message: 'Cet élément est utilisé ailleurs et ne peut pas être modifié ainsi.', code: 'CONSTRAINT' } });
  }
  const status = err.status && Number.isInteger(err.status) ? err.status : 500;
  if (status >= 500) {
    console.error('[error]', req.method, req.originalUrl, err);
  }
  const payload = {
    error: {
      message: status >= 500 ? 'Une erreur interne est survenue.' : err.message,
      code: err.code || 'ERROR',
    },
  };
  if (err.details) payload.error.details = err.details;
  res.status(status).json(payload);
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: 'Route API introuvable', code: 'NOT_FOUND' } });
}
