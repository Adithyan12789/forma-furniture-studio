import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { UPLOADS_DIR } from '../services/storage/storageService.js';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

export const uploadImage = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    const err = new Error('Only JPEG, PNG and WebP images are supported');
    err.status = 400;
    cb(err);
  },
}).single('image');
