import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import bcrypt from 'bcrypt';
import { prisma } from '../prisma';

export class TwoFactorService {
  // Gera secret TOTP e retorna objeto com secret e QR code
  static async generateSecret(userId: string, email: string, appName: string = 'Finance App'): Promise<{
    secret: string;
    qrCodeUrl: string;
    otpauthUrl: string;
  }> {
    const secret = speakeasy.generateSecret({
      name: `${appName} (${email})`,
      length: 32,
    });

    if (!secret.base32 || !secret.otpauth_url) {
      throw new Error('Falha ao gerar secret TOTP');
    }

    // Gerar QR code como data URL
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCodeUrl,
      otpauthUrl: secret.otpauth_url,
    };
  }

  // Valida código TOTP de 6 dígitos
  static verifyToken(secret: string, token: string, window: number = 1): boolean {
    try {
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window, // Janela de tolerância de ±1 período (30 segundos)
      });
      return verified || false;
    } catch (error) {
      console.error('Erro ao verificar token TOTP:', error);
      return false;
    }
  }

  // Gera códigos de backup (8 códigos de 8 dígitos)
  static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      // Gera código de 8 dígitos
      const code = Math.floor(10000000 + Math.random() * 90000000).toString();
      codes.push(code);
    }
    return codes;
  }

  // Criptografa códigos de backup
  static async encryptBackupCodes(codes: string[]): Promise<string[]> {
    const encryptedCodes = await Promise.all(
      codes.map(async (code) => {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(code, salt);
      })
    );
    return encryptedCodes;
  }

  // Valida e remove código de backup usado
  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    const userWith2FA = user as typeof user & { twoFactorBackupCodes: string[] };
    if (!userWith2FA.twoFactorBackupCodes || userWith2FA.twoFactorBackupCodes.length === 0) {
      return false;
    }

    // Verificar cada código de backup
    for (let i = 0; i < userWith2FA.twoFactorBackupCodes.length; i++) {
      const encryptedCode = userWith2FA.twoFactorBackupCodes[i];
      const isValid = await bcrypt.compare(code, encryptedCode);

      if (isValid) {
        // Remover código usado
        const updatedCodes = [...userWith2FA.twoFactorBackupCodes];
        updatedCodes.splice(i, 1);

        await prisma.user.update({
          where: { id: userId },
          data: { twoFactorBackupCodes: updatedCodes } as any,
        });

        return true;
      }
    }

    return false;
  }

  // Nota: O secret TOTP precisa ser armazenado em texto plano (base32) para permitir validação
  // Isso é seguro porque o secret em si já é um valor aleatório forte
  // Em produção, considere usar criptografia simétrica se necessário

  // Habilita 2FA para um usuário
  static async enableTwoFactor(
    userId: string,
    secret: string,
    backupCodes: string[]
  ): Promise<void> {
    // Secret armazenado em base32 (texto plano) - necessário para validação TOTP
    const encryptedBackupCodes = await this.encryptBackupCodes(backupCodes);

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret, // Armazenado em base32
        twoFactorEnabled: true,
        twoFactorBackupCodes: encryptedBackupCodes,
      } as any,
    });
  }

  // Desabilita 2FA para um usuário
  static async disableTwoFactor(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: null,
        twoFactorEnabled: false,
        twoFactorBackupCodes: [],
      } as any,
    });
  }

  // Verifica código TOTP ou backup code
  static async verifyTwoFactorCode(userId: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    const userWith2FA = user as typeof user & { twoFactorEnabled: boolean; twoFactorSecret: string | null };
    if (!userWith2FA.twoFactorEnabled || !userWith2FA.twoFactorSecret) {
      return false;
    }

    // Primeiro, tentar verificar como backup code (mais rápido)
    const isBackupCode = await this.verifyBackupCode(userId, code);
    if (isBackupCode) {
      return true;
    }

    // Se não for backup code, tentar como TOTP
    // O secret está armazenado em base32 (texto plano) para permitir validação
    return this.verifyToken(userWith2FA.twoFactorSecret, code);
  }
}
