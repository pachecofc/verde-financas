import { prisma } from '../prisma';
import { UserPlan } from '@prisma/client';

interface UpdateProfileData {
  name?: string;
  email?: string;
  plan?: UserPlan;
}

export class UserService {
  static async updateUserAvatar(userId: string, avatarUrl: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, name: true, email: true, avatarUrl: true }, // Retorna apenas os campos necessários
    });
    return user;
  }

  static async updateUserProfile(userId: string, data: UpdateProfileData) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        plan: data.plan,
      },
      select: { id: true, name: true, email: true, avatarUrl: true, plan: true }, // Retorna apenas os campos necessários
    });
    return user;
  }

  // Soft delete: marca o usuário como deletado
  static async softDeleteUser(userId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
      select: { id: true, name: true, email: true, deletedAt: true },
    });
    return user;
  }

  // Reativação: remove a marca de deletado
  static async reactivateUser(userId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null },
      select: { id: true, name: true, email: true, deletedAt: true },
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
      },
    });

    return result.count;
  }

  // Verifica se o usuário está deletado
  static async isUserDeleted(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { deletedAt: true },
    });
    return user?.deletedAt !== null;
  }
}
