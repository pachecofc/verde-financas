import React, { useState, useRef, useEffect, useMemo } from 'react'; // Adicionado useMemo
import { useFinance } from '../contexts/FinanceContext';
import { Plus, Trash2, Edit2, ChevronRight, X, Smile, Loader2, AlertCircle, RefreshCw, MoreVertical, Search, Tags } from 'lucide-react';
import { Category } from '../types';
import { authApi } from '../services/api';

// Importa os componentes do Radix UI Dropdown Menu
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// Lista de emojis sugeridos por categoria para facilitar o uso
const EMOJI_LIST = [
  { label: 'Finanças', emojis: ['💰', '💳', '💸', '🏦', '🪙', '📈', '📊', '🏧', '🧾', '💎', '💲'] },
  { label: 'Alimentação', emojis: ['🍎', '🍔', '🍕', '🍱', '☕', '🍦', '🍩', '🥐', '🥗', '🥦'] },
  { label: 'Transporte', emojis: ['🚗', '🚌', '✈️', '⛽', '🚲', '🛴', '🚕', '🚂', '⚓', '🏎️'] },
  { label: 'Moradia', emojis: ['🏠', '💡', '🛠️', '🧺', '🧼', '🛋️', '🔑', '🪑', '🚿', '🪴'] },
  { label: 'Lazer', emojis: ['🎨', '🎬', '🎮', '⚽', '🏖️', '🍿', '🎸', '🎟️', '🎪', '🎢'] },
  { label: 'Saúde', emojis: ['💊', '🏥', '🍎', '👟', '🦷', '🧘', '🚲', '🩺', '👓', '🌡️'] },
  { label: 'Compras', emojis: ['🛒', '🛍️', '🎁', '📦', '🧸', '👗', '👟', '🕶️', '💄', '💍'] },
  { label: 'Tecnologia', emojis: ['📱', '💻', '🖥️', '⌨️', '🎧', '📷', '🔋', '🖱️', '🔌', '📡'] },
];

