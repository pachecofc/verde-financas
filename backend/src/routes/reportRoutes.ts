import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { ReportController } from '../controllers/reportController';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de relatórios
router.get('/expenses-by-category', ReportController.getExpensesByCategory);
router.get('/income-by-category', ReportController.getIncomeByCategory);
router.get('/cash-flow', ReportController.getCashFlow);
router.get('/balance-evolution', ReportController.getBalanceEvolution);
router.get('/goals', ReportController.getGoals);
router.get('/debts', ReportController.getDebts);
router.get('/investments', ReportController.getInvestments);

export default router;
