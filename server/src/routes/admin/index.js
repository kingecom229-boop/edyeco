import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { requireAdmin, csrfProtection } from '../../lib/auth.js';
import { asyncHandler, badRequest } from '../../lib/http.js';
import config from '../../config.js';
import productsAdmin from './products.js';
import ordersAdmin from './orders.js';
import contentAdmin from './content.js';

const router = Router();

// Every route below is admin-only.
router.use(csrfProtection, requireAdmin);

router.use(productsAdmin);
router.use(ordersAdmin);
router.use(contentAdmin);

fs.mkdirSync(config.uploadsDir, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadsDir,
    filename: (_req, file, cb) => {
      const ext = EXT_BY_MIME[file.mimetype] || '.bin';
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) return cb(badRequest('Format d’image non autorisé (JPEG, PNG, WebP, AVIF).'));
    cb(null, true);
  },
});

router.post('/uploads', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw badRequest('Aucun fichier reçu.');
  res.status(201).json({
    url: `${config.uploadsUrlPath}/${req.file.filename}`,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
}));

router.get('/health', (_req, res) => {
  res.json({ ok: true, admin: true, uptime: process.uptime() });
});

export default router;
