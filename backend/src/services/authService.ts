import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { JWT_SECRET, JWT_EXPIRATION } from '../config/jwt';
import { AuthRequest, AuthResponse } from '../types';
import { sendEmail } from '../config/mailer';
import crypto from 'crypto';
import { TwoFactorService } from './twoFactorService';
import { AuditService } from './auditService';

// Adicionar a URL do frontend para o link de reset
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export class AuthService {
  private static generateAccessToken(user: { id: string; email: string }) {
    return jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );
  }

  // Registrar novo usuário
  static async signup(data: AuthRequest): Promise<AuthResponse> {
    const { email, password, name } = data;

    // Verificar se usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('Usuário já existe');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: hashedPassword,
      },
    });

    await AuditService.log({
      actorType: 'user',
      actorId: user.id,
      action: 'USER_CREATE',
      resourceType: 'users',
      resourceId: user.id,
    });

    // Gerar token JWT de acesso (curta duração)
    const token = this.generateAccessToken({ id: user.id, email: user.email });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl || undefined,
        plan: user.plan || undefined,
      },
    };
  }

  // Fazer login (primeira etapa - valida email/senha)
  static async login(data: AuthRequest): Promise<AuthResponse & { requiresTwoFactor?: boolean }> {
    const { email, password } = data;

    // Buscar usuário (sem select para incluir todos os campos incluindo deletedAt)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Se o usuário está deletado, reativar automaticamente ao fazer login
    // Usar type assertion para acessar deletedAt até que o Prisma Client seja atualizado após migration
    const userWithDeletedAt = user as typeof user & { deletedAt: Date | null };
    if (userWithDeletedAt.deletedAt) {
      await prisma.user.update({
        where: { id: user.id },
        data: { deletedAt: null } as any,
      });
      await AuditService.log({
        actorType: 'user',
        actorId: user.id,
        action: 'USER_REACTIVATE',
        resourceType: 'users',
        resourceId: user.id,
      });
    }

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new Error('Senha inválida');
    }

    // Verificar se 2FA está habilitado
    const userWith2FA = user as typeof user & { twoFactorEnabled: boolean };
    if (userWith2FA.twoFactorEnabled) {
      // Retornar sem token, indicando que 2FA é necessário
      return {
        token: '', // Token vazio - será gerado após validação do 2FA
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl || undefined,
          plan: user.plan || undefined,
        },
        requiresTwoFactor: true,
      };
    }

    // Gerar token JWT de acesso (curta duração)
    const token = this.generateAccessToken({ id: user.id, email: user.email });

    await AuditService.log({
      actorType: 'user',
      actorId: user.id,
      action: 'LOGIN',
      resourceType: 'users',
      resourceId: user.id,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl || undefined,
        plan: user.plan || undefined,
      },
    };
  }

  // Verificar código 2FA e completar login
  static async verifyLoginTwoFactor(userId: string, twoFactorCode: string): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const userWith2FA = user as typeof user & { twoFactorEnabled: boolean };
    if (!userWith2FA.twoFactorEnabled) {
      throw new Error('2FA não está habilitado para este usuário');
    }

    // Verificar código 2FA
    const isValid = await TwoFactorService.verifyTwoFactorCode(userId, twoFactorCode);

    if (!isValid) {
      throw new Error('Código de autenticação de dois fatores inválido');
    }

    // Gerar token JWT de acesso
    const token = this.generateAccessToken({ id: user.id, email: user.email });

    await AuditService.log({
      actorType: 'user',
      actorId: user.id,
      action: 'LOGIN',
      resourceType: 'users',
      resourceId: user.id,
      metadata: { twoFactor: true },
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl || undefined,
        plan: user.plan || undefined,
      },
    };
  }

  // Verificar token JWT
  static verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Token inválido');
    }
  }

  // Solicitar redefinição de senha
  static async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });

    // Não informar se o usuário existe por segurança
    if (!user) {
      // Log genérico sem expor o email para evitar vazamento de dados sensíveis
      console.log('Attempted password reset for non-existent email');
      // Ainda assim, retornamos sucesso para evitar enumeração de usuários
      return;
    }

    // Gerar um token de redefinição único e seguro
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // Token válido por 1 hora

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetTokenExpires,
      },
    });

    await AuditService.log({
      actorType: 'user',
      actorId: user.id,
      action: 'PASSWORD_RESET_REQUEST',
      resourceType: 'users',
      resourceId: user.id,
    });

    const resetUrl = `${FRONTEND_URL}/#/reset-password/${resetToken}`;

    const emailHtml = `
      <p>Você solicitou a redefinição de sua senha.</p>
      <p>Por favor, clique no link a seguir para redefinir sua senha:</p>
      <p><a href="${resetUrl}">Redefinir Senha</a></p>
      <p>Este link é válido por 1 hora.</p>
      <p>Se você não solicitou isso, por favor, ignore este e-mail.</p>
    `;

    await sendEmail(user.email, 'Redefinição de Senha para seu App de Finanças', emailHtml);
  }

  // Redefinir senha
  static async resetPassword(token: string, newPasswordPlain: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(), // Verifica se o token não expirou
        },
      },
    });

    if (!user) {
      throw new Error('Token de redefinição inválido ou expirado.');
    }

    const hashedPassword = await bcrypt.hash(newPasswordPlain, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null, // Limpa o token após o uso
        passwordResetExpires: null, // Limpa a expiração
      },
    });

    await AuditService.log({
      actorType: 'user',
      actorId: user.id,
      action: 'PASSWORD_RESET',
      resourceType: 'users',
      resourceId: user.id,
    });
  }

  // Alterar senha do usuário logado
  static async changePassword(
    userId: string,
    currentPasswordPlain: string,
    newPasswordPlain: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    // Verificar se a senha atual está correta
    const passwordMatch = await bcrypt.compare(currentPasswordPlain, user.password);

    if (!passwordMatch) {
      throw new Error('Senha atual incorreta.');
    }

    // Fazer hash da nova senha
    const newHashedPassword = await bcrypt.hash(newPasswordPlain, 10);

    // Atualizar a senha no banco de dados
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: newHashedPassword,
      },
    });

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'PASSWORD_CHANGE',
      resourceType: 'users',
      resourceId: userId,
    });
  }
}
