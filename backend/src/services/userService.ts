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
}
