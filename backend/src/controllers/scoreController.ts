import { Response } from 'express';
import { ScoreService } from '../services/scoreService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { prisma } from '../prisma';

export class ScoreController {
  // GET /api/scores - Obter score e conquistas do usuário
  static async getUserScore(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      
      const userScore = await ScoreService.getUserScore(userId);
      const achievements = await ScoreService.getUserAchievements(userId);

      res.json({
        score: userScore.score,
        achievements: achievements.map(a => ({
          id: a.achievementId,
          name: a.name,
          description: a.description,
          icon: a.icon,
          unlockedAt: a.unlockedAt,
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch user score',
      });
    }
  }

  // POST /api/scores/recalculate - Recalcular score do usuário
  static async recalculateScore(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;

      // Buscar dados necessários para calcular o score
      const [budgets, transactions, goals, assetHoldings] = await Promise.all([
        prisma.budget.findMany({
          where: { userId },
          include: {
            category: true,
          },
        }),
        prisma.transaction.findMany({
          where: { userId },
          select: {
            date: true,
            type: true,
            amount: true,
          },
        }),
        prisma.goal.findMany({
          where: { userId },
          select: {
            currentAmount: true,
            targetAmount: true,
          },
        }),
        prisma.assetHolding.findMany({
          where: { userId },
          select: {
            id: true,
          },
        }),
      ]);

      // Calcular spent para cada budget
      const budgetsWithSpent = await Promise.all(
        budgets.map(async (budget) => {
          const spent = await prisma.transaction.aggregate({
            where: {
              userId,
              categoryId: budget.categoryId,
              type: 'expense',
            },
            _sum: {
              amount: true,
            },
          });

          return {
            spent: Number(spent._sum.amount || 0),
            limit: Number(budget.limit),
          };
        })
      );

      // Preparar dados para cálculo
      const calculationData = {
        budgets: budgetsWithSpent,
        transactions: transactions.map(t => ({
          date: t.date.toISOString().split('T')[0],
          type: t.type,
          amount: Number(t.amount),
        })),
        goals: goals.map(g => ({
          currentAmount: Number(g.currentAmount),
          targetAmount: Number(g.targetAmount),
        })),
        assetHoldings: assetHoldings,
      };

      // Recalcular score
      const result = await ScoreService.recalculateUserScore(userId, calculationData);

      res.json({
        score: result.score,
        achievements: result.achievements.map(a => ({
          id: a.achievementId,
          name: a.name,
          description: a.description,
          icon: a.icon,
          unlockedAt: a.unlockedAt,
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to recalculate score',
      });
    }
  }
}
