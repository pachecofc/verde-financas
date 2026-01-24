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
          categoryName: income.category.name,
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
}
