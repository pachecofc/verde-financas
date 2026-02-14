import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/authMiddleware';
import { uploadSupportAttachment } from '../middleware/uploadMiddleware';
import { SupportController } from '../controllers/supportController';
import multer from 'multer';

const router = Router();

const supportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: { error: 'Muitos pedidos enviados. Tente novamente em alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function handleSupportUpload(req: Request, res: Response, next: NextFunction) {
  uploadSupportAttachment.single('attachment')(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Arquivo muito grande. O limite é 5 MB.' });
        }
      }
      const msg = err instanceof Error ? err.message : 'Erro ao processar anexo.';
      return res.status(400).json({ error: msg });
    }
    next();
  });
}

router.post('/', supportLimiter, authMiddleware, handleSupportUpload, SupportController.submit);

export default router;
