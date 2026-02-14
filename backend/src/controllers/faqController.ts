import { Request, Response } from 'express';
import { FaqService } from '../services/faqService';

export class FaqController {
  static async getAll(req: Request, res: Response) {
    try {
      const categories = await FaqService.getAll();
      res.json({ categories });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Erro ao buscar FAQ',
      });
    }
  }
}
