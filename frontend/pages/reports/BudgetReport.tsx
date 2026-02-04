import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Cell,
} from 'recharts';
import {
  Download,
  Calendar,
  Loader2,
  AlertCircle,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import api, { BudgetReport as BudgetReportType, SessionLostError } from '../../services/api';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface BudgetReportProps {
  onBack: () => void;
}

export const BudgetReport: React.FC<BudgetReportProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<BudgetReportType | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const reportRef = useRef<HTMLDivElement>(null);

  const loadReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Por favor, selecione as datas');
      return;
    }

    setLoading(true);
    try {
      const data = await api.report.getBudget(startDate, endDate);
      setReport(data);
    } catch (error) {
      if (error instanceof SessionLostError) return;
      const message = error instanceof Error ? error.message : 'Erro ao carregar relatório';
      toast.error(message);
      console.error('Erro ao carregar relatório:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const exportToPDF = async () => {
    if (!reportRef.current || !report) {
      toast.error('Nenhum relatório para exportar');
      return;
    }

    try {
      toast.info('Gerando PDF...');
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `relatorio-orcamento-${startDate}-${endDate}.pdf`;
      pdf.save(fileName);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  // Preparar dados para gráfico de planejado vs realizado
  const comparisonChartData = report?.budgets.map(budget => ({
    name: budget.categoryName.length > 15 
      ? budget.categoryName.substring(0, 15) + '...' 
      : budget.categoryName,
    fullName: budget.categoryName,
    planejado: budget.planned,
    realizado: budget.spent,
    variacao: budget.variation,
    status: budget.status,
  })) || [];

  // Preparar dados para gráfico de uso percentual
  const usageChartData = report?.budgets
    .sort((a, b) => b.usagePercentage - a.usagePercentage)
    .slice(0, 10) // Top 10
    .map(budget => ({
      name: budget.categoryName.length > 15 
        ? budget.categoryName.substring(0, 15) + '...' 
        : budget.categoryName,
      fullName: budget.categoryName,
      uso: budget.usagePercentage,
      status: budget.status,
    })) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'over':
        return '#ef4444'; // red
      case 'under':
        return '#10b981'; // emerald
      case 'on-track':
        return '#3b82f6'; // blue
      default:
        return '#64748b'; // slate
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 dark:text-slate-100 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho com Botão Voltar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Relatórios
        </button>
        {report && (
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="budget-report-start" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Data Inicial
            </label>
            <input
              id="budget-report-start"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="budget-report-end" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Data Final
            </label>
            <input
              id="budget-report-end"
              name="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={loadReport}
            disabled={loading}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4" />
                Gerar Relatório
              </>
            )}
          </button>
        </div>
      </div>

      {/* Conteúdo do Relatório */}
      {loading && !report && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      )}

      {!loading && !report && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Nenhum relatório disponível. Selecione um período e clique em "Gerar Relatório".
          </p>
        </div>
      )}

      {report && (
        <div ref={reportRef} className="space-y-6">
          {/* Cabeçalho com Logo */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-600 dark:bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  V
                </div>
                <div>
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                    Verde<span className="text-emerald-600 dark:text-emerald-400">Finanças</span>
                  </span>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Relatório de Orçamento
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Gerado em {new Date().toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Resumo do Período
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Período</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatDate(report.period.startDate)} - {formatDate(report.period.endDate)}
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Planejado</p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(report.summary.totalPlanned)}
                </p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Realizado</p>
                <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(report.summary.totalSpent)}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${
                report.summary.totalRemaining >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-900/20'
                  : 'bg-red-50 dark:bg-red-900/20'
              }`}>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Saldo Restante</p>
                <p className={`text-xl font-bold ${
                  report.summary.totalRemaining >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(report.summary.totalRemaining)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total de Orçamentos</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {report.summary.totalBudgets}
                </p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Estouraram</p>
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {report.summary.categoriesOverBudget}
                </p>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Abaixo do Esperado</p>
                </div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {report.summary.categoriesUnderBudget}
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-blue-600" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">No Alvo</p>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {report.summary.categoriesOnBudget}
                </p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Uso Médio</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatPercentage(report.summary.averageUsage)}
              </p>
            </div>
          </div>

          {/* Gráfico: Planejado vs Realizado */}
          {comparisonChartData.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                Planejado vs Realizado por Categoria
              </h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={comparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="planejado" fill="#8b5cf6" name="Planejado" />
                    <Bar dataKey="realizado" fill="#f59e0b" name="Realizado" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Gráfico: Uso Percentual */}
          {usageChartData.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                Uso Percentual do Orçamento (Top 10)
              </h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="uso" name="Uso do Orçamento (%)">
                      {usageChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Categorias que Estouraram */}
          {report.overBudget.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Categorias que Estouraram o Orçamento ({report.overBudget.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Categoria
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Planejado
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Realizado
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Excedido
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Uso
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.overBudget.map((item) => (
                      <tr
                        key={item.budgetId}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {item.categoryIcon && (
                              <span className="text-lg">{item.categoryIcon}</span>
                            )}
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {item.categoryName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                          {formatCurrency(item.planned)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-orange-600 dark:text-orange-400">
                          {formatCurrency(item.spent)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-red-600 dark:text-red-400">
                          {formatCurrency(item.exceeded)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-red-600 dark:text-red-400">
                          {formatPercentage(item.usagePercentage)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Categorias que Ficaram Abaixo */}
          {report.underBudget.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Categorias Abaixo do Esperado ({report.underBudget.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Categoria
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Planejado
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Realizado
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Economizado
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Uso
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.underBudget.map((item) => (
                      <tr
                        key={item.budgetId}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {item.categoryIcon && (
                              <span className="text-lg">{item.categoryIcon}</span>
                            )}
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {item.categoryName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                          {formatCurrency(item.planned)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                          {formatCurrency(item.spent)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(item.saved)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                          {formatPercentage(item.usagePercentage)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabela Completa */}
          {report.budgets.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Detalhamento Completo
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Categoria
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Planejado
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Realizado
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Restante
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Variação
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Uso
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.budgets.map((budget) => (
                      <tr
                        key={budget.budgetId}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {budget.categoryIcon && (
                              <span className="text-lg">{budget.categoryIcon}</span>
                            )}
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {budget.categoryName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                          {formatCurrency(budget.planned)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-orange-600 dark:text-orange-400">
                          {formatCurrency(budget.spent)}
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold ${
                          budget.remaining >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(budget.remaining)}
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold ${
                          budget.variation >= 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {formatCurrency(budget.variation)} ({formatPercentage(budget.variationPercentage)})
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  budget.usagePercentage > 100
                                    ? 'bg-red-600'
                                    : budget.usagePercentage > 80
                                    ? 'bg-orange-500'
                                    : 'bg-emerald-600'
                                }`}
                                style={{ width: `${Math.min(budget.usagePercentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-400 w-12 text-right">
                              {formatPercentage(budget.usagePercentage)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {budget.status === 'over' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
                              <AlertTriangle className="w-3 h-3" />
                              Estourou
                            </span>
                          )}
                          {budget.status === 'under' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              Abaixo
                            </span>
                          )}
                          {budget.status === 'on-track' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
                              <Target className="w-3 h-3" />
                              No Alvo
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {report.budgets.length === 0 && (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-center">
              <Target className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                Nenhum orçamento encontrado para o período selecionado.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
