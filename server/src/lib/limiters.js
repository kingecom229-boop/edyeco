import rateLimit from 'express-rate-limit';

const base = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Trop de tentatives. Merci de réessayer dans quelques minutes.', code: 'RATE_LIMITED' } },
};

export const limiters = {
  global: rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: 1500 }),
  auth: rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: 30 }),
  register: rateLimit({ ...base, windowMs: 60 * 60 * 1000, limit: 8 }),
  newsletter: rateLimit({ ...base, windowMs: 60 * 60 * 1000, limit: 10 }),
  contact: rateLimit({ ...base, windowMs: 60 * 60 * 1000, limit: 8 }),
  review: rateLimit({ ...base, windowMs: 60 * 60 * 1000, limit: 10 }),
  checkout: rateLimit({ ...base, windowMs: 30 * 60 * 1000, limit: 40 }),
  analytics: rateLimit({ ...base, windowMs: 60 * 1000, limit: 300 }),
  passwordReset: rateLimit({ ...base, windowMs: 60 * 60 * 1000, limit: 6 }),
};

export default limiters;
