// frontend/pages/ResetPassword.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>(); // Obtém o token da URL
  const { resetPassword, isLoading, error, clearError } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null); // Para erros de validação local

  useEffect(() => {
    clearError(); // Limpa erros do contexto ao montar
    setLocalError(null); // Limpa erros locais
    setMessage(null); // Limpa mensagens
    if (!token) {
      setLocalError('Token de redefinição não encontrado na URL.');
    }
  }, [token, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);
    setMessage(null);

    if (!token) {
      setLocalError('Token de redefinição ausente.');
      return;
    }

    if (newPassword.length < 6) {
      setLocalError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError('As senhas não coincidem.');
      return;
    }

    const success = await resetPassword({ token, newPassword });

    if (success) {
      setMessage('Sua senha foi redefinida com sucesso! Você será redirecionado para a página de login.');
      setTimeout(() => {
        navigate('/login');
      }, 3000); // Redireciona após 3 segundos
    } else {
      // O erro já será definido pelo AuthContext
      setMessage(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 md:p-10 space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-emerald-600 dark:bg-emerald-500 rounded-3xl flex items-center justify-center text-white font-black text-4xl shadow-xl shadow-emerald-200 dark:shadow-none mx-auto mb-6 transform hover:rotate-6 transition-transform">
            V
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">
            Redefinir sua senha
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            Digite sua nova senha abaixo.
          </p>
        </div>

        {/* Mensagem de sucesso */}
        {message && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">{message}</p>
          </div>
        )}

        {/* Mensagem de erro (local ou do contexto) */}
        {(error || localError) && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <p className="text-rose-700 dark:text-rose-300 text-sm font-medium">{localError || error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label htmlFor="reset-new-password" className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nova Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="reset-new-password"
                name="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
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

          <div className="space-y-1">
            <label htmlFor="reset-confirm-password" className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="reset-confirm-password"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
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

          <button
            type="submit"
            disabled={isLoading || !!localError || !token}
            className="w-full py-5 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white font-black rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Redefinindo...
              </>
            ) : (
              'Redefinir Senha'
            )}
          </button>
        </form>

        <div className="pt-4 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 transition-colors flex items-center justify-center mx-auto gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o Login
          </button>
        </div>
      </div>
    </div>
  );
};
