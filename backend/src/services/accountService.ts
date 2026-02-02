import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../prisma';
import { AccountType } from '@prisma/client'; // Importar o enum AccountType do Prisma Client
import { GamificationService } from './gamificationService';
import { AuditService } from './auditService';
import { encrypt, decrypt } from './encryptionService';

interface CreateAccountData {
  name: string;
  balance: number; // Usar number aqui, Prisma converterá para Decimal
  currency?: string;
  type: AccountType;
  bankName?: string;
  color?: string;
}

interface UpdateAccountData {
  name?: string;
  balance?: number;
  currency?: string;
  type?: AccountType;
  bankName?: string;
  color?: string;
}

export class AccountService {
  // Criar uma nova conta
  static async createAccount(userId: string, data: CreateAccountData) {
    const accountCount = await prisma.account.count({ where: { userId } });
    const account = await prisma.account.create({
      data: {
        ...data,
        name: encrypt(userId, data.name) ?? data.name,
        bankName: data.bankName !== undefined ? (encrypt(userId, data.bankName) ?? data.bankName) : undefined,
        userId,
        balance: parseFloat(data.balance.toFixed(2)), // Garantir 2 casas decimais
      },
    });

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'ACCOUNT_CREATE',
      resourceType: 'accounts',
      resourceId: account.id,
    });

    if (accountCount === 0) {
      await GamificationService.registerEvent(userId, 'FIRST_ACCOUNT').catch(() => {});
    }
    return {
      ...account,
      name: decrypt(userId, account.name) ?? account.name,
      bankName: account.bankName != null ? (decrypt(userId, account.bankName) ?? account.bankName) : account.bankName,
    };
  }

  static async getAccountsByUserId(userId: string) {
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    return accounts.map((a) => ({
      ...a,
      name: decrypt(userId, a.name) ?? a.name,
      bankName: a.bankName != null ? (decrypt(userId, a.bankName) ?? a.bankName) : a.bankName,
    }));
  }

  static async getAccountById(accountId: string, userId: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId, userId },
    });
    if (!account) {
      throw new Error('Conta não encontrada ou não pertence ao usuário.');
    }
    return {
      ...account,
      name: decrypt(userId, account.name) ?? account.name,
      bankName: account.bankName != null ? (decrypt(userId, account.bankName) ?? account.bankName) : account.bankName,
    };
  }

  // Atualizar uma conta existente
  static async updateAccount(
    userId: string,
    accountId: string,
    data: {
      name?: string;
      balance?: number;
      currency?: string;
      type?: AccountType; // Usar o enum do Prisma
      bankName?: string;
      color?: string;
    }
  ) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId }, // Garante que a conta pertence ao usuário
    });

    if (!account) {
      throw new Error('Conta não encontrada ou não pertence ao usuário.'); // <--- Esta é a mensagem de erro!
    }

    const updateData: any = { ...data };
    if (data.balance !== undefined) {
      updateData.balance = new Decimal(data.balance);
    }
    if (data.name !== undefined) {
      updateData.name = encrypt(userId, data.name) ?? data.name;
    }
    if (data.bankName !== undefined) {
      updateData.bankName = encrypt(userId, data.bankName) ?? data.bankName;
    }

    const updatedAccount = await prisma.account.update({
      where: { id: accountId },
      data: updateData,
    });

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'ACCOUNT_UPDATE',
      resourceType: 'accounts',
      resourceId: accountId,
    });

    return {
      ...updatedAccount,
      name: decrypt(userId, updatedAccount.name) ?? updatedAccount.name,
      bankName:
        updatedAccount.bankName != null
          ? (decrypt(userId, updatedAccount.bankName) ?? updatedAccount.bankName)
          : updatedAccount.bankName,
    };
  }

  // Excluir uma conta com verificação de transações
  static async deleteAccount(userId: string, accountId: string, forceDeleteTransactions: boolean = false) {
    // 1. Verificar se a conta pertence ao usuário
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw new Error('Conta não encontrada ou você não tem permissão para excluí-la.');
    }

    // 2. Contar transações associadas
    const transactionsCount = await prisma.transaction.count({
      where: { accountId: accountId, userId: userId },
    });

    // 3. Lógica condicional de exclusão
    if (transactionsCount > 0 && !forceDeleteTransactions) {
      throw new Error(`Existem ${transactionsCount} transações associadas a esta conta. Confirme a exclusão para removê-las junto com a conta.`);
    }

    if (transactionsCount > 0 && forceDeleteTransactions) {
      // Excluir transações primeiro
      await prisma.transaction.deleteMany({
        where: { accountId: accountId, userId: userId },
      });
    }

    // 4. Excluir a conta
    await prisma.account.delete({
      where: { id: accountId, userId: userId },
    });

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'ACCOUNT_DELETE',
      resourceType: 'accounts',
      resourceId: accountId,
    });

    return { message: 'Conta e transações associadas (se houver) removidas com sucesso.' };
  }
}
