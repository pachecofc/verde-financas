import React, { useState } from 'react';
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  BarChart3,
  Wallet,
  Target,
  FileText,
} from 'lucide-react';
import { ExpensesByCategoryReport } from './reports/ExpensesByCategoryReport';
import { IncomeByCategoryReport } from './reports/IncomeByCategoryReport';

type ReportType = 'expenses-by-category' | 'income-by-category' | null;

interface ReportCard {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

const reportCards: ReportCard[] = [
  {
    id: 'expenses-by-category',
    title: 'Despesas por Categoria',
    description: 'Análise detalhada das despesas agrupadas por categoria com gráficos e comparações',
    icon: PieChart,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
  },
  {
    id: 'income-by-category',
    title: 'Receitas por Categoria',
    description: 'Total de receitas, distribuição por categorias e evolução mês a mês',
    icon: TrendingUp,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  // Futuros relatórios podem ser adicionados aqui:
  // {
  //   id: 'income-vs-expenses',
  //   title: 'Receitas vs Despesas',
  //   description: 'Comparação entre receitas e despesas ao longo do tempo',
  //   icon: TrendingUp,
  //   color: 'text-emerald-600 dark:text-emerald-400',
  //   bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
  // },
  // {
  //   id: 'monthly-summary',
  //   title: 'Resumo Mensal',
  //   description: 'Visão geral das finanças mensais com tendências',
  //   icon: Calendar,
  //   color: 'text-blue-600 dark:text-blue-400',
  //   bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  // },
  // {
  //   id: 'budget-analysis',
  //   title: 'Análise de Orçamentos',
  //   description: 'Desempenho dos orçamentos e limites estabelecidos',
  //   icon: Target,
  //   color: 'text-purple-600 dark:text-purple-400',
  //   bgColor: 'bg-purple-50 dark:bg-purple-900/20',
  // },
  // {
  //   id: 'account-balance',
  //   title: 'Evolução de Saldos',
  //   description: 'Histórico e evolução dos saldos das contas',
  //   icon: Wallet,
  //   color: 'text-amber-600 dark:text-amber-400',
  //   bgColor: 'bg-amber-50 dark:bg-amber-900/20',
  // },
];

export const Reports: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>(null);

  const handleCardClick = (reportId: ReportType) => {
    setSelectedReport(reportId);
  };

  const handleBack = () => {
    setSelectedReport(null);
  };

  // Se um relatório foi selecionado, mostrar o relatório
  if (selectedReport === 'expenses-by-category') {
    return <ExpensesByCategoryReport onBack={handleBack} />;
  }

  if (selectedReport === 'income-by-category') {
    return <IncomeByCategoryReport onBack={handleBack} />;
  }

  // Página principal com cards
  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Relatórios</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Selecione um relatório para visualizar análises detalhadas das suas finanças
        </p>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className="group relative bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 text-left"
            >
              {/* Ícone */}
              <div className={`w-14 h-14 ${card.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-7 h-7 ${card.color}`} />
              </div>

              {/* Título */}
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {card.title}
              </h3>

              {/* Descrição */}
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {card.description}
              </p>

              {/* Indicador de clique */}
              <div className="mt-4 flex items-center text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-sm font-medium">Abrir relatório</span>
                <FileText className="w-4 h-4 ml-2" />
              </div>

              {/* Efeito de hover no card */}
              <div className="absolute inset-0 rounded-xl bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </button>
          );
        })}
      </div>

      {/* Mensagem se não houver relatórios */}
      {reportCards.length === 0 && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-center">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Nenhum relatório disponível no momento.
          </p>
        </div>
      )}
    </div>
  );
};
