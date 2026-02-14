import { Response } from 'express';
import { SupportService } from '../services/supportService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class SupportController {
  static async submit(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const email = req.email!;
      const type = (req.body?.type || '').trim();
      const description = (req.body?.description || '').trim();
      const file = req.file;

      let attachment: { filename: string; buffer: Buffer } | undefined;
      if (file && file.buffer) {
        attachment = { filename: file.originalname || 'anexo', buffer: file.buffer };
      }

      await SupportService.sendSupportRequest(userId, email, type, description, attachment);

      res.json({ message: 'Pedido enviado com sucesso' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao enviar pedido';
      res.status(400).json({ error: message });
    }
  }
}
