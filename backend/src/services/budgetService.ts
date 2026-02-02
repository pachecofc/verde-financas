import { prisma } from '../prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { GamificationService } from './gamificationService';
import { AuditService } from './auditService';

export class BudgetService {
  // Listar todos os orçamentos do usuário
  static async getBudgetsByUserId(userId: string) {
    return await prisma.budget.findMany({
      where: { userId },
      include: {
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Obter um orçamento específico por ID
  static async getBudgetById(userId: string, budgetId: string) {
    const budget = await prisma.budget.findFirst({
      where: { id: budgetId, userId },
      include: {
        category: true,
      },
    });

    if (!budget) {
      throw new Error('Orçamento não encontrado ou não pertence ao usuário.');
    }

    return budget;
  }

  // Criar novo orçamento
  static async createBudget(
    userId: string,
    data: {
      categoryId: string;
      limit: number;
    }
  ) {
    const { categoryId, limit } = data;

    // Validações básicas
    if (!categoryId || limit === undefined || limit <= 0) {
      throw new Error('categoryId e limit são obrigatórios. Limit deve ser maior que zero.');
    }

    // Verificar se a categoria existe e pertence ao usuário
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId },
    });

    if (!category) {
      throw new Error('Categoria não encontrada ou não pertence ao usuário.');
    }

    // Verificar se já existe um orçamento para esta categoria (constraint único)
    const existingBudget = await prisma.budget.findFirst({
      where: { userId, categoryId },
    });

    if (existingBudget) {
      throw new Error('Já existe um orçamento para esta categoria. Use a atualização para modificar.');
    }

    const budgetCount = await prisma.budget.count({ where: { userId } });

    // Criar orçamento
    const newBudget = await prisma.budget.create({
      data: {
        userId,
        categoryId,
        limit: new Decimal(limit),
      },
      include: {
        category: true,
      },
    });

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'BUDGET_CREATE',
      resourceType: 'budgets',
      resourceId: newBudget.id,
    });

    if (budgetCount === 0) {
      await GamificationService.registerEvent(userId, 'FIRST_BUDGET').catch(() => {});
    }
    return newBudget;
  }

  // Atualizar orçamento existente
  static async updateBudget(
    userId: string,
    budgetId: string,
    data: {
      categoryId?: string;
      limit?: number;
    }
  ) {
    const { categoryId, limit } = data;

    // Verificar se o orçamento existe e pertence ao usuário
    const budget = await prisma.budget.findFirst({
      where: { id: budgetId, userId },
    });

    if (!budget) {
      throw new Error('Orçamento não encontrado ou não pertence ao usuário.');
    }

    // Validar limit se estiver sendo alterado
    if (limit !== undefined && limit <= 0) {
      throw new Error('Limit deve ser maior que zero.');
    }

    // Se categoryId está sendo alterado, validar
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, userId },
      });

      if (!category) {
        throw new Error('Categoria não encontrada ou não pertence ao usuário.');
      }

      // Verificar se já existe outro orçamento para a nova categoria
      const existingBudget = await prisma.budget.findFirst({
        where: { userId, categoryId, NOT: { id: budgetId } },
      });

      if (existingBudget) {
        throw new Error('Já existe um orçamento para esta categoria.');
      }
    }

    // Atualizar orçamento
    const updatedBudget = await prisma.budget.update({
      where: { id: budgetId },
      data: {
        ...(categoryId && { categoryId }),
        ...(limit !== undefined && { limit: new Decimal(limit) }),
      },
      include: {
        category: true,
      },
    });

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'BUDGET_UPDATE',
      resourceType: 'budgets',
      resourceId: budgetId,
    });

    return updatedBudget;
  }

  // Deletar orçamento
  static async deleteBudget(userId: string, budgetId: string) {
    // Verificar se o orçamento existe e pertence ao usuário
    const budget = await prisma.budget.findFirst({
      where: { id: budgetId, userId },
    });

    if (!budget) {
      throw new Error('Orçamento não encontrado ou não pertence ao usuário.');
    }

    // Deletar orçamento
    await prisma.budget.delete({
      where: { id: budgetId },
    });

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'BUDGET_DELETE',
      resourceType: 'budgets',
      resourceId: budgetId,
    });

    return { message: 'Orçamento excluído com sucesso.' };
  }

  // Calcular o valor gasto (spent) para um orçamento
  // Esta função calcula o total gasto na categoria do orçamento no mês atual
  static async calculateSpent(userId: string, categoryId: string): Promise<number> {
    const now = new Date();
    return this.calculateSpentForMonth(userId, categoryId, now.getFullYear(), now.getMonth());
  }

  // Calcular o valor gasto na categoria em um mês específico (year: ano, monthIndex: 0-11)
  static async calculateSpentForMonth(
    userId: string,
    categoryId: string,
    year: number,
    monthIndex: number
  ): Promise<number> {
    const startOfMonth = new Date(year, monthIndex, 1);
    const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        categoryId,
        type: 'expense',
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    });
    return transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  }
}
