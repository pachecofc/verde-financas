import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { FinanceState, Category, Account, Transaction, Budget, Schedule, UserProfile, Investment, Asset, AssetHolding, Goal, Theme, Achievement, TransactionType } from '../types';
import { INITIAL_CATEGORIES, INITIAL_ACCOUNTS } from '../constants';
import api, { authApi, categoryApi, SessionLostError } from '../services/api';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

interface FinanceContextType extends FinanceState {
  addCategory: (c: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, c: Partial<Omit<Category, 'id'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  categoriesLoading: boolean;
  categoriesError: string | null;
  refreshCategories: () => Promise<void>;
  ensureDefaultCategories: () => Promise<void>;
  addAccount: (a: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, a: Partial<Omit<Account, 'id'>>) => void;
  deleteAccount: (id: string) => void;
  addTransaction: (t: Omit<Transaction, 'id'>, silent?: boolean) => Promise<void>;
  addTransactions: (ts: Omit<Transaction, 'id'>[]) => void;
  updateTransaction: (id: string, t: Partial<Omit<Transaction, 'id'>>) => void;
  deleteTransaction: (id: string) => void;
  addBudget: (b: Omit<Budget, 'id' | 'spent'>) => Promise<void>;
  updateBudget: (id: string, b: Partial<Omit<Budget, 'id' | 'spent'>>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addSchedule: (s: Omit<Schedule, 'id'>) => Promise<void>;
  updateSchedule: (id: string, s: Partial<Omit<Schedule, 'id'>>, silent?: boolean) => Promise<void>;
  deleteSchedule: (id: string, silent?: boolean) => Promise<void>;
  addInvestment: (i: Omit<Investment, 'id'>) => void;
  updateInvestment: (id: string, i: Partial<Omit<Investment, 'id'>>) => void;
  deleteInvestment: (i: Omit<Investment, 'id'>) => void;
  addAsset: (a: Omit<Asset, 'id'>) => Promise<void>;
  updateAsset: (id: string, a: Partial<Omit<Asset, 'id'>>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  refreshAssets: () => Promise<void>;
  addGoal: (g: Omit<Goal, 'id'>) => Promise<void>;
  updateGoal: (id: string, g: Partial<Omit<Goal, 'id'>>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  refreshGoals: () => Promise<void>;
  refreshState: () => Promise<void>;
  refreshUserScore: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshSchedules: () => Promise<void>;
  updateUserProfile: (u: UserProfile) => void;
  logout: () => void;
  toggleTheme: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const ACHIEVEMENTS: Achievement[] = [
  { id: 'ach-1', name: 'Primeiro Passo', description: 'Realizou seu primeiro lançamento.', icon: '🌱', requirement: '1_transaction' },
  { id: 'ach-2', name: 'Mestre do Orçamento', description: 'Manteve orçamentos no verde por 3 meses.', icon: '🛡️', requirement: '3_months_blue' },
  { id: 'ach-3', name: 'Investidor Verde', description: 'Possui mais de 5 ativos cadastrados.', icon: '💎', requirement: '5_investments' },
  { id: 'ach-4', name: 'Poupador Fiel', description: 'Economizou mais de 30% da renda no mês.', icon: '🏦', requirement: '30_percent_saving' },
];

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Usar AuthContext para detectar mudanças de autenticação
  const { isAuthenticated: authIsAuthenticated } = useAuth();
  
  const [state, setState] = useState<FinanceState>(() => {
    const saved = localStorage.getItem('verde_financas_state');
    const parsed = saved ? JSON.parse(saved) : null;
    // Se o usuário estiver autenticado, não carregar categorias e transações do localStorage
    // Elas serão buscadas do backend no useEffect
    const isAuth = api.auth.isAuthenticated();
    console.log('FinanceProvider: Estado inicial categories:', isAuth ? 'será carregado do backend' : (parsed?.categories?.length || 0));
    console.log('FinanceProvider: Estado inicial transactions:', isAuth ? 'será carregado do backend' : (parsed?.transactions?.length || 0));
    console.log('FinanceProvider: Estado inicial budgets:', isAuth ? 'será carregado do backend' : (parsed?.budgets?.length || 0));
    return {
      categories: isAuth ? [] : (parsed?.categories || []), // Sempre começar vazio se autenticado
      accounts: isAuth ? [] : (parsed?.accounts || INITIAL_ACCOUNTS), // Sempre começar vazio se autenticado
      transactions: isAuth ? [] : (parsed?.transactions || []), // Sempre começar vazio se autenticado
      budgets: isAuth ? [] : (parsed?.budgets || []), // Sempre começar vazio se autenticado
      schedules: isAuth ? [] : (parsed?.schedules || []),
      investments: parsed?.investments || [],
      assets: isAuth ? [] : (parsed?.assets || []),
      assetHoldings: isAuth ? [] : (parsed?.assetHoldings || []),
      goals: parsed?.goals || [],
      user: isAuth ? (parsed?.user ? { ...parsed.user, score: parsed.user.score ?? 0, achievements: parsed.user.achievements ?? [] } : null) : (parsed?.user || { name: 'Visitante', email: '', plan: 'basic', score: 0, achievements: [] }),
      theme: parsed?.theme || 'light',
    };
  });

  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const isCreatingDefaultCategories = useRef(false);
  // NOVO: Ref para controlar se o useEffect já foi executado uma vez (para StrictMode)
  const hasInitialized = useRef(false);

  const isBackendAuthenticated = useCallback(() => {
    return api.auth.isAuthenticated();
  }, []);

  const refreshCategories = useCallback(async () => {
    console.log('refreshCategories: Chamado. Autenticado:', isBackendAuthenticated());
    if (!isBackendAuthenticated()) {
      setState(prev => ({ ...prev, categories: [] }));
      return;
    }

    setCategoriesLoading(true);
    setCategoriesError(null);

    try {
      const apiCategories = await api.category.getAll();
      console.log('refreshCategories: API retornou', apiCategories.length, 'categorias.');
      const mappedCategories: Category[] = apiCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        type: cat.type,
        icon: cat.icon || '📦',
        color: cat.color || '#10b981',
        parentId: cat.parentId || undefined,
        isDefault: cat.isDefault,
      }));
      console.log('refreshCategories: Atualizando estado com', mappedCategories.length, 'categorias.');
      setState(prev => ({ ...prev, categories: mappedCategories }));
    } catch (error) {
      if (error instanceof SessionLostError) return;
      const message = error instanceof Error ? error.message : 'Erro ao carregar categorias';
      setCategoriesError(message);
      console.error('Erro ao buscar categorias do backend:', error);
      toast.error(message);
    } finally {
      setCategoriesLoading(false);
    }
  }, [isBackendAuthenticated]);

  const ensureDefaultCategories = useCallback(async () => {
    console.log('ensureDefaultCategories: Chamado. Autenticado:', isBackendAuthenticated());
    if (!isBackendAuthenticated()) return;

    // NOVO: Verifica a flag antes de qualquer operação assíncrona
    if (isCreatingDefaultCategories.current) {
      console.log('ensureDefaultCategories: Criação de categorias padrão já em andamento. Saindo.');
      return;
    }

    setCategoriesLoading(true);
    setCategoriesError(null);

    try {
      // Marca que a criação está em andamento ANTES de fazer a chamada ao backend
      isCreatingDefaultCategories.current = true;

      const existingCategories = await api.category.getAll();
      console.log('ensureDefaultCategories: Backend tem', existingCategories.length, 'categorias.');

      if (existingCategories.length === 0) {
        console.log('ensureDefaultCategories: Backend tem 0 categorias. Criando categorias padrão em lote...');
        const payload = INITIAL_CATEGORIES.map(cat => ({
          tempId: cat.tempId || '',
          name: cat.name,
          type: cat.type as 'income' | 'expense',
          icon: cat.icon,
          color: cat.color,
          parentId: cat.parentId,
          isDefault: true,
        }));

        await api.category.createMultiple(payload);
        toast.success('Categorias padrão criadas com sucesso!');
        console.log('ensureDefaultCategories: Categorias padrão criadas. Recarregando...');
        await refreshCategories();
      } else {
        console.log('ensureDefaultCategories: Categorias já existem. Apenas recarregando...');
        // Se já existem, apenas recarrega para garantir que o estado local está atualizado
        await refreshCategories();
      }
    } catch (error) {
      if (error instanceof SessionLostError) return;
      const message = error instanceof Error ? error.message : 'Erro ao criar categorias padrão';
      setCategoriesError(message);
      console.error('Erro ao criar categorias padrão no backend:', error);
      toast.error(message);
    } finally {
      // Reseta o flag APÓS a conclusão (sucesso ou falha)
      isCreatingDefaultCategories.current = false;
      setCategoriesLoading(false);
    }
  }, [isBackendAuthenticated, refreshCategories]);

  const refreshBudgets = useCallback(async () => {
    if (!isBackendAuthenticated()) {
      return;
    }

    try {
      const apiBudgets = await api.budget.getAll();
      const mappedBudgets: Budget[] = apiBudgets.map(bud => ({
        id: bud.id,
        categoryId: bud.categoryId,
        limit: bud.limit,
        spent: bud.spent,
      }));
      setState(prev => ({ ...prev, budgets: mappedBudgets }));
    } catch (error) {
      console.error('Erro ao buscar orçamentos do backend:', error);
      // Não mostrar toast para não poluir a interface
      // Em caso de erro, manter os orçamentos locais se existirem
    }
  }, [isBackendAuthenticated]);

  const refreshTransactions = useCallback(async () => {
    if (!isBackendAuthenticated()) {
      return;
    }

    try {
      const apiTransactions = await api.transaction.getAll();
      const mappedTransactions: Transaction[] = apiTransactions.map(tr => {
        // Normalizar a data para formato YYYY-MM-DD
        let normalizedDate = tr.date;
        if (tr.date) {
          // Se a data vem em formato ISO completo, extrair apenas a parte da data
          if (tr.date.includes('T')) {
            normalizedDate = tr.date.split('T')[0];
          }
          // Garantir que está no formato YYYY-MM-DD
          const dateObj = new Date(tr.date);
          if (!isNaN(dateObj.getTime())) {
            normalizedDate = dateObj.toISOString().split('T')[0];
          }
        }
        
        return {
          id: tr.id,
          description: tr.description,
          amount: tr.amount,
          type: tr.type as TransactionType,
          date: normalizedDate,
          categoryId: tr.categoryId || (tr.type === 'transfer' ? 'sys-transfer' : tr.type === 'adjustment' ? 'sys-adjustment' : ''),
          accountId: tr.accountId,
          toAccountId: tr.toAccountId || undefined,
          assetId: tr.assetId || undefined,
          externalId: tr.externalId ?? undefined,
        };
      });
      setState(prev => ({ ...prev, transactions: mappedTransactions }));
    } catch (error) {
      console.error('Erro ao buscar transações do backend:', error);
      // Não mostrar toast para não poluir a interface
    }
  }, [isBackendAuthenticated]);

  const refreshSchedules = useCallback(async () => {
    if (!isBackendAuthenticated()) {
      return;
    }

    try {
      const apiSchedules = await api.schedule.getAll();
      const mappedSchedules: Schedule[] = apiSchedules.map(sch => {
        // Normalizar a data para formato YYYY-MM-DD
        let normalizedDate = sch.date;
        if (sch.date) {
          if (sch.date.includes('T')) {
            normalizedDate = sch.date.split('T')[0];
          }
          const dateObj = new Date(sch.date);
          if (!isNaN(dateObj.getTime())) {
            normalizedDate = dateObj.toISOString().split('T')[0];
          }
        }
        
        return {
          id: sch.id,
          description: sch.description,
          amount: sch.amount,
          date: normalizedDate,
          frequency: sch.frequency,
          type: sch.type as TransactionType,
          categoryId: sch.categoryId || (sch.type === 'transfer' ? 'sys-transfer' : sch.type === 'adjustment' ? 'sys-adjustment' : ''),
          accountId: sch.accountId,
          toAccountId: sch.toAccountId || undefined,
        };
      });
      setState(prev => ({ ...prev, schedules: mappedSchedules }));
    } catch (error) {
      console.error('Erro ao buscar agendamentos do backend:', error);
      // Não mostrar toast para não poluir a interface
    }
  }, [isBackendAuthenticated]);

  const refreshAssets = useCallback(async () => {
    if (!isBackendAuthenticated()) {
      return;
    }

    try {
      const apiAssets = await api.asset.getAll();
      const mappedAssets: Asset[] = apiAssets.map(asset => ({
        id: asset.id,
        name: asset.name,
        incomeType: asset.incomeType,
        color: asset.color || undefined,
      }));
      setState(prev => ({ ...prev, assets: mappedAssets }));
    } catch (error) {
      console.error('Erro ao buscar ativos do backend:', error);
      // Não mostrar toast para não poluir a interface
    }
  }, [isBackendAuthenticated]);

  const refreshAssetHoldings = useCallback(async () => {
    if (!isBackendAuthenticated()) {
      return;
    }

    try {
      const apiHoldings = await api.assetHolding.getAll();
      const mappedHoldings: AssetHolding[] = apiHoldings.map(holding => ({
        id: holding.id,
        assetId: holding.assetId,
        currentValue: holding.currentValue,
        asset: {
          id: holding.asset.id,
          name: holding.asset.name,
          incomeType: holding.asset.incomeType,
          color: holding.asset.color || undefined,
        },
      }));
      setState(prev => ({ ...prev, assetHoldings: mappedHoldings }));
    } catch (error) {
      console.error('Erro ao buscar holdings de ativos do backend:', error);
    }
  }, [isBackendAuthenticated]);

  const refreshGoals = useCallback(async () => {
    if (!isBackendAuthenticated()) {
      return;
    }

    try {
      const apiGoals = await api.goal.getAll();
      const mappedGoals: Goal[] = apiGoals.map(goal => ({
        id: goal.id,
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        deadline: goal.deadline || undefined,
        icon: goal.icon || undefined,
        color: goal.color || undefined,
      }));
      setState(prev => ({ ...prev, goals: mappedGoals }));
    } catch (error) {
      console.error('Erro ao buscar metas do backend:', error);
    }
  }, [isBackendAuthenticated]);

  // Buscar score e conquistas do backend
  const refreshUserScore = useCallback(async () => {
    if (!isBackendAuthenticated()) return;

    try {
      const scoreData = await api.score.getUserScore();
      setState(prev => ({
        ...prev,
        user: prev.user ? {
          ...prev.user,
          score: scoreData.score,
          achievements: scoreData.achievements.map(a => ({
            id: a.id,
            name: a.name,
            description: a.description,
            icon: a.icon,
            requirement: '', // Não usado no backend
            unlockedAt: a.unlockedAt,
          })),
        } : null,
      }));
    } catch (error) {
      console.error('Erro ao buscar score do backend:', error);
    }
  }, [isBackendAuthenticated]);

  useEffect(() => {
    const isAuth = authIsAuthenticated || isBackendAuthenticated();
    console.log('useEffect principal: authIsAuthenticated:', authIsAuthenticated, 'isBackendAuthenticated():', isBackendAuthenticated(), 'isAuth:', isAuth);
    if (isAuth) {
      // Sempre buscar categorias do backend quando autenticado
      console.log('useEffect principal: Chamando ensureDefaultCategories.');
      ensureDefaultCategories().catch(err => console.error('Erro ao garantir categorias padrão:', err));
      // Buscar transações do backend
      refreshTransactions().catch(err => console.error('Erro ao buscar transações:', err));
      // Buscar orçamentos do backend
      refreshBudgets().catch(err => console.error('Erro ao buscar orçamentos:', err));
      // Buscar agendamentos do backend
      refreshSchedules().catch(err => console.error('Erro ao buscar agendamentos:', err));
      // Buscar ativos do backend
      refreshAssets().catch(err => console.error('Erro ao buscar ativos:', err));
      // Buscar holdings de ativos do backend
      refreshAssetHoldings().catch(err => console.error('Erro ao buscar holdings de ativos:', err));
      // Buscar metas do backend
      refreshGoals().catch(err => console.error('Erro ao buscar metas:', err));
      // Buscar score e conquistas do backend
      refreshUserScore().catch(err => console.error('Erro ao buscar score:', err));
    } else {
      console.log('useEffect principal: Usuário não autenticado. Limpando categorias, transações, orçamentos, agendamentos, ativos, holdings, metas e score.');
      setState(prev => ({ ...prev, categories: [], transactions: [], budgets: [], schedules: [], assets: [], assetHoldings: [], goals: [], user: prev.user ? { ...prev.user, score: 0, achievements: [] } : null }));
      isCreatingDefaultCategories.current = false;
      hasInitialized.current = false; // Reset flag quando desautenticado
    }
  }, [authIsAuthenticated, ensureDefaultCategories, refreshTransactions, refreshBudgets, refreshSchedules, refreshAssets, refreshAssetHoldings, refreshGoals, refreshUserScore]);

  useEffect(() => {
    localStorage.setItem('verde_financas_state', JSON.stringify(state));
    if (state.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [state]);

  const generateUniqueId = (prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  };

  const calculateGreenScore = useCallback(() => {
    if (!state.user) return 450;
    let score = 500;
    const overBudgetCount = state.budgets.filter(b => b.spent > b.limit).length;
    score -= overBudgetCount * 50;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyIncome = state.transactions.filter(t => t.date.startsWith(currentMonth) && t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const monthlyExpense = state.transactions.filter(t => t.date.startsWith(currentMonth) && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    if (monthlyIncome > 0) {
      const savingRate = (monthlyIncome - monthlyExpense) / monthlyIncome;
      if (savingRate > 0.2) score += 100;
      if (savingRate > 0.5) score += 100;
      if (savingRate < 0) score -= 100;
    }
    const goalsDone = state.goals.filter(g => g.currentAmount >= g.targetAmount).length;
    score += goalsDone * 40;
    return Math.max(0, Math.min(1000, score));
  }, [state.budgets, state.transactions, state.goals, state.user]);

  const checkAchievements = useCallback(() => {
    if (!state.user) return [];
    const unlocked = [...state.user.achievements];
    const now = new Date().toISOString();
    if (state.transactions.length >= 1 && !unlocked.find(a => a.id === 'ach-1')) {
      unlocked.push({ ...ACHIEVEMENTS[0], unlockedAt: now });
    }
    if (state.investments.length >= 5 && !unlocked.find(a => a.id === 'ach-3')) {
      unlocked.push({ ...ACHIEVEMENTS[2], unlockedAt: now });
    }
    if (calculateGreenScore() > 800 && state.transactions.length > 20 && !unlocked.find(a => a.id === 'ach-2')) {
      unlocked.push({ ...ACHIEVEMENTS[1], unlockedAt: now });
    }
    return unlocked;
  }, [state.transactions, state.investments, state.user, calculateGreenScore]);

  // Atualizar exibição do score quando transações, orçamentos, metas, contas, ativos ou holdings mudarem.
  // Usamos GET /scores (refreshUserScore) para buscar o score atual do backend, que já foi
  // atualizado pelos eventos de gamificação (FIRST_ACCOUNT, FIRST_BUDGET, FIRST_ASSET, etc.). Não usar
  // POST /scores/recalculate aqui, pois ele sobrescreve o score com a fórmula e desfaz os pontos dos eventos.
  // Não incluir state.user nas deps para evitar loop: refreshUserScore atualiza state.user e re-dispararia o efeito.
  useEffect(() => {
    if (!isBackendAuthenticated()) return;

    const timeoutId = setTimeout(() => {
      refreshUserScore().catch(err => console.error('Erro ao atualizar score:', err));
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [state.transactions.length, state.budgets.length, state.goals.length, state.accounts.length, state.assets.length, state.assetHoldings.length, isBackendAuthenticated, refreshUserScore]);

  const toggleTheme = useCallback(() => setState(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' })), []);
  const updateUserProfile = useCallback((u: UserProfile) => setState(prev => ({ ...prev, user: u })), []);
  const logout = useCallback(() => {
    setState(prev => ({
      ...prev,
      user: null,
      categories: [],
      accounts: [],
      transactions: [],
      budgets: [],
      schedules: [],
      investments: [],
      goals: [],
    }));
    localStorage.removeItem('verde_financas_state');
    authApi.clearAuth();
    isCreatingDefaultCategories.current = false;
    hasInitialized.current = false; // NOVO: Reseta a flag de inicialização ao deslogar
  }, []);

  const addCategory = useCallback(async (c: Omit<Category, 'id'>) => {
    if (isBackendAuthenticated()) {
      try {
        setCategoriesLoading(true);
        const apiCategory = await categoryApi.create({
          name: c.name,
          type: c.type,
          icon: c.icon,
          color: c.color,
          parentId: c.parentId,
          isDefault: false,
        });
        const newCategory: Category = {
          id: apiCategory.id,
          name: apiCategory.name,
          type: apiCategory.type,
          icon: apiCategory.icon || '📦',
          color: apiCategory.color || '#10b981',
          parentId: apiCategory.parentId || undefined,
          isDefault: apiCategory.isDefault,
        };
        setState(prev => ({ ...prev, categories: [...prev.categories, newCategory] }));
        toast.success('Categoria criada com sucesso!');
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao criar categoria';
        setCategoriesError(message);
        console.error('Erro ao criar categoria:', error);
        toast.error(message);
      } finally {
        setCategoriesLoading(false);
      }
    } else {
      const newId = generateUniqueId('cat');
      setState(prev => ({ ...prev, categories: [...prev.categories, { ...c, id: newId }] }));
      toast.success('Categoria criada localmente!');
    }
  }, [isBackendAuthenticated]);

  const updateCategory = useCallback(async (id: string, c: Partial<Omit<Category, 'id'>>) => {
    if (isBackendAuthenticated()) {
      try {
        setCategoriesLoading(true);
        const updatedApiCategory = await categoryApi.update(id, {
          name: c.name,
          type: c.type,
          icon: c.icon,
          color: c.color,
          parentId: c.parentId,
        });
        setState(prev => ({
          ...prev,
          categories: prev.categories.map(cat =>
            cat.id === id ? {
              ...cat,
              name: updatedApiCategory.name,
              type: updatedApiCategory.type,
              icon: updatedApiCategory.icon || '📦',
              color: updatedApiCategory.color || '#10b981',
              parentId: updatedApiCategory.parentId || undefined,
              isDefault: updatedApiCategory.isDefault,
            } : cat
          ),
        }));
        toast.success('Categoria atualizada com sucesso!');
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao atualizar categoria';
        setCategoriesError(message);
        console.error('Erro ao atualizar categoria:', error);
        toast.error(message);
      } finally {
        setCategoriesLoading(false);
      }
    } else {
      setState(prev => ({ ...prev, categories: prev.categories.map(cat => cat.id === id ? { ...cat, ...c } : cat) }));
      toast.success('Categoria atualizada localmente!');
    }
  }, [isBackendAuthenticated]);

  const deleteCategory = useCallback(async (id: string) => {
    if (isBackendAuthenticated()) {
      try {
        setCategoriesLoading(true);
        await categoryApi.delete(id);
        setState(prev => ({ ...prev, categories: prev.categories.filter(cat => cat.id !== id) }));
        toast.success('Categoria excluída com sucesso!');
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao excluir categoria';
        setCategoriesError(message);
        console.error('Erro ao excluir categoria:', error);
        toast.error(message);
      } finally {
        setCategoriesLoading(false);
      }
    } else {
      setState(prev => ({ ...prev, categories: prev.categories.filter(cat => cat.id !== id) }));
      toast.success('Categoria excluída localmente!');
    }
  }, [isBackendAuthenticated]);

  const addAccount = useCallback((a: Omit<Account, 'id'>) => setState(prev => ({ ...prev, accounts: [...prev.accounts, { ...a, id: generateUniqueId('acc') }] })), []);
  const updateAccount = useCallback((id: string, a: Partial<Omit<Account, 'id'>>) => setState(prev => ({ ...prev, accounts: prev.accounts.map(acc => acc.id === id ? { ...acc, ...a } : acc) })), []);
  const deleteAccount = useCallback((id: string) => setState(prev => ({ ...prev, accounts: prev.accounts.filter(a => a.id !== id) })), []);

  const addTransaction = useCallback(async (t: Omit<Transaction, 'id'>, silent: boolean = false) => {
    if (isBackendAuthenticated()) {
      try {
        // Preparar payload para o backend
        const payload: any = {
          description: t.description,
          amount: t.amount,
          type: t.type,
          date: t.date,
          accountId: t.accountId,
        };

        // Adicionar categoryId apenas para income e expense
        if (t.type === 'income' || t.type === 'expense') {
          payload.categoryId = t.categoryId;
        }

        // Adicionar toAccountId para transferências
        if (t.type === 'transfer' && t.toAccountId) {
          payload.toAccountId = t.toAccountId;
        }

        // Adicionar assetId para transferências para contas de investimento
        if (t.type === 'transfer' && t.assetId) {
          payload.assetId = t.assetId;
        }

        if (t.externalId != null && String(t.externalId).trim()) {
          payload.externalId = String(t.externalId).trim();
        }

        const apiTransaction = await api.transaction.create(payload);
        const normalizedAmount = typeof apiTransaction.amount === 'string'
          ? parseFloat(apiTransaction.amount)
          : apiTransaction.amount;
        
        // Normalizar a data para formato YYYY-MM-DD
        let normalizedDate = apiTransaction.date;
        if (apiTransaction.date) {
          if (apiTransaction.date.includes('T')) {
            normalizedDate = apiTransaction.date.split('T')[0];
          } else {
            const dateObj = new Date(apiTransaction.date);
            if (!isNaN(dateObj.getTime())) {
              normalizedDate = dateObj.toISOString().split('T')[0];
            }
          }
        }
        
        const newTransaction: Transaction = {
          id: apiTransaction.id,
          description: apiTransaction.description,
          amount: normalizedAmount,
          type: apiTransaction.type as TransactionType,
          date: normalizedDate,
          categoryId: apiTransaction.categoryId || (apiTransaction.type === 'transfer' ? 'sys-transfer' : apiTransaction.type === 'adjustment' ? 'sys-adjustment' : ''),
          accountId: apiTransaction.accountId,
          toAccountId: apiTransaction.toAccountId || undefined,
          assetId: apiTransaction.assetId || undefined,
          externalId: apiTransaction.externalId ?? undefined,
        };

        setState(prev => {
          // O backend já atualiza o saldo das contas, mas atualizamos localmente para manter a UI responsiva
          let updatedAccounts = [...prev.accounts];
          
          if (t.type === 'transfer' && t.toAccountId) {
            updatedAccounts = updatedAccounts.map(acc => {
              if (acc.id === t.accountId) return { ...acc, balance: acc.balance - t.amount };
              if (acc.id === t.toAccountId) return { ...acc, balance: acc.balance + t.amount };
              return acc;
            });
          } else if (t.type === 'adjustment') {
            updatedAccounts = updatedAccounts.map(acc => {
              if (acc.id === t.accountId) return { ...acc, balance: t.amount };
              return acc;
            });
          } else {
            updatedAccounts = updatedAccounts.map(acc => {
              if (acc.id === t.accountId) {
                return { ...acc, balance: acc.balance + (t.type === 'income' ? t.amount : -t.amount) };
              }
              return acc;
            });
          }
          
          return { ...prev, accounts: updatedAccounts, transactions: [newTransaction, ...prev.transactions] };
        });
        
        if (!silent) {
          toast.success('Transação criada com sucesso!');
        }
        return;
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao criar transação';
        console.error('Erro ao criar transação:', error);
        toast.error(message);
        // Não salvar localmente quando houver erro do backend (ex: validações)
        return;
      }
    }

    // Salvar localmente (apenas quando não autenticado ou para transferências/ajustes quando autenticado mas sem backend)
    setState(prev => {
      const newId = generateUniqueId('tr');
      const updatedAccounts = prev.accounts.map(acc => {
        if (t.type === 'transfer') {
          if (acc.id === t.accountId) return { ...acc, balance: acc.balance - t.amount };
          if (acc.id === t.toAccountId) return { ...acc, balance: acc.balance + t.amount };
        } else if (t.type === 'adjustment') {
          if (acc.id === t.accountId) return { ...acc, balance: acc.balance + t.amount };
        } else {
          if (acc.id === t.accountId) return { ...acc, balance: acc.balance + (t.type === 'income' ? t.amount : -t.amount) };
        }
        return acc;
      });
      return { ...prev, accounts: updatedAccounts, transactions: [{ ...t, id: newId }, ...prev.transactions] };
    });
  }, [isBackendAuthenticated]);

  const addTransactions = useCallback((ts: Omit<Transaction, 'id'>[]) => {
    setState(prev => {
      let currentAccounts = [...prev.accounts];
      const newTransactions = ts.map((t, index) => {
        const newId = `tr-bulk-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;
        currentAccounts = currentAccounts.map(acc => {
          if (t.type === 'transfer') {
            if (acc.id === t.accountId) return { ...acc, balance: acc.balance - t.amount };
            if (acc.id === t.toAccountId) return { ...acc, balance: acc.balance + t.amount };
          } else if (t.type === 'adjustment') {
            if (acc.id === t.accountId) return { ...acc, balance: acc.balance + t.amount };
          } else {
            if (acc.id === t.accountId) return { ...acc, balance: acc.balance + (t.type === 'income' ? t.amount : -t.amount) };
          }
          return acc;
        });
        return { ...t, id: newId };
      });
      return { ...prev, accounts: currentAccounts, transactions: [...newTransactions, ...prev.transactions] };
    });
  }, []);

  const updateTransaction = useCallback(async (id: string, updatedData: Partial<Omit<Transaction, 'id'>>) => {
    const oldTr = state.transactions.find(t => t.id === id);
    if (!oldTr) return;

    if (isBackendAuthenticated() && !id.startsWith('tr-')) {
      try {
        const payload: any = {
          description: updatedData.description,
          amount: updatedData.amount,
          type: updatedData.type,
          date: updatedData.date,
          accountId: updatedData.accountId,
        };

        // Adicionar categoryId apenas para income e expense
        if (updatedData.type === 'income' || updatedData.type === 'expense' || (!updatedData.type && (oldTr.type === 'income' || oldTr.type === 'expense'))) {
          payload.categoryId = updatedData.categoryId;
        }

        // Adicionar toAccountId para transferências
        if (updatedData.type === 'transfer' || (!updatedData.type && oldTr.type === 'transfer')) {
          payload.toAccountId = updatedData.toAccountId;
        }

        // Adicionar assetId para transferências para contas de investimento
        if (updatedData.type === 'transfer' || (!updatedData.type && oldTr.type === 'transfer')) {
          payload.assetId = updatedData.assetId !== undefined ? (updatedData.assetId || null) : undefined;
        }

        const apiTransaction = await api.transaction.update(id, payload);
        const normalizedAmount = typeof apiTransaction.amount === 'string'
          ? parseFloat(apiTransaction.amount)
          : apiTransaction.amount;

        // Normalizar a data para formato YYYY-MM-DD
        let normalizedDate = apiTransaction.date;
        if (apiTransaction.date) {
          if (apiTransaction.date.includes('T')) {
            normalizedDate = apiTransaction.date.split('T')[0];
          } else {
            const dateObj = new Date(apiTransaction.date);
            if (!isNaN(dateObj.getTime())) {
              normalizedDate = dateObj.toISOString().split('T')[0];
            }
          }
        }

        const updatedTransaction: Transaction = {
          id: apiTransaction.id,
          description: apiTransaction.description,
          amount: normalizedAmount,
          type: apiTransaction.type as TransactionType,
          date: normalizedDate,
          categoryId: apiTransaction.categoryId || (apiTransaction.type === 'transfer' ? 'sys-transfer' : apiTransaction.type === 'adjustment' ? 'sys-adjustment' : ''),
          accountId: apiTransaction.accountId,
          toAccountId: apiTransaction.toAccountId || undefined,
          assetId: apiTransaction.assetId || undefined,
        };

        setState(prev => ({
          ...prev,
          transactions: prev.transactions.map(t => t.id === id ? updatedTransaction : t)
        }));
        
        toast.success('Transação atualizada com sucesso!');
        return;
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao atualizar transação';
        console.error('Erro ao atualizar transação:', error);
        toast.error(message);
        // Não atualizar localmente quando houver erro do backend (ex: validações)
        return;
      }
    }

    // Atualizar localmente (apenas quando não autenticado)
    setState(prev => {
      const oldTr = prev.transactions.find(t => t.id === id);
      if (!oldTr) return prev;
      let revertedAccounts = prev.accounts.map(acc => {
        if (oldTr.type === 'transfer') {
          if (acc.id === oldTr.accountId) return { ...acc, balance: acc.balance + oldTr.amount };
          if (acc.id === oldTr.toAccountId) return { ...acc, balance: acc.balance - oldTr.amount };
        } else if (oldTr.type === 'adjustment') {
          if (acc.id === oldTr.accountId) return { ...acc, balance: acc.balance - oldTr.amount };
        } else {
          if (acc.id === oldTr.accountId) return { ...acc, balance: acc.balance - (oldTr.type === 'income' ? oldTr.amount : -oldTr.amount) };
        }
        return acc;
      });
      const finalTr = { ...oldTr, ...updatedData };
      const finalAccounts = revertedAccounts.map(acc => {
        if (finalTr.type === 'transfer') {
          if (acc.id === finalTr.accountId) return { ...acc, balance: acc.balance - finalTr.amount };
          if (acc.id === finalTr.toAccountId) return { ...acc, balance: acc.balance + finalTr.amount };
        } else if (finalTr.type === 'adjustment') {
          if (acc.id === finalTr.accountId) return { ...acc, balance: finalTr.amount };
        } else {
          if (acc.id === finalTr.accountId) return { ...acc, balance: acc.balance + (finalTr.type === 'income' ? finalTr.amount : -finalTr.amount) };
        }
        return acc;
      });
      return { ...prev, accounts: finalAccounts, transactions: prev.transactions.map(t => t.id === id ? finalTr : t) };
    });
  }, [isBackendAuthenticated, state.transactions]);

  const deleteTransaction = useCallback(async (id: string) => {
    const tr = state.transactions.find(t => t.id === id);
    if (!tr) return;

    if (isBackendAuthenticated() && !id.startsWith('tr-')) {
      try {
        await api.transaction.delete(id);
        toast.success('Transação excluída com sucesso!');
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao excluir transação';
        console.error('Erro ao excluir transação:', error);
        toast.error(message);
        return; // Não continuar se houver erro no backend
      }
    }

    // Deletar localmente
    setState(prev => {
      const tr = prev.transactions.find(t => t.id === id);
      if (!tr) return prev;
      const updatedAccounts = prev.accounts.map(acc => {
        if (tr.type === 'transfer') {
          if (acc.id === tr.accountId) return { ...acc, balance: acc.balance + tr.amount };
          if (acc.id === tr.toAccountId) return { ...acc, balance: acc.balance - tr.amount };
        } else if (tr.type === 'adjustment') {
          if (acc.id === tr.accountId) return { ...acc, balance: acc.balance - tr.amount };
        } else {
          if (acc.id === tr.accountId) return { ...acc, balance: acc.balance - (tr.type === 'income' ? tr.amount : -tr.amount) };
        }
        return acc;
      });
      return { ...prev, accounts: updatedAccounts, transactions: prev.transactions.filter(t => t.id !== id) };
    });
  }, [isBackendAuthenticated, state.transactions]);

  const addBudget = useCallback(async (b: Omit<Budget, 'id' | 'spent'>) => {
    if (isBackendAuthenticated()) {
      try {
        const apiBudget = await api.budget.create({
          categoryId: b.categoryId,
          limit: b.limit,
        });

        const newBudget: Budget = {
          id: apiBudget.id,
          categoryId: apiBudget.categoryId,
          limit: apiBudget.limit,
          spent: apiBudget.spent,
        };

        setState(prev => ({ ...prev, budgets: [...prev.budgets, newBudget] }));
        toast.success('Orçamento criado com sucesso!');
        return;
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao criar orçamento';
        console.error('Erro ao criar orçamento:', error);
        toast.error(message);
        return; // Não adicionar ao estado quando a API rejeita (ex.: orçamento duplicado)
      }
    }

    // Salvar localmente apenas quando não autenticado
    setState(prev => ({ ...prev, budgets: [...prev.budgets, { ...b, id: generateUniqueId('bud'), spent: 0 }] }));
  }, [isBackendAuthenticated]);

  const updateBudget = useCallback(async (id: string, b: Partial<Omit<Budget, 'id' | 'spent'>>) => {
    if (isBackendAuthenticated() && !id.startsWith('bud-')) {
      try {
        const apiBudget = await api.budget.update(id, {
          categoryId: b.categoryId,
          limit: b.limit,
        });

        const updatedBudget: Budget = {
          id: apiBudget.id,
          categoryId: apiBudget.categoryId,
          limit: apiBudget.limit,
          spent: apiBudget.spent,
        };

        setState(prev => ({
          ...prev,
          budgets: prev.budgets.map(bud => bud.id === id ? updatedBudget : bud)
        }));
        toast.success('Orçamento atualizado com sucesso!');
        return;
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao atualizar orçamento';
        console.error('Erro ao atualizar orçamento:', error);
        toast.error(message);
        // Continuar para atualizar localmente em caso de erro
      }
    }

    // Atualizar localmente
    setState(prev => ({ ...prev, budgets: prev.budgets.map(bud => bud.id === id ? { ...bud, ...b } : bud) }));
  }, [isBackendAuthenticated]);

  const deleteBudget = useCallback(async (id: string) => {
    if (isBackendAuthenticated() && !id.startsWith('bud-')) {
      try {
        await api.budget.delete(id);
        toast.success('Orçamento excluído com sucesso!');
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao excluir orçamento';
        console.error('Erro ao excluir orçamento:', error);
        toast.error(message);
        return; // Não continuar se houver erro no backend
      }
    }

    // Deletar localmente
    setState(prev => ({ ...prev, budgets: prev.budgets.filter(b => b.id !== id) }));
  }, [isBackendAuthenticated]);

  const addSchedule = useCallback(async (s: Omit<Schedule, 'id'>) => {
    if (isBackendAuthenticated()) {
      try {
        // Normalizar categoryId para null se for transfer ou adjustment
        const categoryId = (s.type === 'transfer' || s.type === 'adjustment') ? null : s.categoryId;
        
        const apiSchedule = await api.schedule.create({
          description: s.description,
          amount: s.amount,
          date: s.date,
          frequency: s.frequency,
          type: s.type,
          categoryId: categoryId || null,
          accountId: s.accountId,
          toAccountId: s.type === 'transfer' ? (s.toAccountId || null) : null,
        });

        const newSchedule: Schedule = {
          id: apiSchedule.id,
          description: apiSchedule.description,
          amount: apiSchedule.amount,
          date: apiSchedule.date,
          frequency: apiSchedule.frequency,
          type: apiSchedule.type as TransactionType,
          categoryId: apiSchedule.categoryId || (apiSchedule.type === 'transfer' ? 'sys-transfer' : apiSchedule.type === 'adjustment' ? 'sys-adjustment' : ''),
          accountId: apiSchedule.accountId,
          toAccountId: apiSchedule.toAccountId || undefined,
        };

        setState(prev => ({ ...prev, schedules: [...prev.schedules, newSchedule] }));
        toast.success('Agendamento criado com sucesso!');
        return;
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao criar agendamento';
        console.error('Erro ao criar agendamento:', error);
        toast.error(message);
        // Continuar para salvar localmente em caso de erro
      }
    }

    // Salvar localmente (quando não autenticado ou em caso de erro)
    setState(prev => ({ ...prev, schedules: [...prev.schedules, { ...s, id: generateUniqueId('sch') }] }));
  }, [isBackendAuthenticated]);

  const updateSchedule = useCallback(async (id: string, s: Partial<Omit<Schedule, 'id'>>, silent: boolean = false) => {
    if (isBackendAuthenticated()) {
      try {
        // Normalizar categoryId para null se for transfer ou adjustment
        const updateData: any = { ...s };
        if (updateData.type === 'transfer' || updateData.type === 'adjustment') {
          updateData.categoryId = null;
        }
        
        const apiSchedule = await api.schedule.update(id, updateData);

        const updatedSchedule: Schedule = {
          id: apiSchedule.id,
          description: apiSchedule.description,
          amount: apiSchedule.amount,
          date: apiSchedule.date,
          frequency: apiSchedule.frequency,
          type: apiSchedule.type as TransactionType,
          categoryId: apiSchedule.categoryId || (apiSchedule.type === 'transfer' ? 'sys-transfer' : apiSchedule.type === 'adjustment' ? 'sys-adjustment' : ''),
          accountId: apiSchedule.accountId,
          toAccountId: apiSchedule.toAccountId || undefined,
        };

        setState(prev => ({
          ...prev,
          schedules: prev.schedules.map(sch => sch.id === id ? updatedSchedule : sch),
        }));
        if (!silent) {
          toast.success('Agendamento atualizado com sucesso!');
        }
        return;
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao atualizar agendamento';
        console.error('Erro ao atualizar agendamento:', error);
        toast.error(message);
        // Continuar para atualizar localmente em caso de erro
      }
    }

    // Atualizar localmente (quando não autenticado ou em caso de erro)
    setState(prev => ({ ...prev, schedules: prev.schedules.map(sch => sch.id === id ? { ...sch, ...s } : sch) }));
  }, [isBackendAuthenticated]);

  const deleteSchedule = useCallback(async (id: string, silent: boolean = false) => {
    if (isBackendAuthenticated()) {
      try {
        await api.schedule.delete(id);
        setState(prev => ({ ...prev, schedules: prev.schedules.filter(s => s.id !== id) }));
        if (!silent) {
          toast.success('Agendamento excluído com sucesso!');
        }
        return;
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao excluir agendamento';
        console.error('Erro ao excluir agendamento:', error);
        toast.error(message);
        // Continuar para deletar localmente em caso de erro
      }
    }

    // Deletar localmente
    setState(prev => ({ ...prev, schedules: prev.schedules.filter(s => s.id !== id) }));
  }, [isBackendAuthenticated]);

  const addInvestment = useCallback((i: Omit<Investment, 'id'>) => setState(prev => ({ ...prev, investments: [...prev.investments, { ...i, id: generateUniqueId('inv') }] })), []);
  const updateInvestment = useCallback((id: string, i: Partial<Omit<Investment, 'id'>>) => setState(prev => ({ ...prev, investments: prev.investments.map(inv => inv.id === id ? { ...inv, ...i } : inv) })), []);
  const deleteInvestment = useCallback((id: string) => setState(prev => ({ ...prev, investments: prev.investments.filter(i => i.id !== id) })), []);

  const addAsset = useCallback(async (a: Omit<Asset, 'id'>) => {
    if (isBackendAuthenticated()) {
      try {
        const apiAsset = await api.asset.create({
          name: a.name,
          incomeType: a.incomeType,
          color: a.color || null,
        });

        const newAsset: Asset = {
          id: apiAsset.id,
          name: apiAsset.name,
          incomeType: apiAsset.incomeType,
          color: apiAsset.color || undefined,
        };

        setState(prev => ({ ...prev, assets: [...prev.assets, newAsset] }));
        toast.success('Ativo criado com sucesso!');
        return;
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao criar ativo';
        console.error('Erro ao criar ativo:', error);
        toast.error(message);
        // Continuar para salvar localmente em caso de erro
      }
    }

    // Salvar localmente (quando não autenticado ou em caso de erro)
    setState(prev => ({ ...prev, assets: [...prev.assets, { ...a, id: generateUniqueId('ast') }] }));
  }, [isBackendAuthenticated]);

  const updateAsset = useCallback(async (id: string, a: Partial<Omit<Asset, 'id'>>) => {
    if (isBackendAuthenticated() && !id.startsWith('ast-')) {
      try {
        const apiAsset = await api.asset.update(id, {
          name: a.name,
          incomeType: a.incomeType,
          color: a.color !== undefined ? (a.color || null) : undefined,
        });

        const updatedAsset: Asset = {
          id: apiAsset.id,
          name: apiAsset.name,
          incomeType: apiAsset.incomeType,
          color: apiAsset.color || undefined,
        };

        setState(prev => ({
          ...prev,
          assets: prev.assets.map(ast => ast.id === id ? updatedAsset : ast),
        }));
        toast.success('Ativo atualizado com sucesso!');
        return;
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao atualizar ativo';
        console.error('Erro ao atualizar ativo:', error);
        toast.error(message);
        // Continuar para atualizar localmente em caso de erro
      }
    }

    // Atualizar localmente (quando não autenticado ou em caso de erro)
    setState(prev => ({ ...prev, assets: prev.assets.map(ast => ast.id === id ? { ...ast, ...a } : ast) }));
  }, [isBackendAuthenticated]);

  const deleteAsset = useCallback(async (id: string) => {
    if (isBackendAuthenticated() && !id.startsWith('ast-')) {
      try {
        await api.asset.delete(id);
        setState(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));
        toast.success('Ativo excluído com sucesso!');
        return;
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao excluir ativo';
        console.error('Erro ao excluir ativo:', error);
        toast.error(message);
        // Continuar para deletar localmente em caso de erro
      }
    }

    // Deletar localmente
    setState(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));
  }, [isBackendAuthenticated]);

  const updateAssetHoldingValue = useCallback(async (id: string, value: number) => {
    if (isBackendAuthenticated()) {
      try {
        const apiHolding = await api.assetHolding.updateValue(id, { currentValue: value });
        const updatedHolding: AssetHolding = {
          id: apiHolding.id,
          assetId: apiHolding.assetId,
          currentValue: apiHolding.currentValue,
          asset: {
            id: apiHolding.asset.id,
            name: apiHolding.asset.name,
            incomeType: apiHolding.asset.incomeType,
            color: apiHolding.asset.color || undefined,
          },
        };
        setState(prev => ({
          ...prev,
          assetHoldings: prev.assetHoldings.map(h => h.id === id ? updatedHolding : h),
        }));
        toast.success('Valor do ativo atualizado com sucesso!');
        return;
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao atualizar valor do ativo';
        console.error('Erro ao atualizar valor do ativo:', error);
        toast.error(message);
      }
    }
  }, [isBackendAuthenticated]);

  const deleteAssetHolding = useCallback(async (id: string) => {
    if (isBackendAuthenticated()) {
      try {
        await api.assetHolding.delete(id);
        setState(prev => ({ ...prev, assetHoldings: prev.assetHoldings.filter(h => h.id !== id) }));
        toast.success('Ativo excluído com sucesso!');
        return;
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao excluir ativo';
        console.error('Erro ao excluir ativo:', error);
        toast.error(message);
      }
    }
  }, [isBackendAuthenticated]);

  const addGoal = useCallback(async (g: Omit<Goal, 'id'>) => {
    if (isBackendAuthenticated()) {
      try {
        const apiGoal = await api.goal.create({
          name: g.name,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount || 0,
          deadline: g.deadline || null,
          icon: g.icon || null,
          color: g.color || null,
        });

        const newGoal: Goal = {
          id: apiGoal.id,
          name: apiGoal.name,
          targetAmount: apiGoal.targetAmount,
          currentAmount: apiGoal.currentAmount,
          deadline: apiGoal.deadline || undefined,
          icon: apiGoal.icon || undefined,
          color: apiGoal.color || undefined,
        };

        setState(prev => ({ ...prev, goals: [...prev.goals, newGoal] }));
        toast.success('Meta criada com sucesso!');
        return;
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao criar meta';
        console.error('Erro ao criar meta:', error);
        toast.error(message);
        // Continuar para salvar localmente em caso de erro
      }
    }

    // Salvar localmente (quando não autenticado ou em caso de erro)
    setState(prev => ({ ...prev, goals: [...prev.goals, { ...g, id: generateUniqueId('goal') }] }));
  }, [isBackendAuthenticated]);

  const updateGoal = useCallback(async (id: string, g: Partial<Omit<Goal, 'id'>>) => {
    if (isBackendAuthenticated() && !id.startsWith('goal-')) {
      try {
        const apiGoal = await api.goal.update(id, {
          name: g.name,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          deadline: g.deadline !== undefined ? (g.deadline || null) : undefined,
          icon: g.icon !== undefined ? (g.icon || null) : undefined,
          color: g.color !== undefined ? (g.color || null) : undefined,
        });

        const updatedGoal: Goal = {
          id: apiGoal.id,
          name: apiGoal.name,
          targetAmount: apiGoal.targetAmount,
          currentAmount: apiGoal.currentAmount,
          deadline: apiGoal.deadline || undefined,
          icon: apiGoal.icon || undefined,
          color: apiGoal.color || undefined,
        };

        setState(prev => ({
          ...prev,
          goals: prev.goals.map(goal => goal.id === id ? updatedGoal : goal),
        }));
        toast.success('Meta atualizada com sucesso!');
        return;
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao atualizar meta';
        console.error('Erro ao atualizar meta:', error);
        toast.error(message);
        // Continuar para atualizar localmente em caso de erro
      }
    }

    // Atualizar localmente (quando não autenticado ou em caso de erro)
    setState(prev => ({ ...prev, goals: prev.goals.map(goal => goal.id === id ? { ...goal, ...g } : goal) }));
  }, [isBackendAuthenticated]);

  const deleteGoal = useCallback(async (id: string) => {
    if (isBackendAuthenticated() && !id.startsWith('goal-')) {
      try {
        await api.goal.delete(id);
        setState(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== id) }));
        toast.success('Meta excluída com sucesso!');
        return;
      } catch (error) {
        if (error instanceof SessionLostError) return;
        const message = error instanceof Error ? error.message : 'Erro ao excluir meta';
        console.error('Erro ao excluir meta:', error);
        toast.error(message);
        // Continuar para deletar localmente em caso de erro
      }
    }

    // Deletar localmente
    setState(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== id) }));
  }, [isBackendAuthenticated]);

  const refreshState = useCallback(async () => {
    // Se autenticado, buscar orçamentos do backend (que já calcula o spent)
    if (isBackendAuthenticated()) {
      await refreshBudgets();
    } else {
      // Se não autenticado, calcular localmente (pai/filhas + tipo da categoria: income ou expense)
      setState(prev => {
        const updatedBudgets = prev.budgets.map(budget => {
          const cat = prev.categories.find(c => c.id === budget.categoryId);
          if (!cat) return { ...budget, spent: 0 };
          const categoryIds = !cat.parentId
            ? [budget.categoryId, ...prev.categories.filter(c => c.parentId === budget.categoryId).map(c => c.id)]
            : [budget.categoryId];
          const spent = prev.transactions
            .filter(t => t.type === cat.type && categoryIds.includes(t.categoryId))
            .reduce((sum, t) => sum + Number(t.amount), 0);
          return { ...budget, spent };
        });
        return { ...prev, budgets: updatedBudgets };
      });
    }
  }, [isBackendAuthenticated, refreshBudgets]);

  return (
    <FinanceContext.Provider value={{
      ...state,
      addCategory, updateCategory, deleteCategory,
      categoriesLoading, categoriesError, refreshCategories, ensureDefaultCategories,
      addAccount, updateAccount, deleteAccount,
      addTransaction, addTransactions, updateTransaction, deleteTransaction,
      addBudget, updateBudget, deleteBudget,
      addSchedule, updateSchedule, deleteSchedule,
      addInvestment, updateInvestment, deleteInvestment,
      addAsset, updateAsset, deleteAsset, refreshAssets,
      refreshAssetHoldings, updateAssetHoldingValue, deleteAssetHolding,
      addGoal, updateGoal, deleteGoal, refreshGoals,
      refreshState, refreshUserScore, refreshTransactions, refreshSchedules, updateUserProfile, logout, toggleTheme
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within FinanceProvider');
  return context;
};
