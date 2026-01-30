import { prisma } from '../prisma';
import { UserPlan } from '@prisma/client';
import { GamificationService } from './gamificationService';

interface UpdateProfileData {
  name?: string;
  email?: string;
  plan?: UserPlan;
  stripeCustomerId?: string | null;
}

export class UserService {
  static async updateUserAvatar(userId: string, avatarUrl: string) {
    const previous = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    const hadNoAvatar = !previous?.avatarUrl || previous.avatarUrl.trim() === '';

    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

    if (hadNoAvatar) {
      await GamificationService.registerEvent(userId, 'PROFILE_COMPLETE').catch(() => {});
    }
    return user;
  }

  static async updateUserProfile(userId: string, data: UpdateProfileData) {
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.email !== undefined) payload.email = data.email;
    if (data.plan !== undefined) payload.plan = data.plan;
    if (data.stripeCustomerId !== undefined) payload.stripeCustomerId = data.stripeCustomerId;
    const user = await prisma.user.update({
      where: { id: userId },
      data: payload as { name?: string; email?: string; plan?: UserPlan; stripeCustomerId?: string | null },
      select: { id: true, name: true, email: true, avatarUrl: true, plan: true, stripeCustomerId: true },
    });
    return user;
  }

  // Soft delete: marca o usuário como deletado
  static async softDeleteUser(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() } as any,
    });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    return user;
  }

  // Reativação: remove a marca de deletado
  static async reactivateUser(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null } as any,
    });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    return user;
  }

  // Hard delete: deleta fisicamente usuários que passaram dos 30 dias
  static async hardDeleteExpiredUsers() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.user.deleteMany({
      where: {
        deletedAt: {
          not: null,
          lte: thirtyDaysAgo, // deletedAt <= 30 dias atrás
        },
      } as any,
    });

    return result.count;
  }

  // Atualizar último login (para regra INACTIVITY)
  static async updateLastLogin(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() } as { lastLoginAt: Date },
    });
  }

  // Verifica se o usuário está deletado
  static async isUserDeleted(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return false;
    }
    const userWithDeletedAt = user as typeof user & { deletedAt: Date | null };
    return userWithDeletedAt.deletedAt !== null;
  }
}
