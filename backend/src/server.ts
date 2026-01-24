import express from 'express';
import cors from 'cors';
import { prisma } from './prisma';
import authRoutes from './routes/authRoutes';
import categoryRoutes from './routes/categoryRoutes';
import transactionRoutes from './routes/transactionRoutes';
import userRoutes from './routes/userRoutes';
import accountRoutes from './routes/accountRoutes';
import budgetRoutes from './routes/budgetRoutes';
import scheduleRoutes from './routes/scheduleRoutes';
import assetRoutes from './routes/assetRoutes';
import assetHoldingRoutes from './routes/assetHoldingRoutes';
import goalRoutes from './routes/goalRoutes';
import scoreRoutes from './routes/scoreRoutes';
import reportRoutes from './routes/reportRoutes';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rota de teste do backend
app.get('/api/health', (req, res) => {
  res.json({ message: 'Backend is running! ✅' });
});

// Rota de teste da conexão com banco de dados
app.get('/api/test-db', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json({
      message: 'Database connection successful! ✅',
      userCount: users.length,
      users: users,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Database connection failed! ❌',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Servir arquivos estáticos da pasta 'uploads' (avatares antigos apenas)
// Novos avatares vão para Supabase Storage; /uploads mantido para retrocompatibilidade.
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rotas de autenticação
app.use('/api/auth', authRoutes);

// Rotas de categorias
app.use('/api/categories', categoryRoutes);

// Rotas de transações
app.use('/api/transactions', transactionRoutes);

// Rotas de usuários
app.use('/api/users', userRoutes);

// Rotas de contas
app.use('/api/accounts', accountRoutes);

// Rotas de orçamentos
app.use('/api/budgets', budgetRoutes);

// Rotas de agendamentos
app.use('/api/schedules', scheduleRoutes);

// Rotas de ativos
app.use('/api/assets', assetRoutes);

// Rotas de holdings de ativos
app.use('/api/asset-holdings', assetHoldingRoutes);

// Rotas de metas
app.use('/api/goals', goalRoutes);

// Rotas de score e gamificação
app.use('/api/scores', scoreRoutes);

// Rotas de relatórios
app.use('/api/reports', reportRoutes);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
