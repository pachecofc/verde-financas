import multer from 'multer';
import { Request } from 'express';

const MAX_SIZE_BYTES = 300 * 1024; // 300 KB
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const mime = file.mimetype.toLowerCase().split(';')[0].trim();
  if (ALLOWED_MIMETYPES.includes(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Apenas imagens são permitidas (JPEG, PNG, GIF ou WebP).') as any, false);
  }
};

/**
 * Multer em memória para avatar.
 * - Somente imagens (JPEG, PNG, GIF, WebP).
 * - Limite de 300 KB.
 * - Arquivo em req.file.buffer para upload no Supabase Storage.
 */
export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES },
});
