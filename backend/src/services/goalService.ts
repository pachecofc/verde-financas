import { prisma } from '../prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { GamificationService } from './gamificationService';
import { AuditService } from './auditService';
import { encrypt, decrypt } from './encryptionService';

export class GoalService {
  // Listar todas as metas do usuário
  static async getGoalsByUserId(userId: string) {
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return goals.map((g) => ({ ...g, name: decrypt(userId, g.name) ?? g.name }));
  }

  static async getGoalById(userId: string, goalId: string) {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new Error('Meta não encontrada ou não pertence ao usuário.');
    }

    return { ...goal, name: decrypt(userId, goal.name) ?? goal.name };
  }

  // Criar nova meta
  static async createGoal(
    userId: string,
    data: {
      name: string;
      targetAmount: number;
      currentAmount?: number;
      deadline?: Date | null;
      icon?: string | null;
      color?: string | null;
    }
  ) {
    const { name, targetAmount, currentAmount = 0, deadline, icon, color } = data;

    // Validações básicas
    if (!name || !targetAmount) {
      throw new Error('name e targetAmount são obrigatórios.');
    }

    if (targetAmount <= 0) {
      throw new Error('targetAmount deve ser maior que zero.');
    }

    if (currentAmount < 0) {
      throw new Error('currentAmount não pode ser negativo.');
    }

    const goalCount = await prisma.goal.count({ where: { userId } });

    const encryptedName = encrypt(userId, name) ?? name;
    const newGoal = await prisma.goal.create({
      data: {
        userId,
        name: encryptedName,
        targetAmount: new Decimal(targetAmount),
        currentAmount: new Decimal(currentAmount),
        deadline: deadline || null,
        icon: icon || null,
        color: color || null,
      },
    });

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'GOAL_CREATE',
      resourceType: 'goals',
      resourceId: newGoal.id,
    });

    if (goalCount === 0) {
      await GamificationService.registerEvent(userId, 'FIRST_GOAL').catch(() => {});
    }
    return { ...newGoal, name: decrypt(userId, newGoal.name) ?? newGoal.name };
  }

  // Atualizar meta
  static async updateGoal(
    userId: string,
    goalId: string,
    data: {
      name?: string;
      targetAmount?: number;
      currentAmount?: number;
      deadline?: Date | null;
      icon?: string | null;
      color?: string | null;
    }
  ) {
    // Verificar se a meta existe e pertence ao usuário
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new Error('Meta não encontrada ou não pertence ao usuário.');
    }

    // Validações
    if (data.targetAmount !== undefined && data.targetAmount <= 0) {
      throw new Error('targetAmount deve ser maior que zero.');
    }

    if (data.currentAmount !== undefined && data.currentAmount < 0) {
      throw new Error('currentAmount não pode ser negativo.');
    }

    const prevCurrent = Number(goal.currentAmount);
    const prevTarget = Number(goal.targetAmount);
    const wasReached = prevCurrent >= prevTarget;
    const goalNamePlain = decrypt(userId, goal.name) ?? goal.name ?? '';
    const nameLower = goalNamePlain.toLowerCase();

    // Atualizar meta
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = encrypt(userId, data.name) ?? data.name;
    if (data.targetAmount !== undefined) updateData.targetAmount = new Decimal(data.targetAmount);
    if (data.currentAmount !== undefined) updateData.currentAmount = new Decimal(data.currentAmount);
    if (data.deadline !== undefined) updateData.deadline = data.deadline;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;

    const updated = await prisma.goal.update({
      where: { id: goalId },
      data: updateData,
    });

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'GOAL_UPDATE',
      resourceType: 'goals',
      resourceId: goalId,
    });

    const newCurrent = Number(updated.currentAmount);
    const newTarget = Number(updated.targetAmount);
    if (!wasReached && newCurrent >= newTarget) {
      await GamificationService.registerEvent(userId, 'GOAL_REACHED', { goalId }).catch(() => {});
    }
    if (
      (nameLower.includes('reserva') || nameLower.includes('emergência')) &&
      newTarget > 0 &&
      newCurrent >= newTarget * 0.1 &&
      prevCurrent < prevTarget * 0.1
    ) {
      await GamificationService.registerEvent(userId, 'EMERGENCY_FUND', { goalId }).catch(() => {});
    }
    return { ...updated, name: decrypt(userId, updated.name) ?? updated.name };
  }

  // Deletar meta
  static async deleteGoal(userId: string, goalId: string) {
    // Verificar se a meta existe e pertence ao usuário
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new Error('Meta não encontrada ou não pertence ao usuário.');
    }

    const currentAmount = Number(goal.currentAmount);
    const targetAmount = Number(goal.targetAmount);
    if (currentAmount < targetAmount) {
      await GamificationService.registerEvent(userId, 'GOAL_DELETED', { goalId }).catch(() => {});
    }

    await prisma.goal.delete({
      where: { id: goalId },
    });

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'GOAL_DELETE',
      resourceType: 'goals',
      resourceId: goalId,
    });
  }
}
