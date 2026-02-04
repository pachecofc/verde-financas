import { prisma } from '../prisma';

/**
 * Define app.current_user_id na sessão PostgreSQL para RLS (Row Level Security).
 * Deve ser chamado em toda requisição autenticada (authMiddleware) e também
 * em fluxos de auth que não passam pelo middleware (login, signup, etc.) antes
 * de operações que dependem de RLS (ex.: INSERT em audit_logs).
 * Com Session Pooler, a conexão pode ser reutilizada com o valor da requisição
 * anterior; definir o contexto garante que a política RLS veja o usuário correto.
 */
export async function setRlsUserContext(userId: string): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      "SELECT set_config('app.current_user_id', $1, false)",
      userId
    );
  } catch (error) {
    console.error('[rlsContext] Falha ao setar app.current_user_id:', error);
  }
}
