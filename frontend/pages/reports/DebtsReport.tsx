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
} from 'recharts';
import {
  Download,
  Loader2,
  AlertCircle,
  ArrowLeft,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Calendar,
  DollarSign,
} from 'lucide-react';
import api, { DebtsReport as DebtsReportType } from '../../services/api';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface DebtsReportProps {
  onBack: () => void;
}

export const DebtsReport: React.FC<DebtsReportProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DebtsReportType | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await api.report.getDebts();
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

      const fileName = `relatorio-dividas-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  // Preparar dados para gráfico de ranking
  const rankingData = report?.debts.slice(0, 10).map((debt, index) => ({
    name: debt.description.length > 20 ? debt.description.substring(0, 20) + '...' : debt.description,
    fullName: debt.description,
    totalCost: debt.totalCost,
    rank: index + 1,
  })) || [];

  // Preparar dados para impacto mensal
  const monthlyImpactData = report?.debts.map(debt => ({
    name: debt.description.length > 15 ? debt.description.substring(0, 15) + '...' : debt.description,
    fullName: debt.description,
    impact: debt.monthlyImpact,
  })) || [];

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
            Nenhum relatório disponível.
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
                    Relatório de Dívidas e Obrigações
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
              Resumo Geral
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total de Dívidas</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {report.summary.totalDebts}
                </p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Impacto Mensal</p>
                </div>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(report.summary.totalMonthlyImpact)}
                </p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Valor Total</p>
                <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(report.summary.totalDebtAmount)}
                </p>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Juros Totais</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(report.summary.totalInterest)}
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Custo Total</p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(report.summary.totalCost)}
                </p>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Restante</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(report.summary.totalRemaining)}
                </p>
              </div>
            </div>
          </div>

          {/* Ranking das Dívidas Mais Caras */}
          {rankingData.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                Ranking das Dívidas Mais Caras (Top 10)
              </h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rankingData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={120}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.fullName;
                        }
                        return label;
                      }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="totalCost" fill="#ef4444" name="Custo Total" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Impacto Mensal no Orçamento */}
          {monthlyImpactData.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                Impacto Mensal no Orçamento
              </h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyImpactData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={120}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.fullName;
                        }
                        return label;
                      }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="impact" fill="#f59e0b" name="Impacto Mensal" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Lista Detalhada de Dívidas */}
          {report.debts.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Detalhamento das Dívidas
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        #
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Descrição
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Valor Parcela
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Impacto Mensal
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Parcelas
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Juros (%)
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Custo Total
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Restante
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Prazo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.debts.map((debt, index) => (
                      <tr
                        key={debt.id}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              #{index + 1}
                            </span>
                            {index < 3 && (
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {debt.categoryIcon && (
                              <span className="text-lg">{debt.categoryIcon}</span>
                            )}
                            <div>
                              <p className="font-medium text-slate-900 dark:text-slate-100">
                                {debt.description}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {debt.categoryName} • {debt.accountName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(debt.amount)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-red-600 dark:text-red-400">
                          {formatCurrency(debt.monthlyImpact)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                          <div className="flex flex-col items-end">
                            <span>
                              {debt.paidInstallments}/{debt.totalInstallments}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {debt.remainingInstallments} restantes
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-amber-600 dark:text-amber-400">
                          {debt.interestRate.toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-purple-600 dark:text-purple-400">
                          {formatCurrency(debt.totalCost)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-orange-600 dark:text-orange-400">
                          {formatCurrency(debt.remainingCost)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {formatDate(debt.lastPaymentDate)}
                            </span>
                            {debt.daysUntilNextPayment >= 0 && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                Próxima: {debt.daysUntilNextPayment} dias
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {report.debts.length === 0 && (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-center">
              <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                Nenhuma dívida ou obrigação recorrente encontrada.
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                  Dívidas são identificadas a partir de despesas recorrentes (mensais ou semanais).
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
