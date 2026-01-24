import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import {
  Download,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import api, { GoalsReport as GoalsReportType } from '../../services/api';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface GoalsReportProps {
  onBack: () => void;
}

export const GoalsReport: React.FC<GoalsReportProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<GoalsReportType | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await api.report.getGoals();
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

      const fileName = `relatorio-metas-financeiras-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'on-track':
        return <TrendingUp className="w-5 h-5 text-blue-600" />;
      case 'at-risk':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'delayed':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Target className="w-5 h-5 text-slate-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'on-track':
        return 'No Prazo';
      case 'at-risk':
        return 'Em Risco';
      case 'delayed':
        return 'Atrasada';
      default:
        return 'Sem Prazo';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400';
      case 'on-track':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400';
      case 'at-risk':
        return 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400';
      case 'delayed':
        return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400';
      default:
        return 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400';
    }
  };

  // Preparar dados para gráfico de progresso cumulativo
  const cumulativeChartData = report?.cumulativeProgress.map(month => ({
    month: month.monthLabel,
    progress: month.progressPercentage,
    goalsCreated: month.goalsCreated,
    goalsCompleted: month.goalsCompleted,
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
                    Relatório de Metas Financeiras
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
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total de Metas</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {report.summary.totalGoals}
                </p>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Concluídas</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {report.summary.completedGoals}
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">No Prazo</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {report.summary.onTrackGoals}
                </p>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Em Risco</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {report.summary.atRiskGoals}
                </p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Atrasadas</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {report.summary.delayedGoals}
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Valor Total Alvo</p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(report.summary.totalTarget)}
                </p>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Progresso Geral</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {report.summary.overallProgress.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Gráfico de Progresso Cumulativo */}
          {cumulativeChartData.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                Progresso Cumulativo
              </h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={cumulativeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      label={{ value: 'Progresso (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      label={{ value: 'Metas', angle: 90, position: 'insideRight' }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'progress') {
                          return [`${value.toFixed(1)}%`, 'Progresso'];
                        }
                        return [value, name === 'goalsCreated' ? 'Metas Criadas' : 'Metas Concluídas'];
                      }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar
                      yAxisId="right"
                      dataKey="goalsCreated"
                      fill="#3b82f6"
                      name="Metas Criadas"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="goalsCompleted"
                      fill="#10b981"
                      name="Metas Concluídas"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="progress"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ r: 5 }}
                      name="Progresso (%)"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Lista de Metas */}
          {report.goals.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Detalhamento das Metas
              </h2>
              <div className="space-y-4">
                {report.goals.map((goal) => (
                  <div
                    key={goal.id}
                    className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {goal.icon && (
                          <span className="text-2xl">{goal.icon}</span>
                        )}
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {goal.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusIcon(goal.status)}
                            <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(goal.status)}`}>
                              {getStatusLabel(goal.status)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Progresso</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                          {goal.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="mb-3">
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            goal.isCompleted
                              ? 'bg-emerald-600'
                              : goal.status === 'delayed'
                              ? 'bg-red-600'
                              : goal.status === 'at-risk'
                              ? 'bg-amber-600'
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(100, goal.percentage)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600 dark:text-slate-400 mb-1">Valor Atual</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(goal.currentAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400 mb-1">Valor Alvo</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(goal.targetAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400 mb-1">Restante</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(goal.remaining)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400 mb-1">
                          {goal.isCompleted ? 'Data de Conclusão' : 'Prazo Previsto'}
                        </p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {goal.isCompleted && goal.actualDate
                            ? formatDate(goal.actualDate)
                            : goal.expectedDate
                            ? formatDate(goal.expectedDate)
                            : 'Sem prazo'}
                        </p>
                        {goal.expectedDate && goal.actualDate && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Previsto: {formatDate(goal.expectedDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.goals.length === 0 && (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-center">
              <Target className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                Nenhuma meta cadastrada ainda.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
