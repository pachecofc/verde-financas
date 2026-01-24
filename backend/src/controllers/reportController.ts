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
}
