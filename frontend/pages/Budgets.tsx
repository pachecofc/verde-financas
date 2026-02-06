
import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, Target, Trash2, Edit2, Sparkles, Crown, Loader2, 
  X, Zap, ShieldCheck, ArrowRight, BrainCircuit, Info, MoreVertical, Star,
  Search, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw
} from 'lucide-react';
import { Budget, Category } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
// Importa os componentes do Radix UI Dropdown Menu
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export const Budgets: React.FC = () => {
  const { user: authUser } = useAuth();
  const { 
    budgets, categories, transactions, user, theme,
    addBudget, updateBudget, deleteBudget, refreshState, updateUserProfile 
  } = useFinance();
  
  const [showModal, setShowModal] = useState(false);
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [smartAmount, setSmartAmount] = useState('');
  const [smartPreview, setSmartPreview] = useState<any[] | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    categoryId: '',
    limit: '',
  });
  const [budgetsLoading, setBudgetsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'limit' | 'category'>('category');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    setBudgetsLoading(true);
    refreshState()
      .then(() => {
        if (categories.length > 0 && !formData.categoryId) {
          setFormData(prev => ({ ...prev, categoryId: categories.find(c => c.type === 'expense')?.id || '' }));
        }
      })
      .catch(err => console.error('Erro ao atualizar estado:', err))
      .finally(() => setBudgetsLoading(false));
  }, [categories, refreshState]);

  const handleEdit = (b: Budget) => {
    setEditingId(b.id);
    setFormData({ categoryId: b.categoryId, limit: b.limit.toString() });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ categoryId: categories.find(c => c.type === 'expense')?.id || '', limit: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId || !formData.limit || isSavingBudget) return;
    
    const data = {
      categoryId: formData.categoryId,
      limit: parseFloat(formData.limit)
    };

    setIsSavingBudget(true);
    try {
      if (editingId) {
        await updateBudget(editingId, data);
      } else {
        await addBudget(data);
      }
      handleCloseModal();
    } finally {
      setIsSavingBudget(false);
    }
  };

  const isPremium = authUser?.plan?.toLowerCase() === 'premium';

  // Estados da aba assinatura (apenas exibição; plano vem do Auth/Stripe)
  const stripeCheckoutUrl = import.meta.env.VITE_STRIPE_CHECKOUT_URL || 'https://buy.stripe.com/test_dRm5kD4KJ1ex1Mm8XxefC00';

  const handleSmartBudgetClick = () => {
    if (isPremium) {
      setShowSmartModal(true);
    } else {
      setShowUpgradeModal(true);
    }
  };

  const generateSmartBudget = async () => {
    if (!smartAmount || isProcessing) return;
    setIsProcessing(true);
    setSmartPreview(null);

    try {
      // Preparar dados para a IA: Resumo de gastos por categoria nos últimos 90 dias
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const history = transactions
        .filter(t => new Date(t.date) >= ninetyDaysAgo && t.type === 'expense')
        .reduce((acc: any, t) => {
          acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
          return acc;
        }, {});

      const catList = categories.filter(c => c.type === 'expense').map(c => ({
        id: c.id,
        name: c.name,
        parentId: c.parentId
      }));

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [{
            text: `Aja como um consultor financeiro. O usuário quer alocar R$ ${smartAmount} para o orçamento mensal.
            REGRAS PARA CATEGORIAS PAI:
            - Necessidades: 55%
            - Liberdade Financeira: 10%
            - Educação: 10%
            - Diversão: 10%
            - Gastos de Longo Prazo: 10%
            - Doação: 5%

            HISTÓRICO DE GASTOS (Últimos 90 dias): ${JSON.stringify(history)}
            LISTA DE CATEGORIAS: ${JSON.stringify(catList)}

            TAREFA: 
            1. Identifique as categorias-pai pelos nomes fornecidos.
            2. Distribua o valor total conforme as porcentagens acima.
            3. Distribua o valor de cada pai entre seus filhos baseando-se no histórico (quem gasta mais recebe proporcionalmente mais, mas tente ser realista e sugerir economia se um valor parecer alto).
            4. Retorne APENAS um ARRAY de objetos JSON: { categoryId: string, limit: number }.`
          }]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                categoryId: { type: Type.STRING },
                limit: { type: Type.NUMBER }
              },
              required: ["categoryId", "limit"]
            }
          }
        }
      });

      const suggestions = JSON.parse(response.text);
      setSmartPreview(suggestions);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar orçamento inteligente. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const applySmartBudget = () => {
    if (!smartPreview) return;
    
    // Deletar orçamentos antigos para as categorias sugeridas (opcional, ou apenas atualizar)
    smartPreview.forEach(s => {
      const existing = budgets.find(b => b.categoryId === s.categoryId);
      if (existing) {
        updateBudget(existing.id, { limit: s.limit });
      } else {
        addBudget({ categoryId: s.categoryId, limit: s.limit });
      }
    });

    setShowSmartModal(false);
    setSmartPreview(null);
    setSmartAmount('');
    alert("Orçamento inteligente aplicado com sucesso!");
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getCategoryFullName = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return 'Sistema';
    if (!cat.parentId) return `${cat.icon} ${cat.name}`;
    const parent = categories.find(c => c.id === cat.parentId);
    return `${parent?.icon || ''} ${parent?.name || ''} > ${cat.icon} ${cat.name}`;
  };

  const getCategorySortName = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return '';
    if (!cat.parentId) return cat.name;
    const parent = categories.find(c => c.id === cat.parentId);
    return `${parent?.name || ''} > ${cat.name}`.trim();
  };

  const filteredAndSortedBudgets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = budgets;
    if (q) {
      list = budgets.filter(b => getCategoryFullName(b.categoryId).toLowerCase().includes(q));
    }
    const sorted = [...list].sort((a, b) => {
      if (sortBy === 'limit') {
        const diff = a.limit - b.limit;
        return sortOrder === 'asc' ? diff : -diff;
      }
      // Ordenar pelo campo name da categoria associada ao orçamento (categoryId)
      const catA = categories.find(c => c.id === a.categoryId);
      const catB = categories.find(c => c.id === b.categoryId);
      const nameA = (catA?.name ?? '').trim();
      const nameB = (catB?.name ?? '').trim();
      const cmp = nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [budgets, searchQuery, sortBy, sortOrder, categories]);

  const sortLabel = sortBy === 'limit'
    ? (sortOrder === 'asc' ? 'Valor (menor primeiro)' : 'Valor (maior primeiro)')
    : (sortOrder === 'asc' ? 'Categoria (A-Z)' : 'Categoria (Z-A)');

  return (
    <div className="space-y-6 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Meus Orçamentos</h1>
          <p className="text-slate-500 dark:text-slate-400">Planeje seus gastos e controle suas categorias.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={async () => {
              setBudgetsLoading(true);
              try {
                await refreshState();
              } finally {
                setBudgetsLoading(false);
              }
            }}
            disabled={budgetsLoading}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 flex-shrink-0"
            title="Atualizar orçamentos"
          >
            <RefreshCw className={`w-5 h-5 text-slate-500 dark:text-slate-400 ${budgetsLoading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleSmartBudgetClick}
            className="flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-slate-800/50 px-5 py-3 rounded-xl transition-all font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 active:scale-[0.98] relative group"
          >
            <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
            Orçamento Inteligente
            {!isPremium && <div className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 rounded-full p-1 shadow-sm"><Star className="w-3.5 h-3.5" /></div>}
          </button>
          <button 
            onClick={() => { setEditingId(null); setShowModal(true); }}
            className="flex items-center justify-center gap-2 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white px-6 py-3 rounded-xl transition-all font-semibold shadow-lg shadow-emerald-100 dark:shadow-none active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            Definir Orçamento
          </button>
        </div>
      </div>

      {/* Busca e ordenação */}
      {!budgetsLoading && budgets.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              id="budgets-search"
              name="search"
              type="text"
              placeholder="Buscar por categoria ou subcategoria..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Buscar orçamentos por categoria"
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shrink-0"
                aria-label="Ordenar orçamentos"
              >
                <ArrowUpDown className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <span className="hidden sm:inline">{sortLabel}</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 p-1 z-50 min-w-[200px]"
                sideOffset={6}
                align="end"
              >
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer outline-none"
                  onSelect={() => { setSortBy('category'); setSortOrder('asc'); }}
                >
                  <ArrowUp className="w-4 h-4" /> Categoria (A-Z)
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer outline-none"
                  onSelect={() => { setSortBy('category'); setSortOrder('desc'); }}
                >
                  <ArrowDown className="w-4 h-4" /> Categoria (Z-A)
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer outline-none"
                  onSelect={() => { setSortBy('limit'); setSortOrder('asc'); }}
                >
                  <ArrowUp className="w-4 h-4" /> Valor (menor primeiro)
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer outline-none"
                  onSelect={() => { setSortBy('limit'); setSortOrder('desc'); }}
                >
                  <ArrowDown className="w-4 h-4" /> Valor (maior primeiro)
                </DropdownMenu.Item>
                <DropdownMenu.Arrow className="fill-white dark:fill-slate-800" />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      )}

      {/* Loading State */}
      {budgetsLoading && (
        <div className="flex items-center justify-center py-10 text-slate-500 dark:text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mr-2" /> Carregando orçamentos...
        </div>
      )}

      {/* Lista vazia */}
      {!budgetsLoading && budgets.length === 0 && (
        <div className="text-center py-10 text-slate-500 dark:text-slate-400">
          <p>Nenhum orçamento definido ainda. Clique em &quot;Definir Orçamento&quot; para começar!</p>
        </div>
      )}

      {/* Nenhum resultado da busca */}
      {!budgetsLoading && budgets.length > 0 && filteredAndSortedBudgets.length === 0 && (
        <div className="text-center py-10 text-slate-500 dark:text-slate-400">
          <p>Nenhum orçamento encontrado para a busca &quot;{searchQuery}&quot;.</p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Limpar busca
          </button>
        </div>
      )}

      {!budgetsLoading && filteredAndSortedBudgets.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedBudgets.map(b => {
          const cat = categories.find(c => c.id === b.categoryId);
          const parent = cat?.parentId ? categories.find(c => c.id === cat.parentId) : null;
          const percent = Math.min((b.spent / b.limit) * 100, 100);
          const isOver = b.spent > b.limit;

          return (
            <div key={b.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 group transition-all hover:border-emerald-200 dark:hover:border-emerald-500/30">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xl">
                    {cat?.icon || '📦'}
                  </div>
                  <div>
                    {parent && <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{parent.name}</p>}
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 leading-tight">{cat?.name}</h4>
                  </div>
                </div>
                {/* Botões de Editar/Excluir para Desktop (visíveis no hover) */}
                <div className="hidden lg:flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => handleEdit(b)} className="p-1 text-slate-300 dark:text-slate-600 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteBudget(b.id)} className="p-1 text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
                  {/* Dropdown Menu para Mobile/Tablet (visível em telas menores que lg) */}
                  <div className="lg:hidden">
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          className="p-1 rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          aria-label="Mais opções"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenu.Trigger>

                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 p-1 z-50 animate-in fade-in zoom-in-95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 data-[side=top]:slide-in-from-bottom-2 data-[side=right]:slide-in-from-left-2 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2"
                          sideOffset={5}
                          align="end"
                        >
                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer outline-none transition-colors"
                            onSelect={() => handleEdit(b)}
                          >
                            <Edit2 className="w-4 h-4 text-emerald-500" /> Editar
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator className="h-[1px] bg-slate-100 dark:bg-slate-700 my-1" />
                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer outline-none transition-colors"
                            onSelect={() => deleteBudget(b.id)}
                          >
                            <Trash2 className="w-4 h-4" /> Excluir
                          </DropdownMenu.Item>
                          <DropdownMenu.Arrow className="fill-white dark:fill-slate-800" />
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Progresso</span>
                  <span className={`font-bold ${isOver ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-200'}`}>{percent.toFixed(0)}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${isOver ? 'bg-rose-500 dark:bg-rose-400' : 'bg-emerald-500 dark:bg-emerald-400'}`} style={{ width: `${percent}%` }} />
                </div>
                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-xs text-slate-400 dark:text-slate-500">Gasto: {formatCurrency(b.spent)}</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatCurrency(b.limit)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Modal Orçamento Inteligente */}
      {showSmartModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => !isProcessing && setShowSmartModal(false)} />
           <div className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white"><Sparkles className="w-6 h-6" /></div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Orçamento Inteligente</h3>
                 </div>
                 {!isProcessing && <button onClick={() => setShowSmartModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>}
              </div>
              
              <div className="p-8 space-y-6">
                 {!smartPreview && !isProcessing && (
                   <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 flex gap-4">
                         <BrainCircuit className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
                         <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">A IA do Gemini irá analisar seu histórico de 90 dias e distribuir seu orçamento baseando-se na regra 55/10/10/10/10/5.</p>
                      </div>
                      <div className="space-y-1">
                         <label htmlFor="budget-smart-amount" className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Valor Total para Alocar (Mensal)</label>
                         <input
                           id="budget-smart-amount"
                           name="smartAmount"
                           type="number"
                           placeholder="Ex: 5000"
                           className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-2xl font-black text-slate-900 dark:text-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                           value={smartAmount}
                           onChange={e => setSmartAmount(e.target.value)}
                         />
                      </div>
                      <button 
                        onClick={generateSmartBudget}
                        disabled={!smartAmount}
                        className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        Gerar com IA Gemini <ArrowRight className="w-5 h-5" />
                      </button>
                   </div>
                 )}

                 {isProcessing && (
                   <div className="py-12 flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-300">
                      <div className="relative">
                         <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
                         <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-emerald-400 animate-pulse" />
                      </div>
                      <div className="text-center space-y-2">
                         <p className="text-lg font-black text-slate-800 dark:text-slate-100">Consultando o Gemini...</p>
                         <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">Equilibrando necessidades e investimentos...</p>
                      </div>
                   </div>
                 )}

                 {smartPreview && (
                   <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                      <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                         {smartPreview.map(item => (
                           <div key={item.categoryId} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate pr-4">{getCategoryFullName(item.categoryId)}</span>
                              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 shrink-0">{formatCurrency(item.limit)}</span>
                           </div>
                         ))}
                      </div>
                      <div className="pt-4 flex gap-3">
                         <button 
                          onClick={() => setSmartPreview(null)}
                          className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 transition-all"
                         >
                            Voltar
                         </button>
                         <button 
                          onClick={applySmartBudget}
                          className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg transition-all active:scale-[0.98]"
                         >
                            Aplicar Novo Orçamento
                         </button>
                      </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Paywall Modal (Replicado do Transactions para consistência) */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowUpgradeModal(false)} />
           <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="h-48 bg-gradient-to-br from-emerald-600 to-emerald-400 flex flex-col items-center justify-center text-white relative">
                 <button onClick={() => setShowUpgradeModal(false)} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"><X className="w-5 h-5" /></button>
                 <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-4 backdrop-blur-sm"><Crown className="w-10 h-10 text-white" /></div>
                 <h2 className="text-2xl font-black uppercase tracking-tighter">Verde PRO</h2>
              </div>
              <div className="p-8 space-y-6">
                 <p className="text-center text-slate-600 dark:text-slate-400 font-medium">Libere o poder total da sua gestão financeira com IA.</p>
                 <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                       <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                       <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">Orçamento Inteligente</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Distribuição automática via IA Gemini.</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                       <Zap className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                       <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">Scanner de Notas PRO</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Leitura instantânea de cupons fiscais.</p>
                       </div>
                    </div>
                 </div>
                 <button 
                  onClick={() => window.open(stripeCheckoutUrl, '_blank')}
                  className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none transition-all active:scale-[0.98]"
                 >
                    QUERO SER PRO
                 </button>
                 <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">Apenas R$ 19,90 / mês</p>
              </div>
           </div>
        </div>
      )}

      {/* Modal Cadastro/Edição Normal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={isSavingBudget ? undefined : handleCloseModal} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 animate-in zoom-in">
            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">{editingId ? 'Editar Orçamento' : 'Novo Orçamento'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="budget-form-category" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Categoria</label>
                <select
                  id="budget-form-category"
                  name="categoryId"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  disabled={isSavingBudget}
                >
                  <option value="">Selecione...</option>
                  {categories
                    .slice()
                    .sort((a, b) => getCategorySortName(a.id).localeCompare(getCategorySortName(b.id), 'pt-BR', { sensitivity: 'base' }))
                    .map(c => (
                      <option key={c.id} value={c.id}>{getCategoryFullName(c.id)}</option>
                    ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="budget-form-limit" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Limite Mensal (R$)</label>
                <input
                  id="budget-form-limit"
                  name="limit"
                  type="number"
                  step="0.01"
                  required
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  value={formData.limit}
                  onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                  disabled={isSavingBudget}
                />
              </div>
              <button 
                type="submit" 
                disabled={isSavingBudget}
                className="w-full py-4 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 disabled:opacity-80 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg dark:shadow-none transition-all mt-4 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isSavingBudget ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
