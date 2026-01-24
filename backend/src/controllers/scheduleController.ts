import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { ScheduleService } from '../services/scheduleService';

export class ScheduleController {
  // Obter todos os agendamentos do usuário
  static async getSchedules(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const schedules = await ScheduleService.getSchedulesByUserId(userId);
      
      // Formatar dados para o frontend
      const formattedSchedules = schedules.map(schedule => ({
        id: schedule.id,
        description: schedule.description,
        amount: Number(schedule.amount),
        date: schedule.date.toISOString().split('T')[0], // Formato YYYY-MM-DD
        frequency: schedule.frequency,
        type: schedule.type,
        categoryId: schedule.categoryId || null,
        accountId: schedule.accountId,
        toAccountId: schedule.toAccountId || null,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      }));

      res.status(200).json(formattedSchedules);
    } catch (error) {
      console.error('Erro ao obter agendamentos:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Falha ao obter agendamentos.',
      });
    }
  }

  // Obter um agendamento específico por ID
  static async getScheduleById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const schedule = await ScheduleService.getScheduleById(userId, id);

      res.status(200).json({
        id: schedule.id,
        description: schedule.description,
        amount: Number(schedule.amount),
        date: schedule.date.toISOString().split('T')[0],
        frequency: schedule.frequency,
        type: schedule.type,
        categoryId: schedule.categoryId || null,
        accountId: schedule.accountId,
        toAccountId: schedule.toAccountId || null,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      });
    } catch (error) {
      console.error('Erro ao obter agendamento por ID:', error);
      res.status(404).json({
        error: error instanceof Error ? error.message : 'Agendamento não encontrado.',
      });
    }
  }

  // Criar novo agendamento
  static async createSchedule(req: AuthenticatedRequest, res: Response) {
    try {
      const { description, amount, date, frequency, type, categoryId, accountId, toAccountId } = req.body;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      if (!description || !amount || !date || !frequency || !type || !accountId) {
        return res.status(400).json({ error: 'Campos obrigatórios: description, amount, date, frequency, type, accountId.' });
      }

      // Converter data string para Date
      const scheduleDate = new Date(date + 'T12:00:00');

      const newSchedule = await ScheduleService.createSchedule(userId, {
        description,
        amount: parseFloat(amount),
        date: scheduleDate,
        frequency,
        type,
        categoryId: categoryId || null,
        accountId,
        toAccountId: type === 'transfer' ? (toAccountId || null) : null,
      });

      res.status(201).json({
        id: newSchedule.id,
        description: newSchedule.description,
        amount: Number(newSchedule.amount),
        date: newSchedule.date.toISOString().split('T')[0],
        frequency: newSchedule.frequency,
        type: newSchedule.type,
        categoryId: newSchedule.categoryId || null,
        accountId: newSchedule.accountId,
        toAccountId: newSchedule.toAccountId || null,
        createdAt: newSchedule.createdAt,
        updatedAt: newSchedule.updatedAt,
      });
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Falha ao criar agendamento.',
      });
    }
  }

  // Atualizar agendamento existente
  static async updateSchedule(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { description, amount, date, frequency, type, categoryId, accountId, toAccountId } = req.body;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const updateData: any = {};
      if (description !== undefined) updateData.description = description;
      if (amount !== undefined) updateData.amount = parseFloat(amount);
      if (date !== undefined) updateData.date = new Date(date + 'T12:00:00');
      if (frequency !== undefined) updateData.frequency = frequency;
      if (type !== undefined) updateData.type = type;
      if (categoryId !== undefined) updateData.categoryId = categoryId || null;
      if (accountId !== undefined) updateData.accountId = accountId;
      if (toAccountId !== undefined) updateData.toAccountId = toAccountId || null;

      const updatedSchedule = await ScheduleService.updateSchedule(userId, id, updateData);

      res.status(200).json({
        id: updatedSchedule.id,
        description: updatedSchedule.description,
        amount: Number(updatedSchedule.amount),
        date: updatedSchedule.date.toISOString().split('T')[0],
        frequency: updatedSchedule.frequency,
        type: updatedSchedule.type,
        categoryId: updatedSchedule.categoryId || null,
        accountId: updatedSchedule.accountId,
        toAccountId: updatedSchedule.toAccountId || null,
        createdAt: updatedSchedule.createdAt,
        updatedAt: updatedSchedule.updatedAt,
      });
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      if (error instanceof Error && error.message.includes('não encontrado')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Falha ao atualizar agendamento.',
      });
    }
  }

  // Deletar agendamento
  static async deleteSchedule(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const result = await ScheduleService.deleteSchedule(userId, id);
      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      if (error instanceof Error && error.message.includes('não encontrado')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Falha ao excluir agendamento.',
      });
    }
  }
}
