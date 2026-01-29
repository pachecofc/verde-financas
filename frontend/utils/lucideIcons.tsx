import React from 'react';
import * as LucideIcons from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Wallet: LucideIcons.Wallet,
  ShieldCheck: LucideIcons.ShieldCheck,
  Target: LucideIcons.Target,
  TrendingUp: LucideIcons.TrendingUp,
  BrainCircuit: LucideIcons.BrainCircuit,
  Sparkles: LucideIcons.Sparkles,
  Crown: LucideIcons.Crown,
  Trophy: LucideIcons.Trophy,
  HeartPulse: LucideIcons.HeartPulse,
  BookOpen: LucideIcons.BookOpen,
  Zap: LucideIcons.Zap,
  ArrowRight: LucideIcons.ArrowRight,
};

export function getLucideIcon(iconName: string): React.ComponentType<{ className?: string; size?: number }> | null {
  if (!iconName || typeof iconName !== 'string') return null;
  const key = iconName.trim();
  const fromMap = iconMap[key];
  if (fromMap) return fromMap;
  const fromLucide = (LucideIcons as Record<string, unknown>)[key];
  if (typeof fromLucide === 'function') return fromLucide as React.ComponentType<{ className?: string; size?: number }>;
  return null;
}

export function LucideIconByName({
  name,
  className,
  size = 24,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  const Icon = getLucideIcon(name);
  if (!Icon) return null;
  return <Icon className={className} size={size} />;
}
