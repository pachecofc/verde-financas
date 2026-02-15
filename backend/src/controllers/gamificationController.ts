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
  // Inclui todos os usuários não deletados; quem não tem registro em user_scores usa score 500.
  static async getRanking(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;

      const users = await prisma.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          hideFromRanking: true,
          userScore: { select: { score: true } },
        },
      });

      const DEFAULT_SCORE = 500;
      const withScore = users.map((u) => ({
        userId: u.id,
        name: u.name,
        hideFromRanking: u.hideFromRanking,
        score: u.userScore?.score ?? DEFAULT_SCORE,
      }));
      withScore.sort((a, b) => b.score - a.score);

      const currentIndex = withScore.findIndex((r) => r.userId === userId);
      const currentUserRank = currentIndex >= 0 ? currentIndex + 1 : null;
      const currentRow = withScore[currentIndex];
      const currentUserScore = currentRow?.score ?? DEFAULT_SCORE;
      const currentUserName =
        !currentRow || currentRow.hideFromRanking
          ? 'Usuário'
          : (decrypt(userId, currentRow.name) || currentRow.name || 'Usuário');

      const top10 = withScore.slice(0, 10).map((row, index) => {
        const rank = index + 1;
        const name = row.hideFromRanking
          ? 'Usuário'
          : (decrypt(row.userId, row.name) || row.name);
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
