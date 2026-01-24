
export type TransactionType = 'income' | 'expense' | 'transfer' | 'adjustment';
export type Theme = 'light' | 'dark';
export type UserPlan = 'basic' | 'premium';

export interface Category {
  id: string;
  tempId?: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
  parentId?: string;
  isDefault?: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'credit';
  balance: number;
  lastFour?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryId: string;
  accountId: string;
  toAccountId?: string;
  assetId?: string; // Para transferências para contas de investimento
  type: TransactionType;
}

export interface Budget {
  id: string;
  categoryId: string;
  limit: number;
  spent: number;
}

export interface Schedule {
  id: string;
  description: string;
  amount: number;
  date: string;
  frequency: 'once' | 'monthly' | 'weekly';
  categoryId: string;
  accountId: string;
  toAccountId?: string;
  type: TransactionType;
}

export interface Investment {
  id: string;
  name: string;
  type: 'fixed' | 'stocks' | 'crypto' | 'fii' | 'other';
  amount: number;
  institution: string;
  color: string;
}

export interface Asset {
  id: string;
  name: string;
  incomeType: 'fixed' | 'variable';
  color?: string;
}

export interface AssetHolding {
  id: string;
  assetId: string;
  currentValue: number;
  asset: {
    id: string;
    name: string;
    incomeType: 'fixed' | 'variable';
    color?: string | null;
  };
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  icon: string;
  color: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  requirement: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  plan: UserPlan;
  score: number;
  achievements: Achievement[];
}

export interface FinanceState {
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  schedules: Schedule[];
  investments: Investment[];
  assets: Asset[];
  assetHoldings: AssetHolding[];
  goals: Goal[];
  user: UserProfile | null;
  theme: Theme;
}
