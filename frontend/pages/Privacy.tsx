import React from 'react';

const PRIVACY_PDF_URL = '/docs/politica-de-privacidade.pdf';

export const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-6 md:p-10 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Política de Privacidade
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Entenda como seus dados são coletados, usados e protegidos pelo Verde Finanças.
          </p>
        </header>

        <div className="space-y-4">
          <div className="aspect-[3/4] w-full rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900">
            <iframe
              src={PRIVACY_PDF_URL}
              title="Política de Privacidade"
              className="w-full h-full"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Se o documento não carregar corretamente, você pode{' '}
            <a
              href={PRIVACY_PDF_URL}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-600 dark:text-emerald-400 font-semibold underline"
            >
              abrir a Política de Privacidade em uma nova aba
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;

