import * as fs from 'fs';
import * as path from 'path';

export interface AchievementRule {
  code: string;
  name: string;
  points: number;
  trigger: string;
}

export interface AchievementRuleCategory {
  category: string;
  description: string;
  rules: AchievementRule[];
}

export interface ScoreLevelStyle {
  color: string;
  bg: string;
  border: string;
}

export interface ScoreLevel {
  min: number;
  max: number;
  label: string;
  badge: string;
  icon: string;
  style: ScoreLevelStyle;
  message: string;
}

interface GamificationRulesData {
  achievementRules: AchievementRuleCategory[];
  scoreLevels: ScoreLevel[];
}

let cachedRules: GamificationRulesData | null = null;

function getRulesPath(): string {
  return path.join(__dirname, '..', 'gamificationRules.json');
}

function loadRules(): GamificationRulesData {
  if (cachedRules) return cachedRules;
  const filePath = getRulesPath();
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as GamificationRulesData;
  if (!data.achievementRules || !Array.isArray(data.achievementRules)) {
    throw new Error('gamificationRules.json: achievementRules must be an array');
  }
  if (!data.scoreLevels || !Array.isArray(data.scoreLevels)) {
    throw new Error('gamificationRules.json: scoreLevels must be an array');
  }
  const codes = new Set<string>();
  for (const cat of data.achievementRules) {
    for (const rule of cat.rules || []) {
      if (typeof rule.points !== 'number') throw new Error(`gamificationRules.json: rule ${rule.code} points must be a number`);
      if (codes.has(rule.code)) throw new Error(`gamificationRules.json: duplicate code ${rule.code}`);
      codes.add(rule.code);
    }
  }
  const levels = data.scoreLevels as ScoreLevel[];
  for (let i = 0; i < levels.length; i++) {
    if (typeof levels[i].min !== 'number' || typeof levels[i].max !== 'number') {
      throw new Error(`gamificationRules.json: scoreLevels[${i}] min and max must be numbers`);
    }
    if (i > 0 && levels[i].min !== levels[i - 1].max + 1) {
      // allow contiguous bands
    }
  }
  cachedRules = data;
  return data;
}

export class GamificationRulesService {
  static getAchievementRules(): AchievementRuleCategory[] {
    return loadRules().achievementRules;
  }

  static getScoreLevels(): ScoreLevel[] {
    return loadRules().scoreLevels;
  }

  static getRuleByCode(code: string): AchievementRule | null {
    const categories = loadRules().achievementRules;
    for (const cat of categories) {
      const rule = (cat.rules || []).find((r) => r.code === code);
      if (rule) return rule;
    }
    return null;
  }

  static getRulesByCategory(category: string): AchievementRuleCategory | null {
    const categories = loadRules().achievementRules;
    return categories.find((c) => c.category === category) || null;
  }

  static getLevelByScore(score: number): ScoreLevel | null {
    const levels = loadRules().scoreLevels;
    const clamped = Math.max(0, Math.min(1000, Math.round(score)));
    return levels.find((l) => clamped >= l.min && clamped <= l.max) || null;
  }

  static clearCache(): void {
    cachedRules = null;
  }
}
