import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { BudgetController } from '../controllers/budgetController';

const router = Router();

// Todas as rotas de orçamentos serão protegidas pelo authMiddleware
router.use(authMiddleware);

// GET /api/budgets - Obter todos os orçamentos do usuário
router.get('/', BudgetController.getBudgets);

// GET /api/budgets/:id - Obter um orçamento específico por ID
router.get('/:id', BudgetController.getBudgetById);

// POST /api/budgets - Criar um novo orçamento
router.post('/', BudgetController.createBudget);

// PUT /api/budgets/:id - Atualizar um orçamento existente
router.put('/:id', BudgetController.updateBudget);

// DELETE /api/budgets/:id - Deletar um orçamento
router.delete('/:id', BudgetController.deleteBudget);

export default router;
