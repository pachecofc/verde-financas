
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Send, Sparkles, BrainCircuit, Loader2, Bot, User as UserIcon, 
  TrendingUp, Wallet, Target, Calendar, MessageSquareText, Crown, Zap, ArrowRight
} from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import { GoogleGenAI } from "@google/genai";

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const AiAssistant: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user: authUser } = useAuth();
  const { 
    user, transactions, accounts, budgets, schedules, goals, categories, updateUserProfile 
  } = useFinance();
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: `Olá, ${user?.name || 'investidor'}! Sou seu assistente financeiro Verde. Posso analisar seus gastos, orçamentos e metas para te ajudar com decisões de compra. Como posso ajudar hoje?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isOpen]);

  const generateFinancialSummary = () => {
    const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const monthlySpending = transactions
      .filter(t => t.date.startsWith(currentMonth) && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const upcomingExpenses = schedules
      .filter(s => s.type === 'expense')
      .reduce((sum, s) => sum + s.amount, 0);

    const goalsSummary = goals.map(g => `${g.name}: Objetivo ${g.targetAmount}, Atual ${g.currentAmount} (${Math.round((g.currentAmount/g.targetAmount)*100)}% concluído)`).join('; ');
    
    const budgetSummary = budgets.map(b => {
      const cat = categories.find(c => c.id === b.categoryId);
      return `${cat?.name}: Limite Mensal R$ ${b.limit}, Gasto Atual R$ ${b.spent}`;
    }).join('; ');

    const accountList = accounts.map(a => `${a.name}: R$ ${a.balance.toFixed(2)}`).join(', ');

    return `
      SNAPSHOT FINANCEIRO ATUAL DO USUÁRIO:
      - Saldo Líquido Total em Contas: R$ ${totalBalance.toFixed(2)}
      - Contas Individuais: ${accountList}
      - Gastos já realizados neste mês (${currentMonth}): R$ ${monthlySpending.toFixed(2)}
      - Despesas agendadas para o restante do mês: R$ ${upcomingExpenses.toFixed(2)}
      - Orçamentos Definidos: ${budgetSummary || 'Nenhum definido'}
      - Metas Atuais: ${goalsSummary || 'Nenhuma definida'}
      - Margem Livre (Saldo - Despesas Agendadas): R$ ${(totalBalance - upcomingExpenses).toFixed(2)}
    `;
  };

  const isPremium = authUser?.plan?.toLowerCase() === 'premium';

  // Estados da aba assinatura (apenas exibição; plano vem do Auth/Stripe)
  const stripeCheckoutUrl = import.meta.env.VITE_STRIPE_CHECKOUT_URL || 'https://buy.stripe.com/test_dRm5kD4KJ1ex1Mm8XxefC00';

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!isPremium) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const financialContext = generateFinancialSummary();
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { role: 'user', parts: [{ text: `
            Você é o "Assistente Verde", um consultor financeiro ultra-inteligente, amigável e direto.
            Sua missão é ajudar o usuário a tomar decisões financeiras sábias baseadas nos dados REAIS que eu vou te fornecer.

            CONTEXTO DO USUÁRIO:
            ${financialContext}

            REGRAS DE CONDUTA:
            1. Seja honesto e responsável: se o usuário perguntar se pode comprar algo (ex: um console de R$ 3000) e o saldo dele estiver apertado ou comprometer uma meta importante, diga NÃO educadamente, justificando com os números dele.
            2. Priorize metas e orçamentos: Se ele já estourou o orçamento de uma categoria relacionada, avise.
            3. Responda em Português Brasileiro (pt-BR).
            4. Se houver sobra financeira, sugira quanto ele poderia investir ou poupar em vez de gastar tudo.
            5. Mantenha as respostas concisas e use listas se necessário.

            PERGUNTA DO USUÁRIO: ${userMessage}
          ` }] }
        ]
      });

      const aiResponse = response.text || "Desculpe, tive um problema ao analisar seus dados. Pode tentar perguntar de novo?";
      setMessages(prev => [...prev, { role: 'model', text: aiResponse }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: "Ocorreu um erro ao conectar com minha inteligência. Verifique sua conexão." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose}
      />
      
      <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-[160] transform transition-transform duration-500 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-600 dark:bg-emerald-500 text-white shrink-0">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                 <BrainCircuit className="w-6 h-6 text-white" />
              </div>
              <div>
                 <h3 className="font-black tracking-tight leading-none uppercase text-[10px] opacity-70">CONSULTOR FINANCEIRO</h3>
                 <p className="text-lg font-bold">Assistente Verde</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
           </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-950/50 custom-scrollbar">
           {messages.map((msg, idx) => (
             <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-emerald-600 border border-slate-100 dark:border-slate-700'}`}>
                      {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
                   </div>
                   <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none whitespace-pre-wrap'}`}>
                      {msg.text}
                   </div>
                </div>
             </div>
           ))}
           {isLoading && (
             <div className="flex justify-start animate-in fade-in duration-300">
                <div className="flex gap-3 max-w-[90%]">
                   <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-emerald-600 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                      <Loader2 className="w-5 h-5 animate-spin" />
                   </div>
                   <div className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Analisando seus números...</span>
                   </div>
                </div>
             </div>
           )}
        </div>

        {/* Input / Paywall */}
        <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
           {isPremium ? (
             <div className="relative">
                <input 
                  type="text" 
                  placeholder="Pergunte algo... (ex: Posso comprar um PS5?)"
                  className="w-full pl-5 pr-14 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-medium"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSend()}
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-2 w-10 h-10 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-all active:scale-90"
                >
                  <Send className="w-5 h-5" />
                </button>
             </div>
           ) : (
             <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800/50 space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shrink-0"><Crown className="w-6 h-6" /></div>
                   <div>
                      <h4 className="font-black text-emerald-900 dark:text-emerald-300 text-sm">Recurso Premium</h4>
                      <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">Libere o consultor de IA exclusivo.</p>
                   </div>
                </div>
                <button 
                  onClick={() => window.open(stripeCheckoutUrl, '_blank')}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  UPGRADE PARA PRO <ArrowRight className="w-5 h-5" />
                </button>
                <p className="text-center text-[9px] text-emerald-600 font-bold uppercase tracking-widest">Apenas R$ 19,90 / mês</p>
             </div>
           )}
        </div>
      </div>
    </>
  );
};
