import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, PieChart, CalendarDays, CreditCard, LogOut,
  Menu, X, Tags, Camera, User as UserIcon, Lock, ChevronDown, ChevronUp, TrendingUp,
  Moon, Sun, Eye, EyeOff, Sparkles, BrainCircuit, HeartPulse, Save,
  AlertCircle, CheckCircle, Loader2, Coins, FileText
} from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import { UpdatedUserResponse } from '../services/api';
import { AiAssistant } from './AiAssistant';

// Definir UserPlan para o frontend, refletindo o enum do Prisma
type UserPlan = 'BASIC' | 'PREMIUM';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false); // Para alternar visibilidade da senha

  const { user: authUser, logout, uploadAvatar, updateUserProfile, changePassword, isLoading: authLoading, error: authError, clearError: clearAuthError } = useAuth(); // Usar funções do AuthContext
  const { theme, toggleTheme, user: financeUser } = useFinance(); // Manter useFinance para theme, toggleTheme e score
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Usar dados do authUser para o perfil
  const displayName = authUser?.name || '';
  const displayEmail = authUser?.email || '';
  const displayAvatar = authUser?.avatarUrl || '';
  const displayPlan = (authUser?.plan || 'BASIC') as UserPlan;

  const [profileForm, setProfileForm] = useState({
    name: displayName,
    email: displayEmail,
    avatar: displayAvatar,
    plan: displayPlan as UserPlan,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const profileModalRef = useRef<HTMLDivElement>(null);

  // Sincronizar o formulário com o estado do usuário do AuthContext
  useEffect(() => {
    if (authUser) {
      setProfileForm(prev => ({
        ...prev,
        name: authUser.name,
        email: authUser.email,
        avatar: authUser.avatarUrl || '',
        plan: authUser.plan || 'basic',
      }));
    }
  }, [authUser]);

 // Limpa mensagens de sucesso/erro após um tempo
  useEffect(() => {
    if (profileSuccess || profileError) {
      const timer = setTimeout(() => {
        setProfileSuccess(null);
        setProfileError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [profileSuccess, profileError]);

  // Limpa erros de autenticação globais ao fechar o modal
  useEffect(() => {
    if (!isProfileModalOpen && authError) {
      clearAuthError();
    }
  }, [isProfileModalOpen, authError, clearAuthError]);

  // Fecha o modal ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileModalRef.current && !profileModalRef.current.contains(event.target as Node)) {
        setIsProfileModalOpen(false);
        setShowPasswordSection(false); // Fecha a seção de senha ao fechar o modal
        setProfileError(null); // Limpa erros ao fechar
        setProfileSuccess(null); // Limpa sucessos ao fechar
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAvatarClick = () => {
    // Resetar o formulário para os valores atuais do usuário ao abrir o modal
    setProfileForm({
      name: displayName,
      email: displayEmail,
      avatar: displayAvatar,
      plan: displayPlan,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setProfileError(null);
    setProfileSuccess(null);
    setShowPasswordSection(false);
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      // 1. Atualizar informações básicas do perfil (nome, email, plano)
      const profileDataToUpdate: Partial<UpdatedUserResponse> = {
        name: profileForm.name,
        email: profileForm.email,
        plan: profileForm.plan,
      };

      const profileUpdateSuccess = await updateUserProfile(profileDataToUpdate);

      if (!profileUpdateSuccess) {
        throw new Error(authError || 'Falha ao atualizar informações do perfil.');
      }

      // 2. Se a seção de senha estiver aberta, tentar alterar a senha
      if (showPasswordSection) {
        if (!profileForm.currentPassword || !profileForm.newPassword || !profileForm.confirmPassword) {
          throw new Error('Por favor, preencha todos os campos de senha.');
        }
        if (profileForm.newPassword !== profileForm.confirmPassword) {
          throw new Error('A nova senha e a confirmação não coincidem.');
        }
        if (profileForm.newPassword.length < 6) {
          throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
        }

        const passwordChangeSuccess = await changePassword({
          currentPassword: profileForm.currentPassword,
          newPassword: profileForm.newPassword,
          confirmPassword: profileForm.confirmPassword,
        });

        if (!passwordChangeSuccess) {
          throw new Error(authError || 'Falha ao alterar senha.');
        }

        // Limpar campos de senha após sucesso
        setProfileForm(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
        setShowPasswordSection(false); // Fechar seção de senha
      }

      setProfileSuccess('Perfil atualizado com sucesso!');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Erro ao salvar perfil.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileLoading(true);
      setProfileError(null);
      setProfileSuccess(null);
      try {
        const success = await uploadAvatar(file);
        if (success) {
          setProfileSuccess('Avatar atualizado com sucesso!');
          // O AuthContext já atualiza o estado do usuário e o localStorage
          // O useEffect acima irá sincronizar o profileForm
        } else {
          setProfileError(authError || 'Falha ao fazer upload do avatar.');
        }
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : 'Erro desconhecido ao fazer upload do avatar.');
      } finally {
        setProfileLoading(false);
      }
    }
  };

  // Determina qual avatar exibir
  const avatarSrc = displayAvatar && !displayAvatar.startsWith('data:')
    ? `${import.meta.env.VITE_API_URL}${displayAvatar}`
    : displayAvatar;

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
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all">
              <LogOut className="w-5 h-5" /> Sair
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
                 <img src={`${import.meta.env.VITE_API_URL}${displayAvatar}`} className="w-10 h-10 rounded-full border-2 border-emerald-100 dark:border-emerald-900/30 object-cover shadow-sm group-hover:border-emerald-500 transition-all" alt="Avatar" />
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

      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsProfileModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Meu Perfil</h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-8 space-y-6">
              {/* Mensagens de feedback */}
              {(profileError || authError) && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                  <p className="text-rose-700 dark:text-rose-300 text-sm font-medium">{profileError || authError}</p>
                </div>
              )}
              {profileSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">{profileSuccess}</p>
                </div>
              )}

              <div className="flex flex-col items-center gap-4">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-28 h-28 rounded-[2rem] overflow-hidden border-4 border-emerald-50 dark:border-emerald-900/30 shadow-xl relative bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center transition-transform group-hover:scale-105">
                    {profileForm.avatar ? <img src={`${import.meta.env.VITE_API_URL}${profileForm.avatar}`} alt="Preview" className="w-full h-full object-cover" /> : <UserIcon className="w-12 h-12 text-emerald-300" />}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all"><Camera className="w-6 h-6" /></div>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input type="text" required className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all dark:text-slate-100 font-bold" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                  <input type="email" required className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all dark:text-slate-100 font-bold" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Minha Assinatura</label>
                  <select className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all dark:text-slate-100 font-bold" value={profileForm.plan} onChange={e => setProfileForm({...profileForm, plan: e.target.value as UserPlan})}>
                    <option value="basic">Plano Básico (Gratuito)</option>
                    <option value="premium">Plano PRO (Premium)</option>
                  </select>
                </div>

                {/* Seção de Alterar Senha */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-6 mt-6">
                  <button type="button" onClick={() => setShowPasswordSection(!showPasswordSection)} className="w-full flex items-center justify-between text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 transition-colors">
                    Alterar Senha
                    {showPasswordSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showPasswordSection && (
                    <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Senha Atual</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type={showPasswordFields ? "text" : "password"} placeholder="••••••••"
                            className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all dark:text-slate-100 font-bold"
                            value={profileForm.currentPassword}
                            onChange={e => setProfileForm({...profileForm, currentPassword: e.target.value})}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswordFields(!showPasswordFields)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                          >
                            {showPasswordFields ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nova Senha</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type={showPasswordFields ? "text" : "password"} placeholder="••••••••"
                            className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all dark:text-slate-100 font-bold"
                            value={profileForm.newPassword}
                            onChange={e => setProfileForm({...profileForm, newPassword: e.target.value})}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswordFields(!showPasswordFields)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                          >
                            {showPasswordFields ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type={showPasswordFields ? "text" : "password"} placeholder="••••••••"
                            className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all dark:text-slate-100 font-bold"
                            value={profileForm.confirmPassword}
                            onChange={e => setProfileForm({...profileForm, confirmPassword: e.target.value})}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswordFields(!showPasswordFields)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                          >
                            {showPasswordFields ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" disabled={profileLoading || authLoading} className="w-full py-5 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 dark:shadow-none transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {profileLoading || authLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Confirmar Alterações
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
