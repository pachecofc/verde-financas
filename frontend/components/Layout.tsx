import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, PieChart, CalendarDays, CreditCard, LogOut,
  Menu, X, Tags, User as UserIcon, TrendingUp,
  Moon, Sun, Sparkles, BrainCircuit, HeartPulse, Coins, FileText, Loader2
} from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import { AiAssistant } from './AiAssistant';

/** URL para exibir avatar: absoluta (Supabase) ou relativa (legado /uploads/...). */
function getAvatarSrc(url: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  return `${import.meta.env.VITE_API_URL}${url}`;
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const { user: authUser, logout, isLoggingOut } = useAuth();
  const { theme, toggleTheme, user: financeUser } = useFinance();
  const location = useLocation();
  const navigate = useNavigate();

  // Usar dados do authUser para o perfil
  const displayName = authUser?.name || '';
  const displayAvatar = authUser?.avatarUrl || '';

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Transações', path: '/transactions', icon: ArrowLeftRight },
    { name: 'Orçamentos', path: '/budgets', icon: PieChart },
    { name: 'Programação', path: '/schedule', icon: CalendarDays },
    { name: 'Investimentos', path: '/investments', icon: TrendingUp },
    { name: 'Saúde Financeira', path: '/health', icon: HeartPulse },
    { name: 'Relatórios', path: '/reports', icon: FileText },
    { name: 'Contas', path: '/accounts', icon: CreditCard },
    { name: 'Categorias', path: '/categories', icon: Tags },
    { name: 'Ativos', path: '/assets', icon: Coins },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleAvatarClick = () => {
    setIsProfileModalOpen(true);
  };

  const handleManageAccount = () => {
    setIsProfileModalOpen(false);
    navigate('/settings');
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-300">
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 dark:bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">V</div>
            <span className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Verde<span className="text-emerald-600 dark:text-emerald-400">Finanças</span></span>
          </div>
          <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
            {menuItems.map((item) => (
              <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive(item.path) ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <item.icon className={`w-5 h-5 ${isActive(item.path) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
              {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
            </button>
            <button 
              onClick={handleLogout} 
              disabled={isLoggingOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Saindo...
                </>
              ) : (
                <>
                  <LogOut className="w-5 h-5" /> Sair
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-30 transition-colors">
          <button onClick={() => setIsOpen(true)} className="md:hidden text-slate-600 dark:text-slate-300"><Menu className="w-6 h-6" /></button>
          <div className="flex items-center gap-4 ml-auto cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-xl transition-all group" onClick={handleAvatarClick}>
            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end gap-1.5">
                 <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">{displayName}</p>
              </div>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                 {/* Se você tiver score no modelo User, pode usar aqui */}
                 <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{financeUser?.score || authUser?.score || 0} Score</p>
              </div>
            </div>
            <div className="relative">
               {displayAvatar ? (
                 <img src={getAvatarSrc(displayAvatar)} className="w-10 h-10 rounded-full border-2 border-emerald-100 dark:border-emerald-900/30 object-cover shadow-sm group-hover:border-emerald-500 transition-all" alt="Avatar" />
               ) : (
                 <div className="w-10 h-10 rounded-full border-2 border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:border-emerald-500 transition-all shadow-sm"><UserIcon className="w-5 h-5" /></div>
               )}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">{children}</div>
        </div>

        {/* Floating AI Button */}
        <button
          onClick={() => setIsAiOpen(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-emerald-600 dark:bg-emerald-500 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group z-40"
          title="Assistente Financeiro IA"
        >
          <BrainCircuit className="w-7 h-7 group-hover:rotate-12 transition-transform" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-amber-900" />
          </div>
        </button>

        <AiAssistant isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
      </main>

      {/* Overlay de logout */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 min-w-[280px] animate-in zoom-in duration-300">
            <Loader2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 animate-spin" />
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Desconectando...
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Aguarde enquanto finalizamos sua sessão
              </p>
            </div>
          </div>
        </div>
      )}

      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsProfileModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Perfil</h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-8 space-y-6 flex flex-col items-center">
              {/* Avatar */}
              <div className="relative">
                {displayAvatar ? (
                  <img src={getAvatarSrc(displayAvatar)} alt="Avatar" className="w-28 h-28 rounded-[2rem] border-4 border-emerald-50 dark:border-emerald-900/30 shadow-xl object-cover" />
                ) : (
                  <div className="w-28 h-28 rounded-[2rem] border-4 border-emerald-50 dark:border-emerald-900/30 shadow-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <UserIcon className="w-12 h-12 text-emerald-300" />
                  </div>
                )}
              </div>

              {/* Saudação */}
              <div className="text-center">
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  Olá, {displayName}!
                </p>
              </div>

              {/* Botão Gerenciar Conta */}
              <button
                onClick={handleManageAccount}
                className="w-full py-4 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <UserIcon className="w-5 h-5" />
                Gerenciar conta do Verde Finanças
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
