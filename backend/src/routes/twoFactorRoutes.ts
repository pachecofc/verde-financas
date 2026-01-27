import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/authMiddleware';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { TwoFactorService } from '../services/twoFactorService';
import { AuthService } from '../services/authService';
import { prisma } from '../prisma';
import bcrypt from 'bcrypt';

const router = Router();

// Rate limiter para rotas de 2FA
const twoFactorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo de 10 tentativas por IP nesse período
  message: {
    error: 'Muitas tentativas. Tente novamente em alguns minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/2fa/setup - Gerar secret e QR code para habilitar 2FA
router.post('/setup', authMiddleware, twoFactorLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA já está habilitado' });
    }

    const appName = process.env.APP_NAME || 'Finance App';
    const { secret, qrCodeUrl, otpauthUrl } = await TwoFactorService.generateSecret(
      req.userId,
      user.email,
      appName
    );

    // Armazenar secret temporariamente na sessão (ou em memória) para validação
    // Por enquanto, vamos retornar o secret para o frontend validar antes de habilitar
    // Em produção, considere usar uma sessão temporária ou cache Redis

    res.status(200).json({
      secret, // Secret temporário - será validado antes de habilitar
      qrCodeUrl,
      otpauthUrl,
    });
  } catch (error) {
    console.error('Erro na rota /2fa/setup:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao configurar 2FA',
    });
  }
});

// POST /api/auth/2fa/enable - Habilitar 2FA após validar código inicial
router.post('/enable', authMiddleware, twoFactorLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { secret, verificationCode } = req.body;

    if (!secret || !verificationCode) {
      return res.status(400).json({ error: 'Secret e código de verificação são obrigatórios' });
    }

    // Verificar se o código fornecido é válido para o secret
    const isValid = TwoFactorService.verifyToken(secret, verificationCode);

    if (!isValid) {
      return res.status(400).json({ error: 'Código de verificação inválido' });
    }

    // Gerar códigos de backup
    const backupCodes = TwoFactorService.generateBackupCodes();

    // Habilitar 2FA
    await TwoFactorService.enableTwoFactor(req.userId, secret, backupCodes);

    res.status(200).json({
      message: '2FA habilitado com sucesso',
      backupCodes, // Retornar códigos de backup apenas uma vez
    });
  } catch (error) {
    console.error('Erro na rota /2fa/enable:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao habilitar 2FA',
    });
  }
});

// POST /api/auth/2fa/disable - Desabilitar 2FA (requer senha atual)
router.post('/disable', authMiddleware, twoFactorLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Senha é obrigatória para desabilitar 2FA' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { password: true, twoFactorEnabled: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA não está habilitado' });
    }

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    // Desabilitar 2FA
    await TwoFactorService.disableTwoFactor(req.userId);

    res.status(200).json({ message: '2FA desabilitado com sucesso' });
  } catch (error) {
    console.error('Erro na rota /2fa/disable:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao desabilitar 2FA',
    });
  }
});

// POST /api/auth/2fa/verify - Validar código TOTP genérico
router.post('/verify', authMiddleware, twoFactorLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Código é obrigatório' });
    }

    const isValid = await TwoFactorService.verifyTwoFactorCode(req.userId, code);

    if (!isValid) {
      return res.status(401).json({ error: 'Código inválido' });
    }

    res.status(200).json({ message: 'Código válido' });
  } catch (error) {
    console.error('Erro na rota /2fa/verify:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao verificar código',
    });
  }
});

// GET /api/auth/2fa/backup-codes - Obter códigos de backup (após habilitar)
router.get('/backup-codes', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { twoFactorEnabled: true, twoFactorBackupCodes: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA não está habilitado' });
    }

    // Retornar apenas a quantidade de códigos restantes (não os códigos em si por segurança)
    res.status(200).json({
      remainingCodes: user.twoFactorBackupCodes.length,
    });
  } catch (error) {
    console.error('Erro na rota /2fa/backup-codes:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao obter códigos de backup',
    });
  }
});

// GET /api/auth/2fa/status - Obter status do 2FA
router.get('/status', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { twoFactorEnabled: true, twoFactorBackupCodes: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.status(200).json({
      enabled: user.twoFactorEnabled || false,
      remainingBackupCodes: user.twoFactorBackupCodes?.length || 0,
    });
  } catch (error) {
    console.error('Erro na rota /2fa/status:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao obter status do 2FA',
    });
  }
});

export default router;