export const Categories: React.FC = () => {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    categoriesLoading,
    categoriesError,
    refreshCategories,
    ensureDefaultCategories
  } = useFinance();
  const [showModal, setShowModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // NOVO: Estado para o termo de busca
  const pickerRef = useRef<HTMLDivElement>(null);
  const hasLoadedCategories = useRef(false); // Ref para rastrear se já tentamos carregar as categorias

  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    icon: '🛍️',
    color: '#10b981',
    parentId: ''
  });

  // Carregar categorias quando a página for montada ou quando as categorias estiverem vazias (se autenticado)
  useEffect(() => {
    const loadCategories = async () => {
      if (authApi.isAuthenticated() && categories.length === 0 && !categoriesLoading && !hasLoadedCategories.current) {
        console.log('Categories: Carregando categorias...');
        hasLoadedCategories.current = true;
        try {
          await refreshCategories();
        } catch (err) {
          console.error('Erro ao carregar categorias:', err);
          hasLoadedCategories.current = false; // Permite tentar novamente em caso de erro
        }
      }
    };
    
    loadCategories();
  }, [categories.length, categoriesLoading, refreshCategories]);

  // Resetar o ref quando as categorias forem carregadas com sucesso
  useEffect(() => {
    if (categories.length > 0) {
      hasLoadedCategories.current = false;
    }
  }, [categories.length]);

  // Fecha o seletor ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      type: cat.type,
      icon: cat.icon,
      color: cat.color,
      parentId: cat.parentId || ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setShowEmojiPicker(false);
    setEditingId(null);
    setFormData({ name: '', type: 'expense', icon: '🛍️', color: '#10b981', parentId: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const data = {
      ...formData,
      parentId: formData.parentId === '' ? undefined : formData.parentId
    };

    try {
      if (editingId) {
        await updateCategory(editingId, data);
      } else {
        await addCategory(data);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectEmoji = (emoji: string) => {
    setFormData({ ...formData, icon: emoji });
    setShowEmojiPicker(false);
  };

  // NOVO: Filtrar e ordenar categorias
  const filteredAndSortedCategories = useMemo(() => {
    let filtered = categories;

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filtered = categories.filter(cat =>
        cat.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        (cat.parentId && categories.find(p => p.id === cat.parentId)?.name.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    return filtered.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'income' ? -1 : 1;
      const aParent = a.parentId ? categories.find(c => c.id === a.parentId)?.name : '';
      const bParent = b.parentId ? categories.find(c => c.id === b.parentId)?.name : '';
      const aDisplay = a.parentId ? `${aParent} ${a.name}` : a.name;
      const bDisplay = b.parentId ? `${bParent} ${b.name}` : b.name;
      return aDisplay.localeCompare(bDisplay);
    });
  }, [categories, searchTerm]); // Dependências para o useMemo

  const potentialParents = categories.filter(c =>
    c.type === formData.type &&
    !c.parentId &&
    c.id !== editingId
  );

  return (
    <div className="space-y-6 transition-colors">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6"> {/* Ajustado para melhor responsividade */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Categorias</h1>
          <p className="text-slate-500 dark:text-slate-400">Organize seus lançamentos por tipo e hierarquia.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap"> {/* Ajustado para melhor responsividade */}
          {/* NOVO: Campo de busca */}
          <div className="relative w-full sm:w-auto flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar categoria..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={() => refreshCategories()}
            disabled={categoriesLoading}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 flex-shrink-0"
            title="Atualizar categorias"
          >
            <RefreshCw className={`w-5 h-5 text-slate-500 dark:text-slate-400 ${categoriesLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setEditingId(null); setShowModal(true); }}
            disabled={categoriesLoading}
            className="bg-emerald-600 dark:bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg dark:shadow-none hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-all flex items-center gap-2 font-bold active:scale-[0.98] disabled:opacity-50 flex-shrink-0"
          >
            <Plus className="w-5 h-5" /> Adicionar Categoria
          </button>
        </div>
      </div>

      {/* Mensagem de erro */}
      {categoriesError && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <p className="text-rose-700 dark:text-rose-300 text-sm">{categoriesError}</p>
          <button
            onClick={() => refreshCategories()}
            className="ml-auto text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 text-sm font-medium"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Loading state */}
      {categoriesLoading && categories.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="ml-3 text-slate-500 dark:text-slate-400">Carregando categorias...</span>
        </div>
      )}

      {/* Mensagem se nenhuma categoria for encontrada após a busca */}
      {!categoriesLoading && filteredAndSortedCategories.length === 0 && searchTerm && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
          <Search className="w-12 h-12 mb-4" />
          <p className="text-lg font-semibold">Nenhuma categoria encontrada para "{searchTerm}"</p>
          <p className="text-sm mt-2">Tente um termo de busca diferente ou adicione uma nova categoria.</p>
        </div>
      )}

      {/* Mensagem e botão quando não há categorias cadastradas */}
      {!categoriesLoading && categories.length === 0 && !searchTerm && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
            <Tags className="w-10 h-10 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Nenhuma categoria cadastrada</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
            Parece que você ainda não tem categorias cadastradas. Clique no botão abaixo para carregar as categorias padrão do sistema.
          </p>
          <button
            onClick={() => ensureDefaultCategories()}
            disabled={categoriesLoading}
            className="bg-emerald-600 dark:bg-emerald-500 text-white px-8 py-4 rounded-xl shadow-lg dark:shadow-none hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-all flex items-center gap-3 font-bold active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {categoriesLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Carregando categorias...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Carregar Categorias Padrão
              </>
            )}
          </button>
          {categoriesError && (
            <p className="text-rose-600 dark:text-rose-400 text-sm mt-4">{categoriesError}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredAndSortedCategories // Usar a lista filtrada e ordenada
          .map(cat => {
            const parent = cat.parentId ? categories.find(c => c.id === cat.parentId) : null;

            return (
              <div key={cat.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col group transition-all hover:border-emerald-200 dark:hover:border-emerald-500/30 relative overflow-hidden">
                {cat.parentId && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-100 dark:bg-slate-800" />
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm border border-white dark:border-slate-800"
                    style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                  >
                    {cat.icon}
                  </div>
                  <div className="min-w-0">
                    {parent && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase truncate flex items-center gap-1">
                        {parent.name} <ChevronRight className="w-2 h-2" />
                      </p>
                    )}
                    <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{cat.name}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-auto pt-3 border-t border-slate-50 dark:border-slate-800">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${cat.type === 'income' ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    {cat.type === 'income' ? 'Receita' : 'Despesa'}
                  </span>
                  {/* Botões de Editar/Excluir para Desktop (visíveis no hover) */}
                  <div className="hidden lg:flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleEdit(cat)} className="text-slate-300 dark:text-slate-600 hover:text-emerald-500 dark:hover:text-emerald-400 p-1 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteCategory(cat.id)} className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 p-1 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
                            onSelect={() => handleEdit(cat)}
                          >
                            <Edit2 className="w-4 h-4 text-emerald-500" /> Editar
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator className="h-[1px] bg-slate-100 dark:bg-slate-700 my-1" />
                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer outline-none transition-colors"
                            onSelect={() => deleteCategory(cat.id)}
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

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in duration-300 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{editingId ? 'Editar Categoria' : 'Nova Categoria'}</h3>
              <button onClick={handleCloseModal} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Nome da Categoria</label>
                <input required placeholder="Ex: Alimentação, Lazer..." className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Tipo</label>
                  <select
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as any, parentId: ''})}
                  >
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                  </select>
                </div>

                <div className="space-y-1 relative" ref={pickerRef}>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Ícone</label>
                  <div className="relative">
                    <input
                      readOnly
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-center text-xl cursor-pointer hover:border-emerald-500 transition-all outline-none"
                      value={formData.icon}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 dark:text-slate-500">
                      <Smile className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Emoji Picker Popover */}
                  {showEmojiPicker && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl z-[70] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 transition-all">
                      <div className="p-2 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Escolha um ícone</span>
                        <button type="button" onClick={() => setShowEmojiPicker(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors"><X className="w-3 h-3" /></button>
                      </div>
                      <div className="max-h-[220px] overflow-y-auto p-3 grid grid-cols-5 gap-2 custom-scrollbar transition-all">
                        {EMOJI_LIST.map((group) => (
                          <React.Fragment key={group.label}>
                            <div className="col-span-5 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-2 first:mt-0">{group.label}</div>
                            {group.emojis.map(emoji => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => selectEmoji(emoji)}
                                className="w-full aspect-square flex items-center justify-center text-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Subcategoria de (Opcional)</label>
                <select
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  value={formData.parentId}
                  onChange={e => setFormData({...formData, parentId: e.target.value})}
                >
                  <option value="">Nenhuma (Categoria Principal)</option>
                  {potentialParents.map(p => (
                    <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Cor Visual</label>
                <div className="flex gap-3 items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <input type="color" className="w-12 h-10 border-none p-0 block cursor-pointer bg-transparent" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">{formData.color}</span>
                </div>
              </div>

              <button
                disabled={isSubmitting}
                className="w-full py-4 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white font-bold rounded-xl shadow-lg dark:shadow-none transition-all mt-4 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {editingId ? 'Salvando...' : 'Criando...'}
                  </>
                ) : (
                  editingId ? 'Salvar Alterações' : 'Criar Categoria'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
