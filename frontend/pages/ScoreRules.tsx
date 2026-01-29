import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowLeft, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import api from '../services/api';
import type { GamificationRulesResponse, AchievementRuleCategory, ScoreLevel } from '../services/api';
import { LucideIconByName } from '../utils/lucideIcons';

export const ScoreRules: React.FC = () => {
  const [rules, setRules] = useState<GamificationRulesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    api.gamification
      .getRules()
      .then((data) => {
        if (!cancelled) {
          setRules(data);
          const initial: Record<string, boolean> = {};
          data.achievementRules.forEach((c) => {
            initial[c.category] = true;
          });
          setOpenCategories(initial);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar regras.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !rules) {
    return (
      <div className="space-y-6">
        <Link to="/health" className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:underline">
          <ArrowLeft className="w-4 h-4" /> Voltar à Saúde Financeira
        </Link>
        <p className="text-rose-600">{error ?? 'Regras não disponíveis.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-emerald-600" />
            Entenda o Score Verde
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Regras de conquistas e faixas de pontuação. Tudo em um só lugar.
          </p>
        </div>
        <Link
          to="/health"
          className="inline-flex items-center gap-2 text-emerald-600 font-black text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-4 py-2 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar à Saúde Financeira
        </Link>
      </div>

      {/* Faixas de pontuação (scoreLevels) */}
      <section>
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-4">Faixas de pontuação</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          Seu score (0 a 1000) determina em qual faixa você está. Cada faixa tem um selo e uma mensagem.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.scoreLevels.map((level: ScoreLevel) => (
            <div
              key={`${level.min}-${level.max}`}
              className={`p-6 rounded-2xl border ${level.style.border} ${level.style.bg} dark:bg-opacity-20`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl ${level.style.bg} border ${level.style.border} flex items-center justify-center ${level.style.color}`}>
                  <LucideIconByName name={level.icon} size={22} className={level.style.color} />
                </div>
                <div>
                  <p className={`font-black ${level.style.color}`}>{level.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{level.badge}</p>
                </div>
              </div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                {level.min} – {level.max} pontos
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{level.message}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Regras de conquistas (achievementRules) */}
      <section>
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-4">Regras de conquistas</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          Ao realizar estas ações no sistema, você ganha ou perde pontos conforme a regra.
        </p>
        <div className="space-y-4">
          {rules.achievementRules.map((cat: AchievementRuleCategory) => (
            <div
              key={cat.category}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
            >
              <button
                onClick={() => toggleCategory(cat.category)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div>
                  <h3 className="font-black text-slate-900 dark:text-slate-100">{cat.category}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{cat.description}</p>
                </div>
                {openCategories[cat.category] ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>
              {openCategories[cat.category] && (
                <div className="px-5 pb-5 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                  {cat.rules.map((rule) => (
                    <div
                      key={rule.code}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{rule.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{rule.trigger}</p>
                      </div>
                      <span
                        className={`shrink-0 font-black tabular-nums ${
                          rule.points >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {rule.points >= 0 ? '+' : ''}{rule.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
