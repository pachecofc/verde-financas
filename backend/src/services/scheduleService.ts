import { prisma } from '../prisma';

export class ScheduleService {
  // Listar todos os agendamentos do usuário
  static async getSchedulesByUserId(userId: string) {
    return await prisma.schedule.findMany({
      where: { userId },
      include: {
        category: true,
        account: true,
        toAccount: true,
      },
      orderBy: { date: 'asc' },
    });
  }

  // Obter um agendamento específico por ID
  static async getScheduleById(userId: string, scheduleId: string) {
    const schedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, userId },
      include: {
        category: true,
        account: true,
        toAccount: true,
      },
    });

    if (!schedule) {
      throw new Error('Agendamento não encontrado ou não pertence ao usuário.');
    }

    return schedule;
  }

  // Criar novo agendamento
  static async createSchedule(
    userId: string,
    data: {
      description: string;
      amount: number;
      date: Date;
      frequency: 'once' | 'monthly' | 'weekly';
      type: 'income' | 'expense' | 'transfer' | 'adjustment';
      categoryId?: string | null;
      accountId: string;
      toAccountId?: string | null;
    }
  ) {
    const { description, amount, date, frequency, type, categoryId, accountId, toAccountId } = data;

    // Validações básicas
    if (!description || !amount || !date || !frequency || !type || !accountId) {
      throw new Error('Campos obrigatórios: description, amount, date, frequency, type, accountId.');
    }

    if (amount <= 0) {
      throw new Error('O valor deve ser maior que zero.');
    }

    // Verificar se a conta existe e pertence ao usuário
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw new Error('Conta não encontrada ou não pertence ao usuário.');
    }

    // Para transferências, verificar conta destino
    if (type === 'transfer' && toAccountId) {
      const toAccount = await prisma.account.findFirst({
        where: { id: toAccountId, userId },
      });

      if (!toAccount) {
        throw new Error('Conta destino não encontrada ou não pertence ao usuário.');
      }

      if (accountId === toAccountId) {
        throw new Error('A conta origem e destino não podem ser a mesma.');
      }
    }

    // Verificar categoria se fornecida e se não for transferência ou ajuste
    if (categoryId && type !== 'transfer' && type !== 'adjustment') {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, userId },
      });

      if (!category) {
        throw new Error('Categoria não encontrada ou não pertence ao usuário.');
      }
    }

    // Criar agendamento
    const newSchedule = await prisma.schedule.create({
      data: {
        description,
        amount,
        date,
        frequency,
        type,
        userId,
        categoryId: categoryId || null,
        accountId,
        toAccountId: type === 'transfer' ? (toAccountId || null) : null,
      },
      include: {
        category: true,
        account: true,
        toAccount: true,
      },
    });

    return newSchedule;
  }

  // Atualizar agendamento existente
  static async updateSchedule(
    userId: string,
    scheduleId: string,
    data: {
      description?: string;
      amount?: number;
      date?: Date;
      frequency?: 'once' | 'monthly' | 'weekly';
      type?: 'income' | 'expense' | 'transfer' | 'adjustment';
      categoryId?: string | null;
      accountId?: string;
      toAccountId?: string | null;
    }
  ) {
    // Verificar se o agendamento existe e pertence ao usuário
    const existingSchedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, userId },
    });

    if (!existingSchedule) {
      throw new Error('Agendamento não encontrado ou não pertence ao usuário.');
    }

    // Validações para campos atualizados
    if (data.amount !== undefined && data.amount <= 0) {
      throw new Error('O valor deve ser maior que zero.');
    }

    // Verificar conta se fornecida
    if (data.accountId) {
      const account = await prisma.account.findFirst({
        where: { id: data.accountId, userId },
      });

      if (!account) {
        throw new Error('Conta não encontrada ou não pertence ao usuário.');
      }
    }

    // Verificar conta destino para transferências
    const finalType = data.type || existingSchedule.type;
    if (finalType === 'transfer' && data.toAccountId) {
      const toAccount = await prisma.account.findFirst({
        where: { id: data.toAccountId, userId },
      });

      if (!toAccount) {
        throw new Error('Conta destino não encontrada ou não pertence ao usuário.');
      }

      const accountId = data.accountId || existingSchedule.accountId;
      if (accountId === data.toAccountId) {
        throw new Error('A conta origem e destino não podem ser a mesma.');
      }
    }

    // Verificar categoria se fornecida
    if (data.categoryId !== undefined && finalType !== 'transfer' && finalType !== 'adjustment') {
      if (data.categoryId) {
        const category = await prisma.category.findFirst({
          where: { id: data.categoryId, userId },
        });

        if (!category) {
          throw new Error('Categoria não encontrada ou não pertence ao usuário.');
        }
      }
    }

    // Atualizar agendamento
    const updatedSchedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        ...(data.description !== undefined && { description: data.description }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.date !== undefined && { date: data.date }),
        ...(data.frequency !== undefined && { frequency: data.frequency }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId || null }),
        ...(data.accountId !== undefined && { accountId: data.accountId }),
        ...(data.toAccountId !== undefined && {
          toAccountId: finalType === 'transfer' ? (data.toAccountId || null) : null,
        }),
      },
      include: {
        category: true,
        account: true,
        toAccount: true,
      },
    });

    return updatedSchedule;
  }

  // Deletar agendamento
  static async deleteSchedule(userId: string, scheduleId: string) {
    const schedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, userId },
    });

    if (!schedule) {
      throw new Error('Agendamento não encontrado ou não pertence ao usuário.');
    }

    await prisma.schedule.delete({
      where: { id: scheduleId },
    });

    return { message: 'Agendamento excluído com sucesso.' };
  }
}
