import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { UserService } from '../services/userService';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  email?: string;
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

    next();
  } catch (error: any) {
    if (error?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};
