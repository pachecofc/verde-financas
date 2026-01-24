import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { uploadAvatar } from '../middleware/uploadMiddleware';
import { UserController } from '../controllers/userController';

const router = Router();

// Rota para upload e atualização do avatar do usuário
// Protegida por authMiddleware e usa uploadAvatar para processar o arquivo
router.put('/profile/avatar', authMiddleware, uploadAvatar.single('avatar'), UserController.updateAvatar);

// Rota para atualizar outras informações do perfil (nome, email, etc.)
router.put('/profile', authMiddleware, UserController.updateProfile);

export default router;
