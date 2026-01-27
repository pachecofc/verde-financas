// Configuração base da API
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api';

// Access token mantido apenas em memória
let accessToken: string | null = null;

// Função para obter o token de autenticação (somente em memória)
const getAuthToken = (): string | null => {
  return accessToken;
};

// Headers padrão para requisições autenticadas
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Função genérica para tratamento de erros
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Função para renovar o access token usando o refresh token (cookie HttpOnly)
const refreshAccessToken = async (): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    accessToken = null;
    throw new Error('Falha ao renovar sessão');
  }

  const data = await response.json();
  accessToken = data.token;

  // Opcional: atualizar usuário armazenado no localStorage se vier no payload
  if (data.user) {
    localStorage.setItem('auth_user', JSON.stringify(data.user));
  }
};

// ============ CATEGORY API ============
// --- Interfaces para Categorias ---
export type CategoryType = 'income' | 'expense';

export interface CategoryApiData {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  parentId?: string | null;
  isDefault?: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  parent?: CategoryApiData | null;
  children?: CategoryApiData[];
}

export interface CreateCategoryPayload {
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
  parentId?: string;
  isDefault?: boolean;
}

export interface UpdateCategoryPayload {
  name?: string;
  type?: 'income' | 'expense';
  icon?: string;
  color?: string;
  parentId?: string;
}

// Interface para payload de criação em lote
export interface CreateMultipleCategoriesPayload {
  tempId: string; // ID temporário do frontend
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  parentId?: string; // parentId será o tempId do pai
  isDefault?: boolean;
}

export const categoryApi = {
  // Listar todas as categorias
  getAll: async (): Promise<CategoryApiData[]> => {
    const doRequest = async () => {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return handleResponse<CategoryApiData[]>(response);
    };

    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Criar nova categoria
  create: async (data: CreateCategoryPayload): Promise<CategoryApiData> => {
    const doRequest = async () => {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse<CategoryApiData>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Criar múltiplas categorias
  createMultiple: async (data: CreateMultipleCategoriesPayload[]): Promise<CategoryApiData[]> => {
    const doRequest = async () => {
      const response = await fetch(`${API_BASE_URL}/categories/batch`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse<CategoryApiData[]>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Atualizar categoria existente
  update: async (id: string, data: UpdateCategoryPayload): Promise<CategoryApiData> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      });
      return handleResponse<CategoryApiData>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Deletar categoria
  delete: async (id: string): Promise<{ message: string }> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
        });
        return handleResponse<{ message: string }>(response);
      };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  }
};

// ============ ACCOUNT API ============
export type AccountType = 'CHECKING' | 'SAVINGS' | 'INVESTMENT' | 'CASH' | 'OTHER';

