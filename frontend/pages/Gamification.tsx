import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  BrainCircuit,
  Crown,
  Loader2,
  BookOpen,
  Sparkles,
  X,
  Medal,
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import api from '../services/api';
import type { ScoreLevel, ScoreEventItem, RankingResponse } from '../services/api';

export const Gamification: React.FC = () => {
  const { user: authUser } = useAuth();
  const { user, budgets, goals, accounts } = useFinance();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [scoreLevels, setScoreLevels] = useState<ScoreLevel[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [scoreEvents, setScoreEvents] = useState<ScoreEventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [ranking, setRanking] = useState<RankingResponse | null>(null);
  const [rankingLoading, setRankingLoading] = useState(true);

  const isPremium = authUser?.plan?.toLowerCase() === 'premium';

  const stripeCheckoutUrl = import.meta.env.VITE_STRIPE_CHECKOUT_URL || 'https://buy.stripe.com/test_dRm5kD4KJ1ex1Mm8XxefC00';

  useEffect(() => {
    let cancelled = false;
    api.gamification
      .getRules()
      .then((data) => {
        if (!cancelled) setScoreLevels(data.scoreLevels);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRulesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.gamification
      .getEvents()
      .then((byDay) => {
        if (cancelled) return;
        const flat: ScoreEventItem[] = [];
        byDay.forEach((day) => day.events.forEach((e) => flat.push(e)));
        flat.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setScoreEvents(flat);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setEventsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.gamification
      .getRanking()
      .then((data) => {
        if (!cancelled) setRanking(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRankingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentLevel = useMemo(() => {
    const score = user?.score ?? 0;
    const clamped = Math.max(0, Math.min(1000, Math.round(score)));
    return scoreLevels.find((l) => clamped >= l.min && clamped <= l.max) ?? null;
  }, [user?.score, scoreLevels]);

  const status = currentLevel
    ? {
        label: currentLevel.label,
        color: currentLevel.style.color,
        bg: currentLevel.style.bg,
        border: currentLevel.style.border,
        message: currentLevel.message,
      }
    : {
        label: '—',
        color: 'text-slate-500',
        bg: 'bg-slate-50',
        border: 'border-slate-100',
        message: 'Carregando faixa...',
      };

  const handleAiHealthCheck = async () => {
    if (!isPremium) return;
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = `SCORE VERDE: ${user?.score} / 1000. SALDO: ${accounts.reduce((s, a) => s + a.balance, 0)}. METAS: ${goals.length}. ORÇAMENTOS ESTOURADOS: ${budgets.filter((b) => b.spent > b.limit).length}.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: `Analise minha saúde financeira e dê 3 dicas práticas para subir meu score: ${context}` }] }],
      });
      setAiAnalysis(response.text);
    } catch (err) {
      setAiAnalysis('Erro na análise.');
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
        <Link
          to="/score-rules"
          className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-4 py-2 rounded-xl transition-all"
        >
          <BookOpen className="w-4 h-4" /> Entenda o Score
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
            <div className="w-48 h-48 rounded-full border-[12px] border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center relative mb-6">
              <div
                className="absolute inset-0 rounded-full border-[12px] border-emerald-500 border-t-transparent border-r-transparent -rotate-45"
                style={{ opacity: (user?.score || 0) / 1000 }}
              />
              {rulesLoading ? (
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
              ) : (
                <>
                  <h2 className={`text-5xl font-black ${status.color}`}>{user?.score}</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">PONTOS</p>
                </>
              )}
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Status: {status.label}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-2">{status.message}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">Análise IA Verde</h3>
            </div>
            <div className="space-y-6">
              {!aiAnalysis && !isAnalyzing && (
                <button
                  onClick={() => (isPremium ? handleAiHealthCheck() : setShowUpgradeModal(true))}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 group"
                >
                  Gerar Diagnóstico <Sparkles className="w-5 h-5 group-hover:scale-110" />
                </button>
              )}
              {isAnalyzing && (
                <div className="py-8 text-center animate-pulse">
                  <Loader2 className="w-10 h-10 mx-auto animate-spin text-emerald-500 mb-2" />
                  <p className="text-xs font-black text-slate-400 uppercase">Avaliando...</p>
                </div>
              )}
              {aiAnalysis && (
                <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-800/50 space-y-4 animate-in fade-in">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{aiAnalysis}</p>
                  <button
                    onClick={() => setAiAnalysis(null)}
                    className="text-[10px] font-black text-emerald-600 uppercase hover:underline"
                  >
                    Recalcular Análise
                  </button>
                </div>
              )}
            </div>
          </div>

          {showUpgradeModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowUpgradeModal(false)} />
              <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                <div className="h-48 bg-gradient-to-br from-emerald-600 to-emerald-400 flex flex-col items-center justify-center text-white relative">
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-4 backdrop-blur-sm">
                    <Crown className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Verde PRO</h2>
                </div>
                <div className="p-8 space-y-6">
                  <p className="text-center text-slate-600 dark:text-slate-400 font-medium">
                    Libere o Diagnóstico com IA e conselhos personalizados do Gemini sobre seu patrimônio.
                  </p>
                  <div className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                    <BrainCircuit className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">Gerar Diagnóstico</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Análise personalizada da sua saúde financeira via IA.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => window.open(stripeCheckoutUrl, '_blank')}
                    className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none transition-all active:scale-[0.98]"
                  >
                    QUERO SER PRO
                  </button>
                  <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">
                    Apenas R$ 19,90 / mês
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">
            Suas Conquistas
          </h3>
          <div className="p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            {eventsLoading ? (
              <div className="py-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : scoreEvents.length === 0 ? (
              <p className="text-center text-slate-500 dark:text-slate-400 text-sm py-6">Nenhuma conquista registrada ainda.</p>
            ) : (
              <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {scoreEvents.map((evt, idx) => (
                  <li
                    key={`${evt.ruleCode}-${evt.createdAt}-${idx}`}
                    className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{evt.name}</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">+{evt.points}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 mt-8">
            Ranking
          </h3>
          <div className="p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            {rankingLoading ? (
              <div className="py-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : ranking ? (
              <div className="space-y-4">
                <ul className="space-y-2">
                  {ranking.top10.map((entry) => (
                    <li
                      key={entry.userId}
                      className="flex items-center gap-3 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                    >
                      <span className="flex items-center justify-center w-8 shrink-0">
                        {entry.rank === 1 && <Medal className="w-6 h-6 text-amber-500" aria-label="1º lugar" />}
                        {entry.rank === 2 && <Medal className="w-6 h-6 text-slate-400" aria-label="2º lugar" />}
                        {entry.rank === 3 && <Medal className="w-6 h-6 text-amber-700" aria-label="3º lugar" />}
                        {entry.rank > 3 && (
                          <span className="text-xs font-black text-slate-400 dark:text-slate-500 w-6 text-center">
                            #{entry.rank}
                          </span>
                        )}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate flex-1 min-w-0">
                        {entry.name}
                      </span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {entry.score}
                      </span>
                    </li>
                  ))}
                </ul>
                {ranking.currentUser.rank !== null && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                      Sua posição
                    </p>
                    <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50">
                      <span className="text-xs font-black text-slate-600 dark:text-slate-300 w-8 text-center shrink-0">
                        #{ranking.currentUser.rank}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate flex-1 min-w-0">
                        {ranking.currentUser.name}
                      </span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {ranking.currentUser.score}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-slate-500 dark:text-slate-400 text-sm py-6">Não foi possível carregar o ranking.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
