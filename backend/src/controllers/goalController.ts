import { Response } from 'express';
import { GoalService } from '../services/goalService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class GoalController {
  // GET /api/goals - Listar todas as metas do usuário
  static async getGoals(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const goals = await GoalService.getGoalsByUserId(userId);
      res.json(goals);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch goals',
      });
    }
  }

  // GET /api/goals/:id - Obter uma meta específica
  static async getGoalById(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const goalId = req.params.id;
      const goal = await GoalService.getGoalById(userId, goalId);
      res.json(goal);
    } catch (error) {
      res.status(404).json({
        error: error instanceof Error ? error.message : 'Goal not found',
      });
    }
  }

  // POST /api/goals - Criar nova meta
  static async createGoal(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { name, targetAmount, currentAmount, deadline, icon, color } = req.body;

      if (!name || !targetAmount) {
        return res.status(400).json({
          error: 'name and targetAmount are required',
        });
      }

      const goal = await GoalService.createGoal(userId, {
        name,
        targetAmount: parseFloat(targetAmount),
        currentAmount: currentAmount ? parseFloat(currentAmount) : undefined,
        deadline: deadline ? new Date(deadline) : null,
        icon: icon || null,
        color: color || null,
      });

      res.status(201).json(goal);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create goal',
      });
    }
  }

  // PUT /api/goals/:id - Atualizar meta
  static async updateGoal(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const goalId = req.params.id;
      const { name, targetAmount, currentAmount, deadline, icon, color } = req.body;

      const goal = await GoalService.updateGoal(userId, goalId, {
        name,
        targetAmount: targetAmount ? parseFloat(targetAmount) : undefined,
        currentAmount: currentAmount !== undefined ? parseFloat(currentAmount) : undefined,
        deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : undefined,
        icon: icon !== undefined ? (icon || null) : undefined,
        color: color !== undefined ? (color || null) : undefined,
      });

      res.json(goal);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to update goal',
      });
    }
  }

  // DELETE /api/goals/:id - Deletar meta
  static async deleteGoal(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const goalId = req.params.id;
      await GoalService.deleteGoal(userId, goalId);
      res.json({ message: 'Goal deleted successfully' });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to delete goal',
      });
    }
  }
}
