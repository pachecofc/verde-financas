import { Router } from 'express';
import { FaqController } from '../controllers/faqController';

const router = Router();

// Rota pública - FAQ não requer autenticação
router.get('/', FaqController.getAll);

export default router;
