import { Response } from 'express';
import { TransactionService } from '../services/transactionService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class TransactionController {
  // GET /api/transactions - Listar transações com filtros opcionais
  static async getTransactions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { categoryId, type, startDate, endDate, accountId } = req.query;

      const filters: any = {};

      if (categoryId) {
        filters.categoryId = categoryId as string;
      }

      if (type) {
        filters.type = type as string;
      }

      if (accountId) {
        filters.accountId = accountId as string;
      }

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }

      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      const transactions = await TransactionService.getTransactions(
        userId,
        filters
      );

      res.json(transactions);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch transactions',
      });
    }
  }

  // GET /api/transactions/external-ids - Listar externalIds do usuário (para dedup em importação)
  static async getExternalIds(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const externalIds = await TransactionService.getExternalIds(userId);
      res.json({ externalIds });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch external IDs',
      });
    }
  }

  // GET /api/transactions/:id - Obter transação específica
  static async getTransactionById(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const transactionId = req.params.id;

      const transaction = await TransactionService.getTransactionById(
        userId,
        transactionId
      );

      res.json(transaction);
    } catch (error) {
      res.status(404).json({
        error: error instanceof Error ? error.message : 'Transaction not found',
      });
    }
  }

  // GET /api/transactions/summary/all - Obter resumo de transações
  static async getSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { startDate, endDate } = req.query;

      const filters: any = {};

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }

      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      const summary = await TransactionService.getSummary(userId, filters);

      res.json(summary);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch summary',
      });
    }
  }

  // POST /api/transactions - Criar nova transação
  static async createTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { categoryId, description, amount, type, date, accountId, toAccountId, assetId, externalId } = req.body;

      if (!description || !amount || !type || !date || !accountId) {
        return res.status(400).json({
          error: 'description, amount, type, date, and accountId are required',
        });
      }

      // categoryId é obrigatório apenas para income e expense
      if ((type === 'income' || type === 'expense') && !categoryId) {
        return res.status(400).json({
          error: 'categoryId is required for income and expense transactions',
        });
      }

      // toAccountId é obrigatório para transferências
      if (type === 'transfer' && !toAccountId) {
        return res.status(400).json({
          error: 'toAccountId is required for transfer transactions',
        });
      }

      const transaction = await TransactionService.createTransaction(userId, {
        categoryId,
        description,
        amount: parseFloat(amount),
        type,
        date: new Date(date),
        accountId,
        toAccountId,
        assetId: assetId || null,
        externalId: externalId || null,
      });

      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create transaction',
      });
    }
  }

  // PUT /api/transactions/:id - Atualizar transação
  static async updateTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const transactionId = req.params.id;
      const { categoryId, description, amount, type, date, accountId, toAccountId, assetId } = req.body;

      const transaction = await TransactionService.updateTransaction(
        userId,
        transactionId,
        {
          categoryId,
          description,
          amount: amount ? parseFloat(amount) : undefined,
          type,
          date: date ? new Date(date) : undefined,
          accountId,
          toAccountId,
          assetId: assetId !== undefined ? (assetId || null) : undefined,
        }
      );

      res.json(transaction);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to update transaction',
      });
    }
  }

  // DELETE /api/transactions/:id - Deletar transação
  static async deleteTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const transactionId = req.params.id;

      await TransactionService.deleteTransaction(userId, transactionId);

      res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to delete transaction',
      });
    }
  }
}
