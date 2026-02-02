import { prisma } from '../prisma';

export type AuditActorType = 'user' | 'system' | 'cron';

export interface AuditLogParams {
  actorType: AuditActorType;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export class AuditService {
  /**
   * Registra um evento de auditoria.
   * Não armazena valores sensíveis (senhas, tokens, PII) em metadata.
   */
  static async log(params: AuditLogParams): Promise<void> {
    const { actorType, actorId, action, resourceType, resourceId, metadata } = params;
    try {
      await prisma.auditLog.create({
        data: {
          actorType,
          actorId: actorId ?? undefined,
          action,
          resourceType,
          resourceId: resourceId ?? undefined,
          metadata: (metadata ?? undefined) as object | undefined,
        },
      });
    } catch (error) {
      console.error('[AuditService] Falha ao registrar auditoria:', error);
      // Não propaga o erro para não quebrar o fluxo principal
    }
  }
}
