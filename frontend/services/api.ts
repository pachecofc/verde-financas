// Configuração base da API
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api';

// Função para obter o token de autenticação
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
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
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<CategoryApiData[]>(response);
  },

  // Criar nova categoria
  create: async (data: CreateCategoryPayload): Promise<CategoryApiData> => {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<CategoryApiData>(response);
  },

  // Criar múltiplas categorias
  createMultiple: async (data: CreateMultipleCategoriesPayload[]): Promise<CategoryApiData[]> => {
    const response = await fetch(`${API_BASE_URL}/categories/batch`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<CategoryApiData[]>(response);
  },

  // Atualizar categoria existente
  update: async (id: string, data: UpdateCategoryPayload): Promise<CategoryApiData> => {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<CategoryApiData>(response);
  },

  // Deletar categoria
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(response);
  },
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
    const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<Account>(response);
  },

  // Criar uma nova conta
  createAccount: async (data: CreateAccountPayload): Promise<Account> => {
    const response = await fetch(`${API_BASE_URL}/accounts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Account>(response);
  },

  // Atualizar uma conta existente
  updateAccount: async (id: string, data: UpdateAccountPayload): Promise<Account> => {
    const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Account>(response);
  },

  // Deletar uma conta
  deleteAccount: async (id: string, force?: boolean): Promise<{ message: string }> => {
    const query = force ? '?force=true' : '';
    const response = await fetch(`${API_BASE_URL}/accounts/${id}${query}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    // O backend retorna 200 com mensagem ou 409 com erro se houver transações
    // handleResponse já lida com erros, então aqui só precisamos do sucesso
    return handleResponse<{ message: string }>(response);
  },
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
      body: JSON.stringify(data),
    });
    return handleResponse<AuthResponse>(response);
  },

  // Registro de novo usuário
  signup: async (data: SignupPayload): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<AuthResponse>(response);
  },

  // Solicitar redefinição de senha
  requestPasswordReset: async (data: ForgotPasswordPayload): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string }>(response);
  },

  // Armazenar token e dados do usuário no localStorage
  setAuth: (token: string, user: AuthUser): void => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  },

  // Obter dados do usuário armazenado
  getStoredUser: (): AuthUser | null => {
    const userStr = localStorage.getItem('auth_user');
    if (userStr) {
      try {
        // Ao parsear, garantir que o avatarUrl seja incluído se existir
        const parsedUser = JSON.parse(userStr);
        return {
          id: parsedUser.id,
          name: parsedUser.name,
          email: parsedUser.email,
          avatarUrl: parsedUser.avatarUrl, // Incluir avatarUrl
        };
      } catch {
        return null;
      }
    }
    return null;
  },

  // Remover token e dados do usuário do localStorage
  clearAuth: (): void => {
    localStorage.removeItem('auth_token');
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
  },

  // Obter uma transação por ID
  getById: async (id: string): Promise<TransactionApiData> => {
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<TransactionApiData>(response);
    return {
      ...data,
      amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
    };
  },

  // Criar nova transação
  create: async (data: CreateTransactionPayload): Promise<TransactionApiData> => {
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<TransactionApiData>(response);
    return {
      ...result,
      amount: typeof result.amount === 'string' ? parseFloat(result.amount) : result.amount,
    };
  },

  // Atualizar transação existente
  update: async (id: string, data: UpdateTransactionPayload): Promise<TransactionApiData> => {
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<TransactionApiData>(response);
    return {
      ...result,
      amount: typeof result.amount === 'string' ? parseFloat(result.amount) : result.amount,
    };
  },

  // Deletar transação
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(response);
  },
};

// ============ BUDGET API ============
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
    const response = await fetch(`${API_BASE_URL}/budgets`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<BudgetApiData[]>(response);
  },

  // Obter um orçamento por ID
  getById: async (id: string): Promise<BudgetApiData> => {
    const response = await fetch(`${API_BASE_URL}/budgets/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<BudgetApiData>(response);
  },

  // Criar novo orçamento
  create: async (data: CreateBudgetPayload): Promise<BudgetApiData> => {
    const response = await fetch(`${API_BASE_URL}/budgets`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<BudgetApiData>(response);
  },

  // Atualizar orçamento existente
  update: async (id: string, data: UpdateBudgetPayload): Promise<BudgetApiData> => {
    const response = await fetch(`${API_BASE_URL}/budgets/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<BudgetApiData>(response);
  },

  // Deletar orçamento
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/budgets/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(response);
  },
};

