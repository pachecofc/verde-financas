import React, { useState, useEffect, useRef } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  Download,
  Calendar,
  Loader2,
  AlertCircle,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react';
import api, { CashFlowReport as CashFlowReportType, SessionLostError } from '../../services/api';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface CashFlowReportProps {
  onBack: () => void;
}

export const CashFlowReport: React.FC<CashFlowReportProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CashFlowReportType | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 5, 1); // Últimos 6 meses
    return firstDay.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [showTrend, setShowTrend] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);

  const loadReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Por favor, selecione as datas');
      return;
    }

    setLoading(true);
    try {
      const data = await api.report.getCashFlow(startDate, endDate, granularity);
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
  }, [granularity]);

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

      const fileName = `relatorio-fluxo-caixa-${startDate}-${endDate}.pdf`;
      pdf.save(fileName);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  // Preparar dados para o gráfico
  const chartData = report?.flowData.map(period => ({
    period: period.periodLabel,
    income: period.income,
    expense: period.expense,
    balance: period.balance,
    cumulativeBalance: period.cumulativeBalance,
    isForecast: period.isForecast || false,
  })) || [];

  // Preparar dados de previsão separadamente
  const forecastData = showTrend && report?.trend
    ? report.trend.forecast.map(f => ({
        period: f.periodLabel,
        income: null,
        expense: null,
        balance: null,
        cumulativeBalance: f.cumulativeBalance,
        isForecast: true,
      }))
    : [];

  // Combinar dados reais e previsão
  const chartDataWithForecast = [...chartData, ...forecastData];

  const getGranularityLabel = () => {
    switch (granularity) {
      case 'daily':
        return 'Diário';
      case 'weekly':
        return 'Semanal';
      case 'monthly':
        return 'Mensal';
      default:
        return 'Mensal';
    }
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
            <label htmlFor="cashflow-report-start" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Data Inicial
            </label>
            <input
              id="cashflow-report-start"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="cashflow-report-end" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Data Final
            </label>
            <input
              id="cashflow-report-end"
              name="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="cashflow-report-granularity" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Granularidade
            </label>
            <select
              id="cashflow-report-granularity"
              name="granularity"
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as 'daily' | 'weekly' | 'monthly')}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
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
                    Relatório de Fluxo de Caixa
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Período</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatDate(report.period.startDate)} - {formatDate(report.period.endDate)}
                </p>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Entradas</p>
                </div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(report.summary.totalIncome)}
                </p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Saídas</p>
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(report.summary.totalExpense)}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${
                report.summary.balance >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-900/20'
                  : 'bg-red-50 dark:bg-red-900/20'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className={`w-4 h-4 ${
                    report.summary.balance >= 0
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`} />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Saldo do Período</p>
                </div>
                <p className={`text-2xl font-bold ${
                  report.summary.balance >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(report.summary.balance)}
                </p>
              </div>
            </div>
          </div>

          {/* Gráfico de Fluxo de Caixa */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  Fluxo de Caixa {getGranularityLabel()}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Entradas, saídas e saldo acumulado ao longo do tempo
                </p>
              </div>
              {report.trend && (
                <label htmlFor="cashflow-report-show-trend" className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="cashflow-report-show-trend"
                    name="showTrend"
                    type="checkbox"
                    checked={showTrend}
                    onChange={(e) => setShowTrend(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Mostrar previsão
                  </span>
                </label>
              )}
            </div>

            {chartData.length > 0 ? (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartDataWithForecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="period"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'cumulativeBalance') {
                          return [formatCurrency(value), 'Saldo Acumulado'];
                        }
                        return [formatCurrency(value), name === 'income' ? 'Entradas' : 'Saídas'];
                      }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="income"
                      fill="#10b981"
                      name="Entradas"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="expense"
                      fill="#ef4444"
                      name="Saídas"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="cumulativeBalance"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      name="Saldo Acumulado"
                      connectNulls={false}
                      data={chartData}
                    />
                    {showTrend && report.trend && forecastData.length > 0 && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="cumulativeBalance"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 3, fill: '#f59e0b' }}
                        name="Previsão"
                        connectNulls={true}
                        data={[
                          ...chartData.slice(-1), // Último ponto real para conectar
                          ...forecastData,
                        ]}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                Nenhum dado disponível para o período selecionado.
              </div>
            )}
          </div>

          {/* Tabela Detalhada */}
          {report.flowData.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Detalhamento {getGranularityLabel()}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Período
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Entradas
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Saídas
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Saldo do Período
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Saldo Acumulado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.flowData.map((period, index) => (
                      <tr
                        key={period.period}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                      >
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                          {period.periodLabel}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(period.income)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-red-600 dark:text-red-400">
                          {formatCurrency(period.expense)}
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold ${
                          period.balance >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(period.balance)}
                        </td>
                        <td className={`py-3 px-4 text-right font-bold ${
                          period.cumulativeBalance >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(period.cumulativeBalance)}
                        </td>
                      </tr>
                    ))}
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
