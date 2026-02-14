import { prisma } from '../prisma';
import { sendEmailWithAttachment } from '../config/mailer';
import { decrypt } from './encryptionService';

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL;

const TYPE_LABELS: Record<string, string> = {
  help: 'Pedido de ajuda',
  suggestion: 'Sugestão',
  bug: 'Reportar bug',
};

export class SupportService {
  static async sendSupportRequest(
    userId: string,
    userEmail: string,
    type: string,
    description: string,
    attachment?: { filename: string; buffer: Buffer }
  ): Promise<void> {
    if (!SUPPORT_EMAIL || SUPPORT_EMAIL.trim() === '') {
      throw new Error('SUPPORT_EMAIL não está configurado. Configure no .env para receber pedidos de ajuda.');
    }

    const validTypes = ['help', 'suggestion', 'bug'];
    if (!validTypes.includes(type)) {
      throw new Error('Tipo inválido. Use: help, suggestion ou bug.');
    }

    const trimmedDesc = description?.trim() || '';
    if (trimmedDesc.length < 10) {
      throw new Error('A descrição deve ter pelo menos 10 caracteres.');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    const userName = decrypt(userId, user.name) ?? user.name;
    const typeLabel = TYPE_LABELS[type] || type;

    const subject = `[Verde Finanças] ${typeLabel} - ${userName}`;
    const html = `
      <h2>Novo pedido da página de Ajuda</h2>
      <p><strong>Tipo:</strong> ${typeLabel}</p>
      <p><strong>Usuário:</strong> ${userName}</p>
      <p><strong>E-mail:</strong> ${userEmail}</p>
      <hr />
      <h3>Descrição</h3>
      <p style="white-space: pre-wrap;">${trimmedDesc.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    `;

    const attachments = attachment
      ? [{ filename: attachment.filename, content: attachment.buffer }]
      : [];

    await sendEmailWithAttachment(SUPPORT_EMAIL.trim(), subject, html, attachments);
  }
}
