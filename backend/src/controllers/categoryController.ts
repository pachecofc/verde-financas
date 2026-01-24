// backend/src/controllers/categoryController.ts
import { Response } from 'express';
import { CategoryService } from '../services/categoryService';
import { AuthenticatedRequest } from '../middleware/authMiddleware'; // Importar AuthenticatedRequest

export class CategoryController {
  // GET /api/categories
  static async getAllCategories(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId; // Obtém o userId do token de autenticação
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }
      const categories = await CategoryService.getCategories(userId);
      res.status(200).json(categories);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      res.status(500).json({ error: 'Falha ao buscar categorias.' });
    }
  }

  // POST /api/categories
  static async createCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }
      const { name, type, icon, color, parentId, isDefault } = req.body;

      // Validação básica
      if (!name || !type) {
        return res.status(400).json({ error: 'Nome e tipo da categoria são obrigatórios.' });
      }

      const newCategory = await CategoryService.createCategory(userId, {
        name,
        type,
        icon,
        color,
        parentId,
        isDefault,
      });
      res.status(201).json(newCategory);
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      // Retorna 400 se for um erro de validação (ex: categoria pai não encontrada)
      if (error instanceof Error && error.message.includes('não encontrada')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Falha ao criar categoria.' });
    }
  }

  // PUT /api/categories/:id
  static async updateCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }
      const { name, type, icon, color, parentId, isDefault } = req.body;

      const updatedCategory = await CategoryService.updateCategory(userId, id, {
        name,
        type,
        icon,
        color,
        parentId,
      });
      res.status(200).json(updatedCategory);
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      if (error instanceof Error && error.message.includes('não encontrada')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Falha ao atualizar categoria.' });
    }
  }

  // DELETE /api/categories/:id
  static async deleteCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      await CategoryService.deleteCategory(userId, id);
      res.status(204).send(); // 204 No Content para deleção bem-sucedida
    } catch (error) {
      console.error('Erro ao deletar categoria:', error);
      if (error instanceof Error && error.message.includes('não encontrada')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Falha ao deletar categoria.' });
    }
  }

  // NOVO: POST /api/categories/batch
  static async createMultipleCategories(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }
      const categoriesData = req.body; // Espera um array de objetos de categoria

      if (!Array.isArray(categoriesData) || categoriesData.length === 0) {
        return res.status(400).json({ error: 'Array de categorias inválido ou vazio.' });
      }

      const newCategories = await CategoryService.createMultipleCategories(userId, categoriesData);
      res.status(201).json(newCategories);
    } catch (error) {
      console.error('Erro ao criar múltiplas categorias:', error);
      if (error instanceof Error && error.message.includes('Parent category')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Falha ao criar múltiplas categorias.' });
    }
  }
}
