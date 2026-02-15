import React from 'react';
import { X, Sparkles } from 'lucide-react';

interface WelcomeModalProps {
  userName: string;
  onStartTour: () => void;
  onSkip: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  userName,
  onStartTour,
  onSkip,
}) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onSkip}
        aria-hidden
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Bem-vindo ao Verde Finanças
            </h3>
          </div>
          <button
            onClick={onSkip}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <p className="text-lg text-slate-700 dark:text-slate-200 leading-relaxed">
            Olá, <span className="font-bold text-emerald-600 dark:text-emerald-400">{userName}</span>! Que bom ter você aqui.
          </p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            O Verde Finanças vai te ajudar a organizar suas finanças com clareza e controle. Antes de começar, deseja fazer um tour pelo sistema para conhecer as principais funcionalidades?
          </p>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={onStartTour}
              className="w-full py-4 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white font-bold rounded-2xl shadow-xl shadow-emerald-100 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Sim, fazer tour
            </button>
            <button
              onClick={onSkip}
              className="w-full py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Não, obrigado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
