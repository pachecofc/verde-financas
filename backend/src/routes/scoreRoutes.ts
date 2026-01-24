import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { ScoreController } from '../controllers/scoreController';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// Rotas para operações de score
router.get('/', ScoreController.getUserScore);
router.post('/recalculate', ScoreController.recalculateScore);

export default router;
