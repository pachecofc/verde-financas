import React, { useEffect, useState } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { HelpCircle, ChevronDown, Loader2, Send, X, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import api, {
  type FaqCategoryApi,
  type SupportRequestType,
} from '../services/api';

export const Help: React.FC = () => {
  const [categories, setCategories] = useState<FaqCategoryApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitType, setSubmitType] = useState<SupportRequestType>('help');
  const [submitDescription, setSubmitDescription] = useState('');
  const [submitAttachment, setSubmitAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
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
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98]"
          >
            <Send className="w-4 h-4" />
            Enviar pedido de ajuda
          </button>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !isSubmitting && setIsModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Enviar pedido de ajuda
              </h3>
              <button
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              className="p-6 space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                const desc = submitDescription.trim();
                if (!desc) {
                  toast.error('Por favor, descreva seu pedido.');
                  return;
                }
                if (desc.length < 10) {
                  toast.error('A descrição deve ter pelo menos 10 caracteres.');
                  return;
                }
                setIsSubmitting(true);
                try {
                  await api.supportRequest.submit({
                    type: submitType,
                    description: desc,
                    attachment: submitAttachment || undefined,
                  });
                  toast.success('Pedido enviado com sucesso!');
                  setIsModalOpen(false);
                  setSubmitType('help');
                  setSubmitDescription('');
                  setSubmitAttachment(null);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Erro ao enviar pedido.');
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                  Tipo
                </label>
                <select
                  value={submitType}
                  onChange={(e) => setSubmitType(e.target.value as SupportRequestType)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                >
                  <option value="help">Pedido de ajuda</option>
                  <option value="suggestion">Sugestão</option>
                  <option value="bug">Reportar bug</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                  Descrição
                </label>
                <textarea
                  value={submitDescription}
                  onChange={(e) => setSubmitDescription(e.target.value)}
                  placeholder="Descreva seu pedido, sugestão ou o bug encontrado..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                  Anexo (opcional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <Paperclip className="w-4 h-4" />
                    <span className="text-sm font-medium">Escolher arquivo</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.csv,image/*,application/pdf,text/plain,text/csv"
                      className="hidden"
                      onChange={(e) => setSubmitAttachment(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {submitAttachment && (
                    <span className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                      {submitAttachment.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Imagens, PDF, TXT ou CSV. Máx. 5 MB.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => !isSubmitting && setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Help;
