import { prisma } from '../prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { AssetHoldingService } from './assetHoldingService';

export class TransactionService {
  // Listar todas as transações do usuário
  static async getTransactions(
    userId: string,
    filters?: {
      categoryId?: string;
      type?: string;
      startDate?: Date;
      endDate?: Date;
      accountId?: string;
    }
  ) {
    const where: any = { userId };

    // Filtrar por categoria se fornecido
    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    // Filtrar por tipo (income/expense) se fornecido
    if (filters?.type) {
      where.type = filters.type;
    }

    // <--- NOVO: Adicionar filtro por accountId
    if (filters?.accountId) {
      where.accountId = filters.accountId;
    }

    // Filtrar por intervalo de datas se fornecido
    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    return await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        account: true,
        toAccount: true,
        asset: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  // Obter uma transação específica
  static async getTransactionById(userId: string, transactionId: string) {
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      include: {
        category: true,
        account: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    return transaction;
  }

  // Listar externalIds do usuário (para dedup em importação CSV)
  static async getExternalIds(userId: string): Promise<string[]> {
    const rows = await prisma.transaction.findMany({
      where: { userId, externalId: { not: null } },
      select: { externalId: true },
    });
    return rows.map((r) => r.externalId as string);
  }

  // Criar nova transação
  static async createTransaction(
    userId: string,
    data: {
      categoryId: string;
      description: string;
      amount: number;
      type: string;
      date: Date;
      accountId: string;
      toAccountId?: string; // Para transferências
      assetId?: string | null; // Para transferências para contas de investimento
      externalId?: string | null; // Identificador externo (ex.: CSV) para evitar duplicatas
    }
  ) {
    const { categoryId, description, amount, type, date, accountId, toAccountId, assetId, externalId } = data;

    // Validações básicas
    if (!description || !amount || !type || !date || !accountId) {
      throw new Error('Todos os campos obrigatórios da transação devem ser fornecidos.');
    }

    // Validar tipo
    if (!['income', 'expense', 'transfer', 'adjustment'].includes(type)) {
      throw new Error('Type must be "income", "expense", "transfer", or "adjustment"');
    }

    // Validar amount
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Validações específicas para transferências
    if (type === 'transfer') {
      if (!toAccountId) {
        throw new Error('toAccountId é obrigatório para transferências');
      }
      if (accountId === toAccountId) {
        throw new Error('A conta origem e destino não podem ser a mesma');
      }
    }

    // Para transferências e ajustes, não validar categoria (usam categorias do sistema)
    if (type !== 'transfer' && type !== 'adjustment') {
      if (!categoryId) {
        throw new Error('categoryId é obrigatório para receitas e despesas');
      }

      // Validar se categoria existe e pertence ao usuário
      const category = await prisma.category.findFirst({
        where: { id: categoryId, userId },
      });

      if (!category) {
        throw new Error('Category not found');
      }

      // Validar se o tipo da transação corresponde ao tipo da categoria
      if (category.type !== type) {
        throw new Error(
          `Category type "${category.type}" does not match transaction type "${type}"`
        );
      }
    }

    // Verificar se a conta origem pertence ao usuário
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      throw new Error('Conta origem não encontrada ou não pertence ao usuário.');
    }

    // Para transferências, verificar se a conta destino pertence ao usuário
    if (type === 'transfer' && toAccountId) {
      const toAccount = await prisma.account.findFirst({
        where: { id: toAccountId, userId },
      });
      if (!toAccount) {
        throw new Error('Conta destino não encontrada ou não pertence ao usuário.');
      }

      // Se a conta destino é do tipo INVESTMENT e assetId foi fornecido, validar o ativo
      if (toAccount.type === 'INVESTMENT' && assetId) {
        const asset = await prisma.asset.findFirst({
          where: { id: assetId, userId },
        });
        if (!asset) {
          throw new Error('Ativo não encontrado ou não pertence ao usuário.');
        }
      }
    }

    // Criar transação
    const newTransaction = await prisma.transaction.create({
      data: {
        userId,
        categoryId: (type === 'transfer' || type === 'adjustment') ? null : categoryId, // Null para transfer/adjustment
        description,
        amount: new Decimal(amount),
        type,
        date,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : null,
        assetId: (type === 'transfer' && assetId) ? assetId : null,
        externalId: externalId && String(externalId).trim() ? String(externalId).trim() : null,
      },
      include: {
        category: true,
        account: true,
        toAccount: true,
        asset: true,
      },
    });

    // Atualizar o saldo das contas
    if (type === 'transfer' && toAccountId) {
      // Buscar a conta destino novamente para verificar o tipo
      const toAccount = await prisma.account.findFirst({
        where: { id: toAccountId, userId },
      });

      // Transferência: debita da conta origem e credita na conta destino
      await prisma.account.update({
        where: { id: accountId },
        data: {
          balance: {
            decrement: new Decimal(amount),
          },
        },
      });
      await prisma.account.update({
        where: { id: toAccountId },
        data: {
          balance: {
            increment: new Decimal(amount),
          },
        },
      });

      // Se for transferência para conta de investimento com assetId, criar/atualizar AssetHolding
      if (toAccount?.type === 'INVESTMENT' && assetId) {
        await AssetHoldingService.getOrCreateHolding(userId, assetId, amount);
      }
    } else if (type === 'adjustment') {
      // Ajuste: define o saldo diretamente (o amount já é o saldo desejado)
      await prisma.account.update({
        where: { id: accountId },
        data: {
          balance: new Decimal(amount),
        },
      });
    } else {
      // Receita ou despesa: incrementa ou decrementa
      await prisma.account.update({
        where: { id: accountId },
        data: {
          balance: {
            [type === 'income' ? 'increment' : 'decrement']: new Decimal(amount),
          },
        },
      });
    }

    return newTransaction;
  }

  // Atualizar transação
  static async updateTransaction(
    userId: string,
    transactionId: string,
    data: {
      categoryId?: string;
      description?: string;
      amount?: number;
      type?: string;
      date?: Date;
      accountId?: string;
      toAccountId?: string;
      assetId?: string | null;
    }
  ) {
    const { categoryId, description, amount, type, date, accountId, toAccountId, assetId } = data;

    // Verificar se a transação existe e pertence ao usuário
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      include: { toAccount: true },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Validar amount se estiver sendo alterado
    if (amount !== undefined && amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Validar tipo se estiver sendo alterado
    if (type && !['income', 'expense', 'transfer', 'adjustment'].includes(type)) {
      throw new Error('Type must be "income", "expense", "transfer", or "adjustment"');
    }

    // Validações para transferências
    const finalType = type || transaction.type;
    if (finalType === 'transfer') {
      const finalToAccountId = toAccountId || transaction.toAccountId;
      if (!finalToAccountId) {
        throw new Error('toAccountId é obrigatório para transferências');
      }
      const finalAccountId = accountId || transaction.accountId;
      if (finalAccountId === finalToAccountId) {
        throw new Error('A conta origem e destino não podem ser a mesma');
      }
    }

    // Se categoryId está sendo alterado, validar (exceto para transfer/adjustment)
    if (categoryId && finalType !== 'transfer' && finalType !== 'adjustment') {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, userId },
      });

      if (!category) {
        throw new Error('Category not found');
      }

      // Validar se o tipo da transação corresponde ao tipo da categoria
      if (category.type !== finalType) {
        throw new Error(
          `Category type "${category.type}" does not match transaction type "${finalType}"`
        );
      }
    }

