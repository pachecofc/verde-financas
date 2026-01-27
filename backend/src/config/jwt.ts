// jwt.ts
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET não está definido.');
}
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRATION = '15m';

// Tempo de expiração do refresh token em dias
export const REFRESH_TOKEN_EXPIRATION_DAYS = 7;
