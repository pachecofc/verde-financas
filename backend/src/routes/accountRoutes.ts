import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { AccountController } from '../controllers/accountController';

const router = Router();

// Todas as rotas de contas serão protegidas pelo authMiddleware
router.use(authMiddleware);

// GET /api/accounts - Obter todas as contas do usuário
router.get('/', AccountController.getAccounts);

// GET /api/accounts/:id - Obter uma única conta por ID
router.get('/:id', AccountController.getAccountById);

// POST /api/accounts - Criar uma nova conta
router.post('/', AccountController.createAccount);

// PUT /api/accounts/:id - Atualizar uma conta existente
router.put('/:id', AccountController.updateAccount);

// DELETE /api/accounts/:id - Deletar uma conta
router.delete('/:id', AccountController.deleteAccount);

export default router;
