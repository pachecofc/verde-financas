import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { TwoFactorService } from '../services/twoFactorService';
import { prisma } from '../prisma';

// Middleware que requer 2FA se estiver habilitado
export const requireTwoFactor = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Se 2FA não estiver habilitado, permitir acesso
    const userWith2FA = user as typeof user & { twoFactorEnabled: boolean };
    if (!userWith2FA.twoFactorEnabled) {
      return next();
    }

    // Se 2FA estiver habilitado, verificar código
    const twoFactorCode = req.body.twoFactorCode || req.headers['x-2fa-code'] as string;

    if (!twoFactorCode) {
      return res.status(403).json({
        error: 'Código de autenticação de dois fatores necessário',
        requiresTwoFactor: true,
      });
    }

    const isValid = await TwoFactorService.verifyTwoFactorCode(req.userId, twoFactorCode);

    if (!isValid) {
      return res.status(403).json({
        error: 'Código de autenticação de dois fatores inválido',
        requiresTwoFactor: true,
      });
    }

    next();
  } catch (error) {
    console.error('Erro no middleware de 2FA:', error);
    return res.status(500).json({ error: 'Erro ao verificar autenticação de dois fatores' });
  }
};

// Middleware opcional que valida 2FA apenas se estiver habilitado
export const optionalTwoFactor = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Se 2FA não estiver habilitado, permitir acesso sem validação
    const userWith2FA = user as typeof user & { twoFactorEnabled: boolean };
    if (!userWith2FA.twoFactorEnabled) {
      return next();
    }

    // Se 2FA estiver habilitado, verificar código
    const twoFactorCode = req.body.twoFactorCode || req.headers['x-2fa-code'] as string;

    if (!twoFactorCode) {
      return res.status(403).json({
        error: 'Código de autenticação de dois fatores necessário',
        requiresTwoFactor: true,
      });
    }

    const isValid = await TwoFactorService.verifyTwoFactorCode(req.userId, twoFactorCode);

    if (!isValid) {
      return res.status(403).json({
        error: 'Código de autenticação de dois fatores inválido',
        requiresTwoFactor: true,
      });
    }

    next();
  } catch (error) {
    console.error('Erro no middleware de 2FA:', error);
    return res.status(500).json({ error: 'Erro ao verificar autenticação de dois fatores' });
  }
};
