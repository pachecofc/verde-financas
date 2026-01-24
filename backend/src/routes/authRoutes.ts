import { Router, Response } from 'express';
import { AuthService } from '../services/authService';
import { AuthenticatedRequest, authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// POST /api/auth/signup
router.post('/signup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await AuthService.signup({ email, password, name });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Signup failed',
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await AuthService.login({ email, password });
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Login failed',
    });
  }
});

// POST /api/auth/forgot-password - Solicitar redefinição de senha
router.post('/forgot-password', async (req, res) => {
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

// PUT /api/auth/change-password - Alterar senha do usuário logado
router.put('/change-password', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
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

export default router;
