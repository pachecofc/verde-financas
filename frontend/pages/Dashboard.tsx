
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RePieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Calendar, Info, ShieldCheck, HeartPulse, Trophy, Crown, Sparkles, ChevronRight, AlertTriangle } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { transactions, accounts, categories, schedules, budgets, theme, user } = useFinance();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  
  const currentMonthTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));
  const totalIncome = currentMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = currentMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  const budgetAlerts = useMemo(() => {
    return budgets.map(b => {
      const cat = categories.find(c => c.id === b.categoryId);
      const percent = (b.spent / b.limit) * 100;
      return { ...b, categoryName: cat?.name, percent };
    }).filter(b => b.percent >= 80).sort((a, b) => b.percent - a.percent);
  }, [budgets, categories]);

  const expenseByCategory = useMemo(() => {
    return categories
      .filter(c => c.type === 'expense')
      .map(cat => ({
        name: cat.name,
        value: currentMonthTransactions
          .filter(t => t.categoryId === cat.id)
          .reduce((sum, t) => sum + t.amount, 0),
        color: cat.color
      }))
      .filter(item => item.value > 0);
  }, [categories, currentMonthTransactions]);

  // Lógica Avançada de Fluxo de Caixa (Realizado + Previsto)
  const cashFlowData = useMemo(() => {
    const monthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const data = [];
    // Gerar range: 3 meses atrás até 2 meses à frente (Total 6 meses)
    for (let i = -3; i <= 2; i++) {
      const d = new Date(currentYear, currentMonth + i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
      const isFuture = d > now || (y === currentYear && m === currentMonth);

      let realizedIncome = 0;
      let realizedExpense = 0;
      let predictedIncome = 0;
      let predictedExpense = 0;

      // 1. Somar transações já realizadas
      transactions.forEach(t => {
        if (t.date.startsWith(monthKey)) {
          if (t.type === 'income') realizedIncome += t.amount;
          else if (t.type === 'expense') realizedExpense += t.amount;
        }
      });

      // 2. Projetar agendamentos se for mês atual ou futuro
      if (isFuture) {
        schedules.forEach(s => {
          const sDate = new Date(s.date + 'T00:00:00');
          // Simplificação: se o agendamento começou antes ou neste mês
          if (sDate <= new Date(y, m + 1, 0)) {
            let occurrences = 0;
            if (s.frequency === 'once') {
              if (s.date.startsWith(monthKey)) occurrences = 1;
            } else if (s.frequency === 'monthly') {
              occurrences = 1;
            } else if (s.frequency === 'weekly') {
              occurrences = 4;
            }

            if (s.type === 'income') predictedIncome += s.amount * occurrences;
            else if (s.type === 'expense') predictedExpense += s.amount * occurrences;
          }
        });
      }

      data.push({
        name: monthsShort[m],
        monthKey,
        realizedIncome,
        realizedExpense,
        predictedIncome,
        predictedExpense,
        totalIncome: realizedIncome + predictedIncome,
        totalExpense: realizedExpense + predictedExpense,
        isFuture
      });
    }

    // Calcular saldo acumulado simplificado para o gráfico
    let runningBalance = totalBalance; // Começamos do saldo hoje e voltamos/avançamos
    // Para simplificar a visualização do fluxo, vamos apenas mostrar o saldo líquido mensal no gráfico de área
    return data.map(item => ({
      ...item,
      netFlow: item.totalIncome - item.totalExpense
    }));
  }, [transactions, schedules, totalBalance]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const chartStyles = {
    grid: theme === 'dark' ? '#1e293b' : '#f1f5f9',
    text: theme === 'dark' ? '#94a3b8' : '#64748b',
    tooltipBg: theme === 'dark' ? '#0f172a' : '#ffffff',
    tooltipBorder: theme === 'dark' ? '#1e293b' : '#f1f5f9',
  };

  return (
    <div className="space-y-8 pb-10 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Painel de Controle</h1>
          <p className="text-slate-500 dark:text-slate-400">Acompanhe seu desempenho passado e previsões futuras.</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
           <Trophy className="w-5 h-5 text-amber-500" />
           <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">{user?.achievements.length} Conquistas</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/health" className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <ShieldCheck className="w-24 h-24 text-emerald-600" />
          </div>
          <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
               <HeartPulse className="w-5 h-5" />
             </div>
             <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Score Verde</p>
          </div>
          <h3 className="text-3xl font-black text-emerald-600">{user?.score}</h3>
          <div className="mt-4 w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
             <div className="h-full bg-emerald-500" style={{ width: `${(user?.score || 0) / 10}%` }} />
          </div>
        </Link>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Saldo Líquido</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{formatCurrency(totalBalance)}</h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Entradas</p>
          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(totalIncome)}</h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Saídas</p>
          <h3 className="text-2xl font-black text-rose-500 dark:text-rose-400">{formatCurrency(totalExpense)}</h3>
        </div>
      </div>

      {/* Fluxo de Caixa Central (Novo) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Fluxo de Caixa: Realizado vs Previsto</h3>
            <p className="text-xs text-slate-400">Projeção baseada em seus agendamentos recorrentes.</p>
          </div>
          <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-emerald-500 rounded-full" /> Receita</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-rose-500 rounded-full" /> Despesa</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-slate-200 rounded-full" /> Previsto</div>
          </div>
        </div>
        
        <div className="h-[350px] w-full">
          {isMounted && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cashFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={({ x, y, payload }) => {
                    const item = cashFlowData[payload.index];
                    return (
                      <text x={x} y={y + 15} fill={item.isFuture ? '#10b981' : '#94a3b8'} fontSize={11} fontWeight={item.isFuture ? 'bold' : 'normal'} textAnchor="middle">
                        {payload.value} {item.isFuture ? '*' : ''}
                      </text>
                    );
                  }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '16px' }} 
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                />
                <Bar name="Receita Realizada" dataKey="realizedIncome" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar name="Receita Prevista" dataKey="predictedIncome" stackId="a" fill="#10b981" opacity={0.3} radius={[4, 4, 0, 0]} />
                
                <Bar name="Despesa Realizada" dataKey="realizedExpense" stackId="b" fill="#f43f5e" radius={[0, 0, 0, 0]} />
                <Bar name="Despesa Prevista" dataKey="predictedExpense" stackId="b" fill="#f43f5e" opacity={0.3} radius={[4, 4, 0, 0]} />
                
                <Area 
                  name="Saldo Mensal" 
                  type="monotone" 
                  dataKey="netFlow" 
                  fill="#f8fafc" 
                  stroke="#cbd5e1" 
                  strokeWidth={2}
                  dot={{ fill: '#94a3b8', r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-4 flex items-start gap-2 text-slate-400">
           <Info className="w-4 h-4 mt-0.5 shrink-0" />
           <p className="text-[10px]">Os meses marcados com (*) contêm projeções baseadas em seus lançamentos agendados na tela de Programação. O "Saldo Mensal" indica a diferença entre o que entra e o que sai em cada período.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Alertas de Orçamento */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> Alertas
          </h3>
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
            {budgetAlerts.map(b => (
              <div key={b.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{b.categoryName}</span>
                  <span className={`text-xs font-black ${b.percent >= 100 ? 'text-rose-600' : 'text-amber-600'}`}>{b.percent.toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full ${b.percent >= 100 ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(b.percent, 100)}%` }} />
                </div>
              </div>
            ))}
            {budgetAlerts.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 opacity-40">
                <ShieldCheck className="w-10 h-10 mb-2" />
                <p className="text-xs font-medium">Todos os orçamentos estão sob controle!</p>
              </div>
            )}
          </div>
          <Link to="/budgets" className="mt-6 text-center text-xs font-black text-emerald-600 uppercase hover:underline">Ver todos os orçamentos</Link>
        </div>

        {/* Despesas por Categoria */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-6">Gastos por Categoria</h3>
          <div className="h-[250px] w-full">
            {isMounted && expenseByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={80}
                    paddingAngle={5} dataKey="value"
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">Nenhum gasto este mês.</div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {expenseByCategory.slice(0, 4).map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate uppercase">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conquistas (Resumo) */}
        <div className="bg-emerald-600 dark:bg-emerald-500 p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-between overflow-hidden relative group">
           <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
              <Trophy className="w-40 h-40" />
           </div>
           <div>
              <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">Status Gamer</p>
              <h3 className="text-2xl font-black leading-tight">Você desbloqueou {user?.achievements.length} selos!</h3>
           </div>
           <Link to="/health" className="mt-6 w-full py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-center text-xs font-black uppercase transition-all">Ver Minha Saúde</Link>
        </div>
      </div>
    </div>
  );
};
