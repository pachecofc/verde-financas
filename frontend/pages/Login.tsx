import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Crown, User, Lock, Mail, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { TwoFactorModal } from '../components/TwoFactorModal';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, isLoading, error, clearError, isAuthenticated, verifyLoginTwoFactor } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState<string | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    plan: 'basic' as 'basic' | 'premium'
  });

  // Redireciona se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Limpa erro ao trocar entre login/registro
  useEffect(() => {
    clearError();
  }, [isRegistering, clearError]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError(null);

    let success = false;

    if (isRegistering) {
      success = await signup({
        name: formData.name || formData.email.split('@')[0],
        email: formData.email,
        password: formData.password,
      });
    } else {
      const result = await login({
        email: formData.email,
        password: formData.password,
      });

      // Se o login retornar que 2FA é necessário
      if (result && 'requiresTwoFactor' in result && result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setTwoFactorUserId(result.user?.id || null);
        return;
      }

      success = result as boolean;
    }

    if (success) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  };

  const handleVerify2FA = async (code: string): Promise<boolean> => {
    if (!twoFactorUserId) return false;
    setTwoFactorError(null);

    try {
      const success = await verifyLoginTwoFactor(twoFactorUserId, code);
      if (success) {
        setRequiresTwoFactor(false);
        setTwoFactorUserId(null);
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from, { replace: true });
        return true;
      }
      return false;
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : 'Erro ao verificar código');
      return false;
    }
  };

  const handleClose2FAModal = () => {
    setRequiresTwoFactor(false);
    setTwoFactorUserId(null);
    setTwoFactorError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 md:p-10 space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-emerald-600 dark:bg-emerald-500 rounded-3xl flex items-center justify-center text-white font-black text-4xl shadow-xl shadow-emerald-200 dark:shadow-none mx-auto mb-6 transform hover:rotate-6 transition-transform">
            V
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">
            {isRegistering ? 'Criar sua conta' : 'Bem-vindo de volta'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            {isRegistering ? 'Comece sua jornada financeira hoje.' : 'Acesse suas finanças agora mesmo.'}
          </p>
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <p className="text-rose-700 dark:text-rose-300 text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          {isRegistering && (
            <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Seu Nome</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text" placeholder="Como quer ser chamado?" required
                  className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email" placeholder="seu@email.com" required
                className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Senha</label>
              {!isRegistering && (
                <Link to="/forgot-password" className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hover:underline">Esqueci a senha</Link>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"} placeholder="••••••••" required
                className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {isRegistering && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Escolha seu Plano</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, plan: 'basic'})}
                  className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${formData.plan === 'basic' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600'}`}
                >
                  <User className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase">BASIC</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, plan: 'premium'})}
                  className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${formData.plan === 'premium' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600'}`}
                >
                  <Crown className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase">PRO</span>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-5 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white font-black rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isRegistering ? 'Criando conta...' : 'Entrando...'}
              </>
            ) : (
              <>
                {isRegistering ? 'Criar Conta Grátis' : 'Entrar na Plataforma'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 text-center">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 transition-colors"
          >
            {isRegistering ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Comece grátis'}
          </button>
        </div>
      </div>

      {/* Modal de 2FA */}
      <TwoFactorModal
        isOpen={requiresTwoFactor}
        onClose={handleClose2FAModal}
        onVerify={handleVerify2FA}
        title="Autenticação de Dois Fatores"
        description="Digite o código de 6 dígitos do seu aplicativo autenticador para completar o login"
        error={twoFactorError}
      />
    </div>
  );
};
