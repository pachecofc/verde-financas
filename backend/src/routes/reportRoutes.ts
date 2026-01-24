import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { ReportController } from '../controllers/reportController';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de relatórios
router.get('/expenses-by-category', ReportController.getExpensesByCategory);
router.get('/income-by-category', ReportController.getIncomeByCategory);

export default router;
