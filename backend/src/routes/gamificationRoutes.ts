import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { GamificationController } from '../controllers/gamificationController';

const router = Router();

router.use(authMiddleware);

router.get('/rules', GamificationController.getRules);
router.get('/events', GamificationController.getEvents);
router.get('/ranking', GamificationController.getRanking);

export default router;
