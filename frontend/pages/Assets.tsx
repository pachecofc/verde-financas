import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { Plus, Trash2, Edit2, RefreshCw, MoreVertical, Search, AlertCircle } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Asset } from '../types';

export const Assets: React.FC = () => {
  const { assets, addAsset, updateAsset, deleteAsset } = useFinance();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    incomeType: 'fixed' as 'fixed' | 'variable',
    color: '#10b981',
  });

  const handleEdit = (asset: Asset) => {
    setEditingId(asset.id);
    setFormData({
      name: asset.name,
      incomeType: asset.incomeType,
      color: asset.color || '#10b981',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ name: '', incomeType: 'fixed', color: '#10b981' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingId) {
        await updateAsset(editingId, formData);
      } else {
        await addAsset(formData);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar ativo:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    // Em produção, poderia chamar uma função de refresh específica
    // Por enquanto, apenas simula o loading
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  // Filtrar e ordenar ativos
  const filteredAndSortedAssets = useMemo(() => {
    let filtered = assets;

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filtered = assets.filter(asset =>
        asset.name.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }

    return filtered.sort((a, b) => {
      if (a.incomeType !== b.incomeType) {
        return a.incomeType === 'fixed' ? -1 : 1;
      }
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    });
  }, [assets, searchTerm]);

  const colorOptions = [
    '#10b981', // emerald
    '#3b82f6', // blue
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ef4444', // red
    '#06b6d4', // cyan
    '#f97316', // orange
    '#ec4899', // pink
  ];

  return (
    <div className="space-y-6 transition-colors">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Ativos</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie seus ativos financeiros.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Campo de busca */}
          <div className="relative w-full sm:w-auto flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar ativo..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 flex-shrink-0"
            title="Atualizar ativos"
          >
            <RefreshCw className={`w-5 h-5 text-slate-500 dark:text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setEditingId(null); setShowModal(true); }}
            disabled={isLoading}
            className="bg-emerald-600 dark:bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg dark:shadow-none hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-all flex items-center gap-2 font-bold active:scale-[0.98] disabled:opacity-50 flex-shrink-0"
          >
            <Plus className="w-5 h-5" /> Adicionar Ativo
          </button>
        </div>
      </div>

      {/* Mensagem se nenhum ativo for encontrado após a busca */}
      {!isLoading && filteredAndSortedAssets.length === 0 && searchTerm && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
          <Search className="w-12 h-12 mb-4" />
          <p className="text-lg font-semibold">Nenhum ativo encontrado para "{searchTerm}"</p>
          <p className="text-sm mt-2">Tente um termo de busca diferente ou adicione um novo ativo.</p>
        </div>
      )}

      {/* Mensagem se não houver ativos */}
      {!isLoading && filteredAndSortedAssets.length === 0 && !searchTerm && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
          <AlertCircle className="w-12 h-12 mb-4" />
          <p className="text-lg font-semibold">Nenhum ativo cadastrado</p>
          <p className="text-sm mt-2">Comece adicionando seu primeiro ativo.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredAndSortedAssets.map(asset => {
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
                </div>
              </div>

              <div className="flex justify-between items-center mt-auto pt-3 border-t border-slate-50 dark:border-slate-800">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${
                  asset.incomeType === 'fixed' 
                    ? 'text-emerald-500 dark:text-emerald-400' 
                    : 'text-blue-500 dark:text-blue-400'
                }`}>
                  {asset.incomeType === 'fixed' ? 'Renda Fixa' : 'Renda Variável'}
                </span>
                {/* Botões de Editar/Excluir para Desktop (visíveis no hover) */}
                <div className="hidden lg:flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => handleEdit(asset)} className="text-slate-300 dark:text-slate-600 hover:text-emerald-500 dark:hover:text-emerald-400 p-1 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteAsset(asset.id)} className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 p-1 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
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
                          onSelect={() => handleEdit(asset)}
                        >
                          <Edit2 className="w-4 h-4 text-emerald-500" /> Editar
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="h-[1px] bg-slate-100 dark:bg-slate-700 my-1" />
                        <DropdownMenu.Item
                          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer outline-none transition-colors"
                          onSelect={() => deleteAsset(asset.id)}
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
          );
        })}
      </div>

      {/* Modal de Adicionar/Editar Ativo */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 p-6 transition-all">
            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">
              {editingId ? 'Editar Ativo' : 'Adicionar Ativo'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                  Nome do Ativo
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-emerald-500 transition-all"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Tesouro Direto, Ações, Cripto..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                  Tipo de Renda
                </label>
                <select
                  required
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-emerald-500 transition-all"
                  value={formData.incomeType}
                  onChange={e => setFormData({ ...formData, incomeType: e.target.value as 'fixed' | 'variable' })}
                >
                  <option value="fixed">Renda Fixa</option>
                  <option value="variable">Renda Variável</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                  Cor (Opcional)
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-full aspect-square rounded-lg border-2 transition-all ${
                        formData.color === color
                          ? 'border-slate-900 dark:border-slate-100 scale-110 shadow-md'
                          : 'border-slate-200 dark:border-slate-700 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-all font-semibold shadow-lg dark:shadow-none active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Adicionar Ativo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
