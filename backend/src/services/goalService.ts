import { prisma } from '../prisma';
import { Decimal } from '@prisma/client/runtime/library';

export class GoalService {
  // Listar todas as metas do usuário
  static async getGoalsByUserId(userId: string) {
    return await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Obter uma meta específica por ID
  static async getGoalById(userId: string, goalId: string) {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new Error('Meta não encontrada ou não pertence ao usuário.');
    }

    return goal;
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

    // Criar meta
    const newGoal = await prisma.goal.create({
      data: {
        userId,
        name,
        targetAmount: new Decimal(targetAmount),
        currentAmount: new Decimal(currentAmount),
        deadline: deadline || null,
        icon: icon || null,
        color: color || null,
      },
    });

    return newGoal;
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

    // Atualizar meta
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.targetAmount !== undefined) updateData.targetAmount = new Decimal(data.targetAmount);
    if (data.currentAmount !== undefined) updateData.currentAmount = new Decimal(data.currentAmount);
    if (data.deadline !== undefined) updateData.deadline = data.deadline;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;

    return await prisma.goal.update({
      where: { id: goalId },
      data: updateData,
    });
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

    await prisma.goal.delete({
      where: { id: goalId },
    });
  }
}
