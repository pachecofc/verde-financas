import { Router } from 'express';
import { AssetHoldingController } from '../controllers/assetHoldingController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// GET /api/asset-holdings - Listar todos os holdings do usuário
router.get('/', AssetHoldingController.getHoldings);

// GET /api/asset-holdings/:id - Obter um holding específico
router.get('/:id', AssetHoldingController.getHoldingById);

// PUT /api/asset-holdings/:id/value - Atualizar o valor atual de um holding
router.put('/:id/value', AssetHoldingController.updateHoldingValue);

// DELETE /api/asset-holdings/:id - Deletar um holding
router.delete('/:id', AssetHoldingController.deleteHolding);

export default router;
