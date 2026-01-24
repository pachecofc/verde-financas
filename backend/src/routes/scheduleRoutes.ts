import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { ScheduleController } from '../controllers/scheduleController';

const router = Router();

// Todas as rotas de agendamentos serão protegidas pelo authMiddleware
router.use(authMiddleware);

// GET /api/schedules - Obter todos os agendamentos do usuário
router.get('/', ScheduleController.getSchedules);

// GET /api/schedules/:id - Obter um agendamento específico por ID
router.get('/:id', ScheduleController.getScheduleById);

// POST /api/schedules - Criar um novo agendamento
router.post('/', ScheduleController.createSchedule);

// PUT /api/schedules/:id - Atualizar um agendamento existente
router.put('/:id', ScheduleController.updateSchedule);

// DELETE /api/schedules/:id - Deletar um agendamento
router.delete('/:id', ScheduleController.deleteSchedule);

export default router;
