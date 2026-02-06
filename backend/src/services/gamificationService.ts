import { prisma } from '../prisma';
import { ScoreService } from './scoreService';
import { GamificationRulesService } from './gamificationRulesService';
import { BudgetService } from './budgetService';

export interface RegisterEventContext {
  goalId?: string;
  [key: string]: unknown;
}

export class GamificationService {
  /**
   * Registra um evento de gamificação: aplica o delta de pontos da regra ao score do usuário
   * e persiste o evento no histórico (UserScoreEvent).
   */
  static async registerEvent(
    userId: string,
    ruleCode: string,
    context?: RegisterEventContext
  ): Promise<{ newScore: number } | null> {
    const rule = GamificationRulesService.getRuleByCode(ruleCode);
    if (!rule) return null;

    const current = await ScoreService.getOrCreateUserScore(userId);
    const delta = rule.points;
    const newScore = Math.max(0, Math.min(1000, current.score + delta));

    await ScoreService.updateUserScore(userId, newScore);

    await prisma.userScoreEvent.create({
      data: {
        userId,
        ruleCode,
        points: delta,
        metadata: context ? (context as object) : undefined,
      },
    });

    return { newScore };
  }

  /**
   * Verifica se o usuário já registrou o evento DAILY_LOG na data informada (1x/dia).
   */
  static async hasDailyLogForDate(userId: string, date: Date): Promise<boolean> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const count = await prisma.userScoreEvent.count({
      where: {
        userId,
        ruleCode: 'DAILY_LOG',
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    });
    return count > 0;
  }

  /**
   * Processa o fechamento do mês para um usuário: MONTH_BLUE, BUDGET_RESPECTED, BUDGET_OVERFLOW.
   * Deve ser chamado no início do mês seguinte (ex.: para jan/2026, chamar com year=2026, monthIndex=0).
   */
  static async handleMonthlyClose(userId: string, year: number, monthIndex: number): Promise<void> {
    const startOfMonth = new Date(year, monthIndex, 1);
    const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ['income', 'expense'] },
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { type: true, amount: true },
    });

    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      const n = Number(t.amount);
      if (t.type === 'income') income += n;
      else expense += n;
    }
    if (income > expense) {
      await this.registerEvent(userId, 'MONTH_BLUE').catch(() => {});
    }

    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: { category: true },
    });

    if (budgets.length === 0) return;

    const results = await Promise.all(
      budgets.map(async (b) => {
        const spent = await BudgetService.calculateSpentForMonth(userId, b.categoryId, year, monthIndex);
        const limit = Number(b.limit);
        const respected = spent <= limit;
        const isExpense = b.category.type === 'expense';
        return { respected, isExpense };
      })
    );

    const allRespected = results.every((r) => r.respected);
    const anyExpenseOverflow = results.some((r) => !r.respected && r.isExpense);
    if (allRespected) {
      await this.registerEvent(userId, 'BUDGET_RESPECTED').catch(() => {});
    } else if (anyExpenseOverflow) {
      await this.registerEvent(userId, 'BUDGET_OVERFLOW').catch(() => {});
    }
  }
}
