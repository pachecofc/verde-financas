import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { BudgetService } from '../services/budgetService';

export class BudgetController {
  // Obter todas os orçamentos do usuário
  static async getBudgets(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const budgets = await BudgetService.getBudgetsByUserId(userId);
      
      // Calcular o valor gasto (spent) para cada orçamento
      const budgetsWithSpent = await Promise.all(
        budgets.map(async (budget) => {
          const spent = await BudgetService.calculateSpent(userId, budget.categoryId);
          return {
            ...budget,
            limit: Number(budget.limit),
            spent,
          };
        })
      );

      res.status(200).json(budgetsWithSpent);
    } catch (error) {
      console.error('Erro ao obter orçamentos:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Falha ao obter orçamentos.',
      });
    }
  }

  // Obter um orçamento específico por ID
  static async getBudgetById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const budget = await BudgetService.getBudgetById(userId, id);
      const spent = await BudgetService.calculateSpent(userId, budget.categoryId);

      res.status(200).json({
        ...budget,
        limit: Number(budget.limit),
        spent,
      });
    } catch (error) {
      console.error('Erro ao obter orçamento por ID:', error);
      res.status(404).json({
        error: error instanceof Error ? error.message : 'Orçamento não encontrado.',
      });
    }
  }

  // Criar novo orçamento
  static async createBudget(req: AuthenticatedRequest, res: Response) {
    try {
      const { categoryId, limit } = req.body;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      if (!categoryId || limit === undefined) {
        return res.status(400).json({ error: 'categoryId e limit são obrigatórios.' });
      }

      const newBudget = await BudgetService.createBudget(userId, {
        categoryId,
        limit: parseFloat(limit),
      });

      const spent = await BudgetService.calculateSpent(userId, newBudget.categoryId);

      res.status(201).json({
        ...newBudget,
        limit: Number(newBudget.limit),
        spent,
      });
    } catch (error) {
      console.error('Erro ao criar orçamento:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Falha ao criar orçamento.',
      });
    }
  }

  // Atualizar orçamento existente
  static async updateBudget(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { categoryId, limit } = req.body;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const updatedBudget = await BudgetService.updateBudget(userId, id, {
        categoryId,
        limit: limit !== undefined ? parseFloat(limit) : undefined,
      });

      const finalCategoryId = updatedBudget.categoryId;
      const spent = await BudgetService.calculateSpent(userId, finalCategoryId);

      res.status(200).json({
        ...updatedBudget,
        limit: Number(updatedBudget.limit),
        spent,
      });
    } catch (error) {
      console.error('Erro ao atualizar orçamento:', error);
      if (error instanceof Error && error.message.includes('não encontrado')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Falha ao atualizar orçamento.',
      });
    }
  }

  // Deletar orçamento
  static async deleteBudget(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const result = await BudgetService.deleteBudget(userId, id);
      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      if (error instanceof Error && error.message.includes('não encontrado')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Falha ao excluir orçamento.',
      });
    }
  }
}
