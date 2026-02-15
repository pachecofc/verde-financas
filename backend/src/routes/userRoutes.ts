import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireTwoFactor } from '../middleware/twoFactorMiddleware';
import { uploadAvatar } from '../middleware/uploadMiddleware';
import { UserController } from '../controllers/userController';
import multer from 'multer';

const router = Router();

function handleAvatarUpload(req: Request, res: Response, next: NextFunction) {
  uploadAvatar.single('avatar')(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Arquivo muito grande. O limite é 300 KB.' });
        }
      }
      const msg = err instanceof Error ? err.message : 'Erro ao processar upload.';
      return res.status(400).json({ error: msg });
    }
    next();
  });
}

// Rota para upload e atualização do avatar do usuário
// Protegida por authMiddleware; upload via Supabase Storage (bucket = userId)
router.put('/profile/avatar', authMiddleware, handleAvatarUpload, UserController.updateAvatar);

// Rota para atualizar outras informações do perfil (nome, email, etc.)
router.put('/profile', authMiddleware, UserController.updateProfile);

// Rota para marcar tour de onboarding como concluído
router.put('/profile/onboarding-tour-completed', authMiddleware, UserController.markOnboardingTourCompleted);

// Rota para excluir conta (soft delete) - requer 2FA se habilitado
router.delete('/delete-account', authMiddleware, requireTwoFactor, UserController.deleteAccount);

// Rota para reativar conta
router.post('/reactivate-account', authMiddleware, UserController.reactivateAccount);

export default router;
