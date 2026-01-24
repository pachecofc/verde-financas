import { Response } from 'express';
import { AssetHoldingService } from '../services/assetHoldingService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class AssetHoldingController {
  // GET /api/asset-holdings - Listar todos os holdings do usuário
  static async getHoldings(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const holdings = await AssetHoldingService.getHoldingsByUserId(userId);
      res.json(holdings);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch asset holdings',
      });
    }
  }

  // GET /api/asset-holdings/:id - Obter um holding específico
  static async getHoldingById(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const holdingId = req.params.id;
      const holding = await AssetHoldingService.getHoldingById(userId, holdingId);
      res.json(holding);
    } catch (error) {
      res.status(404).json({
        error: error instanceof Error ? error.message : 'Asset holding not found',
      });
    }
  }

  // PUT /api/asset-holdings/:id/value - Atualizar o valor atual de um holding
  static async updateHoldingValue(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const holdingId = req.params.id;
      const { currentValue } = req.body;

      if (!currentValue || typeof currentValue !== 'number' || currentValue < 0) {
        return res.status(400).json({
          error: 'currentValue is required and must be a positive number',
        });
      }

      const holding = await AssetHoldingService.updateHoldingValue(
        userId,
        holdingId,
        currentValue
      );

      res.json(holding);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to update asset holding',
      });
    }
  }

  // DELETE /api/asset-holdings/:id - Deletar um holding
  static async deleteHolding(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const holdingId = req.params.id;
      await AssetHoldingService.deleteHolding(userId, holdingId);
      res.json({ message: 'Asset holding deleted successfully' });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to delete asset holding',
      });
    }
  }
}
