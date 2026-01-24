// frontend/pages/ForgotPassword.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Loader2, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { requestPasswordReset, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError(); // Limpa erros anteriores
    setMessage(null); // Limpa mensagens anteriores

    const success = await requestPasswordReset({ email });

    if (success) {
      setMessage('Se um usuário com este e-mail for encontrado, um link de redefinição de senha será enviado para sua caixa de entrada.');
      setEmail(''); // Limpa o campo de e-mail
    } else {
      // O erro já será definido pelo AuthContext
      setMessage(null); // Garante que a mensagem de sucesso não apareça com erro
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
            Esqueceu sua senha?
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            Não se preocupe! Digite seu e-mail abaixo e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        {/* Mensagem de sucesso */}
        {message && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">{message}</p>
          </div>
        )}

        {/* Mensagem de erro */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <p className="text-rose-700 dark:text-rose-300 text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email" placeholder="seu@email.com" required
                className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-5 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white font-black rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar Link de Redefinição'
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
