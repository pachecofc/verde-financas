
import React, { useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, ShieldCheck, HeartPulse, BrainCircuit, Sparkles, 
  Crown, Info, ChevronRight, Zap, Target, TrendingUp, Wallet,
  CheckCircle2, Lock, Loader2, ArrowRight, BookOpen, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

export const Gamification: React.FC = () => {
  const { user, transactions, budgets, goals, accounts, updateUserProfile } = useFinance();
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isPremium = user?.plan?.toLowerCase() === 'premium';

  const getScoreStatus = (score: number) => {
    if (score >= 0 && score <= 199) {
      return { 
        label: 'Crítico', 
        color: 'text-rose-600', 
        bg: 'bg-rose-50', 
        border: 'border-rose-100',
        message: 'Toda jornada começa no zero — não desista.'
      };
    }
    if (score >= 200 && score <= 349) {
      return { 
        label: 'Regular', 
        color: 'text-amber-600', 
        bg: 'bg-amber-50', 
        border: 'border-amber-100',
        message: 'A base está sendo construída — siga firme.'
      };
    }
    if (score >= 350 && score <= 499) {
      return { 
        label: 'Em Evolução', 
        color: 'text-blue-600', 
        bg: 'bg-blue-50', 
        border: 'border-blue-100',
        message: 'Sua disciplina está começando a aparecer.'
      };
    }
    if (score >= 500 && score <= 699) {
      return { 
        label: 'Bom', 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-50', 
        border: 'border-emerald-100',
        message: 'Este é o início de sua jornada para a liberdade financeira plena.'
      };
    }
    if (score >= 700 && score <= 849) {
      return { 
        label: 'Muito Bom', 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-50', 
        border: 'border-emerald-100',
        message: 'Visivelmente acima do padrão. Parabéns pelo foco!'
      };
    }
    if (score >= 850 && score <= 949) {
      return { 
        label: 'Excelente', 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-50', 
        border: 'border-emerald-100',
        message: 'Você está muito próximo de atingir o nível máximo.'
      };
    }
    // 950 a 1000
    return { 
      label: 'Lendário', 
      color: 'text-purple-600', 
      bg: 'bg-purple-50', 
      border: 'border-purple-100',
      message: 'Você atingiu o patamar máximo. Continue espalhando sabedoria financeira!'
    };
  };

  const status = getScoreStatus(user?.score || 0);

  const handleAiHealthCheck = async () => {
    if (!isPremium) return;
    setIsAnalyzing(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = `SCORE VERDE: ${user?.score} / 1000. SALDO: ${accounts.reduce((s, a) => s + a.balance, 0)}. METAS: ${goals.length}. ORÇAMENTOS ESTOURADOS: ${budgets.filter(b => b.spent > b.limit).length}.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: `Analise minha saúde financeira e dê 3 dicas práticas para subir meu score: ${context}` }] }]
      });
      setAiAnalysis(response.text);
    } catch (err) {
      setAiAnalysis("Erro na análise.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Saúde Financeira</h1>
          <p className="text-slate-500 dark:text-slate-400">Seu patrimônio transformado em Score Verde.</p>
        </div>
        <button 
          onClick={() => setShowHowItWorks(!showHowItWorks)}
          className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-4 py-2 rounded-xl transition-all"
        >
          <BookOpen className="w-4 h-4" /> Entenda o Score {showHowItWorks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {showHowItWorks && (
        <div className="bg-emerald-600 text-white p-8 rounded-[2.5rem] shadow-2xl animate-in slide-in-from-top-4 duration-500 space-y-6">
           <h3 className="text-xl font-black tracking-tight">Como o Score Verde é calculado?</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                 <Target className="w-6 h-6 mb-2" />
                 <p className="font-bold text-sm">Controle de Orçamento</p>
                 <p className="text-xs opacity-70">Cada categoria que ultrapassa o limite retira 50 pontos do seu score. Mantenha-se no azul!</p>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                 <TrendingUp className="w-6 h-6 mb-2" />
                 <p className="font-bold text-sm">Taxa de Poupança</p>
                 <p className="text-xs opacity-70">Economizar 20% da renda garante +100 pontos. Chegar a 50% de economia te dá +200 pontos.</p>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                 <Trophy className="w-6 h-6 mb-2" />
                 <p className="font-bold text-sm">Metas Alcançadas</p>
                 <p className="text-xs opacity-70">Cada objetivo de vida concluído adiciona permanentemente +40 pontos ao seu ranking.</p>
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Score Display */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
             <div className="w-48 h-48 rounded-full border-[12px] border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center relative mb-6">
                <div className="absolute inset-0 rounded-full border-[12px] border-emerald-500 border-t-transparent border-r-transparent -rotate-45" style={{ opacity: (user?.score || 0) / 1000 }} />
                <h2 className={`text-5xl font-black ${status.color}`}>{user?.score}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">PONTOS</p>
             </div>
             <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Status: {status.label}</h3>
             <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-2">{status.message}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white"><BrainCircuit className="w-5 h-5" /></div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">Análise IA Verde</h3>
             </div>
             <div className="space-y-6">
                {!aiAnalysis && !isAnalyzing && (
                   <button
                     onClick={() => isPremium ? handleAiHealthCheck() : setShowUpgradeModal(true)}
                     className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 group"
                   >
                     Gerar Diagnóstico <Sparkles className="w-5 h-5 group-hover:scale-110" />
                   </button>
                )}
                {isAnalyzing && <div className="py-8 text-center animate-pulse"><Loader2 className="w-10 h-10 mx-auto animate-spin text-emerald-500 mb-2" /><p className="text-xs font-black text-slate-400 uppercase">Avaliando...</p></div>}
                {aiAnalysis && (
                   <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-800/50 space-y-4 animate-in fade-in">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{aiAnalysis}</p>
                      <button onClick={() => setAiAnalysis(null)} className="text-[10px] font-black text-emerald-600 uppercase hover:underline">Recalcular Análise</button>
                   </div>
                )}
             </div>
          </div>

          {/* Modal de upgrade (Basic clica em Gerar Diagnóstico) */}
          {showUpgradeModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowUpgradeModal(false)} />
              <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                <div className="h-48 bg-gradient-to-br from-emerald-600 to-emerald-400 flex flex-col items-center justify-center text-white relative">
                  <button onClick={() => setShowUpgradeModal(false)} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"><X className="w-5 h-5" /></button>
                  <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-4 backdrop-blur-sm"><Crown className="w-10 h-10 text-white" /></div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Verde PRO</h2>
                </div>
                <div className="p-8 space-y-6">
                  <p className="text-center text-slate-600 dark:text-slate-400 font-medium">Libere o Diagnóstico com IA e conselhos personalizados do Gemini sobre seu patrimônio.</p>
                  <div className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                    <BrainCircuit className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">Gerar Diagnóstico</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Análise personalizada da sua saúde financeira via IA.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      updateUserProfile({ ...user!, plan: 'premium' as any });
                      setShowUpgradeModal(false);
                      alert("Parabéns! Você agora é um usuário PREMIUM.");
                    }}
                    className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none transition-all active:scale-[0.98]"
                  >
                    QUERO SER PRO
                  </button>
                  <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">Apenas R$ 19,90 / mês</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Badge Gallery & Challenge */}
        <div className="space-y-6">
           <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Suas Conquistas</h3>
           <div className="grid grid-cols-1 gap-4">
              {user?.achievements.map(ach => (
                <div key={ach.id} className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                   <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl">{ach.icon}</div>
                   <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{ach.name}</h4>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{ach.description}</p>
                   </div>
                </div>
              ))}
              {user?.achievements.length === 0 && <p className="text-center text-slate-400 text-xs py-4">Nenhuma conquista ainda.</p>}
           </div>

           <div className="p-6 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-6 opacity-10"><Sparkles className="w-20 h-20" /></div>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Próximo Desafio</p>
              <h4 className="text-lg font-black tracking-tight mb-4">Investidor Consistente</h4>
              <p className="text-xs text-slate-400 mb-6">Cadastre ativos diferentes e veja sua evolução real.</p>
              <button 
                onClick={() => navigate('/investments')}
                className="w-full py-3 bg-white text-slate-900 font-black rounded-xl text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                Ir para Investimentos <ArrowRight className="w-4 h-4" />
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};
