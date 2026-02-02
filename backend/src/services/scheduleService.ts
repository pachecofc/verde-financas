import { prisma } from '../prisma';
import { AuditService } from './auditService';
import { encrypt, decrypt } from './encryptionService';

export class ScheduleService {
  // Listar todos os agendamentos do usuário
  static async getSchedulesByUserId(userId: string) {
    const schedules = await prisma.schedule.findMany({
      where: { userId },
      include: {
        category: true,
        account: true,
        toAccount: true,
      },
      orderBy: { date: 'asc' },
    });
    return schedules.map((s) => ({
      ...s,
      description: decrypt(userId, s.description) ?? s.description,
      category: s.category
        ? { ...s.category, name: decrypt(userId, s.category.name) ?? s.category.name }
        : s.category,
      account: s.account
        ? {
            ...s.account,
            name: decrypt(userId, s.account.name) ?? s.account.name,
            bankName:
              s.account.bankName != null
                ? (decrypt(userId, s.account.bankName) ?? s.account.bankName)
                : s.account.bankName,
          }
        : s.account,
      toAccount: s.toAccount
        ? {
            ...s.toAccount,
            name: decrypt(userId, s.toAccount.name) ?? s.toAccount.name,
            bankName:
              s.toAccount.bankName != null
                ? (decrypt(userId, s.toAccount.bankName) ?? s.toAccount.bankName)
                : s.toAccount.bankName,
          }
        : s.toAccount,
    }));
  }

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

    return {
      ...schedule,
      description: decrypt(userId, schedule.description) ?? schedule.description,
      category: schedule.category
        ? { ...schedule.category, name: decrypt(userId, schedule.category.name) ?? schedule.category.name }
        : schedule.category,
      account: schedule.account
        ? {
            ...schedule.account,
            name: decrypt(userId, schedule.account.name) ?? schedule.account.name,
            bankName:
              schedule.account.bankName != null
                ? (decrypt(userId, schedule.account.bankName) ?? schedule.account.bankName)
                : schedule.account.bankName,
          }
        : schedule.account,
      toAccount: schedule.toAccount
        ? {
            ...schedule.toAccount,
            name: decrypt(userId, schedule.toAccount.name) ?? schedule.toAccount.name,
            bankName:
              schedule.toAccount.bankName != null
                ? (decrypt(userId, schedule.toAccount.bankName) ?? schedule.toAccount.bankName)
                : schedule.toAccount.bankName,
          }
        : schedule.toAccount,
    };
  }

  // Criar novo agendamento
  static async createSchedule(
    userId: string,
    data: {
      description: string;
      amount: number;
      date: Date;
      frequency: 'once' | 'monthly' | 'weekly' | 'yearly';
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

    const encryptedDescription = encrypt(userId, description) ?? description;
    const newSchedule = await prisma.schedule.create({
      data: {
        description: encryptedDescription,
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

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'SCHEDULE_CREATE',
      resourceType: 'schedules',
      resourceId: newSchedule.id,
    });

    return {
      ...newSchedule,
      description: decrypt(userId, newSchedule.description) ?? newSchedule.description,
      category: newSchedule.category
        ? { ...newSchedule.category, name: decrypt(userId, newSchedule.category.name) ?? newSchedule.category.name }
        : newSchedule.category,
      account: newSchedule.account
        ? {
            ...newSchedule.account,
            name: decrypt(userId, newSchedule.account.name) ?? newSchedule.account.name,
            bankName:
              newSchedule.account.bankName != null
                ? (decrypt(userId, newSchedule.account.bankName) ?? newSchedule.account.bankName)
                : newSchedule.account.bankName,
          }
        : newSchedule.account,
      toAccount: newSchedule.toAccount
        ? {
            ...newSchedule.toAccount,
            name: decrypt(userId, newSchedule.toAccount.name) ?? newSchedule.toAccount.name,
            bankName:
              newSchedule.toAccount.bankName != null
                ? (decrypt(userId, newSchedule.toAccount.bankName) ?? newSchedule.toAccount.bankName)
                : newSchedule.toAccount.bankName,
          }
        : newSchedule.toAccount,
    };
  }

  // Atualizar agendamento existente
  static async updateSchedule(
    userId: string,
    scheduleId: string,
    data: {
      description?: string;
      amount?: number;
      date?: Date;
      frequency?: 'once' | 'monthly' | 'weekly' | 'yearly';
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
        ...(data.description !== undefined && {
          description: encrypt(userId, data.description) ?? data.description,
        }),
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

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'SCHEDULE_UPDATE',
      resourceType: 'schedules',
      resourceId: scheduleId,
    });

    return {
      ...updatedSchedule,
      description: decrypt(userId, updatedSchedule.description) ?? updatedSchedule.description,
      category: updatedSchedule.category
        ? { ...updatedSchedule.category, name: decrypt(userId, updatedSchedule.category.name) ?? updatedSchedule.category.name }
        : updatedSchedule.category,
      account: updatedSchedule.account
        ? {
            ...updatedSchedule.account,
            name: decrypt(userId, updatedSchedule.account.name) ?? updatedSchedule.account.name,
            bankName:
              updatedSchedule.account.bankName != null
                ? (decrypt(userId, updatedSchedule.account.bankName) ?? updatedSchedule.account.bankName)
                : updatedSchedule.account.bankName,
          }
        : updatedSchedule.account,
      toAccount: updatedSchedule.toAccount
        ? {
            ...updatedSchedule.toAccount,
            name: decrypt(userId, updatedSchedule.toAccount.name) ?? updatedSchedule.toAccount.name,
            bankName:
              updatedSchedule.toAccount.bankName != null
                ? (decrypt(userId, updatedSchedule.toAccount.bankName) ?? updatedSchedule.toAccount.bankName)
                : updatedSchedule.toAccount.bankName,
          }
        : updatedSchedule.toAccount,
    };
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

    await AuditService.log({
      actorType: 'user',
      actorId: userId,
      action: 'SCHEDULE_DELETE',
      resourceType: 'schedules',
      resourceId: scheduleId,
    });

    return { message: 'Agendamento excluído com sucesso.' };
  }
}
