import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { UserService } from '../services/userService';
import { UserPlan } from '@prisma/client';
import { uploadAvatarToSupabase } from '../services/avatarStorageService';

export class UserController {
  static async updateAvatar(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'Nenhum arquivo de imagem enviado.' });
      }

      const avatarUrl = await uploadAvatarToSupabase(
        req.userId,
        req.file.buffer,
        req.file.mimetype
      );
      const updatedUser = await UserService.updateUserAvatar(req.userId, avatarUrl);

      res.status(200).json({
        message: 'Avatar atualizado com sucesso!',
        avatarUrl: updatedUser.avatarUrl,
      });
    } catch (error) {
      console.error('Erro ao atualizar avatar:', error);
      const message = error instanceof Error ? error.message : 'Erro interno ao atualizar avatar.';
      const status = message.includes('não está configurado') || message.includes('não permitido') ? 400 : 500;
      res.status(status).json({ error: message });
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const { name, email, plan, hideFromRanking } = req.body;

      // Validar o 'plan' recebido, se necessário
      if (plan && !Object.values(UserPlan).includes(plan.toUpperCase())) {
        return res.status(400).json({ error: 'Plano inválido.' });
      }
      
      const updatedUser = await UserService.updateUserProfile(req.userId, { name, email, plan, hideFromRanking });

      res.status(200).json({
        message: 'Perfil atualizado com sucesso!',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          avatarUrl: updatedUser.avatarUrl,
          plan: updatedUser.plan,
          hideFromRanking: updatedUser.hideFromRanking,
        },
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Erro interno do servidor ao atualizar perfil.',
      });
    }
  }

  static async deleteAccount(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      await UserService.softDeleteUser(req.userId);

      res.status(200).json({
        message: 'Conta marcada para exclusão. Você perderá o acesso imediatamente. Seus dados serão mantidos por 30 dias. Se mudar de ideia, faça login para reativar.',
      });
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Erro interno do servidor ao excluir conta.',
      });
    }
  }

  static async reactivateAccount(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const user = await UserService.reactivateUser(req.userId);

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      res.status(200).json({
        message: 'Conta reativada com sucesso!',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error('Erro ao reativar conta:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Erro interno do servidor ao reativar conta.',
      });
    }
  }
}
