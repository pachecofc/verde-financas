import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from '../services/authService';
import { AuthenticatedRequest, authMiddleware } from '../middleware/authMiddleware';
import { RefreshTokenService } from '../services/refreshTokenService';
import { REFRESH_TOKEN_EXPIRATION_DAYS } from '../config/jwt';
import { requireTwoFactor } from '../middleware/twoFactorMiddleware';

const router = Router();

const REFRESH_COOKIE_NAME = 'refresh_token';

function getRefreshCookieOptions() {
  const maxAge = REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict' as const,
    path: '/api/auth',
    maxAge,
  };
}

// Limite estrito para rotas sensíveis de autenticação
const authSensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo de 5 tentativas por IP nesse período
  message: {
    error: 'Muitas tentativas. Tente novamente em alguns minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/signup
router.post('/signup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await AuthService.signup({ email, password, name });

    // Criar refresh token e enviar em cookie HttpOnly
    const refreshToken = await RefreshTokenService.createRefreshToken(result.user.id);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Signup failed',
    });
  }
});

// POST /api/auth/login
router.post('/login', authSensitiveLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await AuthService.login({ email, password });

    // Se 2FA for necessário, retornar sem token e sem refresh token
    if (result.requiresTwoFactor) {
      return res.status(200).json({
        requiresTwoFactor: true,
        user: result.user,
      });
    }

    // Criar refresh token e enviar em cookie HttpOnly
    const refreshToken = await RefreshTokenService.createRefreshToken(result.user.id);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Login failed',
    });
  }
});

// POST /api/auth/login/verify-2fa - Verificar código 2FA após login
router.post('/login/verify-2fa', authSensitiveLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, twoFactorCode } = req.body;

    if (!userId || !twoFactorCode) {
      return res.status(400).json({ error: 'User ID and 2FA code are required' });
    }

    const result = await AuthService.verifyLoginTwoFactor(userId, twoFactorCode);

    // Criar refresh token e enviar em cookie HttpOnly
    const refreshToken = await RefreshTokenService.createRefreshToken(result.user.id);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({
      error: error instanceof Error ? error.message : '2FA verification failed',
    });
  }
});

// POST /api/auth/forgot-password - Solicitar redefinição de senha
router.post('/forgot-password', authSensitiveLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Chama o serviço, mas não espera o retorno para evitar vazamento de informação
    await AuthService.requestPasswordReset(email);

    // Sempre retorna sucesso para o frontend, mesmo se o e-mail não existir
    res.status(200).json({ message: 'Se um usuário com este e-mail for encontrado, um link de redefinição de senha será enviado.' });
  } catch (error) {
    console.error('Error in forgot-password route:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to request password reset',
    });
  }
});

// POST /api/auth/reset-password - Redefinir senha
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    await AuthService.resetPassword(token, newPassword);

    res.status(200).json({ message: 'Sua senha foi redefinida com sucesso.' });
  } catch (error) {
    console.error('Error in reset-password route:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to reset password',
    });
  }
});

// PUT /api/auth/change-password - Alterar senha do usuário logado (requer 2FA se habilitado)
router.put('/change-password', authMiddleware, requireTwoFactor, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.userId; // Obtido do authMiddleware

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Todos os campos de senha são obrigatórios.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'A nova senha e a confirmação não coincidem.' });
    }

    if (newPassword.length < 6) { // Exemplo de validação de senha
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
    }

    await AuthService.changePassword(userId, currentPassword, newPassword);

    res.status(200).json({ message: 'Senha alterada com sucesso!' });
  } catch (error) {
    console.error('Erro na rota /change-password:', error);
    res.status(400).json({ // 400 Bad Request para erros de senha incorreta ou validação
      error: error instanceof Error ? error.message : 'Falha ao alterar senha.',
    });
  }
});

// POST /api/auth/refresh - Renovar access token usando refresh token rotativo
router.post('/refresh', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token não encontrado' });
    }

    const { newToken, user } = await RefreshTokenService.rotateRefreshToken(refreshToken);

    // Atualiza cookie com novo refresh token
    res.cookie(REFRESH_COOKIE_NAME, newToken, getRefreshCookieOptions());

    // Gera novo access token curto para o usuário
    const accessToken = AuthService['generateAccessToken']({ id: user.id, email: user.email });

    return res.status(200).json({
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl || undefined,
        plan: user.plan || undefined,
      },
    });
  } catch (error) {
    console.error('Erro na rota /refresh:', error);
    // Em caso de erro, limpar cookie para evitar loops
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    return res.status(401).json({
      error: error instanceof Error ? error.message : 'Falha ao renovar sessão',
    });
  }
});

// POST /api/auth/logout - Revogar refresh token e limpar cookie
router.post('/logout', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (refreshToken) {
      await RefreshTokenService.revokeToken(refreshToken);
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    }
    return res.status(200).json({ message: 'Logout realizado com sucesso.' });
  } catch (error) {
    console.error('Erro na rota /logout:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao realizar logout',
    });
  }
});

export default router;
