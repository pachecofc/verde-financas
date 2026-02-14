import React, { useEffect, useState } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { HelpCircle, ChevronDown, Loader2 } from 'lucide-react';
import api, { type FaqCategoryApi } from '../services/api';

export const Help: React.FC = () => {
  const [categories, setCategories] = useState<FaqCategoryApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.faq
      .getAll()
      .then((res) => setCategories(res.categories))
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar FAQ'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 animate-spin" />
        <p className="text-slate-500 dark:text-slate-400">Carregando perguntas frequentes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-6 text-center">
        <p className="text-rose-700 dark:text-rose-300 font-medium">{error}</p>
        <p className="text-sm text-rose-600 dark:text-rose-400 mt-1">
          Verifique sua conexão e tente novamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Ajuda
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Perguntas frequentes organizadas por categoria
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        {categories.map((category) => (
          <section
            key={category.id}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm"
          >
            <h2 className="px-6 py-4 text-lg font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              {category.name}
            </h2>
            <Accordion.Root
              type="multiple"
              collapsible
              className="divide-y divide-slate-100 dark:divide-slate-800"
            >
              {category.items.map((item) => (
                <Accordion.Item
                  key={item.id}
                  value={item.id}
                  className="group transition-colors data-[state=open]:bg-emerald-50/50 dark:data-[state=open]:bg-emerald-900/10"
                >
                  <Accordion.Header>
                    <Accordion.Trigger className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-none [&[data-state=open]>svg]:rotate-180">
                      <span>{item.question}</span>
                      <ChevronDown className="w-5 h-5 shrink-0 text-slate-400 transition-transform duration-200" />
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <div className="px-6 pb-4 pt-0 text-slate-600 dark:text-slate-300 text-[15px] leading-relaxed">
                      {item.answer}
                    </div>
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          </section>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            Nenhuma pergunta frequente disponível no momento.
          </p>
        </div>
      )}
    </div>
  );
};

export default Help;
