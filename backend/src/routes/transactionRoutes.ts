import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { TransactionController } from '../controllers/transactionController';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// Rotas para operações CRUD de transações
router.get('/', TransactionController.getTransactions);
router.get('/summary/all', TransactionController.getSummary);
router.get('/external-ids', TransactionController.getExternalIds);
router.get('/:id', TransactionController.getTransactionById);
router.post('/', TransactionController.createTransaction);
router.put('/:id', TransactionController.updateTransaction);
router.delete('/:id', TransactionController.deleteTransaction);

export default router;
