import React, { useState, useEffect } from 'react';
import { useAccounts } from '../contexts/AccountContext';
import { useFinance } from '../contexts/FinanceContext';
import { Plus, Building2, Trash2, Edit2, Wallet, TrendingUp, DollarSign, X, MoreVertical, CreditCard } from 'lucide-react';
import { Account, AccountType } from '../services/api';
import { Loader2 } from 'lucide-react'; // Para loading states
import { toast } from 'sonner'; // Para notificações
// Importa os componentes do Radix UI Dropdown Menu
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// Definir os tipos de conta para o formulário
const accountTypes: { value: AccountType; label: string; icon: React.ElementType }[] = [
  { value: 'CHECKING', label: 'Conta Corrente', icon: Building2 },
  { value: 'CREDIT_CARD', label: 'Cartão de Crédito', icon: CreditCard },
  { value: 'INVESTMENT', label: 'Investimento', icon: TrendingUp },
  { value: 'CASH', label: 'Dinheiro Físico', icon: Wallet },
  { value: 'OTHER', label: 'Outro', icon: DollarSign },
];

export const Accounts: React.FC = () => {
  const { accounts, loading, error, createAccount, updateAccount, deleteAccount, fetchAccounts } = useAccounts();
  const { refreshUserScore } = useFinance();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    balance: '',
    currency: 'BRL',
    type: 'CHECKING' as AccountType,
    bankName: '',
    color: '#60A5FA',
  });
  const [isSubmitting, setIsSubmitting] = useState(false); // Estado para controlar o envio do formulário

  // Efeito para buscar contas quando o componente é montado
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Efeito para exibir erros
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const formatCurrency = (val: number, currency: string = 'BRL') =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency }).format(val);

  const handleEdit = (acc: Account) => {
    setEditingId(acc.id);
    setFormData({
      name: acc.name,
      balance: acc.balance.toString(),
      currency: acc.currency,
      type: acc.type,
      bankName: acc.bankName || '',
      color: acc.color || '#60A5FA',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      name: '',
      balance: '',
      currency: 'BRL',
      type: 'CHECKING',
      bankName: '',
      color: '#60A5FA',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const dataToSubmit = {
        name: formData.name,
        balance: parseFloat(formData.balance),
        currency: formData.currency,
        type: formData.type,
        bankName: formData.bankName || undefined, // Enviar undefined se vazio
        color: formData.color || undefined,
      };

      if (editingId) {
        await updateAccount(editingId, dataToSubmit);
        toast.success('Conta atualizada com sucesso!');
      } else {
        await createAccount(dataToSubmit);
        toast.success('Conta criada com sucesso!');
        await refreshUserScore();
      }
      handleCloseModal();
    } catch (err) {
      // O erro já é exibido pelo useEffect do AccountContext, mas podemos adicionar um log aqui
      console.error('Erro ao salvar conta no componente:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta conta? Se houver transações associadas, elas também serão excluídas.')) {
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteAccount(id, true); // Força a exclusão de transações associadas
      toast.success('Conta excluída com sucesso!');
    } catch (err: any) {
      // Se o erro for 409 (conflito de transações), o backend já envia uma mensagem específica
      // O AccountContext já exibe o toast.error, mas podemos personalizar aqui se necessário
      if (err.message.includes('transações associadas')) {
        toast.error('Não foi possível excluir a conta: ' + err.message);
      } else {
        toast.error('Falha ao excluir conta.');
      }
      console.error('Erro ao deletar conta no componente:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAccountTypeIcon = (type: AccountType) => {
    const typeInfo = accountTypes.find(at => at.value === type);
    return typeInfo ? typeInfo.icon : DollarSign;
  };

  return (
    <div className="space-y-6 transition-colors">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Minhas Contas</h1>
          <p className="text-slate-500 dark:text-slate-400">Bancos e cartões de crédito conectados.</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white px-6 py-3 rounded-xl transition-all shadow-lg dark:shadow-none active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" /> Adicionar
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-10 text-slate-500 dark:text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mr-2" /> Carregando contas...
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-400 p-4 rounded-xl">
          <p>Erro ao carregar contas: {error}</p>
          <button onClick={fetchAccounts} className="mt-2 text-sm font-semibold hover:underline">Tentar novamente</button>
        </div>
      )}

      {/* Lista de contas */}
      {!loading && !error && accounts.length === 0 && (
        <div className="text-center py-10 text-slate-500 dark:text-slate-400">
          <p>Nenhuma conta cadastrada ainda. Clique em "Adicionar" para começar!</p>
        </div>
      )}

      {!loading && !error && accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map(acc => {
            const IconComponent = getAccountTypeIcon(acc.type);
            return (
              <div key={acc.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 group transition-all hover:border-emerald-200 dark:hover:border-emerald-500/30">
                <div className="flex justify-between items-start">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center`} style={{ backgroundColor: acc.color + '20', color: acc.color }}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  {/* Botões de Editar/Excluir para Desktop (visíveis no hover) */}
                  <div className="hidden lg:flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleEdit(acc)} className="p-1 text-slate-400 dark:text-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(acc.id)} className="p-1 text-slate-400 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                            onSelect={() => handleEdit(acc)}
                          >
                            <Edit2 className="w-4 h-4 text-emerald-500" /> Editar
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator className="h-[1px] bg-slate-100 dark:bg-slate-700 my-1" />
                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer outline-none transition-colors"
                            onSelect={() => handleDelete(acc.id)}
                          >
                            <Trash2 className="w-4 h-4" /> Excluir
                          </DropdownMenu.Item>
                          <DropdownMenu.Arrow className="fill-white dark:fill-slate-800" />
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">{acc.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-widest">{accountTypes.find(at => at.value === acc.type)?.label || acc.type}</p>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-slate-400 dark:text-slate-500">Saldo Disponível</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(acc.balance, acc.currency)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de criação/edição */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50 dark:bg-slate-950/70 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-8 shadow-2xl dark:shadow-none border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button onClick={handleCloseModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">{editingId ? 'Editar Conta' : 'Adicionar Nova Conta'}</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Conta</label>
                <input
                  type="text"
                  id="name"
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="balance" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Saldo Inicial</label>
                <input
                  type="number"
                  id="balance"
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.balance}
                  onChange={e => setFormData({ ...formData, balance: e.target.value })}
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Moeda</label>
                <input
                  type="text"
                  id="currency"
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.currency}
                  onChange={e => setFormData({ ...formData, currency: e.target.value })}
                  maxLength={3}
                  required
                />
              </div>
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Conta</label>
                <select
                  id="type"
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as AccountType })}
                  required
                >
                  {accountTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="bankName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Banco (Opcional)</label>
                <input
                  type="text"
                  id="bankName"
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.bankName}
                  onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="color" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cor (Opcional)</label>
                <input
                  type="color"
                  id="color"
                  className="w-full h-10 p-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.color}
                  onChange={e => setFormData({ ...formData, color: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white px-6 py-3 rounded-xl transition-all shadow-lg dark:shadow-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                {editingId ? 'Salvar Alterações' : 'Adicionar Conta'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
