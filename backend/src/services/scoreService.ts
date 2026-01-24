import { prisma } from '../prisma';
import { Decimal } from '@prisma/client/runtime/library';

export interface ScoreCalculationData {
  budgets: Array<{ spent: number; limit: number }>;
  transactions: Array<{ date: string; type: string; amount: number }>;
  goals: Array<{ currentAmount: number; targetAmount: number }>;
  assetHoldings: Array<{ id: string }>;
}

export class ScoreService {
  // Calcular o score verde baseado nos dados financeiros
  static calculateGreenScore(data: ScoreCalculationData): number {
    let score = 500; // Score base

    // Penalizar orçamentos estourados (-50 pontos cada)
    const overBudgetCount = data.budgets.filter(b => b.spent > b.limit).length;
    score -= overBudgetCount * 50;

    // Calcular taxa de poupança do mês atual
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyIncome = data.transactions
      .filter(t => t.date.startsWith(currentMonth) && t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const monthlyExpense = data.transactions
      .filter(t => t.date.startsWith(currentMonth) && t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    if (monthlyIncome > 0) {
      const savingRate = (monthlyIncome - monthlyExpense) / monthlyIncome;
      if (savingRate > 0.5) score += 200; // +200 se economizar mais de 50%
      else if (savingRate > 0.2) score += 100; // +100 se economizar mais de 20%
      if (savingRate < 0) score -= 100; // -100 se gastar mais do que ganha
    }

    // Bonificar metas concluídas (+40 pontos cada)
    const goalsDone = data.goals.filter(g => g.currentAmount >= g.targetAmount).length;
    score += goalsDone * 40;

    // Limitar score entre 0 e 1000
    return Math.max(0, Math.min(1000, score));
  }

  // Obter ou criar score do usuário
  static async getOrCreateUserScore(userId: string) {
    let userScore = await prisma.userScore.findUnique({
      where: { userId },
    });

    if (!userScore) {
      userScore = await prisma.userScore.create({
        data: {
          userId,
          score: 500, // Score inicial
        },
      });
    }

    return userScore;
  }

  // Atualizar score do usuário
  static async updateUserScore(userId: string, score: number) {
    return await prisma.userScore.upsert({
      where: { userId },
      update: {
        score,
        lastCalculatedAt: new Date(),
      },
      create: {
        userId,
        score,
        lastCalculatedAt: new Date(),
      },
    });
  }

  // Obter score do usuário
  static async getUserScore(userId: string) {
    return await this.getOrCreateUserScore(userId);
  }

  // Verificar e desbloquear conquistas
  static async checkAndUnlockAchievements(
    userId: string,
    data: {
      transactionsCount: number;
      assetHoldingsCount: number;
      currentScore: number;
    }
  ) {
    const unlockedAchievements: string[] = [];

    // Conquista 1: Primeiro Passo (1 transação)
    if (data.transactionsCount >= 1) {
      await this.unlockAchievement(userId, {
        achievementId: 'ach-1',
        name: 'Primeiro Passo',
        description: 'Realizou seu primeiro lançamento.',
        icon: '🌱',
      });
      unlockedAchievements.push('ach-1');
    }

    // Conquista 2: Mestre do Orçamento (Score > 800 e mais de 20 transações)
    if (data.currentScore > 800 && data.transactionsCount > 20) {
      await this.unlockAchievement(userId, {
        achievementId: 'ach-2',
        name: 'Mestre do Orçamento',
        description: 'Manteve orçamentos no azul por 3 meses.',
        icon: '🛡️',
      });
      unlockedAchievements.push('ach-2');
    }

    // Conquista 3: Investidor Verde (5+ ativos)
    if (data.assetHoldingsCount >= 5) {
      await this.unlockAchievement(userId, {
        achievementId: 'ach-3',
        name: 'Investidor Verde',
        description: 'Possui mais de 5 ativos cadastrados.',
        icon: '💎',
      });
      unlockedAchievements.push('ach-3');
    }

    return unlockedAchievements;
  }

  // Desbloquear uma conquista específica
  static async unlockAchievement(
    userId: string,
    achievement: {
      achievementId: string;
      name: string;
      description: string;
      icon: string;
    }
  ) {
    // Verificar se já existe
    const existing = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.achievementId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Criar nova conquista
    return await prisma.userAchievement.create({
      data: {
        userId,
        achievementId: achievement.achievementId,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
      },
    });
  }

  // Obter todas as conquistas do usuário
  static async getUserAchievements(userId: string) {
    return await prisma.userAchievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  // Recalcular e atualizar score do usuário
  static async recalculateUserScore(
    userId: string,
    data: ScoreCalculationData
  ) {
    const newScore = this.calculateGreenScore(data);
    await this.updateUserScore(userId, newScore);

    // Verificar conquistas
    const transactionsCount = data.transactions.length;
    const assetHoldingsCount = data.assetHoldings.length;
    
    await this.checkAndUnlockAchievements(userId, {
      transactionsCount,
      assetHoldingsCount,
      currentScore: newScore,
    });

    return {
      score: newScore,
      achievements: await this.getUserAchievements(userId),
    };
  }
}