export interface Account {
  id: string;
  userId: string;
  name: string;
  balance: number; // No frontend, trabalharemos com number
  currency: string;
  type: AccountType;
  bankName?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountPayload {
  name: string;
  balance: number;
  currency: string;
  type: AccountType;
  bankName?: string;
  color?: string;
}

export interface UpdateAccountPayload {
  name?: string;
  balance?: number;
  currency?: string;
  type?: AccountType;
  bankName?: string;
  color?: string;
}

const accountApi = {
  // Obter todas as contas do usuário
  getAccounts: async (): Promise<Account[]> => {
    const response = await fetch(`${API_BASE_URL}/accounts`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<Account[]>(response);
  },

  // Obter uma única conta por ID
  getAccountById: async (id: string): Promise<Account> => {
    const doRequest = async () => {
      const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return handleResponse<Account>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Criar uma nova conta
  createAccount: async (data: CreateAccountPayload): Promise<Account> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/accounts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
      return handleResponse<Account>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Atualizar uma conta existente
  updateAccount: async (id: string, data: UpdateAccountPayload): Promise<Account> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      });
      return handleResponse<Account>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Deletar uma conta
  deleteAccount: async (id: string, force?: boolean): Promise<{ message: string }> => {
    const query = force ? '?force=true' : '';
    const doRequest = async () => {
        const response = await fetch(`${API_BASE_URL}/accounts/${id}${query}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handleResponse<{ message: string }>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  }
};

// ============ AUTH API ============

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  plan?: 'BASIC' | 'PREMIUM';
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  plan?: 'BASIC' | 'PREMIUM';
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface UpdatedUserResponse {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  plan?: 'BASIC' | 'PREMIUM';
}

// Interface para payload de mudança de senha
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const authApi = {
  // Login de usuário existente
  login: async (data: LoginPayload): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<AuthResponse>(response);
  },

  // Registro de novo usuário
  signup: async (data: SignupPayload): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<AuthResponse>(response);
  },

  // Solicitar redefinição de senha
  requestPasswordReset: async (data: ForgotPasswordPayload): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string }>(response);
  },

  // Redefinir senha
  resetPassword: async (data: ResetPasswordPayload): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string }>(response);
  },

  // Função para fazer upload do avatar
  uploadAvatar: async (file: File): Promise<{ message: string; avatarUrl: string }> => {
    const formData = new FormData();
    formData.append('avatar', file); // 'avatar' deve corresponder ao nome do campo no Multer

    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/users/profile/avatar`, {
      method: 'PUT',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    return handleResponse<{ message: string; avatarUrl: string }>(response);
  },

  // Função para atualizar informações do perfil (nome, email, etc.)
  updateProfile: async (data: Partial<UpdatedUserResponse>): Promise<{ message: string; user: UpdatedUserResponse }> => {
    // Certifique-se de que o 'plan' seja enviado em maiúsculas, se existir
    const payload = { ...data };
    if (payload.plan) {
      payload.plan = payload.plan.toUpperCase() as 'BASIC' | 'PREMIUM';
    }

    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<{ message: string; user: UpdatedUserResponse }>(response);
  },

  // Função para alterar a senha do usuário logado
  changePassword: async (data: ChangePasswordPayload): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string }>(response);
  },

  // Armazenar token e dados do usuário no localStorage
  setAuth: (token: string, user: AuthUser): void => {
    accessToken = token;
    localStorage.setItem('auth_user', JSON.stringify(user));
  },

  // Obter dados do usuário armazenado
  getStoredUser: (): AuthUser | null => {
    const userStr = localStorage.getItem('auth_user');
    if (userStr) {
      try {
        // Ao parsear, garantir que avatarUrl e plan sejam incluídos se existirem
        const parsedUser = JSON.parse(userStr);
        return {
          id: parsedUser.id,
          name: parsedUser.name,
          email: parsedUser.email,
          avatarUrl: parsedUser.avatarUrl,
          plan: parsedUser.plan,
        };
      } catch {
        return null;
      }
    }
    return null;
  },

  // Remover token e dados do usuário do localStorage
  clearAuth: (): void => {
    accessToken = null;
    localStorage.removeItem('auth_user');
  },

  // Verificar se está autenticado
  isAuthenticated: (): boolean => {
    return !!getAuthToken();
  },

  // Obter token atual
  getToken: (): string | null => {
    return getAuthToken();
  },

  // Excluir conta do usuário (soft delete)
  deleteAccount: async (): Promise<{ message: string }> => {
    const doRequest = async () => {
      const response = await fetch(`${API_BASE_URL}/users/delete-account`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      return handleResponse<{ message: string }>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Reativar conta do usuário
  reactivateAccount: async (): Promise<{ message: string; user: UpdatedUserResponse }> => {
    const doRequest = async () => {
      const response = await fetch(`${API_BASE_URL}/users/reactivate-account`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      return handleResponse<{ message: string; user: UpdatedUserResponse }>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
};

// ============ TRANSACTION API ============
export interface TransactionApiData {
  id: string;
  description: string;
  amount: number; // Decimal do backend será convertido para number
  type: 'income' | 'expense' | 'transfer' | 'adjustment';
  date: string; // ISO date string
  userId: string;
  categoryId: string | null; // Null para transferências e ajustes
  accountId: string;
  toAccountId?: string | null; // Para transferências
  assetId?: string | null; // Para transferências para contas de investimento
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
    type: 'income' | 'expense';
  } | null;
  account?: {
    id: string;
    name: string;
  };
  toAccount?: {
    id: string;
    name: string;
    type?: string;
  } | null;
  asset?: {
    id: string;
    name: string;
    incomeType: 'fixed' | 'variable';
    color?: string | null;
  } | null;
}

export interface CreateTransactionPayload {
  categoryId?: string; // Opcional para transfer e adjustment
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer' | 'adjustment';
  date: string; // ISO date string
  accountId: string;
  toAccountId?: string; // Obrigatório para transferências
  assetId?: string | null; // Para transferências para contas de investimento
}

export interface UpdateTransactionPayload {
  categoryId?: string;
  description?: string;
  amount?: number;
  type?: 'income' | 'expense' | 'transfer' | 'adjustment';
  date?: string; // ISO date string
  accountId?: string;
  toAccountId?: string; // Para transferências
  assetId?: string | null; // Para transferências para contas de investimento
}

const transactionApi = {
  // Obter todas as transações do usuário
  getAll: async (filters?: {
    categoryId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    accountId?: string;
  }): Promise<TransactionApiData[]> => {
    const doRequest = async () => {
    const queryParams = new URLSearchParams();
    if (filters?.categoryId) queryParams.append('categoryId', filters.categoryId);
    if (filters?.type) queryParams.append('type', filters.type);
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    if (filters?.accountId) queryParams.append('accountId', filters.accountId);

    const query = queryParams.toString();
    const url = `${API_BASE_URL}/transactions${query ? `?${query}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<TransactionApiData[]>(response);
    // Converter Decimal para number
    return data.map(t => ({
      ...t,
      amount: typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount,
    }));
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Obter uma transação por ID
  getById: async (id: string): Promise<TransactionApiData> => {
    const doRequest = async () => {
      const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return handleResponse<TransactionApiData>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Criar nova transação
  create: async (data: CreateTransactionPayload): Promise<TransactionApiData> => {
    const doRequest = async () => {
        const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse<TransactionApiData>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;  
        }
      }
      throw error;
    }
  },
  // Atualizar transação existente
  update: async (id: string, data: UpdateTransactionPayload): Promise<TransactionApiData> => {
    const doRequest = async () => {
        const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse<TransactionApiData>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
  // Deletar transação
  delete: async (id: string): Promise<{ message: string }> => {
    const doRequest = async () => {
      const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handleResponse<{ message: string }>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
};

export interface BudgetApiData {
  id: string;
  userId: string;
  categoryId: string;
  limit: number;
  spent: number; // Calculado no backend
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
    type: 'income' | 'expense';
    icon?: string;
    color?: string;
  };
}

export interface CreateBudgetPayload {
  categoryId: string;
  limit: number;
}

export interface UpdateBudgetPayload {
  categoryId?: string;
  limit?: number;
}

export interface ScheduleApiData {
  id: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  frequency: 'once' | 'monthly' | 'weekly';
  type: 'income' | 'expense' | 'transfer' | 'adjustment';
  categoryId: string | null;
  accountId: string;
  toAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSchedulePayload {
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  frequency: 'once' | 'monthly' | 'weekly';
  type: 'income' | 'expense' | 'transfer' | 'adjustment';
  categoryId?: string | null;
  accountId: string;
  toAccountId?: string | null;
}

export interface UpdateSchedulePayload {
  description?: string;
  amount?: number;
  date?: string; // YYYY-MM-DD
  frequency?: 'once' | 'monthly' | 'weekly';
  type?: 'income' | 'expense' | 'transfer' | 'adjustment';
  categoryId?: string | null;
  accountId?: string;
  toAccountId?: string | null;
}

const budgetApi = {
  // Obter todos os orçamentos do usuário
  getAll: async (): Promise<BudgetApiData[]> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/budgets`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<BudgetApiData[]>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Obter um orçamento por ID
  getById: async (id: string): Promise<BudgetApiData> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/budgets/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<BudgetApiData>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Criar novo orçamento
  create: async (data: CreateBudgetPayload): Promise<BudgetApiData> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/budgets`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<BudgetApiData>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Atualizar orçamento existente
  update: async (id: string, data: UpdateBudgetPayload): Promise<BudgetApiData> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/budgets/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
      return handleResponse<BudgetApiData>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Deletar orçamento
  delete: async (id: string): Promise<{ message: string }> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/budgets/${id}`, {
        method: 'DELETE',
         headers: getAuthHeaders(),
    });
      return handleResponse<{ message: string }>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
};

const scheduleApi = {
  // Obter todos os agendamentos do usuário
  getAll: async (): Promise<ScheduleApiData[]> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/schedules`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<ScheduleApiData[]>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Obter um agendamento por ID
  getById: async (id: string): Promise<ScheduleApiData> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/schedules/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<ScheduleApiData>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Criar novo agendamento
  create: async (data: CreateSchedulePayload): Promise<ScheduleApiData> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/schedules`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<ScheduleApiData>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Atualizar agendamento existente
  update: async (id: string, data: UpdateSchedulePayload): Promise<ScheduleApiData> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/schedules/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<ScheduleApiData>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Deletar agendamento
  delete: async (id: string): Promise<{ message: string }> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/schedules/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
};

export interface AssetApiData {
  id: string;
  name: string;
  incomeType: 'fixed' | 'variable';
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetPayload {
  name: string;
  incomeType: 'fixed' | 'variable';
  color?: string | null;
}

export interface UpdateAssetPayload {
  name?: string;
  incomeType?: 'fixed' | 'variable';
  color?: string | null;
}

const assetApi = {
  // Obter todos os ativos do usuário
  getAll: async (): Promise<AssetApiData[]> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/assets`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<AssetApiData[]>(response);
      };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
  // Obter um ativo por ID
  getById: async (id: string): Promise<AssetApiData> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/assets/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<AssetApiData>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Criar novo ativo
  create: async (data: CreateAssetPayload): Promise<AssetApiData> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/assets`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse<AssetApiData>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
  // Atualizar ativo existente
  update: async (id: string, data: UpdateAssetPayload): Promise<AssetApiData> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/assets/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<AssetApiData>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // Deletar ativo
  delete: async (id: string): Promise<{ message: string }> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/assets/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
};

// ============ ASSET HOLDING API ============
export interface AssetHoldingApiData {
  id: string;
  assetId: string;
  userId: string;
  currentValue: number;
  createdAt: string;
  updatedAt: string;
  asset: {
    id: string;
    name: string;
    incomeType: 'fixed' | 'variable';
    color?: string | null;
  };
}

export interface UpdateAssetHoldingValuePayload {
  currentValue: number;
}

const assetHoldingApi = {
  // Obter todos os holdings do usuário
  getAll: async (): Promise<AssetHoldingApiData[]> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/asset-holdings`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<AssetHoldingApiData[]>(response);
    // Converter Decimal para number
    return data.map(h => ({
      ...h,
      currentValue: typeof h.currentValue === 'string' ? parseFloat(h.currentValue) : h.currentValue,
    }));
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
  // Obter um holding por ID
  getById: async (id: string): Promise<AssetHoldingApiData> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/asset-holdings/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<AssetHoldingApiData>(response);
    return {
      ...data,
      currentValue: typeof data.currentValue === 'string' ? parseFloat(data.currentValue) : data.currentValue,
    };
      };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
  // Atualizar o valor atual de um holding
  updateValue: async (id: string, data: UpdateAssetHoldingValuePayload): Promise<AssetHoldingApiData> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/asset-holdings/${id}/value`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<AssetHoldingApiData>(response);
    return {
      ...result,
      currentValue: typeof result.currentValue === 'string' ? parseFloat(result.currentValue) : result.currentValue,
    };
      };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
  // Deletar um holding
  delete: async (id: string): Promise<{ message: string }> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/asset-holdings/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
};

// ============ GOAL API ============
export interface GoalApiData {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string | null;
  icon?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalPayload {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  deadline?: string | null;
  icon?: string | null;
  color?: string | null;
}

export interface UpdateGoalPayload {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: string | null;
  icon?: string | null;
  color?: string | null;
}

const goalApi = {
  // Obter todas as metas do usuário
  getAll: async (): Promise<GoalApiData[]> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/goals`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<GoalApiData[]>(response);
    // Converter Decimal para number
    return data.map(g => ({
      ...g,
      targetAmount: typeof g.targetAmount === 'string' ? parseFloat(g.targetAmount) : g.targetAmount,
      currentAmount: typeof g.currentAmount === 'string' ? parseFloat(g.currentAmount) : g.currentAmount,
    }));
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
  // Obter uma meta por ID
  getById: async (id: string): Promise<GoalApiData> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<GoalApiData>(response);
    return {
      ...data,
      targetAmount: typeof data.targetAmount === 'string' ? parseFloat(data.targetAmount) : data.targetAmount,
      currentAmount: typeof data.currentAmount === 'string' ? parseFloat(data.currentAmount) : data.currentAmount,
    };
      };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
  // Criar nova meta
  create: async (data: CreateGoalPayload): Promise<GoalApiData> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/goals`, {
      method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse<GoalApiData>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
  // Atualizar meta existente
  update: async (id: string, data: UpdateGoalPayload): Promise<GoalApiData> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
      method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse<GoalApiData>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
  // Deletar meta
  delete: async (id: string): Promise<{ message: string }> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(response);
    };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
};

// ============ SCORE API ============
export interface ScoreApiData {
  score: number;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    unlockedAt: string;
  }>;
}

const scoreApi = {
  // Obter score e conquistas do usuário
  getUserScore: async (): Promise<ScoreApiData> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/scores`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<ScoreApiData>(response);
      };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
  // Recalcular score do usuário
  recalculateScore: async (): Promise<ScoreApiData> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/scores/recalculate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<ScoreApiData>(response);
      };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
};

// ============ REPORT API ============
export interface ExpenseByCategory {
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  categoryColor?: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
}

export interface ExpenseReport {
  period: {
    startDate: string;
    endDate: string;
  };
  totalExpenses: number;
  expensesByCategory: ExpenseByCategory[];
  previousPeriod?: {
    startDate: string;
    endDate: string;
    totalExpenses: number;
    expensesByCategory: ExpenseByCategory[];
  };
  comparison?: {
    totalDifference: number;
    totalDifferencePercentage: number;
    categoryComparisons: Array<{
      categoryId: string;
      categoryName: string;
      currentAmount: number;
      previousAmount: number;
      difference: number;
      differencePercentage: number;
    }>;
  };
}

export interface IncomeByCategory {
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  categoryColor?: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
}

export interface MonthlyEvolution {
  month: string;
  monthLabel: string;
  total: number;
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
  }>;
}

export interface IncomeReport {
  period: {
    startDate: string;
    endDate: string;
  };
  totalIncome: number;
  incomeByCategory: IncomeByCategory[];
  monthlyEvolution: MonthlyEvolution[];
}

export interface CashFlowPeriod {
  period: string;
  periodLabel: string;
  income: number;
  expense: number;
  balance: number;
  cumulativeBalance: number;
  isForecast?: boolean;
}

export interface CashFlowTrend {
  slope: number;
  intercept: number;
  forecast: CashFlowPeriod[];
}

export interface CashFlowReport {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  granularity: 'daily' | 'weekly' | 'monthly';
  flowData: CashFlowPeriod[];
  trend: CashFlowTrend | null;
}

export interface BalanceEvolutionMonth {
  month: string;
  monthLabel: string;
  totalBalance: number;
  assetValue: number;
  netWorth: number;
  transactions: number;
  balanceVariation: number;
  netWorthVariation: number;
}

export interface BalanceEvolutionReport {
  period: {
    startDate: string;
    endDate: string;
  };
  initial: {
    totalBalance: number;
    assetValue: number;
    netWorth: number;
  };
  final: {
    totalBalance: number;
    assetValue: number;
    netWorth: number;
  };
  evolution: BalanceEvolutionMonth[];
  summary: {
    totalBalanceVariation: number;
    totalNetWorthVariation: number;
  };
}

export interface GoalReportData {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  percentage: number;
  remaining: number;
  isCompleted: boolean;
  expectedDate: string | null;
  actualDate: string | null;
  status: 'on-track' | 'at-risk' | 'delayed' | 'completed' | 'no-deadline';
  icon: string | null;
  color: string | null;
  createdAt: string;
  expectedProgress: number;
}

export interface CumulativeProgress {
  month: string;
  monthLabel: string;
  goalsCreated: number;
  goalsCompleted: number;
  totalProgress: number;
  cumulativeAmount: number;
  cumulativeTarget: number;
  progressPercentage: number;
}

export interface GoalsReport {
  summary: {
    totalGoals: number;
    completedGoals: number;
    onTrackGoals: number;
    atRiskGoals: number;
    delayedGoals: number;
    totalTarget: number;
    totalCurrent: number;
    overallProgress: number;
  };
  goals: GoalReportData[];
  cumulativeProgress: CumulativeProgress[];
}

export interface DebtData {
  id: string;
  description: string;
  amount: number;
  monthlyImpact: number;
  frequency: 'monthly' | 'weekly';
  startDate: string;
  lastPaymentDate: string;
  totalInstallments: number;
  remainingInstallments: number;
  paidInstallments: number;
  interestRate: number;
  estimatedInterest: number;
  totalAmount: number;
  totalInterest: number;
  totalCost: number;
  paidAmount: number;
  remainingAmount: number;
  remainingCost: number;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  accountName: string;
  daysUntilNextPayment: number;
}

export interface DebtsReport {
  summary: {
    totalDebts: number;
    totalMonthlyImpact: number;
    totalDebtAmount: number;
    totalInterest: number;
    totalCost: number;
    totalPaid: number;
    totalRemaining: number;
  };
  debts: DebtData[];
}

export interface InvestmentDistribution {
  assetId: string;
  assetName: string;
  assetColor: string | null;
  incomeType: string;
  currentValue: number;
  investedAmount: number;
  return: number;
  returnPercentage: number;
  percentage: number;
}

export interface InvestmentEvolution {
  month: string;
  monthLabel: string;
  totalValue: number;
  byAsset: Array<{
    assetId: string;
    assetName: string;
    value: number;
  }>;
}

export interface InvestmentsReport {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalAssets: number;
    totalValue: number;
    totalInvested: number;
    totalReturn: number;
    returnPercentage: number;
  };
  distribution: InvestmentDistribution[];
  evolution: InvestmentEvolution[];
}

export interface BudgetData {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  planned: number;
  spent: number;
  remaining: number;
  usagePercentage: number;
  variation: number;
  variationPercentage: number;
  status: 'over' | 'under' | 'on-track';
}

export interface OverBudgetData {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  planned: number;
  spent: number;
  exceeded: number;
  usagePercentage: number;
}

export interface UnderBudgetData {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  planned: number;
  spent: number;
  saved: number;
  usagePercentage: number;
}

export interface BudgetReport {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalBudgets: number;
    totalPlanned: number;
    totalSpent: number;
    totalRemaining: number;
    averageUsage: number;
    categoriesOverBudget: number;
    categoriesUnderBudget: number;
    categoriesOnBudget: number;
  };
  budgets: BudgetData[];
  overBudget: OverBudgetData[];
  underBudget: UnderBudgetData[];
}

export interface MonthlyData {
  month: number;
  monthLabel: string;
  income: number;
  expenses: number;
  balance: number;
  incomeVariation: number;
  expensesVariation: number;
  balanceVariation: number;
}

export interface Insight {
  type: 'positive' | 'warning' | 'info';
  title: string;
  description: string;
}

export interface TopCategory {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  total: number;
  percentage: number;
}

export interface AnnualReport {
  year: number;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    averageMonthlyIncome: number;
    averageMonthlyExpenses: number;
    averageMonthlyBalance: number;
    bestMonth: {
      month: number;
      monthLabel: string;
      balance: number;
      income: number;
      expenses: number;
    } | null;
    worstMonth: {
      month: number;
      monthLabel: string;
      balance: number;
      income: number;
      expenses: number;
    } | null;
    monthsWithPositiveBalance: number;
    monthsWithNegativeBalance: number;
  };
  monthlyData: MonthlyData[];
  insights: Insight[];
  topCategories: {
    income: TopCategory[];
    expenses: TopCategory[];
  };
}

const reportApi = {
  // Obter relatório de despesas por categoria
  getExpensesByCategory: async (
    startDate: string,
    endDate: string,
    includeComparison: boolean = true
  ): Promise<ExpenseReport> => {
    const doRequest = async () => {
    const queryParams = new URLSearchParams({
      startDate,
      endDate,
      includeComparison: includeComparison.toString(),
    });

    const response = await fetch(`${API_BASE_URL}/reports/expenses-by-category?${queryParams}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<ExpenseReport>(response);
      };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
  // Obter relatório de receitas por categoria
  getIncomeByCategory: async (
    startDate: string,
    endDate: string
  ): Promise<IncomeReport> => {
    const doRequest = async () => {
    const queryParams = new URLSearchParams({
      startDate,
      endDate,
    });

    const response = await fetch(`${API_BASE_URL}/reports/income-by-category?${queryParams}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<IncomeReport>(response);
        };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
  // Obter relatório de Fluxo de Caixa
  getCashFlow: async (
    startDate: string,
    endDate: string,
    granularity: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ): Promise<CashFlowReport> => {
    const doRequest = async () => {
    const queryParams = new URLSearchParams({
      startDate,
      endDate,
      granularity,
    });

    const response = await fetch(`${API_BASE_URL}/reports/cash-flow?${queryParams}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<CashFlowReport>(response);
        };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
  // Obter relatório de Evolução do Saldo / Patrimônio
  getBalanceEvolution: async (
    startDate: string,
    endDate: string
  ): Promise<BalanceEvolutionReport> => {
    const doRequest = async () => {
    const queryParams = new URLSearchParams({
      startDate,
      endDate,
    });

    const response = await fetch(`${API_BASE_URL}/reports/balance-evolution?${queryParams}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<BalanceEvolutionReport>(response);
          };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
  // Obter relatório de Metas Financeiras
  getGoals: async (): Promise<GoalsReport> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/reports/goals`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<GoalsReport>(response);
        };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
  // Obter relatório de Dívidas e Obrigações
  getDebts: async (): Promise<DebtsReport> => {
    const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/reports/debts`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<DebtsReport>(response);
          };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
  // Obter relatório de Investimentos
  getInvestments: async (
    startDate: string,
    endDate: string,
    assetId?: string
  ): Promise<InvestmentsReport> => {
    const doRequest = async () => {
    const queryParams = new URLSearchParams({
      startDate,
      endDate,
    });
    if (assetId) {
      queryParams.append('assetId', assetId);
    }

    const response = await fetch(`${API_BASE_URL}/reports/investments?${queryParams}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<InvestmentsReport>(response);
        };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {

          throw error;
        }
      }
      throw error;
    }
  },
  // Obter relatório de Orçamento
  getBudget: async (
    startDate: string,
    endDate: string
  ): Promise<BudgetReport> => {
    const doRequest = async () => {
    const queryParams = new URLSearchParams({
      startDate,
      endDate,
    });

    const response = await fetch(`${API_BASE_URL}/reports/budget?${queryParams}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<BudgetReport>(response);
        };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
  // Obter relatório Anual
  getAnnual: async (year?: number): Promise<AnnualReport> => {
    const doRequest = async () => {
    const queryParams = new URLSearchParams();
    if (year) {
      queryParams.append('year', year.toString());
    }

    const url = year
      ? `${API_BASE_URL}/reports/annual?${queryParams}`
      : `${API_BASE_URL}/reports/annual`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<AnnualReport>(response);
        };
    try {
      return await doRequest();
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.toLowerCase().includes('token')) {
        try {
          await refreshAccessToken();
          return await doRequest();
        } catch {
          throw error;
          }
        }
      throw error;
    }
  }
};

export default {
  category: categoryApi,
  auth: authApi,
  account: accountApi,
  transaction: transactionApi,
  budget: budgetApi,
  schedule: scheduleApi,
  asset: assetApi,
  assetHolding: assetHoldingApi,
  goal: goalApi,
  score: scoreApi,
  report: reportApi,
};