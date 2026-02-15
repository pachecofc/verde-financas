import { Response } from 'express';
import { GamificationRulesService } from '../services/gamificationRulesService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { prisma } from '../prisma';
import { decrypt } from '../services/encryptionService';

export class GamificationController {
  // GET /api/gamification/rules - Retorna achievementRules e scoreLevels
  static async getRules(req: AuthenticatedRequest, res: Response) {
    try {
      const achievementRules = GamificationRulesService.getAchievementRules();
      const scoreLevels = GamificationRulesService.getScoreLevels();
      res.json({ achievementRules, scoreLevels });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch gamification rules',
      });
    }
  }

  // GET /api/gamification/events - Histórico de eventos de score do usuário (paginado, agrupado por dia)
  static async getEvents(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
      const events = await prisma.userScoreEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const byDate: Record<string, { ruleCode: string; name: string; points: number; createdAt: Date }[]> = {};
      for (const e of events) {
        const dateKey = e.createdAt.toISOString().split('T')[0];
        if (!byDate[dateKey]) byDate[dateKey] = [];
        const rule = GamificationRulesService.getRuleByCode(e.ruleCode);
        byDate[dateKey].push({
          ruleCode: e.ruleCode,
          name: rule?.name ?? e.ruleCode,
          points: e.points,
          createdAt: e.createdAt,
        });
      }

      const result = Object.entries(byDate).map(([date, evs]) => ({
        date,
        events: evs,
        dayTotal: evs.reduce((s, x) => s + x.points, 0),
      }));

      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch score events',
      });
    }
  }

  // GET /api/gamification/ranking - Top 10 por score + posição do usuário logado
  static async getRanking(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;

      const allScores = await prisma.userScore.findMany({
        where: {
          user: {
            deletedAt: null,
          },
        },
        include: {
          user: {
            select: { id: true, name: true, hideFromRanking: true },
          },
        },
        orderBy: { score: 'desc' },
      });

      const currentUserScoreRow = allScores.find((r) => r.userId === userId);
      const currentUserRank = currentUserScoreRow
        ? allScores.findIndex((r) => r.userId === userId) + 1
        : null;
      const currentUserScore = currentUserScoreRow?.score ?? 0;
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, hideFromRanking: true },
      });
      const currentUserName =
        !currentUser || currentUser.hideFromRanking
          ? 'Usuário'
          : (decrypt(userId, currentUser.name) || currentUser.name || 'Usuário');

      const top10 = allScores.slice(0, 10).map((row, index) => {
        const rank = index + 1;
        const name =
          (row.user as { hideFromRanking?: boolean }).hideFromRanking
            ? 'Usuário'
            : (decrypt(row.userId, row.user.name) || row.user.name);
        return {
          rank,
          userId: row.userId,
          name,
          score: row.score,
        };
      });

      res.json({
        top10,
        currentUser: {
          rank: currentUserRank,
          score: currentUserScore,
          name: currentUserName,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch ranking',
      });
    }
  }
}
