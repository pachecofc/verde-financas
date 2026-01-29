import { Response } from 'express';
import { GamificationRulesService } from '../services/gamificationRulesService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { prisma } from '../prisma';

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
}
