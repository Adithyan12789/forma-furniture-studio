import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

/**
 * Image storage with two providers behind one interface:
 * - local: files on disk under server/uploads, served from /uploads
 * - cloudinary: signed REST upload when CLOUDINARY_CLOUD_NAME,
 *   CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are set (Phase 7)
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const UPLOADS_DIR = path.join(root, 'uploads');

export function provider() {
  return process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
    ? 'cloudinary'
    : 'local';
}

/** Cloudinary signature: SHA-1 of sorted params + api secret. */
export function cloudinarySignature(params, apiSecret) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
}

async function uploadToCloudinary(filePath, mimeType) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'forma';
  const signature = cloudinarySignature({ folder, timestamp }, apiSecret);

  const bytes = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mimeType }), path.basename(filePath));
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const err = new Error(`Cloudinary upload failed (${res.status}). ${detail.slice(0, 160)}`);
    err.status = 502;
    throw err;
  }
  const data = await res.json();
  return data.secure_url;
}

/**
 * Store a Multer-uploaded temp file. Returns the public URL to persist:
 * `/uploads/<file>` for local, an https Cloudinary URL for cloudinary.
 */
export async function storeUploadedImage(file) {
  if (provider() === 'cloudinary') {
    const url = await uploadToCloudinary(file.path, file.mimetype);
    fs.rm(file.path, { force: true }, () => {});
    return { url, provider: 'cloudinary' };
  }
  return { url: `/uploads/${file.filename}`, provider: 'local' };
}

/** Read an image (for AI analysis) from its stored URL, local or remote. */
export async function readStoredImage(url) {
  if (url.startsWith('http')) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not fetch stored image (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  const file = url.replace(/^\/uploads\//, '');
  return fs.readFileSync(path.join(UPLOADS_DIR, file));
}

export function deleteLocalImage(url) {
  if (url.startsWith('/uploads/')) {
    fs.rm(path.join(UPLOADS_DIR, url.replace(/^\/uploads\//, '')), { force: true }, () => {});
  }
}

export function mimeFromUrl(url) {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  return ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
}
