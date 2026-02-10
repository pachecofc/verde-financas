import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { JWT_SECRET, JWT_EXPIRATION } from '../config/jwt';
import { AuthRequest, AuthResponse } from '../types';
import { sendEmail } from '../config/mailer';
import crypto from 'crypto';
import { TwoFactorService } from './twoFactorService';
import { AuditService } from './auditService';
import { encrypt, decrypt } from './encryptionService';
import { setRlsUserContext } from '../utils/rlsContext';

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
  static async signup(data: AuthRequest, clientIp?: string): Promise<AuthResponse> {
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

    const plainName = name || email.split('@')[0];
    const user = await prisma.user.create({
      data: {
        email,
        name: plainName,
        password: hashedPassword,
        termsAcceptedAt: new Date(), // Registra o momento exato
        termsVersion: process.env.CURRENT_TERMS_VERSION,
        privacyPolicyVersion: process.env.CURRENT_PRIVACY_VERSION,
        signupIp: clientIp || null, // Salva o IP vindo do controller
      },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { name: encrypt(user.id, plainName) ?? plainName },
    });

    await setRlsUserContext(user.id);
    await AuditService.log({
      actorType: 'user',
      actorId: user.id,
      action: 'USER_CREATE',
      resourceType: 'users',
      resourceId: user.id,
      metadata: {
        termsVersion: process.env.CURRENT_TERMS_VERSION ?? undefined,
        privacyPolicyVersion: process.env.CURRENT_PRIVACY_VERSION ?? undefined,
        signupIp: clientIp ?? undefined,
      },
    });

    // E-mail de boas-vindas (não bloqueia o signup em caso de falha)
    try {
      const welcomeHtml = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <p style="font-size: 18px; color: #334155; line-height: 1.6;">Olá, ${plainName} 🌿</p>
          <p style="font-size: 16px; color: #64748b; line-height: 1.7;">Que bom ter você aqui! Sua conta no Verde Finanças foi criada com sucesso.</p>
          <p style="font-size: 16px; color: #64748b; line-height: 1.7;">Respire fundo. Este é o começo de uma jornada mais tranquila com suas finanças — com clareza, controle e calma para tomar decisões conscientes.</p>
          <p style="font-size: 16px; color: #64748b; line-height: 1.7;">Quando quiser, acesse o app e comece a organizar sua vida financeira no seu próprio ritmo. Estamos aqui para apoiar.</p>
          <p style="font-size: 16px; color: #10b981; font-weight: 600; margin-top: 24px;">Um abraço verde,</p>
          <p style="font-size: 16px; color: #64748b;">Equipe Verde Finanças</p>
        </div>
      `;
      await sendEmail(user.email, 'Bem-vindo(a) ao Verde Finanças 🌿', welcomeHtml);
    } catch (emailErr) {
      console.error('[Auth] Erro ao enviar e-mail de boas-vindas:', emailErr);
    }

    // Gerar token JWT de acesso (curta duração)
    const token = this.generateAccessToken({ id: user.id, email: user.email });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: plainName,
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
      await setRlsUserContext(user.id);
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
      const nameDecrypted = decrypt(user.id, user.name) ?? user.name;
      return {
        token: '', // Token vazio - será gerado após validação do 2FA
        user: {
          id: user.id,
          email: user.email,
          name: nameDecrypted,
          avatarUrl: user.avatarUrl || undefined,
          plan: user.plan || undefined,
        },
        requiresTwoFactor: true,
      };
    }

    // Gerar token JWT de acesso (curta duração)
    const token = this.generateAccessToken({ id: user.id, email: user.email });

    await setRlsUserContext(user.id);
    await AuditService.log({
      actorType: 'user',
      actorId: user.id,
      action: 'LOGIN',
      resourceType: 'users',
      resourceId: user.id,
    });

    const nameDecrypted = decrypt(user.id, user.name) ?? user.name;
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: nameDecrypted,
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

    await setRlsUserContext(user.id);
    await AuditService.log({
      actorType: 'user',
      actorId: user.id,
      action: 'LOGIN',
      resourceType: 'users',
      resourceId: user.id,
      metadata: { twoFactor: true },
    });

    const nameDecrypted2FA = decrypt(user.id, user.name) ?? user.name;
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: nameDecrypted2FA,
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

    await setRlsUserContext(user.id);
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

    await setRlsUserContext(user.id);
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
