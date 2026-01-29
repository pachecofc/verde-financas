import { prisma } from '../prisma';
import { UserService } from './userService';
import { GamificationService } from './gamificationService';

/**
 * Serviço de cron job para executar tarefas agendadas
 * - Diariamente à meia-noite: hard delete de usuários expirados; INACTIVITY (7 dias sem login)
 * - Mensalmente no dia 1: fechamento do mês anterior (MONTH_BLUE, BUDGET_RESPECTED, BUDGET_OVERFLOW)
 */
export class CronService {
  private static dailyIntervalId: NodeJS.Timeout | null = null;
  private static monthlyIntervalId: NodeJS.Timeout | null = null;

  static start() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    setTimeout(() => {
      this.runDailyJobs();
      this.dailyIntervalId = setInterval(() => {
        this.runDailyJobs();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    const nextFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const msUntilFirst = nextFirst.getTime() - now.getTime();
    setTimeout(() => {
      this.runMonthlyJobs();
      this.monthlyIntervalId = setInterval(() => {
        this.runMonthlyJobs();
      }, 30 * 24 * 60 * 60 * 1000);
    }, Math.max(msUntilFirst, 0));

    console.log('✅ Cron jobs iniciados (hard delete + gamificação diária/mensal).');
  }

  static stop() {
    if (this.dailyIntervalId) {
      clearInterval(this.dailyIntervalId);
      this.dailyIntervalId = null;
    }
    if (this.monthlyIntervalId) {
      clearInterval(this.monthlyIntervalId);
      this.monthlyIntervalId = null;
    }
    console.log('⏹️ Cron jobs parados.');
  }

  private static async runDailyJobs() {
    try {
      await UserService.hardDeleteExpiredUsers();
    } catch (error) {
      console.error('❌ Erro no hard delete:', error);
    }
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const inactiveUsers = await prisma.user.findMany({
        where: {
          deletedAt: null,
          lastLoginAt: { not: null, lt: sevenDaysAgo },
        },
        select: { id: true },
      });
      for (const u of inactiveUsers) {
        const recentInactivity = await prisma.userScoreEvent.findFirst({
          where: { userId: u.id, ruleCode: 'INACTIVITY', createdAt: { gte: sevenDaysAgo } },
        });
        if (!recentInactivity) {
          await GamificationService.registerEvent(u.id, 'INACTIVITY').catch(() => {});
        }
      }
    } catch (error) {
      console.error('❌ Erro ao aplicar INACTIVITY:', error);
    }
  }

  private static async runMonthlyJobs() {
    try {
      const now = new Date();
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const users = await prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });
      for (const u of users) {
        await GamificationService.handleMonthlyClose(u.id, prevYear, prevMonth).catch(() => {});
      }
      console.log(`✅ Fechamento mensal de gamificação aplicado para ${users.length} usuário(s).`);
    } catch (error) {
      console.error('❌ Erro no fechamento mensal de gamificação:', error);
    }
  }
}
