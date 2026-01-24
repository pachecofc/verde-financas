import React, { useState, useEffect, useRef } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Download,
  FileText,
  Calendar,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import api, { ExpenseReport } from '../services/api';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const Reports: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const reportRef = useRef<HTMLDivElement>(null);

  const loadReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Por favor, selecione as datas');
      return;
    }

    setLoading(true);
    try {
      const data = await api.report.getExpensesByCategory(startDate, endDate, true);
      setReport(data);
    } catch (error) {
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

      const fileName = `relatorio-despesas-${startDate}-${endDate}.pdf`;
      pdf.save(fileName);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const chartData = report?.expensesByCategory.map(cat => ({
    name: cat.categoryName,
    value: cat.totalAmount,
    percentage: cat.percentage.toFixed(1),
    color: cat.categoryColor || '#10b981',
  })) || [];

  const COLORS = chartData.map(item => item.color);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 dark:text-slate-100">{data.name}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {formatCurrency(data.value)} ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Relatórios</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Análise detalhada das suas despesas por categoria
          </p>
        </div>
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Data Final
            </label>
            <input
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
                    Relatório de Despesas por Categoria
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Período</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatDate(report.period.startDate)} - {formatDate(report.period.endDate)}
                </p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Gasto</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(report.totalExpenses)}
                </p>
              </div>
              {report.comparison && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Comparação com Período Anterior
                  </p>
                  <div className="flex items-center gap-2">
                    {report.comparison.totalDifference >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-red-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-emerald-600" />
                    )}
                    <p
                      className={`text-lg font-semibold ${
                        report.comparison.totalDifference >= 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {report.comparison.totalDifference >= 0 ? '+' : ''}
                      {formatCurrency(report.comparison.totalDifference)} (
                      {report.comparison.totalDifferencePercentage >= 0 ? '+' : ''}
                      {report.comparison.totalDifferencePercentage.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gráficos */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 sm:mb-0">
                Distribuição por Categoria
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setChartType('pie')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    chartType === 'pie'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Pizza
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    chartType === 'bar'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Barras
                </button>
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="h-96">
                {chartType === 'pie' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      />
                      <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
                                <p className="font-semibold text-slate-900 dark:text-slate-100">
                                  {data.name}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {formatCurrency(data.value)} ({data.percentage}%)
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                Nenhuma despesa encontrada no período selecionado.
              </div>
            )}
          </div>

          {/* Tabela de Categorias */}
          {report.expensesByCategory.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Detalhamento por Categoria
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Categoria
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Valor
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Percentual
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Transações
                      </th>
                      {report.comparison && (
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Variação
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {report.expensesByCategory.map((cat) => {
                      const comparison = report.comparison?.categoryComparisons.find(
                        (c) => c.categoryId === cat.categoryId
                      );
                      return (
                        <tr
                          key={cat.categoryId}
                          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {cat.categoryIcon && (
                                <span className="text-lg">{cat.categoryIcon}</span>
                              )}
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {cat.categoryName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(cat.totalAmount)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                            {cat.percentage.toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                            {cat.transactionCount}
                          </td>
                          {report.comparison && comparison && (
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {comparison.difference >= 0 ? (
                                  <TrendingUp className="w-4 h-4 text-red-600" />
                                ) : (
                                  <TrendingDown className="w-4 h-4 text-emerald-600" />
                                )}
                                <span
                                  className={
                                    comparison.difference >= 0
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-emerald-600 dark:text-emerald-400'
                                  }
                                >
                                  {comparison.difference >= 0 ? '+' : ''}
                                  {formatCurrency(comparison.difference)} (
                                  {comparison.differencePercentage >= 0 ? '+' : ''}
                                  {comparison.differencePercentage.toFixed(1)}%)
                                </span>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
