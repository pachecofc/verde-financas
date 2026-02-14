import multer from 'multer';
import { Request } from 'express';

const MAX_AVATAR_BYTES = 300 * 1024; // 300 KB
const MAX_SUPPORT_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_AVATAR_MIMETYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_SUPPORT_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
];

const avatarFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const mime = file.mimetype.toLowerCase().split(';')[0].trim();
  if (ALLOWED_AVATAR_MIMETYPES.includes(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Apenas imagens são permitidas (JPEG, PNG, GIF ou WebP).') as any, false);
  }
};

const supportFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const mime = file.mimetype.toLowerCase().split(';')[0].trim();
  if (ALLOWED_SUPPORT_MIMETYPES.includes(mime)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Apenas imagens (JPEG, PNG, GIF, WebP), PDF, TXT ou CSV são permitidos.'
      ) as any,
      false
    );
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
  fileFilter: avatarFileFilter,
  limits: { fileSize: MAX_AVATAR_BYTES },
});

/**
 * Multer em memória para anexo de pedido de ajuda.
 * - Imagens, PDF, TXT, CSV.
 * - Limite de 5 MB.
 * - Um único arquivo por requisição (campo 'attachment').
 */
export const uploadSupportAttachment = multer({
  storage: multer.memoryStorage(),
  fileFilter: supportFileFilter,
  limits: { fileSize: MAX_SUPPORT_ATTACHMENT_BYTES },
});
