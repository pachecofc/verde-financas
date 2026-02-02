import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { UserService } from '../services/userService';
import { prisma } from '../prisma';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  email?: string;
}

/**
 * Define app.current_user_id na sessão PostgreSQL para RLS (Row Level Security).
 * Requer que a DATABASE_URL use connection_limit=1 (ou conexão direta sem pooler
 * em modo transação) para que a mesma conexão seja usada nas queries do request.
 */
async function setRlsUserContext(userId: string): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      "SELECT set_config('app.current_user_id', $1, false)",
      userId
    );
  } catch (error) {
    console.error('[authMiddleware] Falha ao setar app.current_user_id para RLS:', error);
    // Não propaga: a requisição continua; RLS pode bloquear algumas linhas
  }
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = AuthService.verifyToken(token) as any;
    req.userId = decoded.userId;
    req.email = decoded.email;

    // Verificar se o usuário está deletado
    if (req.userId) {
      const isDeleted = await UserService.isUserDeleted(req.userId);
      if (isDeleted) {
        return res.status(403).json({ 
          error: 'Conta excluída. Faça login para reativar sua conta.' 
        });
      }
    }

    // Definir contexto de usuário para RLS (Row Level Security) no PostgreSQL
    if (req.userId) {
      await setRlsUserContext(req.userId);
    }

    next();
  } catch (error: any) {
    if (error?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};
