
import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useAccounts } from '../contexts/AccountContext';
import { 
  Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Trash2, Edit2, CheckCircle2, AlertCircle, Clock, ArrowRightLeft, ChevronRight as ChevronRightSmall, MoreVertical, Loader2
} from 'lucide-react';
import { Schedule as ScheduleType, TransactionType } from '../types';
import { toast } from 'sonner';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export const Schedule: React.FC = () => {
  const { 
    schedules, categories, theme,
    addSchedule, updateSchedule, deleteSchedule, addTransaction 
  } = useFinance();
  const { accounts } = useAccounts();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payingScheduleId, setPayingScheduleId] = useState<string | null>(null);
  const [fadingOutIds, setFadingOutIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    frequency: 'monthly' as 'monthly' | 'weekly' | 'yearly' | 'once',
    categoryId: '',
    accountId: '',
    toAccountId: '',
    type: 'expense' as TransactionType
  });

  // Status logic
  const getStatus = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const itemDate = new Date(dateStr + 'T00:00:00');
    
    const diffTime = itemDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'near';
    return 'on-time';
  };

  const overdueCount = useMemo(() => 
    schedules.filter(s => getStatus(s.date) === 'overdue').length, 
  [schedules]);

  useEffect(() => {
    if (showModal && !editingId) {
      const firstExpenseCat = categories.find(c => c.type === 'expense')?.id || '';
      const firstAccount = accounts[0]?.id || '';
      setFormData(prev => ({
        ...prev,
        categoryId: firstExpenseCat,
        accountId: firstAccount,
        type: 'expense'
      }));
    }
  }, [showModal, editingId, categories, accounts]);

  const handleTypeChange = (newType: TransactionType) => {
    const firstCatOfType = (newType === 'income' || newType === 'expense')
      ? (categories.find(c => c.type === newType)?.id || '')
      : '';

    setFormData(prev => ({
      ...prev,
      type: newType,
      categoryId: firstCatOfType,
      toAccountId: newType === 'transfer' ? (accounts.find(a => a.id !== prev.accountId)?.id || '') : ''
    }));
  };

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const startDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth(currentDate.getFullYear(), currentDate.getMonth()); i++) calendarDays.push(i);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleEdit = (s: ScheduleType) => {
    setEditingId(s.id);
    setFormData({
      description: s.description,
      amount: s.amount.toString(),
      date: s.date,
      frequency: s.frequency,
      categoryId: s.categoryId,
      accountId: s.accountId,
      toAccountId: s.toAccountId || '',
      type: s.type
    });
    setShowModal(true);
  };

  const handlePaySchedule = async (s: ScheduleType) => {
    // Evitar cliques duplos
    if (payingScheduleId === s.id || fadingOutIds.has(s.id)) {
      return;
    }

    setPayingScheduleId(s.id);
    
    // Iniciar animação de fade out
    setFadingOutIds(prev => new Set(prev).add(s.id));

    try {
      // Criar transação silenciosamente (sem toast)
      await addTransaction({
        description: `PAGTO: ${s.description}`,
        amount: s.amount,
        date: new Date().toISOString().split('T')[0],
        categoryId: s.categoryId,
        accountId: s.accountId,
        toAccountId: s.toAccountId,
        type: s.type
      }, true); // silent = true

      // Mostrar um único toast personalizado
      const nextAction = s.frequency === 'once' 
        ? 'removido' 
        : s.frequency === 'monthly' 
          ? 'atualizado para o próximo mês' 
          : s.frequency === 'yearly'
            ? 'atualizado para o próximo ano'
            : 'atualizado para a próxima semana';
      toast.success(`Pagamento realizado! Agendamento ${nextAction}.`, {
        duration: 3000,
      });

      // Aguardar 2 segundos antes de atualizar/deletar e fazer fade in
      setTimeout(async () => {
        try {
          if (s.frequency === 'once') {
            await deleteSchedule(s.id, true); // silent = true
          } else {
            const nextDate = new Date(s.date + 'T00:00:00');
            if (s.frequency === 'monthly') {
              nextDate.setMonth(nextDate.getMonth() + 1);
            } else if (s.frequency === 'weekly') {
              nextDate.setDate(nextDate.getDate() + 7);
            } else if (s.frequency === 'yearly') {
              nextDate.setFullYear(nextDate.getFullYear() + 1);
            }
            await updateSchedule(s.id, { date: nextDate.toISOString().split('T')[0] }, true); // silent = true
          }

          // Remover da lista de fading out para fazer fade in
          setFadingOutIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(s.id);
            return newSet;
          });
        } catch (error) {
          console.error('Erro ao atualizar/deletar agendamento:', error);
          // Reverter animação em caso de erro
          setFadingOutIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(s.id);
            return newSet;
          });
        } finally {
          setPayingScheduleId(null);
        }
      }, 2000);
    } catch (error) {
      // Em caso de erro, reverter a animação
      setFadingOutIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(s.id);
        return newSet;
      });
      setPayingScheduleId(null);
      toast.error('Erro ao processar pagamento. Tente novamente.');
    }
  };

  const handleCloseModal = (force = false) => {
    if (!force && isSubmitting) return;
    setShowModal(false);
    setEditingId(null);
    setFormData({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      frequency: 'monthly',
      categoryId: '',
      accountId: '',
      toAccountId: '',
      type: 'expense'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const finalCategoryId = (formData.type === 'transfer' || formData.type === 'adjustment')
      ? `sys-${formData.type}`
      : formData.categoryId;

    const data = {
      description: formData.description,
      amount: parseFloat(formData.amount),
      date: formData.date,
      frequency: formData.frequency,
      categoryId: finalCategoryId,
      accountId: formData.accountId,
      toAccountId: formData.type === 'transfer' ? formData.toAccountId : undefined,
      type: formData.type
    };

    try {
      if (editingId) {
        await updateSchedule(editingId, data);
      } else {
        await addSchedule(data);
      }
      handleCloseModal(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar agendamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isScheduledOnDay = (day: number, s: ScheduleType) => {
    const [y, m, d] = s.date.split('-').map(Number);
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    // Anual: mesmo dia e mês, qualquer ano (mostra no calendário do mês)
    if (s.frequency === 'yearly') {
      return d === day && (m - 1) === currentMonth;
    }
    return d === day && (m - 1) === currentMonth && y === currentYear;
  };

  const getCategoryFullName = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return '';
    if (!cat.parentId) return `${cat.icon} ${cat.name}`;
    const parent = categories.find(c => c.id === cat.parentId);
    return `${parent?.icon || ''} ${parent?.name || ''} > ${cat.icon} ${cat.name}`;
  };

  return (
    <div className="space-y-6 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Programação</h1>
          <p className="text-slate-500 dark:text-slate-400">Agende pagamentos, recebimentos ou transferências.</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setShowModal(true); }}
          className="flex items-center justify-center gap-2 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white px-6 py-3 rounded-xl transition-all font-semibold shadow-lg shadow-emerald-100 dark:shadow-none active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          Agendar Lançamento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {overdueCount > 0 && (
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
              <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              <div>
                <p className="text-rose-900 dark:text-rose-200 font-bold text-sm">Atenção!</p>
                <p className="text-rose-700 dark:text-rose-400 text-xs font-medium">Você possui {overdueCount} lançamentos vencidos.</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
            <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Próximos Lançamentos</h3>
            </div>
            
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {schedules
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map(s => {
                  const status = getStatus(s.date);
                  const cat = categories.find(c => c.id === s.categoryId);
                  const parent = cat?.parentId ? categories.find(c => c.id === cat.parentId) : null;
                  
                  const isFadingOut = fadingOutIds.has(s.id);
                  const isPaying = payingScheduleId === s.id;
                  
                  return (
                    <div 
                      key={s.id} 
                      className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all group ${
                        isFadingOut ? 'opacity-0 scale-95 transition-opacity duration-300' : 'opacity-100 scale-100 transition-opacity duration-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-white dark:border-slate-700
                          ${status === 'overdue' ? 'bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400' : 
                            status === 'near' ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}
                        >
                          {s.type === 'transfer' ? <ArrowRightLeft className="w-6 h-6" /> : (cat?.icon || <Clock className="w-6 h-6" />)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{s.description}</p>
                          <div className="flex flex-wrap items-center gap-y-0.5 gap-x-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                            <span>{new Date(s.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                            <span>•</span>
                            <span className="capitalize">{s.frequency === 'monthly' ? 'Mensal' : s.frequency === 'weekly' ? 'Semanal' : s.frequency === 'yearly' ? 'Anual' : 'Único'}</span>
                            {s.type === 'transfer' ? (
                              <span className="text-blue-500 dark:text-blue-400 font-bold text-[10px] uppercase tracking-wider">Transferência</span>
                            ) : parent && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase flex items-center gap-0.5 tracking-tight">{parent.name} <ChevronRightSmall className="w-2 h-2" /> {cat?.name}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className={`font-bold text-lg ${s.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : s.type === 'transfer' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                            {formatCurrency(s.amount)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                           <button 
                             onClick={() => handlePaySchedule(s)} 
                             disabled={isPaying || isFadingOut}
                             className={`p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:text-white transition-all shadow-sm ${
                               isPaying || isFadingOut ? 'opacity-50 cursor-not-allowed' : ''
                             }`}
                           >
                             <CheckCircle2 className="w-5 h-5" />
                           </button>
                           {/* Botões de Editar/Excluir para Desktop (visíveis apenas em telas grandes) */}
                           <div className="hidden lg:flex gap-2">
                             <button onClick={() => handleEdit(s)} className="p-3 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><Edit2 className="w-5 h-5" /></button>
                             <button onClick={() => deleteSchedule(s.id)} className="p-3 text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"><Trash2 className="w-5 h-5" /></button>
                           </div>
                           {/* Dropdown Menu para Mobile/Tablet (visível em telas menores que lg) */}
                           <div className="lg:hidden">
                             <DropdownMenu.Root>
                               <DropdownMenu.Trigger asChild>
                                 <button
                                   className="p-3 rounded-xl text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                   aria-label="Mais opções"
                                 >
                                   <MoreVertical className="w-5 h-5" />
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
                                     onSelect={() => handleEdit(s)}
                                   >
                                     <Edit2 className="w-4 h-4 text-emerald-500" /> Editar
                                   </DropdownMenu.Item>
                                   <DropdownMenu.Separator className="h-[1px] bg-slate-100 dark:bg-slate-700 my-1" />
                                   <DropdownMenu.Item
                                     className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer outline-none transition-colors"
                                     onSelect={() => deleteSchedule(s.id)}
                                   >
                                     <Trash2 className="w-4 h-4" /> Excluir
                                   </DropdownMenu.Item>
                                   <DropdownMenu.Arrow className="fill-white dark:fill-slate-800" />
                                 </DropdownMenu.Content>
                               </DropdownMenu.Portal>
                             </DropdownMenu.Root>
                           </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              {schedules.length === 0 && (
                <div className="p-12 text-center text-slate-400 dark:text-slate-600 italic">
                  Nenhum agendamento pendente.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 transition-all">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize">{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
                <div className="flex gap-1">
                   <button onClick={prevMonth} className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors text-slate-600 dark:text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
                   <button onClick={nextMonth} className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors text-slate-600 dark:text-slate-400"><ChevronRight className="w-4 h-4" /></button>
                </div>
             </div>
             <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  if (!day) return <div key={idx} className="aspect-square" />;

                  // Lógica de destaque por tipo de lançamento
                  const daySchedules = schedules.filter(s => isScheduledOnDay(day, s));
                  const hasExpense = daySchedules.some(s => s.type === 'expense' || s.type === 'transfer');
                  const hasIncome = daySchedules.some(s => s.type === 'income');
                  const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

                  let dayClasses = "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800";
                  
                  if (isToday) {
                    dayClasses = "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-100 dark:shadow-none";
                  } else if (hasExpense) {
                    dayClasses = "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 font-bold border border-rose-100/50 dark:border-rose-900/50";
                  } else if (hasIncome) {
                    dayClasses = "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-100/50 dark:border-emerald-900/50";
                  }

                  return (
                    <div key={idx} className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-all ${dayClasses}`}>
                      {day}
                    </div>
                  );
                })}
             </div>
             <div className="mt-6 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Legenda</p>
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-900/50 rounded" /> <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Receita</span></div>
                   <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-900/50 rounded" /> <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Despesa</span></div>
                   <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-600 rounded" /> <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Hoje</span></div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={isSubmitting ? undefined : handleCloseModal} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 p-6 transition-all" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">{editingId ? 'Editar Agendamento' : 'Agendar Lançamento'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {['expense', 'income', 'transfer'].map(type => (
                  <button key={type} type="button" onClick={() => handleTypeChange(type as any)} className={`py-2 text-[10px] font-bold rounded-lg transition-all ${formData.type === type ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    {type === 'expense' ? 'Despesa' : type === 'income' ? 'Receita' : 'Transf.'}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Descrição</label>
                <input type="text" required className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-emerald-500 transition-all" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Valor R$</label>
                  <input type="number" step="0.01" required className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-emerald-500 transition-all" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Data</label>
                  <input type="date" required className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-emerald-500 transition-all" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Conta</label>
                  <select required className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-emerald-500 transition-all" value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})}>
                    <option value="">Escolha...</option>
                    {accounts.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                {formData.type === 'transfer' ? (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Conta Destino</label>
                    <select required className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-emerald-500 transition-all" value={formData.toAccountId} onChange={e => setFormData({...formData, toAccountId: e.target.value})}>
                      <option value="">Escolha...</option>
                      {accounts.filter(a => a.id !== formData.accountId).slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Categoria</label>
                    <select required className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-emerald-500 transition-all" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                      <option value="">Selecione...</option>
                      {categories
                        .filter(c => c.type === (formData.type === 'income' ? 'income' : 'expense'))
                        .sort((a, b) => getCategoryFullName(a.id).localeCompare(getCategoryFullName(b.id)))
                        .map(c => <option key={c.id} value={c.id}>{getCategoryFullName(c.id)}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Frequência</label>
                <select className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-emerald-500 transition-all" value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value as any})}>
                  <option value="monthly">Mensal</option>
                  <option value="weekly">Semanal</option>
                  <option value="yearly">Anual</option>
                  <option value="once">Único</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white font-bold rounded-xl shadow-lg dark:shadow-none mt-4 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>{editingId ? 'Salvar Alterações' : 'Salvar Agendamento'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
