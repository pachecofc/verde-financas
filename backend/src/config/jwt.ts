// jwt.ts
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET não está definido.');
}
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRATION = '7d';
