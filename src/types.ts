/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string; // Emoji representing the team/vibe or just uniform circles with letters
  color: string; // Tailwind hex color or color class
  secondaryColor: string;
  defaultAttackXg: number;
  defaultDefenseXgConceded: number;
  defaultForm: number;
  defaultH2hAverageGoals: number;
  formHistory?: number[]; // Rating over past 10 matches (0-100%)
  category?: "club" | "national";
}

export interface MatchStats {
  home_attack_xg: number;
  home_defense_xg_conceded: number;
  away_attack_xg: number;
  away_defense_xg_conceded: number;
  home_form_last_5: number;
  away_form_last_5: number;
  h2h_average_goals: number;
}

export interface GoalMarketProbability {
  market: string; // '0.5 Goals', '1.5 Goals', '2.5 Goals', '3.5 Goals'
  over: number;  // 0 - 100
  under: number; // 0 - 100
}

export interface ProbabilityDistribution {
  homeWin: number;
  draw: number;
  awayWin: number;
}

export interface ScorelineProbability {
  score: string;
  probability: number;
  isHomeWin: boolean;
  isDraw: boolean;
  isAwayWin: boolean;
}

export interface PredictionResult {
  statsUsed: MatchStats;
  over_1_5_prob: number; // 0 - 100
  isHighConfidence: boolean;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  distribution: ProbabilityDistribution;
  standardMarkets: GoalMarketProbability[];
  scorelineProbabilities: ScorelineProbability[];
  predictedScore: string;
  aiAnalysis?: string;
}
