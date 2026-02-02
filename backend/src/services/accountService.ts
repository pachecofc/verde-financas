import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../prisma';
import { AccountType } from '@prisma/client'; // Importar o enum AccountType do Prisma Client
import { GamificationService } from './gamificationService';
import { AuditService } from './auditService';

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
    return account;
  }

  // Obter todas as contas de um usuário
  static async getAccountsByUserId(userId: string) {
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    return accounts;
  }

  // Obter uma única conta por ID
  static async getAccountById(accountId: string, userId: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId, userId }, // Garantir que a conta pertence ao usuário
    });
    if (!account) {
      throw new Error('Conta não encontrada ou não pertence ao usuário.');
    }
    return account;
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

    // Preparar os dados para atualização, convertendo balance para Decimal se presente
    const updateData: any = { ...data };
    if (data.balance !== undefined) {
      updateData.balance = new Decimal(data.balance);
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

    return updatedAccount;
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
