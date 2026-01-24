import { useState, useEffect, useCallback } from 'react';
import { categoryApi, CategoryApiData, CreateCategoryPayload, UpdateCategoryPayload } from '../services/api';
import { Category } from '../types';
import { authApi } from '../services/api';

// Converte dados da API para o formato do frontend
const mapApiToCategory = (apiData: CategoryApiData): Category => ({
  id: apiData.id,
  name: apiData.name,
  type: apiData.type,
  icon: apiData.icon || '📦',
  color: apiData.color || '#10b981',
  parentId: apiData.parentId || undefined,
});

// Converte dados do frontend para payload da API
const mapCategoryToPayload = (data: Omit<Category, 'id'>): CreateCategoryPayload => ({
  name: data.name,
  type: data.type,
  icon: data.icon,
  color: data.color,
  parentId: data.parentId,
});

interface UseCategoriesReturn {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  // CRUD operations
  fetchCategories: () => Promise<void>;
  addCategory: (data: Omit<Category, 'id'>) => Promise<Category | null>;
  updateCategory: (id: string, data: Partial<Omit<Category, 'id'>>) => Promise<Category | null>;
  deleteCategory: (id: string) => Promise<boolean>;
  // Utility
  clearError: () => void;
}

export const useCategories = (): UseCategoriesReturn => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(authApi.isAuthenticated());

  // Verificar autenticação
  useEffect(() => {
    setIsAuthenticated(authApi.isAuthenticated());
  }, []);

  // Buscar categorias do backend
  const fetchCategories = useCallback(async () => {
    if (!authApi.isAuthenticated()) {
      setError('Usuário não autenticado');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiCategories = await categoryApi.getAll();
      const mappedCategories = apiCategories.map(mapApiToCategory);
      setCategories(mappedCategories);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar categorias';
      setError(message);
      console.error('Erro ao buscar categorias:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar categorias ao montar o componente (se autenticado)
  useEffect(() => {
    if (authApi.isAuthenticated()) {
      fetchCategories();
    }
  }, [fetchCategories]);

  // Adicionar nova categoria
  const addCategory = useCallback(async (data: Omit<Category, 'id'>): Promise<Category | null> => {
    if (!authApi.isAuthenticated()) {
      setError('Usuário não autenticado');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload = mapCategoryToPayload(data);
      const apiCategory = await categoryApi.create(payload);
      const newCategory = mapApiToCategory(apiCategory);
      
      setCategories(prev => [...prev, newCategory]);
      return newCategory;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar categoria';
      setError(message);
      console.error('Erro ao criar categoria:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Atualizar categoria existente
  const updateCategory = useCallback(async (
    id: string, 
    data: Partial<Omit<Category, 'id'>>
  ): Promise<Category | null> => {
    if (!authApi.isAuthenticated()) {
      setError('Usuário não autenticado');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload: UpdateCategoryPayload = {
        name: data.name,
        type: data.type,
        icon: data.icon,
        color: data.color,
        parentId: data.parentId,
      };

      const apiCategory = await categoryApi.update(id, payload);
      const updatedCategory = mapApiToCategory(apiCategory);
      
      setCategories(prev => 
        prev.map(cat => cat.id === id ? updatedCategory : cat)
      );
      return updatedCategory;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar categoria';
      setError(message);
      console.error('Erro ao atualizar categoria:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Deletar categoria
  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    if (!authApi.isAuthenticated()) {
      setError('Usuário não autenticado');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await categoryApi.delete(id);
      
      // Remove a categoria e atualiza parentId das subcategorias
      setCategories(prev => 
        prev
          .filter(cat => cat.id !== id)
          .map(cat => cat.parentId === id ? { ...cat, parentId: undefined } : cat)
      );
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar categoria';
      setError(message);
      console.error('Erro ao deletar categoria:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    categories,
    isLoading,
    error,
    isAuthenticated,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    clearError,
  };
};

export default useCategories;
