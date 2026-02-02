import { prisma } from '../prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { decrypt } from './encryptionService';

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
          categoryName: decrypt(userId, expense.category.name) ?? expense.category.name,
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
            categoryName: decrypt(userId, expense.category.name) ?? expense.category.name,
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

  /**
   * Gera relatório de receitas por categoria com evolução mês a mês
   */
  static async getIncomeByCategoryReport(
    userId: string,
    startDate: Date,
    endDate: Date
  ) {
    // Buscar todas as receitas do período
    const incomes = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'income',
        date: {
          gte: startDate,
          lte: endDate,
        },
        categoryId: {
          not: null,
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        date: 'asc',
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

    incomes.forEach(income => {
      if (!income.categoryId || !income.category) return;

      const existing = categoryMap.get(income.categoryId);
      const amount = income.amount.toNumber();

      if (existing) {
        existing.totalAmount += amount;
        existing.transactionCount += 1;
      } else {
        categoryMap.set(income.categoryId, {
          categoryId: income.categoryId,
          categoryName: decrypt(userId, income.category.name) ?? income.category.name,
          categoryIcon: income.category.icon || undefined,
          categoryColor: income.category.color || undefined,
          totalAmount: amount,
          transactionCount: 1,
        });
      }
    });

    // Calcular total e porcentagens
    const totalIncome = Array.from(categoryMap.values())
      .reduce((sum, cat) => sum + cat.totalAmount, 0);

    const incomeByCategory = Array.from(categoryMap.values())
      .map(cat => ({
        ...cat,
        percentage: totalIncome > 0 ? (cat.totalAmount / totalIncome) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Calcular evolução mês a mês
    const monthlyEvolution = new Map<string, {
      month: string;
      monthLabel: string;
      total: number;
      byCategory: Map<string, number>;
    }>();

    incomes.forEach(income => {
      if (!income.categoryId) return;

      const date = new Date(income.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

      let monthData = monthlyEvolution.get(monthKey);
      if (!monthData) {
        monthData = {
          month: monthKey,
          monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
          total: 0,
          byCategory: new Map(),
        };
        monthlyEvolution.set(monthKey, monthData);
      }

      const amount = income.amount.toNumber();
      monthData.total += amount;

      const categoryAmount = monthData.byCategory.get(income.categoryId) || 0;
      monthData.byCategory.set(income.categoryId, categoryAmount + amount);
    });

    // Converter evolução mensal para array ordenado
    const monthlyEvolutionArray = Array.from(monthlyEvolution.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(month => ({
        month: month.month,
        monthLabel: month.monthLabel,
        total: month.total,
        byCategory: Array.from(month.byCategory.entries()).map(([categoryId, amount]) => {
          const category = categoryMap.get(categoryId);
          return {
            categoryId,
            categoryName: category?.categoryName || 'Desconhecida',
            amount,
          };
        }),
      }));

    return {
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      totalIncome,
      incomeByCategory,
      monthlyEvolution: monthlyEvolutionArray,
    };
  }

  /**
   * Gera relatório de Fluxo de Caixa (Cash Flow)
   * Com entradas, saídas, saldo e evolução temporal
   */
  static async getCashFlowReport(
    userId: string,
    startDate: Date,
    endDate: Date,
    granularity: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ) {
    // Buscar todas as transações do período (receitas e despesas)
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: {
          in: ['income', 'expense'],
        },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Calcular totais
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(transaction => {
      const amount = transaction.amount.toNumber();
      if (transaction.type === 'income') {
        totalIncome += amount;
      } else if (transaction.type === 'expense') {
        totalExpense += amount;
      }
    });

    const balance = totalIncome - totalExpense;

    // Agrupar por período conforme granularidade
    const periodMap = new Map<string, {
      period: string;
      periodLabel: string;
      income: number;
      expense: number;
      balance: number;
      cumulativeBalance: number;
    }>();

    let cumulativeBalance = 0;

    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      let periodKey: string;
      let periodLabel: string;

      if (granularity === 'daily') {
        periodKey = date.toISOString().split('T')[0];
        periodLabel = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } else if (granularity === 'weekly') {
        // Calcular semana (semana começa na segunda-feira)
        const dayOfWeek = date.getDay();
        const monday = new Date(date);
        monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        periodKey = `${monday.getFullYear()}-W${String(Math.ceil((monday.getTime() - new Date(monday.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24 * 7))).padStart(2, '0')}`;
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        periodLabel = `${monday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${sunday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
      } else {
        // monthly
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        periodLabel = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        periodLabel = periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);
      }

      const amount = transaction.amount.toNumber();
      let periodData = periodMap.get(periodKey);

      if (!periodData) {
        periodData = {
          period: periodKey,
          periodLabel,
          income: 0,
          expense: 0,
          balance: 0,
          cumulativeBalance: 0,
        };
        periodMap.set(periodKey, periodData);
      }

      if (transaction.type === 'income') {
        periodData.income += amount;
      } else if (transaction.type === 'expense') {
        periodData.expense += amount;
      }

      periodData.balance = periodData.income - periodData.expense;
    });

    // Calcular saldo acumulado e ordenar por período
    const flowData = Array.from(periodMap.values())
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((period, index, array) => {
        // Calcular saldo acumulado
        const previousCumulative = index > 0 ? array[index - 1].cumulativeBalance : 0;
        period.cumulativeBalance = previousCumulative + period.balance;
        return period;
      });

    // Calcular tendência simples (regressão linear simples)
    // Usando os últimos períodos para prever os próximos
    const trendData = flowData.length >= 3 ? this.calculateTrend(flowData) : null;

    return {
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      summary: {
        totalIncome,
        totalExpense,
        balance,
      },
      granularity,
      flowData,
      trend: trendData,
    };
  }

  /**
   * Calcula tendência simples usando regressão linear
   */
  private static calculateTrend(flowData: Array<{ period: string; cumulativeBalance: number }>) {
    const n = flowData.length;
    if (n < 2) return null;

    // Usar os últimos períodos para calcular tendência
    const recentData = flowData.slice(-Math.min(n, 6)); // Últimos 6 períodos ou todos se menos
    const x = recentData.map((_, i) => i);
    const y = recentData.map(d => d.cumulativeBalance);

    // Calcular média
    const xMean = x.reduce((a, b) => a + b, 0) / x.length;
    const yMean = y.reduce((a, b) => a + b, 0) / y.length;

    // Calcular coeficientes da regressão linear
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < x.length; i++) {
      numerator += (x[i] - xMean) * (y[i] - yMean);
      denominator += Math.pow(x[i] - xMean, 2);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    // Prever próximos 3 períodos
    const forecast = [];
    const lastPeriodIndex = x.length - 1;
    for (let i = 1; i <= 3; i++) {
      const predictedValue = slope * (lastPeriodIndex + i) + intercept;
      forecast.push({
        period: `forecast-${i}`,
        periodLabel: `Previsão ${i}`,
        cumulativeBalance: predictedValue,
        isForecast: true,
      });
    }

    return {
      slope,
      intercept,
      forecast,
    };
  }

  /**
   * Gera relatório de Evolução do Saldo / Patrimônio
   * Mostra evolução do saldo total e patrimônio líquido ao longo dos meses
   */
  static async getBalanceEvolutionReport(
    userId: string,
    startDate: Date,
    endDate: Date
  ) {
    // Buscar todas as contas do usuário
    const accounts = await prisma.account.findMany({
      where: { userId },
    });

    // Buscar todos os holdings de ativos
    const assetHoldings = await prisma.assetHolding.findMany({
      where: { userId },
      include: {
        asset: true,
      },
    });

    // Calcular saldo atual total (soma dos saldos atuais das contas)
    const currentBalance = accounts.reduce((sum, acc) => sum + acc.balance.toNumber(), 0);
    
    // Calcular valor atual dos ativos
    const currentAssetValue = assetHoldings.reduce(
      (sum, holding) => sum + holding.currentValue.toNumber(),
      0
    );

    // Buscar todas as transações do período
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Calcular saldo inicial: saldo atual menos o impacto das transações do período
    let balanceAdjustment = 0;
    transactions.forEach(transaction => {
      const amount = transaction.amount.toNumber();
      if (transaction.type === 'income') {
        balanceAdjustment += amount;
      } else if (transaction.type === 'expense') {
        balanceAdjustment -= amount;
      }
      // Transferências e ajustes não afetam o saldo total
    });

    const initialBalance = currentBalance - balanceAdjustment;
    const initialNetWorth = initialBalance + currentAssetValue;

    // Agrupar transações por mês e calcular evolução
    const monthlyData = new Map<string, {
      month: string;
      monthLabel: string;
      totalBalance: number;
      assetValue: number;
      netWorth: number;
      transactions: number;
    }>();

    // Calcular saldo mês a mês
    let runningBalance = initialBalance;

    // Processar transações mês a mês
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const capitalizedMonthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

      let monthData = monthlyData.get(monthKey);
      if (!monthData) {
        monthData = {
          month: monthKey,
          monthLabel: capitalizedMonthLabel,
          totalBalance: runningBalance,
          assetValue: currentAssetValue, // Assumindo que o valor dos ativos é constante por enquanto
          netWorth: runningBalance + currentAssetValue,
          transactions: 0,
        };
        monthlyData.set(monthKey, monthData);
      }

      // Atualizar saldo baseado no tipo de transação
      const amount = transaction.amount.toNumber();
      
      if (transaction.type === 'income') {
        runningBalance += amount;
      } else if (transaction.type === 'expense') {
        runningBalance -= amount;
      }
      // Transferências e ajustes não alteram o saldo total

      monthData.totalBalance = runningBalance;
      monthData.netWorth = runningBalance + currentAssetValue;
      monthData.transactions += 1;
    });

    // Se não houver transações, criar pelo menos um ponto de dados inicial
    if (monthlyData.size === 0) {
      const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      const startMonthLabel = startDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      monthlyData.set(startMonth, {
        month: startMonth,
        monthLabel: startMonthLabel.charAt(0).toUpperCase() + startMonthLabel.slice(1),
        totalBalance: initialBalance,
        assetValue: currentAssetValue,
        netWorth: initialNetWorth,
        transactions: 0,
      });
    }

    // Converter para array e ordenar
    const evolutionData = Array.from(monthlyData.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((month, index, array) => {
        // Calcular variação percentual
        const previousMonth = index > 0 ? array[index - 1] : null;
        let balanceVariation = 0;
        let netWorthVariation = 0;

        if (previousMonth) {
          if (previousMonth.totalBalance !== 0) {
            balanceVariation = ((month.totalBalance - previousMonth.totalBalance) / Math.abs(previousMonth.totalBalance)) * 100;
          }
          if (previousMonth.netWorth !== 0) {
            netWorthVariation = ((month.netWorth - previousMonth.netWorth) / Math.abs(previousMonth.netWorth)) * 100;
          }
        }

        return {
          ...month,
          balanceVariation,
          netWorthVariation,
        };
      });

    // Calcular variação total do período
    const firstMonth = evolutionData[0];
    const lastMonth = evolutionData[evolutionData.length - 1];
    
    const totalBalanceVariation = firstMonth && lastMonth && firstMonth.totalBalance !== 0
      ? ((lastMonth.totalBalance - firstMonth.totalBalance) / Math.abs(firstMonth.totalBalance)) * 100
      : 0;

    const totalNetWorthVariation = firstMonth && lastMonth && firstMonth.netWorth !== 0
      ? ((lastMonth.netWorth - firstMonth.netWorth) / Math.abs(firstMonth.netWorth)) * 100
      : 0;

    return {
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      initial: {
        totalBalance: initialBalance,
        assetValue: currentAssetValue,
        netWorth: initialNetWorth,
      },
      final: {
        totalBalance: lastMonth?.totalBalance || initialBalance,
        assetValue: lastMonth?.assetValue || currentAssetValue,
        netWorth: lastMonth?.netWorth || initialNetWorth,
      },
      evolution: evolutionData,
      summary: {
        totalBalanceVariation,
        totalNetWorthVariation,
      },
    };
  }

  /**
   * Gera relatório de Metas Financeiras
   * Mostra progresso, percentual concluído e comparação de datas
   */
  static async getGoalsReport(userId: string) {
    // Buscar todas as metas do usuário
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: [
        { deadline: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    const now = new Date();
    const goalsData = goals.map(goal => {
      const targetAmount = goal.targetAmount.toNumber();
      const currentAmount = goal.currentAmount.toNumber();
      const percentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
      const isCompleted = currentAmount >= targetAmount;
      const remaining = Math.max(0, targetAmount - currentAmount);

      // Data prevista (deadline)
      const expectedDate = goal.deadline ? new Date(goal.deadline) : null;

      // Data real de conclusão (quando currentAmount >= targetAmount)
      // Usar updatedAt como aproximação se a meta estiver concluída
      const actualDate = isCompleted ? new Date(goal.updatedAt) : null;

      // Status da meta
      let status: 'on-track' | 'at-risk' | 'delayed' | 'completed' | 'no-deadline' = 'no-deadline';
      
      if (isCompleted) {
        status = 'completed';
      } else if (expectedDate) {
        const daysRemaining = Math.ceil((expectedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const totalDays = Math.ceil((expectedDate.getTime() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const daysElapsed = Math.ceil((now.getTime() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const expectedProgress = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;

        if (expectedProgress > percentage + 10) {
          status = 'delayed';
        } else if (expectedProgress > percentage - 5) {
          status = 'at-risk';
        } else {
          status = 'on-track';
        }
      }

      // Calcular progresso esperado baseado no tempo
      let expectedProgress = 0;
      if (expectedDate && !isCompleted) {
        const totalDays = Math.ceil((expectedDate.getTime() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const daysElapsed = Math.ceil((now.getTime() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        expectedProgress = totalDays > 0 ? Math.min(100, (daysElapsed / totalDays) * 100) : 0;
      }

      return {
        id: goal.id,
        name: decrypt(userId, goal.name) ?? goal.name,
        targetAmount,
        currentAmount,
        percentage: Math.min(100, percentage),
        remaining,
        isCompleted,
        expectedDate: expectedDate ? expectedDate.toISOString().split('T')[0] : null,
        actualDate: actualDate ? actualDate.toISOString().split('T')[0] : null,
        status,
        icon: goal.icon || null,
        color: goal.color || null,
        createdAt: goal.createdAt.toISOString().split('T')[0],
        expectedProgress,
      };
    });

    // Calcular estatísticas gerais
    const totalGoals = goalsData.length;
    const completedGoals = goalsData.filter(g => g.isCompleted).length;
    const onTrackGoals = goalsData.filter(g => g.status === 'on-track').length;
    const atRiskGoals = goalsData.filter(g => g.status === 'at-risk').length;
    const delayedGoals = goalsData.filter(g => g.status === 'delayed').length;
    const totalTarget = goalsData.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalCurrent = goalsData.reduce((sum, g) => sum + g.currentAmount, 0);
    const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

    // Calcular progresso cumulativo ao longo do tempo
    // Agrupar por mês baseado na criação e atualização das metas
    const cumulativeProgress = new Map<string, {
      month: string;
      monthLabel: string;
      goalsCreated: number;
      goalsCompleted: number;
      totalProgress: number;
      cumulativeAmount: number;
    }>();

    goals.forEach(goal => {
      // Mês de criação
      const createdAt = new Date(goal.createdAt);
      const createdMonth = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
      const createdMonthLabel = createdAt.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      
      let monthData = cumulativeProgress.get(createdMonth);
      if (!monthData) {
        monthData = {
          month: createdMonth,
          monthLabel: createdMonthLabel.charAt(0).toUpperCase() + createdMonthLabel.slice(1),
          goalsCreated: 0,
          goalsCompleted: 0,
          totalProgress: 0,
          cumulativeAmount: 0,
        };
        cumulativeProgress.set(createdMonth, monthData);
      }
      monthData.goalsCreated += 1;

      // Se a meta foi concluída, registrar no mês de conclusão
      const currentAmount = goal.currentAmount.toNumber();
      const targetAmount = goal.targetAmount.toNumber();
      if (currentAmount >= targetAmount) {
        const updatedAt = new Date(goal.updatedAt);
        const completedMonth = `${updatedAt.getFullYear()}-${String(updatedAt.getMonth() + 1).padStart(2, '0')}`;
        const completedMonthLabel = updatedAt.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        
        let completedMonthData = cumulativeProgress.get(completedMonth);
        if (!completedMonthData) {
          completedMonthData = {
            month: completedMonth,
            monthLabel: completedMonthLabel.charAt(0).toUpperCase() + completedMonthLabel.slice(1),
            goalsCreated: 0,
            goalsCompleted: 0,
            totalProgress: 0,
            cumulativeAmount: 0,
          };
          cumulativeProgress.set(completedMonth, completedMonthData);
        }
        completedMonthData.goalsCompleted += 1;
      }
    });

    // Calcular progresso acumulado mês a mês
    let cumulativeAmount = 0;
    const cumulativeData = Array.from(cumulativeProgress.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(month => {
        // Somar o progresso atual de todas as metas até este mês
        const goalsUpToMonth = goalsData.filter(g => {
          const goalCreated = new Date(g.createdAt);
          const goalMonth = `${goalCreated.getFullYear()}-${String(goalCreated.getMonth() + 1).padStart(2, '0')}`;
          return goalMonth <= month.month;
        });
        
        const currentProgress = goalsUpToMonth.reduce((sum, g) => sum + g.currentAmount, 0);
        const targetProgress = goalsUpToMonth.reduce((sum, g) => sum + g.targetAmount, 0);
        const progressPercentage = targetProgress > 0 ? (currentProgress / targetProgress) * 100 : 0;

        return {
          ...month,
          cumulativeAmount: currentProgress,
          cumulativeTarget: targetProgress,
          progressPercentage,
        };
      });

    return {
      summary: {
        totalGoals,
        completedGoals,
        onTrackGoals,
        atRiskGoals,
        delayedGoals,
        totalTarget,
        totalCurrent,
        overallProgress,
      },
      goals: goalsData,
      cumulativeProgress: cumulativeData,
    };
  }

  /**
   * Gera relatório de Dívidas e Obrigações
   * Baseado em agendamentos recorrentes de despesas
   */
  static async getDebtsReport(userId: string): Promise<{
    summary: {
      totalDebts: number;
      totalMonthlyImpact: number;
      totalDebtAmount: number;
      totalInterest: number;
      totalCost: number;
      totalPaid: number;
      totalRemaining: number;
    };
    debts: Array<{
      id: string;
      description: string;
      amount: number;
      monthlyImpact: number;
      frequency: string;
      startDate: string;
      lastPaymentDate: string;
      totalInstallments: number;
      remainingInstallments: number;
      paidInstallments: number;
      interestRate: number;
      estimatedInterest: number;
      totalAmount: number;
      totalInterest: number;
      totalCost: number;
      paidAmount: number;
      remainingAmount: number;
      remainingCost: number;
      categoryName: string;
      categoryIcon: string | null;
      categoryColor: string | null;
      accountName: string;
      daysUntilNextPayment: number;
    }>;
  }> {
    // Buscar todos os agendamentos de despesas recorrentes
    const schedules = await prisma.schedule.findMany({
      where: {
        userId,
        type: 'expense',
        frequency: {
          in: ['monthly', 'weekly', 'yearly'],
        },
      },
      include: {
        category: true,
        account: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    const now = new Date();
    const debtsData = schedules.map(schedule => {
      const amount = schedule.amount.toNumber();
      const scheduleDate = new Date(schedule.date);
      
      // Calcular impacto mensal
      let monthlyImpact = 0;
      if (schedule.frequency === 'monthly') {
        monthlyImpact = amount;
      } else if (schedule.frequency === 'weekly') {
        monthlyImpact = amount * 4.33; // Média de semanas por mês
      } else if (schedule.frequency === 'yearly') {
        monthlyImpact = amount / 12; // Impacto mensal proporcional
      }

      // Estimar juros (taxa padrão de 2% ao mês para dívidas)
      // Em um sistema real, isso viria de um campo específico
      const interestRate = 0.02; // 2% ao mês
      const estimatedInterest = amount * interestRate;

      // Calcular parcelas pagas e restantes
      // Para monthly: contar meses desde a data inicial até hoje
      // Para weekly: contar semanas desde a data inicial até hoje
      let paidInstallments = 0;
      let totalInstallments = 0;
      
      if (schedule.frequency === 'monthly') {
        // Calcular meses desde a data inicial
        const startDate = new Date(schedule.date);
        const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + 
                          (now.getMonth() - startDate.getMonth());
        paidInstallments = Math.max(0, monthsDiff);
        
        // Estimar total de parcelas (assumindo 12 meses ou até a data atual + 12 meses)
        const estimatedEndDate = new Date(startDate);
        estimatedEndDate.setMonth(estimatedEndDate.getMonth() + 12);
        totalInstallments = Math.max(1, Math.ceil(
          (estimatedEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        ));
      } else if (schedule.frequency === 'weekly') {
        // Calcular semanas desde a data inicial
        const startDate = new Date(schedule.date);
        const weeksDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
        paidInstallments = Math.max(0, weeksDiff);
        
        // Estimar total de parcelas (assumindo 52 semanas ou 1 ano)
        totalInstallments = 52;
      } else if (schedule.frequency === 'yearly') {
        // Calcular anos desde a data inicial
        const startDate = new Date(schedule.date);
        const yearsDiff = now.getFullYear() - startDate.getFullYear();
        paidInstallments = Math.max(0, yearsDiff);
        totalInstallments = 20; // Estimativa de 20 anos para dívidas anuais
      }

      const remainingInstallments = Math.max(0, totalInstallments - paidInstallments);
      
      // Calcular prazo de quitação (data da última parcela)
      const lastPaymentDate = new Date(scheduleDate);
      if (schedule.frequency === 'monthly') {
        lastPaymentDate.setMonth(lastPaymentDate.getMonth() + (totalInstallments - 1));
      } else if (schedule.frequency === 'weekly') {
        lastPaymentDate.setDate(lastPaymentDate.getDate() + ((totalInstallments - 1) * 7));
      } else if (schedule.frequency === 'yearly') {
        lastPaymentDate.setFullYear(lastPaymentDate.getFullYear() + (totalInstallments - 1));
      }

      // Calcular valor total (valor das parcelas + juros estimados)
      const totalAmount = amount * totalInstallments;
      const totalInterest = estimatedInterest * totalInstallments;
      const totalCost = totalAmount + totalInterest;

      // Calcular valor já pago
      const paidAmount = amount * paidInstallments;
      const remainingAmount = totalAmount - paidAmount;

      // Calcular custo total restante (incluindo juros)
      const remainingCost = remainingAmount + (estimatedInterest * remainingInstallments);

      return {
        id: schedule.id,
        description: decrypt(userId, schedule.description) ?? schedule.description,
        amount,
        monthlyImpact,
        frequency: schedule.frequency,
        startDate: schedule.date.toISOString().split('T')[0],
        lastPaymentDate: lastPaymentDate.toISOString().split('T')[0],
        totalInstallments,
        remainingInstallments,
        paidInstallments,
        interestRate: interestRate * 100, // Em percentual
        estimatedInterest,
        totalAmount,
        totalInterest,
        totalCost,
        paidAmount,
        remainingAmount,
        remainingCost,
        categoryName: (schedule.category ? (decrypt(userId, schedule.category.name) ?? schedule.category.name) : null) || 'Sem categoria',
        categoryIcon: schedule.category?.icon || null,
        categoryColor: schedule.category?.color || null,
        accountName: decrypt(userId, schedule.account.name) ?? schedule.account.name,
        daysUntilNextPayment: Math.ceil((scheduleDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      };
    });

    // Ordenar por custo total (mais caras primeiro)
    const sortedDebts = debtsData.sort((a, b) => b.totalCost - a.totalCost);

    // Calcular impacto mensal total
    const totalMonthlyImpact = debtsData.reduce((sum, debt) => sum + debt.monthlyImpact, 0);

    // Calcular totais
    const totalDebtAmount = debtsData.reduce((sum, debt) => sum + debt.totalAmount, 0);
    const totalInterest = debtsData.reduce((sum, debt) => sum + debt.totalInterest, 0);
    const totalCost = debtsData.reduce((sum, debt) => sum + debt.totalCost, 0);
    const totalPaid = debtsData.reduce((sum, debt) => sum + debt.paidAmount, 0);
    const totalRemaining = debtsData.reduce((sum, debt) => sum + debt.remainingCost, 0);

    return {
      summary: {
        totalDebts: debtsData.length,
        totalMonthlyImpact,
        totalDebtAmount,
        totalInterest,
        totalCost,
        totalPaid,
        totalRemaining,
      },
      debts: sortedDebts,
    };
  }

  /**
   * Gera relatório de Investimentos
   * Mostra distribuição por ativos e evolução patrimonial
   */
  static async getInvestmentsReport(
    userId: string,
    startDate: Date,
    endDate: Date,
    assetId?: string
  ): Promise<{
    period: {
      startDate: string;
      endDate: string;
    };
    summary: {
      totalAssets: number;
      totalValue: number;
      totalInvested: number;
      totalReturn: number;
      returnPercentage: number;
    };
    distribution: Array<{
      assetId: string;
      assetName: string;
      assetColor: string | null;
      incomeType: string;
      currentValue: number;
      investedAmount: number;
      return: number;
      returnPercentage: number;
      percentage: number;
    }>;
    evolution: Array<{
      month: string;
      monthLabel: string;
      totalValue: number;
      byAsset: Array<{
        assetId: string;
        assetName: string;
        value: number;
      }>;
    }>;
  }> {
    // Buscar todos os holdings de ativos do usuário
    const assetHoldings = await prisma.assetHolding.findMany({
      where: {
        userId,
        ...(assetId ? { assetId } : {}),
      },
      include: {
        asset: true,
      },
    });

    // Buscar todas as transações de investimento (transferências com assetId)
    const investmentTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'transfer',
        assetId: assetId ? assetId : { not: null },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        asset: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Calcular valores atuais e distribuídos
    const totalValue = assetHoldings.reduce((sum, holding) => sum + holding.currentValue.toNumber(), 0);

    // Calcular valor investido (soma das transferências para investimentos)
    const investedByAsset = new Map<string, number>();
    investmentTransactions.forEach(transaction => {
      if (transaction.assetId) {
        const amount = transaction.amount.toNumber();
        const existing = investedByAsset.get(transaction.assetId) || 0;
        investedByAsset.set(transaction.assetId, existing + amount);
      }
    });

    // Calcular distribuição por ativo
    const distribution = assetHoldings.map(holding => {
      const currentValue = holding.currentValue.toNumber();
      const investedAmount = investedByAsset.get(holding.assetId) || 0;
      const returnAmount = currentValue - investedAmount;
      const returnPercentage = investedAmount > 0 ? (returnAmount / investedAmount) * 100 : 0;
      const percentage = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;

      return {
        assetId: holding.assetId,
        assetName: decrypt(userId, holding.asset.name) ?? holding.asset.name,
        assetColor: holding.asset.color,
        incomeType: holding.asset.incomeType,
        currentValue,
        investedAmount,
        return: returnAmount,
        returnPercentage,
        percentage,
      };
    }).sort((a, b) => b.currentValue - a.currentValue);

    // Calcular totais
    const totalInvested = distribution.reduce((sum, asset) => sum + asset.investedAmount, 0);
    const totalReturn = distribution.reduce((sum, asset) => sum + asset.return, 0);
    const totalReturnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    // Calcular evolução mensal baseada nas transações de investimento
    // Agrupar transações por mês e calcular valor acumulado investido
    const monthlyEvolution = new Map<string, {
      month: string;
      monthLabel: string;
      investedByAsset: Map<string, { assetId: string; assetName: string; invested: number }>;
    }>();

    // Processar transações de investimento
    investmentTransactions.forEach(transaction => {
      if (!transaction.assetId || !transaction.asset) return;

      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const capitalizedMonthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

      let monthData = monthlyEvolution.get(monthKey);
      if (!monthData) {
        monthData = {
          month: monthKey,
          monthLabel: capitalizedMonthLabel,
          investedByAsset: new Map(),
        };
        monthlyEvolution.set(monthKey, monthData);
      }

      const amount = transaction.amount.toNumber();
      const existing = monthData.investedByAsset.get(transaction.assetId);
      if (existing) {
        existing.invested += amount;
      } else {
        monthData.investedByAsset.set(transaction.assetId, {
          assetId: transaction.assetId,
          assetName: decrypt(userId, transaction.asset.name) ?? transaction.asset.name,
          invested: amount,
        });
      }
    });

    // Calcular valor acumulado investido mês a mês
    const investedByAssetAccumulated = new Map<string, number>();
    const evolutionData = Array.from(monthlyEvolution.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(month => {
        // Atualizar valores acumulados por ativo
        month.investedByAsset.forEach((assetData, assetId) => {
          const current = investedByAssetAccumulated.get(assetId) || 0;
          investedByAssetAccumulated.set(assetId, current + assetData.invested);
        });

        // Calcular valor total acumulado (investido até o momento)
        const totalInvested = Array.from(investedByAssetAccumulated.values())
          .reduce((sum, val) => sum + val, 0);

        // Para cada ativo, usar o valor atual do holding se disponível
        // ou o valor investido acumulado como aproximação
        const byAsset = Array.from(investedByAssetAccumulated.entries()).map(([assetId, invested]) => {
          const holding = assetHoldings.find(h => h.assetId === assetId);
          // Se temos um holding, usar o valor atual; senão, usar o investido
          const value = holding ? holding.currentValue.toNumber() : invested;
          
          const asset = holding?.asset || assetHoldings.find(h => h.assetId === assetId)?.asset;
          return {
            assetId,
            assetName: (asset ? (decrypt(userId, asset.name) ?? asset.name) : null) || 'Desconhecido',
            value,
          };
        });

        return {
          month: month.month,
          monthLabel: month.monthLabel,
          totalValue: totalInvested, // Usar valor investido acumulado como base
          byAsset,
        };
      });

    // Se não houver transações, usar valores atuais dos holdings
    if (evolutionData.length === 0) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const currentMonthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      
      evolutionData.push({
        month: currentMonth,
        monthLabel: currentMonthLabel.charAt(0).toUpperCase() + currentMonthLabel.slice(1),
        totalValue,
        byAsset: assetHoldings.map(holding => ({
          assetId: holding.assetId,
          assetName: decrypt(userId, holding.asset.name) ?? holding.asset.name,
          value: holding.currentValue.toNumber(),
        })),
      });
    }

    return {
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      summary: {
        totalAssets: assetHoldings.length,
        totalValue,
        totalInvested,
        totalReturn,
        returnPercentage: totalReturnPercentage,
      },
      distribution,
      evolution: evolutionData,
    };
  }

  /**
   * Gera relatório de Orçamento
   * Compara orçamento planejado vs realizado por categoria
   */
  static async getBudgetReport(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    period: {
      startDate: string;
      endDate: string;
    };
    summary: {
      totalBudgets: number;
      totalPlanned: number;
      totalSpent: number;
      totalRemaining: number;
      averageUsage: number;
      categoriesOverBudget: number;
      categoriesUnderBudget: number;
      categoriesOnBudget: number;
    };
    budgets: Array<{
      budgetId: string;
      categoryId: string;
      categoryName: string;
      categoryIcon: string | null;
      categoryColor: string | null;
      planned: number;
      spent: number;
      remaining: number;
      usagePercentage: number;
      variation: number;
      variationPercentage: number;
      status: 'over' | 'under' | 'on-track';
    }>;
    overBudget: Array<{
      budgetId: string;
      categoryId: string;
      categoryName: string;
      categoryIcon: string | null;
      categoryColor: string | null;
      planned: number;
      spent: number;
      exceeded: number;
      usagePercentage: number;
    }>;
    underBudget: Array<{
      budgetId: string;
      categoryId: string;
      categoryName: string;
      categoryIcon: string | null;
      categoryColor: string | null;
      planned: number;
      spent: number;
      saved: number;
      usagePercentage: number;
    }>;
  }> {
    // Buscar todos os orçamentos do usuário
    const budgets = await prisma.budget.findMany({
      where: {
        userId,
      },
      include: {
        category: true,
      },
    });

    // Buscar todas as transações de despesa no período
    const expenseTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'expense',
        date: {
          gte: startDate,
          lte: endDate,
        },
        categoryId: {
          not: null,
        },
      },
    });

    // Calcular gasto por categoria
    const spentByCategory = new Map<string, number>();
    expenseTransactions.forEach(transaction => {
      if (transaction.categoryId) {
        const amount = transaction.amount.toNumber();
        const existing = spentByCategory.get(transaction.categoryId) || 0;
        spentByCategory.set(transaction.categoryId, existing + amount);
      }
    });

    // Processar cada orçamento
    const budgetData = budgets.map(budget => {
      const planned = budget.limit.toNumber();
      const spent = spentByCategory.get(budget.categoryId) || 0;
      const remaining = planned - spent;
      const usagePercentage = planned > 0 ? (spent / planned) * 100 : 0;
      const variation = spent - planned;
      const variationPercentage = planned > 0 ? (variation / planned) * 100 : 0;
      
      let status: 'over' | 'under' | 'on-track';
      if (spent > planned) {
        status = 'over';
      } else if (spent < planned * 0.9) { // Considera "under" se gastou menos de 90%
        status = 'under';
      } else {
        status = 'on-track';
      }

      return {
        budgetId: budget.id,
        categoryId: budget.categoryId,
        categoryName: decrypt(userId, budget.category.name) ?? budget.category.name,
        categoryIcon: budget.category.icon,
        categoryColor: budget.category.color,
        planned,
        spent,
        remaining,
        usagePercentage,
        variation,
        variationPercentage,
        status,
      };
    });

    // Separar por status
    const overBudget = budgetData
      .filter(b => b.status === 'over')
      .map(b => ({
        budgetId: b.budgetId,
        categoryId: b.categoryId,
        categoryName: b.categoryName,
        categoryIcon: b.categoryIcon,
        categoryColor: b.categoryColor,
        planned: b.planned,
        spent: b.spent,
        exceeded: b.spent - b.planned,
        usagePercentage: b.usagePercentage,
      }))
      .sort((a, b) => b.exceeded - a.exceeded); // Ordenar por maior excesso

    const underBudget = budgetData
      .filter(b => b.status === 'under')
      .map(b => ({
        budgetId: b.budgetId,
        categoryId: b.categoryId,
        categoryName: b.categoryName,
        categoryIcon: b.categoryIcon,
        categoryColor: b.categoryColor,
        planned: b.planned,
        spent: b.spent,
        saved: b.planned - b.spent,
        usagePercentage: b.usagePercentage,
      }))
      .sort((a, b) => b.saved - a.saved); // Ordenar por maior economia

    // Calcular resumo
    const totalPlanned = budgetData.reduce((sum, b) => sum + b.planned, 0);
    const totalSpent = budgetData.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = totalPlanned - totalSpent;
    const averageUsage = budgetData.length > 0
      ? budgetData.reduce((sum, b) => sum + b.usagePercentage, 0) / budgetData.length
      : 0;

    return {
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      summary: {
        totalBudgets: budgets.length,
        totalPlanned,
        totalSpent,
        totalRemaining,
        averageUsage,
        categoriesOverBudget: overBudget.length,
        categoriesUnderBudget: underBudget.length,
        categoriesOnBudget: budgetData.filter(b => b.status === 'on-track').length,
      },
      budgets: budgetData.sort((a, b) => b.usagePercentage - a.usagePercentage), // Ordenar por maior uso
      overBudget,
      underBudget,
    };
  }

  /**
   * Gera relatório Anual
   * Resumo dos 12 meses, totais anuais, melhores/piores meses e insights
   */
  static async getAnnualReport(
    userId: string,
    year: number
  ): Promise<{
    year: number;
    summary: {
      totalIncome: number;
      totalExpenses: number;
      netBalance: number;
      averageMonthlyIncome: number;
      averageMonthlyExpenses: number;
      averageMonthlyBalance: number;
      bestMonth: {
        month: number;
        monthLabel: string;
        balance: number;
        income: number;
        expenses: number;
      } | null;
      worstMonth: {
        month: number;
        monthLabel: string;
        balance: number;
        income: number;
        expenses: number;
      } | null;
      monthsWithPositiveBalance: number;
      monthsWithNegativeBalance: number;
    };
    monthlyData: Array<{
      month: number;
      monthLabel: string;
      income: number;
      expenses: number;
      balance: number;
      incomeVariation: number;
      expensesVariation: number;
      balanceVariation: number;
    }>;
    insights: Array<{
      type: 'positive' | 'warning' | 'info';
      title: string;
      description: string;
    }>;
    topCategories: {
      income: Array<{
        categoryId: string;
        categoryName: string;
        categoryIcon: string | null;
        categoryColor: string | null;
        total: number;
        percentage: number;
      }>;
      expenses: Array<{
        categoryId: string;
        categoryName: string;
        categoryIcon: string | null;
        categoryColor: string | null;
        total: number;
        percentage: number;
      }>;
    };
  }> {
    // Definir período do ano
    const startDate = new Date(year, 0, 1); // 1º de janeiro
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999); // 31 de dezembro

    // Buscar todas as transações do ano
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        type: {
          in: ['income', 'expense'],
        },
      },
      include: {
        category: true,
      },
    });

    // Agrupar por mês
    const monthlyDataMap = new Map<number, {
      income: number;
      expenses: number;
    }>();

    // Inicializar todos os meses
    for (let month = 0; month < 12; month++) {
      monthlyDataMap.set(month, { income: 0, expenses: 0 });
    }

    // Processar transações
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const month = date.getMonth();
      const amount = transaction.amount.toNumber();

      const monthData = monthlyDataMap.get(month) || { income: 0, expenses: 0 };

      if (transaction.type === 'income') {
        monthData.income += amount;
      } else if (transaction.type === 'expense') {
        monthData.expenses += amount;
      }

      monthlyDataMap.set(month, monthData);
    });

    // Calcular dados mensais com variações
    const monthlyData: Array<{
      month: number;
      monthLabel: string;
      income: number;
      expenses: number;
      balance: number;
      incomeVariation: number;
      expensesVariation: number;
      balanceVariation: number;
    }> = [];

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    let previousIncome = 0;
    let previousExpenses = 0;
    let previousBalance = 0;

    for (let month = 0; month < 12; month++) {
      const monthDataEntry = monthlyDataMap.get(month) || { income: 0, expenses: 0 };
      const income = monthDataEntry.income;
      const expenses = monthDataEntry.expenses;
      const balance = income - expenses;

      const incomeVariation = previousIncome > 0
        ? ((income - previousIncome) / previousIncome) * 100
        : 0;
      const expensesVariation = previousExpenses > 0
        ? ((expenses - previousExpenses) / previousExpenses) * 100
        : 0;
      const balanceVariation = previousBalance !== 0
        ? ((balance - previousBalance) / Math.abs(previousBalance)) * 100
        : 0;

      monthlyData.push({
        month: month + 1,
        monthLabel: monthNames[month],
        income,
        expenses,
        balance,
        incomeVariation,
        expensesVariation,
        balanceVariation,
      });

      previousIncome = income;
      previousExpenses = expenses;
      previousBalance = balance;
    }

    // Calcular totais anuais
    const totalIncome = monthlyData.reduce((sum, m) => sum + m.income, 0);
    const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0);
    const netBalance = totalIncome - totalExpenses;
    const averageMonthlyIncome = totalIncome / 12;
    const averageMonthlyExpenses = totalExpenses / 12;
    const averageMonthlyBalance = netBalance / 12;

    // Encontrar melhor e pior mês (baseado no saldo)
    const bestMonth = monthlyData.reduce((best, current) => {
      if (!best || current.balance > best.balance) {
        return current;
      }
      return best;
    }, null as typeof monthlyData[0] | null);

    const worstMonth = monthlyData.reduce((worst, current) => {
      if (!worst || current.balance < worst.balance) {
        return current;
      }
      return worst;
    }, null as typeof monthlyData[0] | null);

    const monthsWithPositiveBalance = monthlyData.filter(m => m.balance > 0).length;
    const monthsWithNegativeBalance = monthlyData.filter(m => m.balance < 0).length;

    // Calcular top categorias
    const incomeByCategory = new Map<string, {
      categoryId: string;
      categoryName: string;
      categoryIcon: string | null;
      categoryColor: string | null;
      total: number;
    }>();

    const expensesByCategory = new Map<string, {
      categoryId: string;
      categoryName: string;
      categoryIcon: string | null;
      categoryColor: string | null;
      total: number;
    }>();

    transactions.forEach(transaction => {
      if (!transaction.categoryId || !transaction.category) return;

      const amount = transaction.amount.toNumber();
      const categoryData = {
        categoryId: transaction.categoryId,
        categoryName: decrypt(userId, transaction.category.name) ?? transaction.category.name,
        categoryIcon: transaction.category.icon,
        categoryColor: transaction.category.color,
        total: 0,
      };

      if (transaction.type === 'income') {
        const existing = incomeByCategory.get(transaction.categoryId);
        if (existing) {
          existing.total += amount;
        } else {
          categoryData.total = amount;
          incomeByCategory.set(transaction.categoryId, categoryData);
        }
      } else if (transaction.type === 'expense') {
        const existing = expensesByCategory.get(transaction.categoryId);
        if (existing) {
          existing.total += amount;
        } else {
          categoryData.total = amount;
          expensesByCategory.set(transaction.categoryId, categoryData);
        }
      }
    });

    const topIncomeCategories = Array.from(incomeByCategory.values())
      .map(cat => ({
        ...cat,
        percentage: totalIncome > 0 ? (cat.total / totalIncome) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const topExpenseCategories = Array.from(expensesByCategory.values())
      .map(cat => ({
        ...cat,
        percentage: totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Gerar insights
    const insights: Array<{
      type: 'positive' | 'warning' | 'info';
      title: string;
      description: string;
    }> = [];

    // Insight sobre saldo anual
    if (netBalance > 0) {
      insights.push({
        type: 'positive',
        title: 'Saldo Positivo no Ano',
        description: `Você teve um saldo positivo de R$ ${netBalance.toFixed(2)} no ano de ${year}. Isso indica uma boa gestão financeira.`,
      });
    } else if (netBalance < 0) {
      insights.push({
        type: 'warning',
        title: 'Saldo Negativo no Ano',
        description: `O saldo anual foi negativo em R$ ${Math.abs(netBalance).toFixed(2)}. Considere revisar suas despesas ou aumentar suas receitas.`,
      });
    }

    // Insight sobre melhor mês
    if (bestMonth && bestMonth.balance > 0) {
      insights.push({
        type: 'positive',
        title: `Melhor Mês: ${bestMonth.monthLabel}`,
        description: `${bestMonth.monthLabel} foi seu melhor mês com saldo de R$ ${bestMonth.balance.toFixed(2)} (receitas: R$ ${bestMonth.income.toFixed(2)}, despesas: R$ ${bestMonth.expenses.toFixed(2)}).`,
      });
    }

    // Insight sobre pior mês
    if (worstMonth && worstMonth.balance < 0) {
      insights.push({
        type: 'warning',
        title: `Atenção: ${worstMonth.monthLabel}`,
        description: `${worstMonth.monthLabel} foi o mês mais desafiador com saldo negativo de R$ ${Math.abs(worstMonth.balance).toFixed(2)}.`,
      });
    }

    // Insight sobre meses positivos
    if (monthsWithPositiveBalance >= 6) {
      insights.push({
        type: 'positive',
        title: 'Maioria dos Meses com Saldo Positivo',
        description: `Você teve saldo positivo em ${monthsWithPositiveBalance} dos 12 meses, o que é um bom indicador de consistência financeira.`,
      });
    } else if (monthsWithNegativeBalance >= 6) {
      insights.push({
        type: 'warning',
        title: 'Maioria dos Meses com Saldo Negativo',
        description: `Atenção: ${monthsWithNegativeBalance} meses tiveram saldo negativo. Considere revisar seu orçamento.`,
      });
    }

    // Insight sobre tendência
    const lastQuarter = monthlyData.slice(-3);
    const firstQuarter = monthlyData.slice(0, 3);
    const lastQuarterAvg = lastQuarter.reduce((sum, m) => sum + m.balance, 0) / 3;
    const firstQuarterAvg = firstQuarter.reduce((sum, m) => sum + m.balance, 0) / 3;

    if (lastQuarterAvg > firstQuarterAvg * 1.1) {
      insights.push({
        type: 'positive',
        title: 'Tendência de Melhoria',
        description: 'Seus últimos 3 meses mostraram uma melhoria significativa em relação ao início do ano.',
      });
    } else if (lastQuarterAvg < firstQuarterAvg * 0.9) {
      insights.push({
        type: 'warning',
        title: 'Tendência de Piora',
        description: 'Os últimos 3 meses mostraram uma piora em relação ao início do ano. Considere revisar seus gastos.',
      });
    }

    // Insight sobre média mensal
    if (averageMonthlyBalance > 0) {
      insights.push({
        type: 'info',
        title: 'Média Mensal Positiva',
        description: `Sua média mensal de saldo foi de R$ ${averageMonthlyBalance.toFixed(2)}, indicando uma boa capacidade de poupança.`,
      });
    }

    // Insight sobre maior receita
    const maxIncomeMonth = monthlyData.reduce((max, m) => m.income > max.income ? m : max, monthlyData[0]);
    if (maxIncomeMonth && maxIncomeMonth.income > 0) {
      insights.push({
        type: 'info',
        title: `Maior Receita: ${maxIncomeMonth.monthLabel}`,
        description: `${maxIncomeMonth.monthLabel} teve a maior receita do ano com R$ ${maxIncomeMonth.income.toFixed(2)}.`,
      });
    }

    // Insight sobre maior despesa
    const maxExpenseMonth = monthlyData.reduce((max, m) => m.expenses > max.expenses ? m : max, monthlyData[0]);
    if (maxExpenseMonth && maxExpenseMonth.expenses > 0) {
      insights.push({
        type: 'info',
        title: `Maior Despesa: ${maxExpenseMonth.monthLabel}`,
        description: `${maxExpenseMonth.monthLabel} teve a maior despesa do ano com R$ ${maxExpenseMonth.expenses.toFixed(2)}.`,
      });
    }

    return {
      year,
      summary: {
        totalIncome,
        totalExpenses,
        netBalance,
        averageMonthlyIncome,
        averageMonthlyExpenses,
        averageMonthlyBalance,
        bestMonth: bestMonth ? {
          month: bestMonth.month,
          monthLabel: bestMonth.monthLabel,
          balance: bestMonth.balance,
          income: bestMonth.income,
          expenses: bestMonth.expenses,
        } : null,
        worstMonth: worstMonth ? {
          month: worstMonth.month,
          monthLabel: worstMonth.monthLabel,
          balance: worstMonth.balance,
          income: worstMonth.income,
          expenses: worstMonth.expenses,
        } : null,
        monthsWithPositiveBalance,
        monthsWithNegativeBalance,
      },
      monthlyData,
      insights,
      topCategories: {
        income: topIncomeCategories,
        expenses: topExpenseCategories,
      },
    };
  }
}
