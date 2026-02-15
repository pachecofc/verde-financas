import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { toast } from 'sonner';
import { 
  TrendingUp, Landmark, Target, Plus, Trash2, Edit2,
  Award, X, Search, AlertCircle, Loader2, MoreVertical
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { 
  AreaChart, Area, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { Goal, Asset } from '../types';

const colorOptions = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#f97316', '#ec4899',
];

export const Investments: React.FC = () => {
  const { 
    assets, assetHoldings, goals, theme,
    refreshAssets, refreshAssetHoldings, updateAssetHoldingValue, deleteAssetHolding,
    addAsset, updateAsset, deleteAsset,
    addGoal, updateGoal, deleteGoal 
  } = useFinance();
  
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingHoldingId, setEditingHoldingId] = useState<string | null>(null);
  const [assetValueForm, setAssetValueForm] = useState({ amount: '' });
  const [isMounted, setIsMounted] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [isAssetSubmitting, setIsAssetSubmitting] = useState(false);
  const [isGoalSubmitting, setIsGoalSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [assetFormData, setAssetFormData] = useState({
    name: '',
    incomeType: 'fixed' as 'fixed' | 'variable',
    color: '#10b981',
  });

  const [goalForm, setGoalForm] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    icon: '🎯',
    color: '#10b981'
  });

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  useEffect(() => {
    if (window.location.hash === '#ativos') {
      document.getElementById('ativos')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    refreshAssetHoldings();
  }, [refreshAssetHoldings]);

  useEffect(() => {
    refreshAssets();
  }, [refreshAssets]);

  const filteredAndSortedAssets = useMemo(() => {
    let filtered = assets;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = assets.filter(a => a.name.toLowerCase().includes(term));
    }
    return [...filtered].sort((a, b) => {
      if (a.incomeType !== b.incomeType) return a.incomeType === 'fixed' ? -1 : 1;
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    });
  }, [assets, searchTerm]);

  const totalInvested = useMemo(() => 
    assetHoldings.reduce((sum, holding) => sum + holding.currentValue, 0), 
  [assetHoldings]);

  const investmentDistribution = useMemo(() => {
    return assetHoldings.map(holding => ({
      name: holding.asset.name,
      value: holding.currentValue,
      color: holding.asset.color || '#10b981'
    }));
  }, [assetHoldings]);

  const evolutionData = [
    { name: 'Jan', value: totalInvested * 0.8 },
    { name: 'Fev', value: totalInvested * 0.85 },
    { name: 'Mar', value: totalInvested * 0.92 },
    { name: 'Abr', value: totalInvested * 0.98 },
    { name: 'Mai', value: totalInvested },
  ];

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleOpenAssetValueModal = (holdingId: string, currentValue: number) => {
    setEditingHoldingId(holdingId);
    setAssetValueForm({ amount: currentValue.toString() });
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAssetId(asset.id);
    setAssetFormData({
      name: asset.name,
      incomeType: asset.incomeType,
      color: asset.color || '#10b981',
    });
    setShowAssetModal(true);
  };

  const handleCloseAssetModal = () => {
    setShowAssetModal(false);
    setEditingAssetId(null);
    setAssetFormData({ name: '', incomeType: 'fixed', color: '#10b981' });
  };

  const handleAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAssetSubmitting(true);
    try {
      if (editingAssetId) {
        await updateAsset(editingAssetId, assetFormData);
      } else {
        await addAsset(assetFormData);
      }
      handleCloseAssetModal();
    } catch (err) {
      console.error('Erro ao salvar ativo:', err);
    } finally {
      setIsAssetSubmitting(false);
    }
  };

  const handleOpenGoalModal = (goal?: Goal) => {
    if (goal) {
      setEditingGoalId(goal.id);
      setGoalForm({
        name: goal.name,
        targetAmount: goal.targetAmount.toString(),
        currentAmount: goal.currentAmount.toString(),
        deadline: goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '',
        icon: goal.icon || '🎯',
        color: goal.color || '#10b981'
      });
    } else {
      setEditingGoalId(null);
      setGoalForm({ name: '', targetAmount: '', currentAmount: '', deadline: '', icon: '🎯', color: '#10b981' });
    }
    setShowGoalModal(true);
  };

  const handleAssetValueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoldingId) return;
    
    const newValue = parseFloat(assetValueForm.amount);
    
    if (isNaN(newValue) || newValue < 0) {
      toast.error('Valor inválido. O valor deve ser maior ou igual a zero.');
      return;
    }
    
    await updateAssetHoldingValue(editingHoldingId, newValue);
    await refreshAssetHoldings();
    
    setEditingHoldingId(null);
    setAssetValueForm({ amount: '' });
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGoalSubmitting(true);
    try {
      const data = {
        ...goalForm,
        targetAmount: parseFloat(goalForm.targetAmount),
        currentAmount: parseFloat(goalForm.currentAmount),
        deadline: goalForm.deadline ? goalForm.deadline : undefined
      };

      if (editingGoalId) {
        await updateGoal(editingGoalId, data);
      } else {
        await addGoal(data);
      }
      setShowGoalModal(false);
    } finally {
      setIsGoalSubmitting(false);
    }
  };

  const chartStyles = {
    tooltipBg: theme === 'dark' ? '#0f172a' : '#ffffff',
    tooltipBorder: theme === 'dark' ? '#1e293b' : '#f1f5f9',
  };

  return (
    <div className="space-y-8 pb-12 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Investimentos & Metas</h1>
          <p className="text-slate-500 dark:text-slate-400">Construa seu patrimônio e realize seus sonhos.</p>
        </div>
        <div className="flex gap-2">
           <button 
            data-tour-id="tour-nova-meta"
            onClick={() => handleOpenGoalModal()}
            className="flex items-center gap-2 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-slate-800 px-5 py-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800 transition-all font-semibold"
          >
            <Target className="w-4 h-4" /> Nova Meta
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden min-w-0 transition-all min-h-[400px]">
             <div className="absolute top-0 right-0 p-8 opacity-5">
                <Landmark className="w-32 h-32 text-slate-900 dark:text-slate-100" />
             </div>
             <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Patrimônio Investido</p>
             <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-6">{formatCurrency(totalInvested)}</h2>
             
             <div className="h-[250px] w-full min-w-0 overflow-hidden">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={evolutionData}>
                      <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: chartStyles.tooltipBg, 
                          borderRadius: '16px', 
                          border: `1px solid ${chartStyles.tooltipBorder}`, 
                          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                          color: theme === 'dark' ? '#f1f5f9' : '#0f172a'
                        }}
                        formatter={(val: number) => formatCurrency(val)}
                      />
                      <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
             </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-w-0 transition-all min-h-[400px]">
             <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Alocação de Ativos</h3>
             <div className="h-[250px] w-full min-w-0">
                {isMounted && investmentDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={investmentDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {investmentDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: chartStyles.tooltipBg, 
                          borderRadius: '12px', 
                          border: `1px solid ${chartStyles.tooltipBorder}`,
                          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                          color: theme === 'dark' ? '#f1f5f9' : '#0f172a'
                        }}
                        labelStyle={{ color: theme === 'dark' ? '#f1f5f9' : '#0f172a' }}
                        itemStyle={{ color: theme === 'dark' ? '#f1f5f9' : '#0f172a' }}
                        formatter={(val: number) => formatCurrency(val)} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : isMounted ? (
                  <div className="h-full flex items-center justify-center text-slate-300 dark:text-slate-600 text-xs text-center p-4 italic">
                    Adicione ativos para ver sua distribuição.
                  </div>
                ) : null}
             </div>
             <div className="mt-4 space-y-2">
                {investmentDistribution.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{item.name}</span>
                     </div>
                     <span className="font-bold text-slate-800 dark:text-slate-200">{((item.value / totalInvested) * 100).toFixed(1)}%</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      <section id="ativos" className="space-y-6 scroll-mt-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Meus Ativos
          </h3>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative w-full sm:w-auto flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                id="investments-assets-search"
                type="text"
                placeholder="Buscar ativo..."
                aria-label="Buscar ativos"
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              data-tour-id="tour-adicionar-ativo"
              onClick={() => { setEditingAssetId(null); setShowAssetModal(true); }}
              className="bg-emerald-600 dark:bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg dark:shadow-none hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-all flex items-center gap-2 font-bold active:scale-[0.98] flex-shrink-0"
            >
              <Plus className="w-5 h-5" /> Adicionar Ativo
            </button>
          </div>
        </div>

        {filteredAndSortedAssets.length === 0 && searchTerm && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
            <Search className="w-12 h-12 mb-4" />
            <p className="text-lg font-semibold">Nenhum ativo encontrado para &quot;{searchTerm}&quot;</p>
            <p className="text-sm mt-2">Tente um termo de busca diferente ou adicione um novo ativo.</p>
          </div>
        )}

        {filteredAndSortedAssets.length === 0 && !searchTerm && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <AlertCircle className="w-12 h-12 mb-4" />
            <p className="text-lg font-semibold">Nenhum ativo cadastrado</p>
            <p className="text-sm mt-2">Comece adicionando seu primeiro ativo.</p>
            <button
              onClick={() => setShowAssetModal(true)}
              className="mt-4 bg-emerald-600 dark:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-all"
            >
              <Plus className="w-5 h-5 inline mr-2" /> Adicionar Ativo
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAndSortedAssets.map(asset => {
            const holding = assetHoldings.find(h => h.assetId === asset.id);
            return (
              <div key={asset.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col group transition-all hover:border-emerald-200 dark:hover:border-emerald-500/30 relative overflow-hidden">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm border border-white dark:border-slate-800"
                    style={{ backgroundColor: `${asset.color || '#10b981'}15`, color: asset.color || '#10b981' }}
                  >
                    💰
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{asset.name}</p>
                    {holding && (
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">{formatCurrency(holding.currentValue)}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-auto pt-3 border-t border-slate-50 dark:border-slate-800">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${
                    asset.incomeType === 'fixed' ? 'text-emerald-500 dark:text-emerald-400' : 'text-blue-500 dark:text-blue-400'
                  }`}>
                    {asset.incomeType === 'fixed' ? 'Renda Fixa' : 'Renda Variável'}
                  </span>
                  <div className="flex items-center gap-2">
                    {holding && (
                      <button
                        onClick={() => handleOpenAssetValueModal(holding.id, holding.currentValue)}
                        className="text-slate-300 dark:text-slate-600 hover:text-emerald-500 dark:hover:text-emerald-400 p-1"
                        title="Atualizar valor"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="hidden lg:flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleEditAsset(asset)} className="text-slate-300 dark:text-slate-600 hover:text-emerald-500 dark:hover:text-emerald-400 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteAsset(asset.id)} className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="lg:hidden">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button className="p-1 rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Mais opções">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 p-1 z-50"
                            sideOffset={5}
                            align="end"
                          >
                            {holding && (
                              <>
                                <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer" onSelect={() => handleOpenAssetValueModal(holding.id, holding.currentValue)}>
                                  <Edit2 className="w-4 h-4 text-emerald-500" /> Atualizar valor
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator className="h-[1px] bg-slate-100 dark:bg-slate-700 my-1" />
                              </>
                            )}
                            <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer" onSelect={() => handleEditAsset(asset)}>
                              <Edit2 className="w-4 h-4 text-emerald-500" /> Editar ativo
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator className="h-[1px] bg-slate-100 dark:bg-slate-700 my-1" />
                            <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer" onSelect={() => deleteAsset(asset.id)}>
                              <Trash2 className="w-4 h-4" /> Excluir
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Metas de Vida
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(goal => {
            const percent = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            const isDone = percent >= 100;
            return (
              <div key={goal.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm group hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all relative">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${isDone ? 'bg-amber-50 dark:bg-amber-900/20 animate-bounce' : 'bg-slate-50 dark:bg-slate-800'}`}>
                    {isDone ? '👑' : goal.icon}
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="hidden lg:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenGoalModal(goal)} className="text-slate-300 dark:text-slate-600 hover:text-emerald-500 dark:hover:text-emerald-400 p-1"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => deleteGoal(goal.id)} className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 p-1"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="lg:hidden">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button className="p-1 rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Mais opções">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 p-1 z-50"
                            sideOffset={5}
                            align="end"
                          >
                            <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer" onSelect={() => handleOpenGoalModal(goal)}>
                              <Edit2 className="w-4 h-4 text-emerald-500" /> Editar
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator className="h-[1px] bg-slate-100 dark:bg-slate-700 my-1" />
                            <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer" onSelect={() => deleteGoal(goal.id)}>
                              <X className="w-4 h-4" /> Excluir
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </div>
                  </div>
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">{goal.name}</h4>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-400 dark:text-slate-500">{formatCurrency(goal.currentAmount)}</span>
                  <span className={isDone ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>{percent.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full transition-all duration-1000 ${isDone ? 'bg-amber-500 dark:bg-amber-400' : 'bg-emerald-500 dark:bg-emerald-400'}`} 
                    style={{ width: `${percent}%` }} 
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 text-right font-bold">Objetivo: {formatCurrency(goal.targetAmount)}</p>
              </div>
            );
          })}
          {goals.length === 0 && (
            <div className="col-span-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
              <Award className="w-12 h-12 opacity-20 mb-2" />
              <p className="text-sm font-medium text-center">Nenhuma meta definida. Que tal começar a planejar uma viagem?</p>
            </div>
          )}
        </div>
      </section>

      {editingHoldingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingHoldingId(null)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in duration-300 transition-all">
             <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-slate-100">Atualizar Valor do Ativo</h3>
             <form onSubmit={handleAssetValueSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="investment-asset-value" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Valor Atual (R$)</label>
                  <input
                    id="investment-asset-value"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:border-emerald-500"
                    value={assetValueForm.amount}
                    onChange={e => setAssetValueForm({...assetValueForm, amount: e.target.value})}
                    placeholder="0,00"
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Use este campo para ajustar o valor do ativo devido a valorização ou desvalorização.
                  </p>
                </div>
                <button type="submit" className="w-full py-4 bg-emerald-600 dark:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg dark:shadow-none mt-4 active:scale-95 transition-all">
                  Atualizar Valor
                </button>
             </form>
          </div>
        </div>
      )}

      {showAssetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseAssetModal} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in duration-300 transition-all">
            <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-slate-100">
              {editingAssetId ? 'Editar Ativo' : 'Adicionar Ativo'}
            </h3>
            <form onSubmit={handleAssetSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="investment-asset-name" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nome do Ativo</label>
                <input
                  id="investment-asset-name"
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:border-emerald-500"
                  value={assetFormData.name}
                  onChange={e => setAssetFormData({ ...assetFormData, name: e.target.value })}
                  placeholder="Ex: Tesouro Direto, Ações, Cripto..."
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="investment-asset-incomeType" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tipo de Renda</label>
                <select
                  id="investment-asset-incomeType"
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:border-emerald-500"
                  value={assetFormData.incomeType}
                  onChange={e => setAssetFormData({ ...assetFormData, incomeType: e.target.value as 'fixed' | 'variable' })}
                >
                  <option value="fixed">Renda Fixa</option>
                  <option value="variable">Renda Variável</option>
                </select>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cor (Opcional)</span>
                <div className="grid grid-cols-8 gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAssetFormData({ ...assetFormData, color })}
                      className={`w-full aspect-square rounded-lg border-2 transition-all ${
                        assetFormData.color === color ? 'border-slate-900 dark:border-slate-100 scale-110 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleCloseAssetModal} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={isAssetSubmitting} className="flex-1 py-3 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl font-semibold shadow-lg dark:shadow-none hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isAssetSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Salvando...</> : (editingAssetId ? 'Salvar Alterações' : 'Adicionar Ativo')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGoalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowGoalModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in duration-300 transition-all">
             <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-slate-100">{editingGoalId ? 'Editar Meta' : 'Nova Meta Financeira'}</h3>
             <form onSubmit={handleGoalSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="investment-goal-name" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Título da Meta</label>
                  <input id="investment-goal-name" name="name" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:border-emerald-500" value={goalForm.name} onChange={e => setGoalForm({...goalForm, name: e.target.value})} placeholder="Ex: Viagem à Disney" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="investment-goal-target" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Valor Alvo (R$)</label>
                    <input id="investment-goal-target" name="targetAmount" type="number" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:border-emerald-500" value={goalForm.targetAmount} onChange={e => setGoalForm({...goalForm, targetAmount: e.target.value})} placeholder="20000" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="investment-goal-current" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Já Tenho (R$)</label>
                    <input id="investment-goal-current" name="currentAmount" type="number" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:border-emerald-500" value={goalForm.currentAmount} onChange={e => setGoalForm({...goalForm, currentAmount: e.target.value})} placeholder="500" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label htmlFor="investment-goal-deadline" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data Limite</label>
                  <input
                    id="investment-goal-deadline"
                    name="deadline"
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:border-emerald-500"
                    value={goalForm.deadline}
                    onChange={e => setGoalForm({...goalForm, deadline: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                   <label id="investment-goal-icon-label" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Ícone Representativo</label>
                   <div className="grid grid-cols-6 gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                      {['✈️', '🏠', '🚗', '🎓', '💍', '👶', '🏖️', '💻', '🚲', '🏥', '🎉', '💰'].map(emoji => (
                        <button 
                          key={emoji}
                          type="button"
                          onClick={() => setGoalForm({...goalForm, icon: emoji})}
                          className={`w-full aspect-square flex items-center justify-center text-xl rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all ${goalForm.icon === emoji ? 'bg-white dark:bg-slate-600 shadow-sm scale-110 border border-emerald-100 dark:border-emerald-500' : ''}`}
                        >
                          {emoji}
                        </button>
                      ))}
                   </div>
                </div>
                <button type="submit" disabled={isGoalSubmitting} className="w-full py-4 bg-emerald-600 dark:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg dark:shadow-none mt-4 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isGoalSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Salvando...</> : (editingGoalId ? 'Atualizar Meta' : 'Criar Meta')}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
