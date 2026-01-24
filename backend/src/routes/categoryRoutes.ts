// backend/src/routes/categoryRoutes.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { CategoryController } from '../controllers/categoryController';

const router = Router();

// Todas as rotas de categorias serão protegidas pelo authMiddleware
router.use(authMiddleware);

// Rotas para operações CRUD de categorias
router.get('/', CategoryController.getAllCategories);
router.post('/', CategoryController.createCategory);
router.put('/:id', CategoryController.updateCategory);
router.delete('/:id', CategoryController.deleteCategory);

// Rota para criar múltiplas categorias em lote
router.post('/batch', CategoryController.createMultipleCategories);

export default router;