const scheduleApi = {
  // Obter todos os agendamentos do usuário
  getAll: async (): Promise<ScheduleApiData[]> => {
    const response = await fetch(`${API_BASE_URL}/schedules`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<ScheduleApiData[]>(response);
  },

  // Obter um agendamento por ID
  getById: async (id: string): Promise<ScheduleApiData> => {
    const response = await fetch(`${API_BASE_URL}/schedules/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<ScheduleApiData>(response);
  },

  // Criar novo agendamento
  create: async (data: CreateSchedulePayload): Promise<ScheduleApiData> => {
    const response = await fetch(`${API_BASE_URL}/schedules`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<ScheduleApiData>(response);
  },

  // Atualizar agendamento existente
  update: async (id: string, data: UpdateSchedulePayload): Promise<ScheduleApiData> => {
    const response = await fetch(`${API_BASE_URL}/schedules/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<ScheduleApiData>(response);
  },

  // Deletar agendamento
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/schedules/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(response);
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
    const response = await fetch(`${API_BASE_URL}/assets`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<AssetApiData[]>(response);
  },

  // Obter um ativo por ID
  getById: async (id: string): Promise<AssetApiData> => {
    const response = await fetch(`${API_BASE_URL}/assets/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<AssetApiData>(response);
  },

  // Criar novo ativo
  create: async (data: CreateAssetPayload): Promise<AssetApiData> => {
    const response = await fetch(`${API_BASE_URL}/assets`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<AssetApiData>(response);
  },

  // Atualizar ativo existente
  update: async (id: string, data: UpdateAssetPayload): Promise<AssetApiData> => {
    const response = await fetch(`${API_BASE_URL}/assets/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<AssetApiData>(response);
  },

  // Deletar ativo
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/assets/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(response);
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
  },

  // Obter um holding por ID
  getById: async (id: string): Promise<AssetHoldingApiData> => {
    const response = await fetch(`${API_BASE_URL}/asset-holdings/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<AssetHoldingApiData>(response);
    return {
      ...data,
      currentValue: typeof data.currentValue === 'string' ? parseFloat(data.currentValue) : data.currentValue,
    };
  },

  // Atualizar o valor atual de um holding
  updateValue: async (id: string, data: UpdateAssetHoldingValuePayload): Promise<AssetHoldingApiData> => {
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
  },

  // Deletar um holding
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/asset-holdings/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(response);
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
  },

  // Obter uma meta por ID
  getById: async (id: string): Promise<GoalApiData> => {
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
  },

  // Criar nova meta
  create: async (data: CreateGoalPayload): Promise<GoalApiData> => {
    const response = await fetch(`${API_BASE_URL}/goals`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<GoalApiData>(response);
    return {
      ...result,
      targetAmount: typeof result.targetAmount === 'string' ? parseFloat(result.targetAmount) : result.targetAmount,
      currentAmount: typeof result.currentAmount === 'string' ? parseFloat(result.currentAmount) : result.currentAmount,
    };
  },

  // Atualizar meta existente
  update: async (id: string, data: UpdateGoalPayload): Promise<GoalApiData> => {
    const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<GoalApiData>(response);
    return {
      ...result,
      targetAmount: typeof result.targetAmount === 'string' ? parseFloat(result.targetAmount) : result.targetAmount,
      currentAmount: typeof result.currentAmount === 'string' ? parseFloat(result.currentAmount) : result.currentAmount,
    };
  },

  // Deletar meta
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(response);
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
    const response = await fetch(`${API_BASE_URL}/scores`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<ScoreApiData>(response);
  },

  // Recalcular score do usuário
  recalculateScore: async (): Promise<ScoreApiData> => {
    const response = await fetch(`${API_BASE_URL}/scores/recalculate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<ScoreApiData>(response);
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

const reportApi = {
  // Obter relatório de despesas por categoria
  getExpensesByCategory: async (
    startDate: string,
    endDate: string,
    includeComparison: boolean = true
  ): Promise<ExpenseReport> => {
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
  },

  // Obter relatório de receitas por categoria
  getIncomeByCategory: async (
    startDate: string,
    endDate: string
  ): Promise<IncomeReport> => {
    const queryParams = new URLSearchParams({
      startDate,
      endDate,
    });

    const response = await fetch(`${API_BASE_URL}/reports/income-by-category?${queryParams}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<IncomeReport>(response);
  },

  // Obter relatório de Fluxo de Caixa
  getCashFlow: async (
    startDate: string,
    endDate: string,
    granularity: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ): Promise<CashFlowReport> => {
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
  },
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
