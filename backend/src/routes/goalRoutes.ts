import { Router } from 'express';
import { GoalController } from '../controllers/goalController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// GET /api/goals - Listar todas as metas do usuário
router.get('/', GoalController.getGoals);

// GET /api/goals/:id - Obter uma meta específica
router.get('/:id', GoalController.getGoalById);

// POST /api/goals - Criar nova meta
router.post('/', GoalController.createGoal);

// PUT /api/goals/:id - Atualizar meta
router.put('/:id', GoalController.updateGoal);

// DELETE /api/goals/:id - Deletar meta
router.delete('/:id', GoalController.deleteGoal);

export default router;
