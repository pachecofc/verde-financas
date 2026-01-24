import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AssetService } from '../services/assetService';

export class AssetController {
  // Obter todos os ativos do usuário
  static async getAssets(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const assets = await AssetService.getAssetsByUserId(userId);
      
      // Formatar dados para o frontend
      const formattedAssets = assets.map(asset => ({
        id: asset.id,
        name: asset.name,
        incomeType: asset.incomeType,
        color: asset.color || null,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
      }));

      res.status(200).json(formattedAssets);
    } catch (error) {
      console.error('Erro ao obter ativos:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Falha ao obter ativos.',
      });
    }
  }

  // Obter um ativo específico por ID
  static async getAssetById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const asset = await AssetService.getAssetById(userId, id);

      res.status(200).json({
        id: asset.id,
        name: asset.name,
        incomeType: asset.incomeType,
        color: asset.color || null,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
      });
    } catch (error) {
      console.error('Erro ao obter ativo por ID:', error);
      res.status(404).json({
        error: error instanceof Error ? error.message : 'Ativo não encontrado.',
      });
    }
  }

  // Criar novo ativo
  static async createAsset(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, incomeType, color } = req.body;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      if (!name || !incomeType) {
        return res.status(400).json({ error: 'name e incomeType são obrigatórios.' });
      }

      const newAsset = await AssetService.createAsset(userId, {
        name,
        incomeType,
        color: color || null,
      });

      res.status(201).json({
        id: newAsset.id,
        name: newAsset.name,
        incomeType: newAsset.incomeType,
        color: newAsset.color || null,
        createdAt: newAsset.createdAt,
        updatedAt: newAsset.updatedAt,
      });
    } catch (error) {
      console.error('Erro ao criar ativo:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Falha ao criar ativo.',
      });
    }
  }

  // Atualizar ativo existente
  static async updateAsset(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, incomeType, color } = req.body;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (incomeType !== undefined) updateData.incomeType = incomeType;
      if (color !== undefined) updateData.color = color || null;

      const updatedAsset = await AssetService.updateAsset(userId, id, updateData);

      res.status(200).json({
        id: updatedAsset.id,
        name: updatedAsset.name,
        incomeType: updatedAsset.incomeType,
        color: updatedAsset.color || null,
        createdAt: updatedAsset.createdAt,
        updatedAt: updatedAsset.updatedAt,
      });
    } catch (error) {
      console.error('Erro ao atualizar ativo:', error);
      if (error instanceof Error && error.message.includes('não encontrado')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Falha ao atualizar ativo.',
      });
    }
  }

  // Deletar ativo
  static async deleteAsset(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const result = await AssetService.deleteAsset(userId, id);
      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao excluir ativo:', error);
      if (error instanceof Error && error.message.includes('não encontrado')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Falha ao excluir ativo.',
      });
    }
  }
}
