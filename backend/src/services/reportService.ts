import { prisma } from '../prisma';
import { Decimal } from '@prisma/client/runtime/library';

export interface ExpenseByCategory {
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  categoryColor?: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
}

export interface ExpenseReport {
  period: {
    startDate: string;
    endDate: string;
  };
  totalExpenses: number;
  expensesByCategory: ExpenseByCategory[];
  previousPeriod?: {
    startDate: string;
    endDate: string;
    totalExpenses: number;
    expensesByCategory: ExpenseByCategory[];
  };
  comparison?: {
    totalDifference: number;
    totalDifferencePercentage: number;
    categoryComparisons: Array<{
      categoryId: string;
      categoryName: string;
      currentAmount: number;
      previousAmount: number;
      difference: number;
      differencePercentage: number;
    }>;
  };
}

export class ReportService {
  /**
   * Gera relatório de despesas por categoria para um período específico
   */
  static async getExpensesByCategoryReport(
    userId: string,
    startDate: Date,
    endDate: Date,
    includeComparison: boolean = true
  ): Promise<ExpenseReport> {
    // Buscar todas as despesas do período
    const expenses = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'expense',
        date: {
          gte: startDate,
          lte: endDate,
        },
        categoryId: {
          not: null, // Apenas despesas com categoria
        },
      },
      include: {
        category: true,
      },
    });

    // Agrupar por categoria
    const categoryMap = new Map<string, {
      categoryId: string;
      categoryName: string;
      categoryIcon?: string;
      categoryColor?: string;
      totalAmount: number;
      transactionCount: number;
    }>();

    expenses.forEach(expense => {
      if (!expense.categoryId || !expense.category) return;

      const existing = categoryMap.get(expense.categoryId);
      const amount = expense.amount.toNumber();

      if (existing) {
        existing.totalAmount += amount;
        existing.transactionCount += 1;
      } else {
        categoryMap.set(expense.categoryId, {
          categoryId: expense.categoryId,
          categoryName: expense.category.name,
          categoryIcon: expense.category.icon || undefined,
          categoryColor: expense.category.color || undefined,
          totalAmount: amount,
          transactionCount: 1,
        });
      }
    });

    // Calcular total e porcentagens
    const totalExpenses = Array.from(categoryMap.values())
      .reduce((sum, cat) => sum + cat.totalAmount, 0);

    const expensesByCategory: ExpenseByCategory[] = Array.from(categoryMap.values())
      .map(cat => ({
        ...cat,
        percentage: totalExpenses > 0 ? (cat.totalAmount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount); // Ordenar por valor decrescente

    const report: ExpenseReport = {
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      totalExpenses,
      expensesByCategory,
    };

    // Se solicitado, incluir comparação com período anterior
    if (includeComparison) {
      const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const previousEndDate = new Date(startDate);
      previousEndDate.setDate(previousEndDate.getDate() - 1);
      const previousStartDate = new Date(previousEndDate);
      previousStartDate.setDate(previousStartDate.getDate() - periodDays);

      const previousExpenses = await prisma.transaction.findMany({
        where: {
          userId,
          type: 'expense',
          date: {
            gte: previousStartDate,
            lte: previousEndDate,
          },
          categoryId: {
            not: null,
          },
        },
        include: {
          category: true,
        },
      });

      // Agrupar período anterior por categoria
      const previousCategoryMap = new Map<string, {
        categoryId: string;
        categoryName: string;
        totalAmount: number;
      }>();

      previousExpenses.forEach(expense => {
        if (!expense.categoryId || !expense.category) return;

        const existing = previousCategoryMap.get(expense.categoryId);
        const amount = expense.amount.toNumber();

        if (existing) {
          existing.totalAmount += amount;
        } else {
          previousCategoryMap.set(expense.categoryId, {
            categoryId: expense.categoryId,
            categoryName: expense.category.name,
            totalAmount: amount,
          });
        }
      });

      const previousTotalExpenses = Array.from(previousCategoryMap.values())
        .reduce((sum, cat) => sum + cat.totalAmount, 0);

      const previousExpensesByCategory: ExpenseByCategory[] = Array.from(previousCategoryMap.values())
        .map(cat => ({
          ...cat,
          categoryIcon: undefined,
          categoryColor: undefined,
          percentage: previousTotalExpenses > 0 ? (cat.totalAmount / previousTotalExpenses) * 100 : 0,
          transactionCount: 0, // Não contamos transações no período anterior para simplificar
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);

      report.previousPeriod = {
        startDate: previousStartDate.toISOString().split('T')[0],
        endDate: previousEndDate.toISOString().split('T')[0],
        totalExpenses: previousTotalExpenses,
        expensesByCategory: previousExpensesByCategory,
      };

      // Calcular comparações
      const categoryComparisons = expensesByCategory.map(current => {
        const previous = previousCategoryMap.get(current.categoryId);
        const previousAmount = previous?.totalAmount || 0;
        const difference = current.totalAmount - previousAmount;
        const differencePercentage = previousAmount > 0
          ? ((difference / previousAmount) * 100)
          : (current.totalAmount > 0 ? 100 : 0);

        return {
          categoryId: current.categoryId,
          categoryName: current.categoryName,
          currentAmount: current.totalAmount,
          previousAmount,
          difference,
          differencePercentage,
        };
      });

      // Adicionar categorias que existiam apenas no período anterior
      previousCategoryMap.forEach((previous, categoryId) => {
        if (!categoryComparisons.find(c => c.categoryId === categoryId)) {
          categoryComparisons.push({
            categoryId,
            categoryName: previous.categoryName,
            currentAmount: 0,
            previousAmount: previous.totalAmount,
            difference: -previous.totalAmount,
            differencePercentage: -100,
          });
        }
      });

      const totalDifference = totalExpenses - previousTotalExpenses;
      const totalDifferencePercentage = previousTotalExpenses > 0
        ? ((totalDifference / previousTotalExpenses) * 100)
        : (totalExpenses > 0 ? 100 : 0);

      report.comparison = {
        totalDifference,
        totalDifferencePercentage,
        categoryComparisons: categoryComparisons.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference)),
      };
    }

    return report;
  }
}
