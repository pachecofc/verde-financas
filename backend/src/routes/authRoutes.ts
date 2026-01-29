import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from '../services/authService';
import { AuthenticatedRequest, authMiddleware } from '../middleware/authMiddleware';
import { RefreshTokenService } from '../services/refreshTokenService';
import { UserService } from '../services/userService';
import { REFRESH_TOKEN_EXPIRATION_DAYS } from '../config/jwt';
import { requireTwoFactor } from '../middleware/twoFactorMiddleware';
import { validateBody } from '../middleware/validationMiddleware';
import {
  signupSchema,
  loginSchema,
  verifyLoginTwoFactorSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validations/authSchemas';

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
router.post('/signup', validateBody(signupSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, name } = req.body;

    const result = await AuthService.signup({ email, password, name });

    const refreshToken = await RefreshTokenService.createRefreshToken(result.user.id);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
    UserService.updateLastLogin(result.user.id).catch(() => {});

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Signup failed',
    });
  }
});

// POST /api/auth/login
router.post('/login', authSensitiveLimiter, validateBody(loginSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await AuthService.login({ email, password });

    // Se 2FA for necessário, retornar sem token e sem refresh token
    if (result.requiresTwoFactor) {
      return res.status(200).json({
        requiresTwoFactor: true,
        user: result.user,
      });
    }

    const refreshToken = await RefreshTokenService.createRefreshToken(result.user.id);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
    UserService.updateLastLogin(result.user.id).catch(() => {});

    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Login failed',
    });
  }
});

// POST /api/auth/login/verify-2fa - Verificar código 2FA após login
router.post('/login/verify-2fa', authSensitiveLimiter, validateBody(verifyLoginTwoFactorSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, twoFactorCode } = req.body;

    const result = await AuthService.verifyLoginTwoFactor(userId, twoFactorCode);

    const refreshToken = await RefreshTokenService.createRefreshToken(result.user.id);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
    UserService.updateLastLogin(result.user.id).catch(() => {});

    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({
      error: error instanceof Error ? error.message : '2FA verification failed',
    });
  }
});

// POST /api/auth/forgot-password - Solicitar redefinição de senha
router.post('/forgot-password', authSensitiveLimiter, validateBody(forgotPasswordSchema), async (req, res) => {
  try {
    const { email } = req.body;

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
router.post('/reset-password', validateBody(resetPasswordSchema), async (req, res) => {
  try {
    const { token, newPassword } = req.body;

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
router.put('/change-password', authMiddleware, requireTwoFactor, validateBody(changePasswordSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId; // Obtido do authMiddleware

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
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

    res.cookie(REFRESH_COOKIE_NAME, newToken, getRefreshCookieOptions());
    UserService.updateLastLogin(user.id).catch(() => {});

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
