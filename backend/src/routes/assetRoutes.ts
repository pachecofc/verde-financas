import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { AssetController } from '../controllers/assetController';

const router = Router();

// Todas as rotas de ativos serão protegidas pelo authMiddleware
router.use(authMiddleware);

// GET /api/assets - Obter todos os ativos do usuário
router.get('/', AssetController.getAssets);

// GET /api/assets/:id - Obter um ativo específico por ID
router.get('/:id', AssetController.getAssetById);

// POST /api/assets - Criar um novo ativo
router.post('/', AssetController.createAsset);

// PUT /api/assets/:id - Atualizar um ativo existente
router.put('/:id', AssetController.updateAsset);

// DELETE /api/assets/:id - Deletar um ativo
router.delete('/:id', AssetController.deleteAsset);

export default router;
