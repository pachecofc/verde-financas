import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { Account, CreateAccountPayload, UpdateAccountPayload, AccountType } from '../services/api';
import { useAuth } from './AuthContext'; // Para obter o token de autenticação
import { toast } from 'sonner';

interface AccountContextType {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  fetchAccounts: () => Promise<void>;
  createAccount: (data: CreateAccountPayload) => Promise<void>;
  updateAccount: (id: string, data: UpdateAccountPayload) => Promise<void>;
  deleteAccount: (id: string, force?: boolean) => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!isAuthenticated) {
      setAccounts([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.account.getAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Erro ao buscar contas:', err);
      setError(err instanceof Error ? err.message : 'Falha ao carregar contas.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const createAccount = async (data: CreateAccountPayload) => {
    setLoading(true);
    setError(null);
    try {
      const newAccount = await api.account.createAccount(data);
      setAccounts(prev => [...prev, newAccount]);
      // Opcional: Recarregar todas as contas para garantir consistência
      // await fetchAccounts();
    } catch (err) {
      console.error('Erro ao criar conta:', err);
      setError(err instanceof Error ? err.message : 'Falha ao criar conta.');
      throw err; // Re-throw para que o componente possa lidar com o erro
    } finally {
      setLoading(false);
    }
  };

  const updateAccount = async (id: string, data: UpdateAccountPayload) => {
    setLoading(true);
    setError(null);
    try {
      const updatedAccount = await api.account.updateAccount(id, data); // <--- Chama a API
      setAccounts(prev => prev.map(acc => acc.id === id ? updatedAccount : acc)); // Atualiza o estado local
      toast.success('Conta atualizada com sucesso!');
    } catch (err) {
      console.error('Erro ao atualizar conta:', err);
      setError(err instanceof Error ? err.message : 'Falha ao atualizar conta.');
      toast.error(err instanceof Error ? err.message : 'Falha ao atualizar conta.');
      throw err; // Re-throw para que o componente possa lidar com o erro (ex: não fechar modal)
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async (id: string, force: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      await api.account.deleteAccount(id, force);
      setAccounts(prev => prev.filter(acc => acc.id !== id));
      // Opcional: Recarregar todas as contas para garantir consistência
      // await fetchAccounts();
    } catch (err) {
      console.error('Erro ao deletar conta:', err);
      setError(err instanceof Error ? err.message : 'Falha ao deletar conta.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts, isAuthenticated]); // Recarrega contas quando o estado de autenticação muda

  return (
    <AccountContext.Provider value={{ accounts, loading, error, fetchAccounts, createAccount, updateAccount, deleteAccount }}>
      {children}
    </AccountContext.Provider>
  );
};

export const useAccounts = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccounts must be used within an AccountProvider');
  }
  return context;
};