    // Validar accountId
    if (accountId) {
      const account = await prisma.account.findFirst({
        where: { id: accountId, userId },
      });
      if (!account) {
        throw new Error('Conta origem não encontrada ou não pertence ao usuário.');
      }
    }

    // Validar toAccountId para transferências
    if (toAccountId || (finalType === 'transfer' && transaction.toAccountId)) {
      const finalToAccountId = toAccountId || transaction.toAccountId;
      if (finalToAccountId) {
        const toAccount = await prisma.account.findFirst({
          where: { id: finalToAccountId, userId },
        });
        if (!toAccount) {
          throw new Error('Conta destino não encontrada ou não pertence ao usuário.');
        }

        // Se a conta destino é do tipo INVESTMENT e assetId foi fornecido, validar o ativo
        const finalAssetId = assetId !== undefined ? assetId : transaction.assetId;
        if (toAccount.type === 'INVESTMENT' && finalAssetId) {
          const asset = await prisma.asset.findFirst({
            where: { id: finalAssetId, userId },
          });
          if (!asset) {
            throw new Error('Ativo não encontrado ou não pertence ao usuário.');
          }
        }
      }
    }

    // Reverter o impacto da transação antiga
    if (transaction.type === 'transfer' && transaction.toAccountId) {
      // Reverter transferência: reverter débito na origem e crédito no destino
      await prisma.account.update({
        where: { id: transaction.accountId },
        data: { balance: { increment: transaction.amount } },
      });
      await prisma.account.update({
        where: { id: transaction.toAccountId },
        data: { balance: { decrement: transaction.amount } },
      });
    } else if (transaction.type === 'adjustment') {
      // Para ajustes, não podemos reverter facilmente, então apenas atualizamos
      // O saldo será definido novamente abaixo
    } else {
      // Reverter receita/despesa
      await prisma.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            [transaction.type === 'income' ? 'decrement' : 'increment']: transaction.amount,
          },
        },
      });
    }

    // Aplicar o impacto da transação atualizada
    const updatedAmount = amount !== undefined ? new Decimal(amount) : transaction.amount;
    const updatedAccountId = accountId || transaction.accountId;
    const updatedToAccountId = toAccountId !== undefined ? toAccountId : transaction.toAccountId;

    if (finalType === 'transfer' && updatedToAccountId) {
      // Aplicar transferência: debitar origem e creditar destino
      await prisma.account.update({
        where: { id: updatedAccountId },
        data: { balance: { decrement: updatedAmount } },
      });
      await prisma.account.update({
        where: { id: updatedToAccountId },
        data: { balance: { increment: updatedAmount } },
      });
    } else if (finalType === 'adjustment') {
      // Ajuste: define o saldo diretamente
      await prisma.account.update({
        where: { id: updatedAccountId },
        data: { balance: updatedAmount },
      });
    } else {
      // Aplicar receita/despesa
      await prisma.account.update({
        where: { id: updatedAccountId },
        data: {
          balance: {
            [finalType === 'income' ? 'increment' : 'decrement']: updatedAmount,
          },
        },
      });
    }

    // Atualizar transação
    const updateData: any = {
      ...(description && { description }),
      ...(amount !== undefined && { amount: new Decimal(amount) }),
      ...(type && { type }),
      ...(date && { date }),
      ...(accountId && { accountId }),
      ...(toAccountId !== undefined && { toAccountId: finalType === 'transfer' ? toAccountId : null }),
    };

    // Atualizar categoryId apenas se fornecido e não for transfer/adjustment
    if (categoryId !== undefined) {
      if (finalType === 'transfer' || finalType === 'adjustment') {
        updateData.categoryId = null;
      } else {
        updateData.categoryId = categoryId;
      }
    } else if (type && (type === 'transfer' || type === 'adjustment')) {
      // Se mudou para transfer/adjustment, remover categoryId
      updateData.categoryId = null;
    }

    // Atualizar assetId apenas para transferências
    if (assetId !== undefined) {
      updateData.assetId = (finalType === 'transfer' && assetId) ? assetId : null;
    } else if (type && type !== 'transfer') {
      // Se mudou para não-transfer, remover assetId
      updateData.assetId = null;
    }

    return await prisma.transaction.update({
      where: { id: transactionId },
      data: updateData,
      include: {
        category: true,
        account: true,
        toAccount: true,
        asset: true,
      },
    });
  }

  // Deletar transação
  static async deleteTransaction(userId: string, transactionId: string) {
    // Verificar se a transação existe e pertence ao usuário
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      include: { toAccount: true },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Reverter o impacto da transação no saldo das contas
    if (transaction.type === 'transfer' && transaction.toAccountId) {
      // Reverter transferência: reverter débito na origem e crédito no destino
      await prisma.account.update({
        where: { id: transaction.accountId },
        data: { balance: { increment: transaction.amount } },
      });
      await prisma.account.update({
        where: { id: transaction.toAccountId },
        data: { balance: { decrement: transaction.amount } },
      });

      // Se for transação de investimento com assetId, decrementar AssetHolding
      if (transaction.assetId) {
        const toAccount = await prisma.account.findFirst({
          where: { id: transaction.toAccountId, userId },
        });
        if (toAccount?.type === 'INVESTMENT') {
          await AssetHoldingService.decrementHolding(
            userId,
            transaction.assetId,
            transaction.amount.toNumber()
          );
        }
      }
    } else if (transaction.type === 'adjustment') {
      // Para ajustes, não podemos reverter facilmente sem saber o saldo anterior
      // Por segurança, apenas removemos a transação sem alterar o saldo
      // Em produção, você pode querer armazenar o saldo anterior
    } else {
      // Reverter receita/despesa
      await prisma.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            [transaction.type === 'income' ? 'decrement' : 'increment']: transaction.amount,
          },
        },
      });
    }

    // Deletar transação
    await prisma.transaction.delete({
      where: { id: transactionId },
    });
  }

  // Obter resumo de transações (total de receitas, despesas, saldo)
  static async getSummary(
    userId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      accountId?: string;
    }
  ) {
    const where: any = { userId };

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }
    if (filters?.accountId) {
      where.accountId = filters.accountId;
    }

    // Calcular totais
    const transactions = await prisma.transaction.findMany({
      where,
    });

    // Converter Decimal para number antes de somar/subtrair
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount.toNumber(), 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount.toNumber(), 0);
    const balance = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      balance,
      transactionCount: transactions.length,
    };
  }
}
