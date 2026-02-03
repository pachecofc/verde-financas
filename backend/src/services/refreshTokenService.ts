import crypto from 'crypto';
import { prisma } from '../prisma';
import { REFRESH_TOKEN_EXPIRATION_DAYS } from '../config/jwt';

export class RefreshTokenService {
  static async createRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

    // Definir contexto RLS para esta conexão (signup/login/verify-2fa não passam pelo authMiddleware)
    await prisma.$executeRawUnsafe(
      "SELECT set_config('app.current_user_id', $1, false)",
      userId
    );

    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  static async rotateRefreshToken(oldToken: string) {
    const existing = await prisma.refreshToken.findUnique({
      where: { token: oldToken },
      include: { user: true },
    });

    if (
      !existing ||
      existing.revokedAt ||
      existing.expiresAt.getTime() <= Date.now()
    ) {
      throw new Error('Refresh token inválido ou expirado');
    }

    // Revogar o token antigo
    await prisma.refreshToken.update({
      where: { token: oldToken },
      data: { revokedAt: new Date() },
    });

    // Criar novo token
    const newToken = await this.createRefreshToken(existing.userId);

    return { newToken, user: existing.user };
  }

  static async revokeToken(token: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  static async revokeAllForUser(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

