
import { Category, Account } from './types';

export const INITIAL_CATEGORIES: Array<Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> = [
  // --- CATEGORIAS PAIS ---
  // --- LIBERDADE FINANCEIRA ---
  { tempId: 'cat-lib-fin', name: 'Liberdade Financeira', type: 'expense', icon: '🕊️', color: '#10b981', isDefault: true },
  // --- EDUCAÇÃO ---
  { tempId: 'cat-edu', name: 'Educação', type: 'expense', icon: '🎓', color: '#3b82f6', isDefault: true },
  // --- NECESSIDADES ---
  { tempId: 'cat-nec', name: 'Necessidades', type: 'expense', icon: '🏠', color: '#6366f1', isDefault: true },
  // --- DIVERSÃO ---
  { tempId: 'cat-div', name: 'Diversão', type: 'expense', icon: '🍿', color: '#ec4899', isDefault: true },
  // --- DOAÇÃO ---
  { tempId: 'cat-doa', name: 'Doação', type: 'expense', icon: '💝', color: '#f43f5e', isDefault: true },
  // --- GASTOS DE LONGO PRAZO ---
  { tempId: 'cat-lp', name: 'Gastos de Longo Prazo', type: 'expense', icon: '⏳', color: '#8b5cf6', isDefault: true },
  // --- RECEITAS ---
  { tempId: 'cat-sal', name: 'Salário', type: 'income', icon: '💰', color: '#10b981', isDefault: true },
  { tempId: 'cat-free', name: 'Freelance', type: 'income', icon: '💻', color: '#8b5cf6', isDefault: true },
  { tempId: 'cat-inv-inc', name: 'Rendimentos', type: 'income', icon: '📈', color: '#10b981', isDefault: true },

  // --- CATEGORIAS FILHAS ---
  // --- LIBERDADE FINANCEIRA ---
  { tempId: 'cat-inv', name: 'Investimentos', type: 'expense', icon: '📈', color: '#10b981', parentId: 'cat-lib-fin', isDefault: true },

  // --- EDUCAÇÃO ---
  { tempId: 'cat-mens-esc', name: 'Mensalidade Escolar', type: 'expense', icon: '🏫', color: '#3b82f6', parentId: 'cat-edu', isDefault: true },
  { tempId: 'cat-curs', name: 'Cursos', type: 'expense', icon: '📚', color: '#3b82f6', parentId: 'cat-edu', isDefault: true },

  // --- NECESSIDADES ---
  { tempId: 'cat-cond', name: 'Condomínio', type: 'expense', icon: '🏢', color: '#6366f1', parentId: 'cat-nec', isDefault: true },
  { tempId: 'cat-consumo', name: 'Contas de Consumo', type: 'expense', icon: '💡', color: '#6366f1', parentId: 'cat-nec', isDefault: true },
  { tempId: 'cat-taxas', name: 'Taxas e Impostos', type: 'expense', icon: '📜', color: '#6366f1', parentId: 'cat-nec', isDefault: true },
  { tempId: 'cat-telef', name: 'Telefonia', type: 'expense', icon: '📱', color: '#6366f1', parentId: 'cat-nec', isDefault: true },
  { tempId: 'cat-alim', name: 'Alimentação', type: 'expense', icon: '🍎', color: '#6366f1', parentId: 'cat-nec', isDefault: true },
  { tempId: 'cat-transp', name: 'Transporte', type: 'expense', icon: '🚗', color: '#6366f1', parentId: 'cat-nec', isDefault: true },
  { tempId: 'cat-vest', name: 'Vestuário', type: 'expense', icon: '👕', color: '#6366f1', parentId: 'cat-nec', isDefault: true },
  { tempId: 'cat-pets', name: 'Animais de Estimação', type: 'expense', icon: '🐾', color: '#6366f1', parentId: 'cat-nec', isDefault: true },
  { tempId: 'cat-saude', name: 'Saúde', type: 'expense', icon: '🏥', color: '#6366f1', parentId: 'cat-nec', isDefault: true },
  { tempId: 'cat-aluguel', name: 'Aluguel', type: 'expense', icon: '🔑', color: '#6366f1', parentId: 'cat-nec', isDefault: true },
  { tempId: 'cat-manut', name: 'Manutenção', type: 'expense', icon: '🛠️', color: '#6366f1', parentId: 'cat-nec', isDefault: true },

  // --- DIVERSÃO ---
  { tempId: 'cat-viag', name: 'Viagens', type: 'expense', icon: '✈️', color: '#ec4899', parentId: 'cat-div', isDefault: true },
  { tempId: 'cat-rest', name: 'Restaurantes', type: 'expense', icon: '🍽️', color: '#ec4899', parentId: 'cat-div', isDefault: true },
  { tempId: 'cat-stream', name: 'Streaming', type: 'expense', icon: '📺', color: '#ec4899', parentId: 'cat-div', isDefault: true },
  { tempId: 'cat-cinema', name: 'Cinema', type: 'expense', icon: '🎬', color: '#ec4899', parentId: 'cat-div', isDefault: true },
  { tempId: 'cat-spa', name: 'Spa', type: 'expense', icon: '🧖', color: '#ec4899', parentId: 'cat-div', isDefault: true },
  { tempId: 'cat-pass', name: 'Passeios', type: 'expense', icon: '🎡', color: '#ec4899', parentId: 'cat-div', isDefault: true },

  // --- DOAÇÃO ---
  { tempId: 'cat-carid', name: 'Caridade', type: 'expense', icon: '🤝', color: '#f43f5e', parentId: 'cat-doa', isDefault: true },
  { tempId: 'cat-pres', name: 'Presentes', type: 'expense', icon: '🎁', color: '#f43f5e', parentId: 'cat-doa', isDefault: true },

  // --- GASTOS DE LONGO PRAZO ---
  { tempId: 'cat-carro', name: 'Novo carro', type: 'expense', icon: '🚘', color: '#8b5cf6', parentId: 'cat-lp', isDefault: true },
  { tempId: 'cat-casa', name: 'Nova casa', type: 'expense', icon: '🏡', color: '#8b5cf6', parentId: 'cat-lp', isDefault: true },
  { tempId: 'cat-eletro', name: 'Novos eletrodomésticos', type: 'expense', icon: '🧊', color: '#8b5cf6', parentId: 'cat-lp', isDefault: true },
  { tempId: 'cat-eletron', name: 'Novos eletrônicos', type: 'expense', icon: '💻', color: '#8b5cf6', parentId: 'cat-lp', isDefault: true },
];

export const INITIAL_ACCOUNTS: Account[] = [
  { id: 'acc-1', name: 'NuBank Principal', type: 'bank', balance: 0 },
  { id: 'acc-2', name: 'Cartão Itaú', type: 'credit', balance: 0 },
];
