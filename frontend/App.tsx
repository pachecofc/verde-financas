import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Categories } from './pages/Categories';
import { Transactions } from './pages/Transactions';
import { Accounts } from './pages/Accounts';
import { Budgets } from './pages/Budgets';
import { Schedule } from './pages/Schedule';
import { Investments } from './pages/Investments';
import { Assets } from './pages/Assets';
import { Gamification } from './pages/Gamification';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AccountProvider } from './contexts/AccountContext';
import { FinanceProvider } from './contexts/FinanceContext';
import { Toaster } from 'sonner'; // Para notificações

// Componente de rota privada
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-slate-500 dark:text-slate-400">Carregando...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <FinanceProvider>
          <AccountProvider> {/* <--- NOVO: Envolver as rotas com AccountProvider */}
            <Routes>
              {/* Rotas de Autenticação */}
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />

              {/* Rotas Protegidas */}
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/categories"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Categories />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/assets"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Assets />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/transactions"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Transactions />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/accounts"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Accounts />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/budgets"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Budgets />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/schedule"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Schedule />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/investments"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Investments />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/health"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Gamification />
                    </Layout>
                  </PrivateRoute>
                }
              />
              {/* Adicione outras rotas protegidas aqui */}
            </Routes>
          </AccountProvider>
        </FinanceProvider>
      </AuthProvider>
      <Toaster richColors position="bottom-right" /> {/* <--- NOVO: Adicionar Toaster para notificações */}
    </Router>
  );
};

export default App;