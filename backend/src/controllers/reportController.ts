import { Response } from 'express';
import { ReportService } from '../services/reportService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class ReportController {
  /**
   * GET /api/reports/expenses-by-category
   * Gera relatório de despesas por categoria
   * Query params: startDate, endDate, includeComparison (opcional, default: true)
   */
  static async getExpensesByCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { startDate, endDate, includeComparison } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'startDate and endDate are required (format: YYYY-MM-DD)',
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Validar datas
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          error: 'Invalid date format. Use YYYY-MM-DD',
        });
      }

      if (start > end) {
        return res.status(400).json({
          error: 'startDate must be before or equal to endDate',
        });
      }

      // Incluir comparação por padrão, a menos que seja explicitamente false
      const shouldIncludeComparison = includeComparison !== 'false';

      const report = await ReportService.getExpensesByCategoryReport(
        userId,
        start,
        end,
        shouldIncludeComparison
      );

      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate report',
      });
    }
  }

  /**
   * GET /api/reports/income-by-category
   * Gera relatório de receitas por categoria com evolução mês a mês
   * Query params: startDate, endDate
   */
  static async getIncomeByCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'startDate and endDate are required (format: YYYY-MM-DD)',
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Validar datas
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          error: 'Invalid date format. Use YYYY-MM-DD',
        });
      }

      if (start > end) {
        return res.status(400).json({
          error: 'startDate must be before or equal to endDate',
        });
      }

      const report = await ReportService.getIncomeByCategoryReport(
        userId,
        start,
        end
      );

      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate report',
      });
    }
  }

  /**
   * GET /api/reports/cash-flow
   * Gera relatório de Fluxo de Caixa
   * Query params: startDate, endDate, granularity (daily|weekly|monthly, default: monthly)
   */
  static async getCashFlow(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { startDate, endDate, granularity } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'startDate and endDate are required (format: YYYY-MM-DD)',
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Validar datas
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          error: 'Invalid date format. Use YYYY-MM-DD',
        });
      }

      if (start > end) {
        return res.status(400).json({
          error: 'startDate must be before or equal to endDate',
        });
      }

      // Validar granularidade
      const validGranularity = ['daily', 'weekly', 'monthly'].includes(granularity as string)
        ? (granularity as 'daily' | 'weekly' | 'monthly')
        : 'monthly';

      const report = await ReportService.getCashFlowReport(
        userId,
        start,
        end,
        validGranularity
      );

      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate report',
      });
    }
  }

  /**
   * GET /api/reports/balance-evolution
   * Gera relatório de Evolução do Saldo / Patrimônio
   * Query params: startDate, endDate
   */
  static async getBalanceEvolution(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'startDate and endDate are required (format: YYYY-MM-DD)',
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Validar datas
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          error: 'Invalid date format. Use YYYY-MM-DD',
        });
      }

      if (start > end) {
        return res.status(400).json({
          error: 'startDate must be before or equal to endDate',
        });
      }

      const report = await ReportService.getBalanceEvolutionReport(
        userId,
        start,
        end
      );

      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate report',
      });
    }
  }

  /**
   * GET /api/reports/goals
   * Gera relatório de Metas Financeiras
   */
  static async getGoals(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;

      const report = await ReportService.getGoalsReport(userId);

      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate report',
      });
    }
  }

  /**
   * GET /api/reports/debts
   * Gera relatório de Dívidas e Obrigações
   */
  static async getDebts(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;

      const report = await ReportService.getDebtsReport(userId);

      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate report',
      });
    }
  }

  /**
   * GET /api/reports/investments
   * Gera relatório de Investimentos
   * Query params: startDate, endDate, assetId (opcional - para filtrar por ativo específico)
   */
  static async getInvestments(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { startDate, endDate, assetId } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'startDate and endDate are required (format: YYYY-MM-DD)',
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Validar datas
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          error: 'Invalid date format. Use YYYY-MM-DD',
        });
      }

      if (start > end) {
        return res.status(400).json({
          error: 'startDate must be before or equal to endDate',
        });
      }

      const report = await ReportService.getInvestmentsReport(
        userId,
        start,
        end,
        assetId as string | undefined
      );

      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate report',
      });
    }
  }
}
