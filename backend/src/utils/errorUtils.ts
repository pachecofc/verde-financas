/**
 * Detecta erros de conexão com o banco ou indisponibilidade do serviço.
 * Usado para retornar mensagem amigável ao usuário em login/signup.
 */
const PRISMA_CONNECTION_CODES = new Set([
  'P1001', // Can't reach database server
  'P1002', // Connection timed out
  'P1017', // Server has closed the connection
  'P2024', // Timed out fetching a new connection from the connection pool
]);

const CONNECTION_KEYWORDS = [
  'econnrefused',
  'etimedout',
  'enotfound',
  'connection refused',
  "can't reach",
  "can't reach database",
  'reach database server',
  'database server',
  'connect econnrefused',
  'connection timed out',
  'connection pool',
  'network',
  'socket hang up',
  'getaddrinfo',
];

function getErrorText(error: unknown): string {
  if (!error) return '';
  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.message);
    const errWithCause = error as Error & { cause?: unknown };
    if (errWithCause.cause instanceof Error) parts.push(errWithCause.cause.message);
    const errWithMeta = error as unknown as { meta?: unknown };
    if (errWithMeta.meta != null) parts.push(JSON.stringify(errWithMeta.meta));
  }
  parts.push(String(error));
  return parts.join(' ').toLowerCase();
}

export function isConnectionOrDatabaseError(error: unknown): boolean {
  if (!error) return false;
  const msg = getErrorText(error);
  if (CONNECTION_KEYWORDS.some((k) => msg.includes(k))) return true;
  const code = (error as { code?: string }).code;
  if (code && PRISMA_CONNECTION_CODES.has(code)) return true;
  return false;
}

/** Mensagem amigável para falha de conexão em telas de login/signup */
export const AUTH_CONNECTION_ERROR_MESSAGE =
  'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente em alguns instantes.';
