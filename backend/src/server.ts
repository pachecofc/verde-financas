import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { prisma } from './prisma';
import authRoutes from './routes/authRoutes';
import twoFactorRoutes from './routes/twoFactorRoutes';
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
import gamificationRoutes from './routes/gamificationRoutes';
import reportRoutes from './routes/reportRoutes';
import stripeWebhookRoutes from './routes/stripeWebhookRoutes';
import faqRoutes from './routes/faqRoutes';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Confiar no proxy reverso (Render, etc.) para IP correto no rate limit
app.set('trust proxy', 1);

// Stripe webhook precisa do body bruto para verificar assinatura (antes de express.json)
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use('/api/webhooks/stripe', stripeWebhookRoutes);

// Rate limiting para rotas públicas não autenticadas
// Aplicado apenas em rotas específicas que precisam de proteção
const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // máximo de 300 requisições por IP nesse período
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas requisições. Tente novamente em alguns minutos.',
  },
});

// Middlewares
// Helmet.js configura automaticamente cabeçalhos HTTP de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400,
}));
app.use(cookieParser());
app.use(express.json()); // demais rotas usam JSON

// Rate limiting aplicado apenas em rotas específicas que precisam de proteção
// Rotas de autenticação já têm seus próprios limiters mais restritivos
// Rotas autenticadas não têm rate limiting geral para permitir carregamento normal após login

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
// Rotas de 2FA (dentro de /api/auth/2fa)
app.use('/api/auth/2fa', twoFactorRoutes);

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
app.use('/api/gamification', gamificationRoutes);

// Rotas de relatórios
app.use('/api/reports', reportRoutes);

// Rotas de FAQ (públicas)
app.use('/api/faq', faqRoutes);

// Iniciar cron job para hard delete
import { CronService } from './services/cronService';
CronService.start();

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
