import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { UserService } from '../services/userService';
import { UserPlan } from '@prisma/client';

export class UserController {
  static async updateAvatar(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo de imagem enviado.' });
      }

      const avatarPath = `/uploads/avatars/${req.file.filename}`;

      const updatedUser = await UserService.updateUserAvatar(req.userId, avatarPath);

      res.status(200).json({
        message: 'Avatar atualizado com sucesso!',
        avatarUrl: updatedUser.avatarUrl,
      });
    } catch (error) {
      console.error('Erro ao atualizar avatar:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Erro interno do servidor ao atualizar avatar.',
      });
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const { name, email, plan } = req.body;

      // Validar o 'plan' recebido, se necessário
      if (plan && !Object.values(UserPlan).includes(plan.toUpperCase())) {
        return res.status(400).json({ error: 'Plano inválido.' });
      }
      
      const updatedUser = await UserService.updateUserProfile(req.userId, { name, email, plan });

      res.status(200).json({
        message: 'Perfil atualizado com sucesso!',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          avatarUrl: updatedUser.avatarUrl,
          plan: updatedUser.plan,
        },
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Erro interno do servidor ao atualizar perfil.',
      });
    }
  }
}
