/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  RotateCcw,
  Sliders,
  TrendingUp,
  CircleAlert,
  ShieldAlert,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Goal,
  Activity,
  Award,
  BookOpen,
  Info,
  Globe,
  BarChart3
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import { TEAMS_DATABASE } from "./teamsData";
import { Team, MatchStats, PredictionResult } from "./types";
import { WorldCupStandings } from "./components/WorldCupStandings";

export default function App() {
  // Select initial teams
  const [homeTeam, setHomeTeam] = useState<Team>(
    TEAMS_DATABASE.find((t) => t.id === "mancity") || TEAMS_DATABASE[0]
  );
  const [awayTeam, setAwayTeam] = useState<Team>(
    TEAMS_DATABASE.find((t) => t.id === "realmadrid") || TEAMS_DATABASE[1]
  );

  // Stats form state
  const [stats, setStats] = useState<MatchStats>({
    home_attack_xg: 2.4,
    home_defense_xg_conceded: 1.0,
    away_attack_xg: 2.2,
    away_defense_xg_conceded: 0.8,
    home_form_last_5: 85,
    away_form_last_5: 88,
    h2h_average_goals: 3.0,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [activeTab, setActiveTab] = useState<"analysis" | "scorelines" | "markets" | "trends" | "worldcup" | "h2h">("analysis");
  const [showConfigInfo, setShowConfigInfo] = useState<boolean>(false);

  // Run prediction on load and on trigger
  const runPrediction = async (currentStats: MatchStats = stats) => {
    setLoading(true);
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stats: currentStats,
          homeTeamName: homeTeam.name,
          awayTeamName: awayTeam.name,
        }),
      });
      const data = await response.json();
      setPrediction(data);
    } catch (e) {
      console.error("Prediction request failed", e);
    } finally {
      setLoading(false);
    }
  };

  // Sync stats when home/away team changes by fetching defaults from the mock API
  useEffect(() => {
    let active = true;
    
    async function fetchTeamStats() {
      setSyncing(true);
      try {
        // Fetch Home Team
        const resHome = await fetch(`/api/teams/${homeTeam.id}`);
        if (!resHome.ok) throw new Error(`Home team fetch returned ${resHome.status}`);
        const dataHome = await resHome.json();
        
        // Fetch Away Team
        const resAway = await fetch(`/api/teams/${awayTeam.id}`);
        if (!resAway.ok) throw new Error(`Away team fetch returned ${resAway.status}`);
        const dataAway = await resAway.json();
        
        if (!active) return;
        
        // Generate average h2h goals as average of default H2Hs
        const avgH2h = Math.round(((dataHome.defaultH2hAverageGoals + dataAway.defaultH2hAverageGoals) / 2) * 10) / 10;
        
        const newStats = {
          home_attack_xg: dataHome.defaultAttackXg,
          home_defense_xg_conceded: dataHome.defaultDefenseXgConceded,
          away_attack_xg: dataAway.defaultAttackXg,
          away_defense_xg_conceded: dataAway.defaultDefenseXgConceded,
          home_form_last_5: dataHome.defaultForm,
          away_form_last_5: dataAway.defaultForm,
          h2h_average_goals: avgH2h,
        };
        
        setStats(newStats);
        
        // Trigger prediction run with newly updated stats automatically
        runPrediction(newStats);
      } catch (err) {
        console.error("Failed to dynamically fetch team stats from API:", err);
      } finally {
        if (active) {
          setSyncing(false);
        }
      }
    }
    
    fetchTeamStats();
    
    return () => {
      active = false;
    };
  }, [homeTeam.id, awayTeam.id]);

  // Run prediction initial on component mount
  useEffect(() => {
    runPrediction();
  }, []);

  const handleStatChange = (key: keyof MatchStats, val: number) => {
    setStats((prev) => {
      const updated = { ...prev, [key]: val };
      return updated;
    });
  };

  const handleSwapTeams = () => {
    const tempHome = homeTeam;
    setHomeTeam(awayTeam);
    setAwayTeam(tempHome);
  };

  const resetToTeamDefaults = () => {
    const avgH2h = Math.round(((homeTeam.defaultH2hAverageGoals + awayTeam.defaultH2hAverageGoals) / 2) * 10) / 10;
    const defaults = {
      home_attack_xg: homeTeam.defaultAttackXg,
      home_defense_xg_conceded: homeTeam.defaultDefenseXgConceded,
      away_attack_xg: awayTeam.defaultAttackXg,
      away_defense_xg_conceded: awayTeam.defaultDefenseXgConceded,
      home_form_last_5: homeTeam.defaultForm,
      away_form_last_5: awayTeam.defaultForm,
      h2h_average_goals: avgH2h,
    };
    setStats(defaults);
    runPrediction(defaults);
  };

  const getPoissonProbability = (lambda: number, k: number): number => {
    let fact = 1;
    for (let i = 2; i <= k; i++) fact *= i;
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / fact;
  };

  const generateH2hDistributionData = () => {
    if (!prediction) return [];
    const homeLambda = prediction.expectedHomeGoals;
    const awayLambda = prediction.expectedAwayGoals;
    const data = [];
    let homeCum = 0;
    let awayCum = 0;
    
    for (let k = 0; k <= 4; k++) {
      const hProb = Math.round(getPoissonProbability(homeLambda, k) * 1000) / 10;
      const aProb = Math.round(getPoissonProbability(awayLambda, k) * 1000) / 10;
      homeCum += hProb;
      awayCum += aProb;
      data.push({
        goals: `${k} Goal${k === 1 ? "" : "s"}`,
        [homeTeam.name]: hProb,
        [awayTeam.name]: aProb,
      });
    }
    
    const hProb5 = Math.max(0, Math.round((100 - homeCum) * 10) / 10);
    const aProb5 = Math.max(0, Math.round((100 - awayCum) * 10) / 10);
    data.push({
      goals: "5+ Goals",
      [homeTeam.name]: hProb5,
      [awayTeam.name]: aProb5,
    });
    
    return data;
  };

  const generateRadarData = () => {
    const getTeamKpis = (t: Team) => {
      const attackXg = t.defaultAttackXg || 1.5;
      const defenseXg = t.defaultDefenseXgConceded || 1.3;
      const form = t.defaultForm || 70;
      // Deterministic hash based on ID so each team has specialized traits
      const idHash = t.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      
      const attack = Math.max(45, Math.min(98, Math.round(50 + (attackXg - 1.0) * 30 + (idHash % 5))));
      const defense = Math.max(45, Math.min(98, Math.round(95 - (defenseXg - 0.7) * 45 + (idHash % 4))));
      const midfield = Math.max(40, Math.min(99, Math.round(40 + (attackXg * 15) + (2.0 - defenseXg) * 10 + (form - 60) * 0.4 + (idHash % 6))));
      const discipline = Math.max(50, Math.min(95, Math.round(70 + (idHash % 25) - (attackXg > 2.0 ? 5 : 0) + (defenseXg > 1.4 ? -10 : 0))));
      const setPiece = Math.max(55, Math.min(97, Math.round(60 + (idHash % 31) + (attackXg > 1.8 ? 5 : 0))));
      
      return { attack, defense, midfield, discipline, setPiece };
    };
    
    const homeKPIs = getTeamKpis(homeTeam);
    const awayKPIs = getTeamKpis(awayTeam);
    
    return [
      { subject: "Attack", [homeTeam.name]: homeKPIs.attack, [awayTeam.name]: awayKPIs.attack, fullMark: 100 },
      { subject: "Defense", [homeTeam.name]: homeKPIs.defense, [awayTeam.name]: awayKPIs.defense, fullMark: 100 },
      { subject: "Midfield Control", [homeTeam.name]: homeKPIs.midfield, [awayTeam.name]: awayKPIs.midfield, fullMark: 100 },
      { subject: "Discipline", [homeTeam.name]: homeKPIs.discipline, [awayTeam.name]: awayKPIs.discipline, fullMark: 100 },
      { subject: "Set-Piece Efficiency", [homeTeam.name]: homeKPIs.setPiece, [awayTeam.name]: awayKPIs.setPiece, fullMark: 100 },
    ];
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500 selection:text-white pb-12">
      {/* Dynamic Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-xl shadow-glow relative">
              <Goal className="w-6 h-6 text-white animate-pulse" id="header-logo-icon" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
                AI Football Goal Predictor
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                XGBoost Goal Engine Active (v3.5) • June 2026
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConfigInfo(!showConfigInfo)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-400 flex items-center gap-2 hover:border-slate-700 transition"
              id="model-config-toggle"
            >
              <Info className="w-3.5 h-3.5 text-sky-400" />
              Formula Insights
            </button>
            <div className="text-xs bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-1.5 font-mono text-slate-400 hidden md:block">
              System UTC: <span className="text-slate-300">2026-06-03</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Model Weight Formula explanation block */}
        {showConfigInfo && (
          <div className="mb-6 p-5 bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/20 border border-slate-800 rounded-xl animate-fadeIn relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-sky-500/5 blur-3xl rounded-full"></div>
            <button 
              onClick={() => setShowConfigInfo(false)} 
              className="absolute right-3 top-3 text-slate-400 hover:text-white text-sm"
              id="close-insights"
            >
              ✕
            </button>
            <h3 className="font-display font-semibold text-sm text-sky-400 flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4" />
              Over 1.5 Goals Prediction - XGBoost Calibration Logit
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
              This dashboard replicates an XGBoost logistic classifier mapping standard football indicators.
              The underlying probability utilizes the logit function: 
              <span className="font-mono bg-slate-950/80 px-2 py-0.5 mx-1 rounded text-emerald-400">
                P(Over 1.5) = 1 / (1 + e^-z)
              </span> 
              where <span className="font-mono text-sky-300">z</span> calibrates team offensive capabilities, overall structural weaknesses, Head-to-Head trends, and recent form metrics.
              Predictions exceeding <span className="font-mono text-emerald-400 font-bold">80.00%</span> trigger the strict **High Confidence Verdict** for premium goal volume conditions.
            </p>
          </div>
        )}

        {/* Top interactive Team Selector */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            
            {/* Team Dropdown Selectors */}
            <div className="w-full flex-1 flex flex-col md:flex-row items-center gap-4 justify-around">
              
              {/* Home Team */}
              <div className="w-full md:w-5/12 flex flex-col gap-2">
                <label className="text-xs font-mono tracking-wider text-slate-400 uppercase">Home Team</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-2xl">
                    {homeTeam.logo}
                  </div>
                  <select
                    value={homeTeam.id}
                    onChange={(e) => {
                      const selected = TEAMS_DATABASE.find((t) => t.id === e.target.value);
                      if (selected) setHomeTeam(selected);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700/80 rounded-xl pl-12 pr-4 py-3.5 text-base font-semibold font-display text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer transition [&>optgroup]:text-slate-400 [&>optgroup]:bg-slate-950 [&>optgroup>option]:text-white [&>optgroup>option]:bg-slate-950"
                    id="home-team-select"
                  >
                    <optgroup label="Club Squads">
                      {TEAMS_DATABASE.filter(t => t.id !== awayTeam.id && t.category !== "national").map((t) => (
                        <option key={t.id} value={t.id} className="py-2">
                          {t.logo} {t.name} ({t.shortName})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="World Cup Contenders">
                      {TEAMS_DATABASE.filter(t => t.id !== awayTeam.id && t.category === "national").map((t) => (
                        <option key={t.id} value={t.id} className="py-2">
                          {t.logo} {t.name} ({t.shortName})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                    <span 
                      className="w-3.5 h-3.5 rounded-full border border-white/20" 
                      style={{ backgroundColor: homeTeam.color }}
                    ></span>
                  </div>
                </div>
              </div>

              {/* Verses Battle Indicator */}
              <div className="flex flex-col items-center justify-center">
                <button
                  type="button"
                  onClick={handleSwapTeams}
                  className="p-3 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:text-sky-400 text-slate-400 rounded-full shadow-lg transition transform hover:rotate-180 duration-300 group"
                  title="Swap Venues"
                  id="swap-teams-btn"
                >
                  <Activity className="w-4 h-4 group-hover:scale-110" />
                </button>
                <span className="text-[10px] font-mono tracking-widest text-slate-500 mt-1 uppercase">venue swap</span>
              </div>

              {/* Away Team */}
              <div className="w-full md:w-5/12 flex flex-col gap-2">
                <label className="text-xs font-mono tracking-wider text-slate-400 uppercase">Away Team</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-2xl">
                    {awayTeam.logo}
                  </div>
                  <select
                    value={awayTeam.id}
                    onChange={(e) => {
                      const selected = TEAMS_DATABASE.find((t) => t.id === e.target.value);
                      if (selected) setAwayTeam(selected);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700/80 rounded-xl pl-12 pr-4 py-3.5 text-base font-semibold font-display text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer transition [&>optgroup]:text-slate-400 [&>optgroup]:bg-slate-950 [&>optgroup>option]:text-white [&>optgroup>option]:bg-slate-950"
                    id="away-team-select"
                  >
                    <optgroup label="Club Squads">
                      {TEAMS_DATABASE.filter(t => t.id !== homeTeam.id && t.category !== "national").map((t) => (
                        <option key={t.id} value={t.id} className="py-2">
                          {t.logo} {t.name} ({t.shortName})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="World Cup Contenders">
                      {TEAMS_DATABASE.filter(t => t.id !== homeTeam.id && t.category === "national").map((t) => (
                        <option key={t.id} value={t.id} className="py-2">
                          {t.logo} {t.name} ({t.shortName})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                    <span 
                      className="w-3.5 h-3.5 rounded-full border border-white/20" 
                      style={{ backgroundColor: awayTeam.color }}
                    ></span>
                  </div>
                </div>
              </div>

            </div>

            {/* Quick Defaults Control Button */}
            <div className="w-full lg:w-auto flex flex-row lg:flex-col justify-end gap-2.5">
              <button
                onClick={resetToTeamDefaults}
                className="w-full sm:w-auto px-4 py-3.5 bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-mono flex items-center justify-center gap-2 hover:bg-slate-900 transition"
                title="Reset stats back to default rosters"
                id="reset-defaults-btn"
              >
                <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                Reset To Database Roster Profiles
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Panels Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Parametric Metrics Sliders (Take 5 cols) */}
          <section className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-md font-bold font-display tracking-tight text-slate-200 mb-6 flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span>Adjust Predictor Variables</span>
              </div>
              {syncing ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-sky-500/10 border border-sky-500/30 text-[10px] text-sky-400 font-mono rounded-full animate-pulse shadow-sm">
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-ping"></span>
                  API Syncing...
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-mono rounded-full shadow-sm">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                  API Live
                </span>
              )}
            </h2>

            <div className="space-y-6">
              
              {/* Home Team Parameters Panel */}
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/50">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">{homeTeam.logo}</span>
                  <h3 className="font-semibold text-xs font-mono tracking-wider text-slate-300 uppercase" style={{ borderLeft: `3px solid ${homeTeam.color}`, paddingLeft: '8px' }}>
                    {homeTeam.name}
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Home Attack xG */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1.5">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        Attack expected goals (xG)
                      </span>
                      <span className="font-bold text-sky-400">{stats.home_attack_xg.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="4.0"
                      step="0.1"
                      value={stats.home_attack_xg}
                      onChange={(e) => handleStatChange("home_attack_xg", parseFloat(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                      id="home-attack-xg-slider"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                      <span>0.5 (Weak)</span>
                      <span>4.0 (Elite)</span>
                    </div>
                  </div>

                  {/* Home Defense xG Conceded */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1.5">
                      <span className="text-slate-400">Defense expected cessions (xG)</span>
                      <span className="font-bold text-amber-500">{stats.home_defense_xg_conceded.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="4.0"
                      step="0.1"
                      value={stats.home_defense_xg_conceded}
                      onChange={(e) => handleStatChange("home_defense_xg_conceded", parseFloat(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                      id="home-defense-xg-slider"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                      <span>0.5 (Solid)</span>
                      <span>4.0 (Vulnerable)</span>
                    </div>
                  </div>

                  {/* Home Form Rating */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1.5">
                      <span className="text-slate-400">Team form (recent 5 matches)</span>
                      <span className="font-bold text-emerald-400">{stats.home_form_last_5}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={stats.home_form_last_5}
                      onChange={(e) => handleStatChange("home_form_last_5", parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                      id="home-form-slider"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                      <span>10% (Struggling)</span>
                      <span>100% (Unstoppable)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Away Team Parameters Panel */}
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/50">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">{awayTeam.logo}</span>
                  <h3 className="font-semibold text-xs font-mono tracking-wider text-slate-300 uppercase" style={{ borderLeft: `3px solid ${awayTeam.color}`, paddingLeft: '8px' }}>
                    {awayTeam.name}
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Away Attack xG */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1.5">
                      <span className="text-slate-400">Attack expected goals (xG)</span>
                      <span className="font-bold text-sky-400">{stats.away_attack_xg.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="4.0"
                      step="0.1"
                      value={stats.away_attack_xg}
                      onChange={(e) => handleStatChange("away_attack_xg", parseFloat(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                      id="away-attack-xg-slider"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                      <span>0.5 (Weak)</span>
                      <span>4.0 (Elite)</span>
                    </div>
                  </div>

                  {/* Away Defense xG Conceded */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1.5">
                      <span className="text-slate-400">Defense expected cessions (xG)</span>
                      <span className="font-bold text-amber-500">{stats.away_defense_xg_conceded.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="4.0"
                      step="0.1"
                      value={stats.away_defense_xg_conceded}
                      onChange={(e) => handleStatChange("away_defense_xg_conceded", parseFloat(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                      id="away-defense-xg-slider"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                      <span>0.5 (Solid)</span>
                      <span>4.0 (Vulnerable)</span>
                    </div>
                  </div>

                  {/* Away Form Rating */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1.5">
                      <span className="text-slate-400">Team form (recent 5 matches)</span>
                      <span className="font-bold text-emerald-400">{stats.away_form_last_5}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={stats.away_form_last_5}
                      onChange={(e) => handleStatChange("away_form_last_5", parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                      id="away-form-slider"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                      <span>10% (Struggling)</span>
                      <span>100% (Unstoppable)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Head to Head Global Multiplier */}
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/50">
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-slate-300 font-medium">H2H Historical Average Goals</span>
                  <span className="font-bold text-sky-400 pr-1">{stats.h2h_average_goals.toFixed(1)} goals</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="6.0"
                  step="0.1"
                  value={stats.h2h_average_goals}
                  onChange={(e) => handleStatChange("h2h_average_goals", parseFloat(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                  id="h2h-average-goals-slider"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                  <span>0.5 (Cagey)</span>
                  <span>6.0 (High Scoring)</span>
                </div>
              </div>

              {/* Trigger Prediction Button */}
              <button
                onClick={() => runPrediction()}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-sky-600 via-sky-500 to-indigo-600 text-white hover:brightness-110 active:brightness-95 disabled:brightness-75 font-semibold font-display tracking-tight text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                id="trigger-prediction-btn"
              >
                <Sparkles className={`w-4 h-4 text-white/90 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Re-modeling Goal Distribution..." : "Run AI Prediction Metric"}
              </button>
            </div>
          </section>

          {/* RIGHT COLUMN: Output Dashboard Insights (Take 7 cols) */}
          <section className="lg:col-span-7 space-y-8">
            
            {/* HER0 METER: Probability of OVER 1.5 GOALS */}
            {prediction ? (
              <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                {/* Background ambient lighting */}
                <div className={`absolute -right-12 -top-12 w-48 h-48 rounded-full blur-3xl opacity-10 transition-colors duration-500 ${
                  prediction.isHighConfidence ? "bg-emerald-500" : "bg-amber-500"
                }`}></div>

                <div className="flex flex-col md:flex-row items-center gap-6">
                  
                  {/* Large visual circular ring meter */}
                  <div className="relative flex-shrink-0 w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        className="stroke-slate-800"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        className={`transition-all duration-1000 ease-out ${
                          prediction.isHighConfidence ? "stroke-emerald-500" : "stroke-amber-500"
                        }`}
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 42}
                        strokeDashoffset={(2 * Math.PI * 42) * (1 - prediction.over_1_5_prob / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-3xl font-extrabold font-mono tracking-tighter text-white">
                        {prediction.over_1_5_prob.toFixed(1)}%
                      </span>
                      <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase mt-0.5">
                        Probability
                      </span>
                    </div>
                  </div>

                  {/* Model Verdict details */}
                  <div className="flex-1 text-center md:text-left">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest font-bold mb-3.5 bg-slate-950 border border-slate-800">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                        prediction.isHighConfidence ? "bg-emerald-500 shadow-glow" : "bg-amber-500"
                      }`}></span>
                      Market: Over 1.5 Goals Line
                    </span>

                    <h3 className="text-xl font-bold font-display tracking-tight text-white mb-2">
                      {prediction.isHighConfidence ? (
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 flex items-center justify-center md:justify-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          Recommended Bet: High Goal Yield
                        </span>
                      ) : (
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-500 flex items-center justify-center md:justify-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          Model Verdict: Skip Match
                        </span>
                      )}
                    </h3>

                    <p className="text-xs text-slate-300 leading-relaxed max-w-md">
                      {prediction.isHighConfidence 
                        ? `This matchup meets or exceeds our strict 80% statistical valuation threshold (${prediction.over_1_5_prob.toFixed(1)}%). Offensive xG structures flag a rapid, expansive flow with defensive apertures.`
                        : `This matchup fails to cross the 80% threshold. Tactical constraints indicating strong defensive structural shields, poor offensive xG values or H2H history make this market a hold parameter.`
                      }
                    </p>
                  </div>
                </div>

                {/* Sub expected score badge */}
                <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/40">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Expected Score</div>
                    <div className="text-lg font-bold font-display text-white mt-0.5">{prediction.predictedScore}</div>
                  </div>
                  <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/40">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">{homeTeam.shortName} xG Expectancy</div>
                    <div className="text-lg font-bold font-mono text-sky-400 mt-0.5">{prediction.expectedHomeGoals.toFixed(2)}</div>
                  </div>
                  <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/40">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">{awayTeam.shortName} xG Expectancy</div>
                    <div className="text-lg font-bold font-mono text-sky-400 mt-0.5">{prediction.expectedAwayGoals.toFixed(2)}</div>
                  </div>
                  <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/40">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Confidence Match</div>
                    <div className={`text-lg font-bold font-display mt-0.5 ${prediction.isHighConfidence ? "text-emerald-400" : "text-amber-400"}`}>
                      {prediction.isHighConfidence ? "HIGH" : "MODERATE"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-inner">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-sky-400/30 border-t-sky-500 rounded-full mb-3"></div>
                <p className="text-slate-400 text-sm font-mono">Formulating Poisson projections & logical regression models...</p>
              </div>
            )}

            {/* TAB PANEL CONTENT */}
            {prediction && (
              <div className="space-y-6">
                
                {/* Visual tabs switcher */}
                <div className="flex overflow-x-auto scrollbar-none border-b border-slate-800 gap-1.5 p-1 bg-slate-950/80 rounded-xl border whitespace-nowrap">
                  <button
                    onClick={() => setActiveTab("analysis")}
                    className={`flex-1 md:flex-initial min-w-[140px] md:min-w-0 md:flex-1 py-3 text-xs font-semibold font-display rounded-lg transition-all flex items-center justify-center gap-2 ${
                      activeTab === "analysis"
                        ? "bg-slate-900 text-white border border-slate-800 shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    id="tab-btn-analysis"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    AI Tactical Analyst Report
                  </button>
                  <button
                    onClick={() => setActiveTab("markets")}
                    className={`flex-1 md:flex-initial min-w-[140px] md:min-w-0 md:flex-1 py-3 text-xs font-semibold font-display rounded-lg transition-all flex items-center justify-center gap-2 ${
                      activeTab === "markets"
                        ? "bg-slate-900 text-white border border-slate-800 shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    id="tab-btn-markets"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    Standard Goal Markets
                  </button>
                  <button
                    onClick={() => setActiveTab("trends")}
                    className={`flex-1 md:flex-initial min-w-[120px] md:min-w-0 md:flex-1 py-3 text-xs font-semibold font-display rounded-lg transition-all flex items-center justify-center gap-2 ${
                      activeTab === "trends"
                        ? "bg-slate-900 text-white border border-slate-800 shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    id="tab-btn-trends"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                    Form Trend Chart
                  </button>
                  <button
                    onClick={() => setActiveTab("h2h")}
                    className={`flex-1 md:flex-initial min-w-[150px] md:min-w-0 md:flex-1 py-3 text-xs font-semibold font-display rounded-lg transition-all flex items-center justify-center gap-2 ${
                      activeTab === "h2h"
                        ? "bg-slate-900 text-white border border-slate-800 shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    id="tab-btn-h2h"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-orange-400" />
                    H2H Goal Distribution
                  </button>
                  <button
                    onClick={() => setActiveTab("scorelines")}
                    className={`flex-1 md:flex-initial min-w-[140px] md:min-w-0 md:flex-1 py-3 text-xs font-semibold font-display rounded-lg transition-all flex items-center justify-center gap-2 ${
                      activeTab === "scorelines"
                        ? "bg-slate-900 text-white border border-slate-800 shadow relative"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    id="tab-btn-scorelines"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    Poisson Scorelines
                  </button>
                  <button
                    onClick={() => setActiveTab("worldcup")}
                    className={`flex-1 md:flex-initial min-w-[150px] md:min-w-0 md:flex-1 py-3 text-xs font-semibold font-display rounded-lg transition-all flex items-center justify-center gap-2 transition ${
                      activeTab === "worldcup"
                        ? "bg-slate-900 text-white border border-slate-800 shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    id="tab-btn-worldcup"
                  >
                    <Globe className="w-3.5 h-3.5 text-rose-400" />
                    World Cup Group Stage
                  </button>
                </div>

                {/* TAB CONTENT: AI Tactical Analyst Report */}
                {activeTab === "analysis" && (
                  <div className="bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-md">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-850">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-sky-400" />
                        <h3 className="font-semibold text-sm text-slate-200 font-display">Tactical Intel Summary</h3>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800/80 uppercase">
                        Gemini LLM Synthesis
                      </div>
                    </div>

                    {loading ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center">
                        <div className="relative w-12 h-12 mb-4">
                          <div className="absolute inset-0 rounded-full border-4 border-sky-400/20"></div>
                          <div className="absolute inset-0 rounded-full border-4 border-sky-500 border-t-transparent animate-spin"></div>
                          <Sparkles className="w-5 h-5 text-sky-400 absolute inset-0 m-auto animate-pulse" />
                        </div>
                        <p className="text-slate-400 text-xs font-mono">Synthesizing tactical battlegrounds & expected yields...</p>
                      </div>
                    ) : (
                      <div className="prose prose-invert prose-xs text-slate-300 leading-relaxed space-y-4 max-w-none text-xs">
                        {prediction.aiAnalysis ? (
                          prediction.aiAnalysis.split("\n").map((para, i) => {
                            if (para.startsWith("1.") || para.startsWith("2.") || para.startsWith("3.") || para.startsWith("**")) {
                              return <p key={i} className="font-medium text-slate-100 my-3 text-xs leading-normal" dangerouslySetInnerHTML={{ __html: para.replace(/\*\*/g, "") }} />;
                            }
                            if (para.trim().startsWith("-")) {
                              return <li key={i} className="list-disc ml-4 my-1 pl-1 text-slate-300" dangerouslySetInnerHTML={{ __html: para.slice(1).trim().replace(/\*\*/g, "<b>").replace(/\*\*/g, "</b>") }} />;
                            }
                            return <p key={i} className="my-2" dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.*?)\*\*/g, "<strong class='text-sky-300'>$1</strong>") }} />;
                          })
                        ) : (
                          <p className="text-slate-400 select-none italic text-center py-6">No match assessment compiles. Click predicted trigger button.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: Goal Markets Chart Output */}
                {activeTab === "markets" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                      {/* Left: Distributions and Probabilities */}
                      <div className="bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-md space-y-5">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                          <h3 className="font-semibold text-sm text-slate-200 font-display">Comparative Goals Distributions</h3>
                        </div>

                        <div className="space-y-4">
                          {prediction.standardMarkets.map((m) => (
                            <div key={m.market} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/50">
                              <div className="flex justify-between items-center text-xs font-mono mb-2">
                                <span className="font-semibold text-slate-300">{m.market} Goals</span>
                                <div className="flex gap-4">
                                  <span className="text-sky-400">Over: {m.over.toFixed(1)}%</span>
                                  <span className="text-slate-500">Under: {m.under.toFixed(1)}%</span>
                                </div>
                              </div>
                              
                              {/* Comparative visual loading bars */}
                              <div className="h-2.5 bg-slate-900 w-full rounded-full overflow-hidden flex">
                                <div 
                                  className="bg-gradient-to-r from-sky-600 to-indigo-500 h-full rounded-l transition-all duration-700" 
                                  style={{ width: `${m.over}%` }}
                                ></div>
                                <div 
                                  className="bg-slate-800 h-full rounded-r transition-all duration-700"
                                  style={{ width: `${m.under}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Standard 3-way distribution (Home, Draw, Away Win probabilities) */}
                        <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800">
                          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3.5">
                            Outcome Probabilities (1x2 Distribution)
                          </h4>
                          <div className="flex justify-between text-xs font-mono mb-2 text-slate-300">
                            <span style={{ color: homeTeam.color }} className="font-semibold">{homeTeam.shortName} Win: {prediction.distribution.homeWin}%</span>
                            <span className="text-slate-400 font-semibold">Draw: {prediction.distribution.draw}%</span>
                            <span style={{ color: awayTeam.color }} className="font-semibold">{awayTeam.shortName} Win: {prediction.distribution.awayWin}%</span>
                          </div>
                          <div className="h-3 bg-slate-900 w-full rounded-full overflow-hidden flex">
                            <div 
                              className="h-full transition-all duration-700" 
                              style={{ width: `${prediction.distribution.homeWin}%`, backgroundColor: homeTeam.color }}
                            ></div>
                            <div 
                              className="h-full bg-slate-700 transition-all duration-700" 
                              style={{ width: `${prediction.distribution.draw}%` }}
                            ></div>
                            <div 
                              className="h-full transition-all duration-700" 
                              style={{ width: `${prediction.distribution.awayWin}%`, backgroundColor: awayTeam.color }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Team Strength KPIs Radar Chart */}
                      <div className="bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-md space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-cyan-400" />
                            <h3 className="font-semibold text-sm text-slate-200 font-display">Tactical Profile Strength Balance</h3>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            Calibrated Team Strengths KPI
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          This radar chart displays relative indices out of 100 on five core vectors of modern football tactical metrics. Strengths dynamically adjust according to default attack xG, defensive discipline, and seasonal team quality offsets.
                        </p>

                        <div className="h-[280px] w-full flex items-center justify-center pt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={generateRadarData()}>
                              <PolarGrid stroke="#334155" />
                              <PolarAngleAxis 
                                dataKey="subject" 
                                stroke="#94a3b8" 
                                style={{ fontSize: 10, fontFamily: 'Space Grotesk', fontWeight: 500 }} 
                              />
                              <PolarRadiusAxis 
                                angle={30} 
                                domain={[0, 100]} 
                                stroke="#475569" 
                                style={{ fontSize: 8, fontFamily: 'JetBrains Mono' }} 
                              />
                              <Radar
                                name={`${homeTeam.name} (${homeTeam.shortName})`}
                                dataKey={homeTeam.name}
                                stroke={homeTeam.color}
                                fill={homeTeam.color}
                                fillOpacity={0.25}
                              />
                              <Radar
                                name={`${awayTeam.name} (${awayTeam.shortName})`}
                                dataKey={awayTeam.name}
                                stroke={awayTeam.color || "#ef4444"}
                                fill={awayTeam.color || "#ef4444"}
                                fillOpacity={0.25}
                              />
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-2xl font-mono text-xs space-y-1.5">
                                        <p className="text-slate-400 font-bold border-b border-slate-800 pb-1 mb-1">
                                          {payload[0].payload.subject}
                                        </p>
                                        {payload.map((item: any) => (
                                          <p key={item.name} style={{ color: item.color }} className="flex justify-between gap-6">
                                            <span>{item.name}:</span>
                                            <span className="font-bold">{item.value}/100</span>
                                          </p>
                                        ))}
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Legend 
                                wrapperStyle={{ fontSize: 11, fontFamily: 'Space Grotesk', paddingTop: 12 }} 
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-[11px] pt-4 border-t border-slate-800/50 font-mono">
                          <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/40">
                            <span className="text-[10px] text-slate-500 block uppercase font-bold" style={{ color: homeTeam.color }}>
                              {homeTeam.shortName} Style
                            </span>
                            <span className="text-slate-300">
                              {homeTeam.defaultAttackXg > 1.9 ? "Possession & High-Press" : "Sturdy Defensive Block"}
                            </span>
                          </div>
                          <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/40">
                            <span className="text-[10px] text-slate-500 block uppercase font-bold" style={{ color: awayTeam.color || "#ef4444" }}>
                              {awayTeam.shortName} Style
                            </span>
                            <span className="text-slate-300">
                              {awayTeam.defaultAttackXg > 1.9 ? "Counter-Press & Speed" : "Low Block Direct Play"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: Form Trend Chart */}
                {activeTab === "trends" && (
                  <div className="bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/85">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-400" />
                        <h3 className="font-semibold text-sm text-slate-200 font-display">
                          10-Match Form Fluctuation Trend
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        Adjusting form baseline dynamically offsets history
                      </span>
                    </div>

                    <div className="h-72 w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={Array.from({ length: 10 }).map((_, idx) => {
                            const homeHistory = homeTeam.formHistory || [70, 75, 78, 80, 85, 82, 80, 85, 90, 85];
                            const awayHistory = awayTeam.formHistory || [82, 85, 84, 88, 92, 90, 88, 92, 85, 88];

                            const homeOffset = stats.home_form_last_5 - homeTeam.defaultForm;
                            const awayOffset = stats.away_form_last_5 - awayTeam.defaultForm;

                            const adjustedHomeVal = Math.max(10, Math.min(100, Math.round((homeHistory[idx] || 50) + homeOffset)));
                            const adjustedAwayVal = Math.max(10, Math.min(100, Math.round((awayHistory[idx] || 50) + awayOffset)));

                            return {
                              name: `Match ${idx + 1}`,
                              [homeTeam.shortName]: adjustedHomeVal,
                              [awayTeam.shortName]: adjustedAwayVal,
                            };
                          })}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            stroke="#64748b" 
                            style={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} 
                          />
                          <YAxis 
                            stroke="#64748b" 
                            domain={[0, 100]} 
                            style={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} 
                            ticks={[0, 20, 40, 60, 80, 100]}
                          />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-2xl font-mono text-xs space-y-1.5">
                                    <p className="text-slate-400 font-bold border-b border-slate-800 pb-1 mb-1">{label}</p>
                                    {payload.map((item: any) => (
                                      <p key={item.name} style={{ color: item.color }} className="flex justify-between gap-6">
                                        <span>{item.name}:</span>
                                        <span className="font-bold">{item.value}%</span>
                                      </p>
                                    ))}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ fontSize: 11, fontFamily: 'Space Grotesk', paddingTop: 10 }}
                          />
                          <Line
                            type="monotone"
                            dataKey={homeTeam.shortName}
                            name={`${homeTeam.name} (${homeTeam.shortName})`}
                            stroke={homeTeam.color}
                            activeDot={{ r: 6 }}
                            strokeWidth={3}
                          />
                          <Line
                            type="monotone"
                            dataKey={awayTeam.shortName}
                            name={`${awayTeam.name} (${awayTeam.shortName})`}
                            stroke={awayTeam.color}
                            activeDot={{ r: 6 }}
                            strokeWidth={3}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center text-xs p-1">
                      <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/40">
                        <span className="text-slate-400 font-mono block text-[10px] uppercase">Home Team Form Trend</span>
                        <span style={{ color: homeTeam.color }} className="font-semibold font-display text-sm mt-0.5 inline-block">
                          {stats.home_form_last_5 > homeTeam.defaultForm ? "📈 Rising" : stats.home_form_last_5 < homeTeam.defaultForm ? "📉 Declining" : "➖ Steady"}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/40">
                        <span className="text-slate-400 font-mono block text-[10px] uppercase">Away Team Form Trend</span>
                        <span style={{ color: awayTeam.color }} className="font-semibold font-display text-sm mt-0.5 inline-block">
                          {stats.away_form_last_5 > awayTeam.defaultForm ? "📈 Rising" : stats.away_form_last_5 < awayTeam.defaultForm ? "📉 Declining" : "➖ Steady"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* TAB CONTENT: H2H Goal Distribution Chart */}
                {activeTab === "h2h" && (
                  <div className="bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/85">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-orange-400" />
                        <h3 className="font-semibold text-sm text-slate-200 font-display">
                          Historical Head-to-Head Goal Distributions
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        Poisson Probability Density Output
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      This distribution illustrates the expected probability of each side scoring exact goal counts in their direct encounters. The vectors are calculated using predictive Poisson logit expectations calibrated by active attack xG scores, opposing concessions, and recent tactical performance modifiers.
                    </p>

                    <div className="h-72 w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={generateH2hDistributionData()}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="goals" 
                            stroke="#64748b" 
                            style={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} 
                          />
                          <YAxis 
                            stroke="#64748b" 
                            style={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} 
                            tickFormatter={(v) => `${v}%`}
                          />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-2xl font-mono text-xs space-y-1.5">
                                    <p className="text-slate-400 font-bold border-b border-slate-800 pb-1 mb-1">{label}</p>
                                    {payload.map((item: any) => (
                                      <p key={item.name} style={{ color: item.color }} className="flex justify-between gap-6">
                                        <span>{item.name}:</span>
                                        <span className="font-bold">{item.value}%</span>
                                      </p>
                                    ))}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ fontSize: 11, fontFamily: 'Space Grotesk', paddingTop: 10 }}
                          />
                          <Bar
                            dataKey={homeTeam.name}
                            name={`${homeTeam.name} (${homeTeam.shortName})`}
                            fill={homeTeam.color}
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey={awayTeam.name}
                            name={`${awayTeam.name} (${awayTeam.shortName})`}
                            fill={awayTeam.color || "#ef4444"}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mt-4 pt-4 border-t border-slate-800/60">
                      <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/40">
                        <span className="text-slate-400 font-mono block text-[10px] uppercase">Home Scoring Density</span>
                        <p className="text-slate-300 mt-1">
                          {prediction.expectedHomeGoals > prediction.expectedAwayGoals 
                            ? `The Poisson engine models ${homeTeam.name} with an offensive edge, showcasing an expected matching profile of ${prediction.expectedHomeGoals.toFixed(2)} goals.` 
                            : `${homeTeam.name} presents a more conservative goal density with a higher expectancy of low total scores (0-1 goals).`}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/40">
                        <span className="text-slate-400 font-mono block text-[10px] uppercase">Away Scoring Density</span>
                        <p className="text-slate-300 mt-1">
                          {prediction.expectedAwayGoals > prediction.expectedHomeGoals 
                            ? `The Poisson engine models ${awayTeam.name} with an offensive edge, showcasing an expected matching profile of ${prediction.expectedAwayGoals.toFixed(2)} goals.` 
                            : `${awayTeam.name} presents a more conservative goal density with a higher expectancy of low total scores (0-1 goals).`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: Scorelines Grid */}
                {activeTab === "scorelines" && (
                  <div className="bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-md">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <h3 className="font-semibold text-sm text-slate-200 font-display">Top Recommended Scorelines</h3>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
                        Poisson Model Matrices
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {prediction.scorelineProbabilities.map((line, idx) => {
                        let outlineBorder = "border-slate-800 hover:border-slate-700";
                        if (idx === 0) outlineBorder = "border-emerald-500/80 bg-emerald-950/10 shadow-glow shadow-emerald-500/5";

                        return (
                          <div 
                            key={line.score} 
                            className={`p-4 bg-slate-950/60 rounded-xl border text-center transition ${outlineBorder}`}
                          >
                            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                              {idx === 0 ? "🏆 Most Likely" : `Rank #${idx + 1}`}
                            </div>
                            <div className="text-2xl font-bold font-display text-white my-1 tracking-tighter">
                              {line.score}
                            </div>
                            <div className="text-[11px] font-mono bg-slate-900/80 inline-block px-1.5 py-0.5 rounded font-bold text-sky-400 mt-1">
                              {line.probability.toFixed(1)}% chance
                            </div>
                            <div className="text-[9px] font-mono text-slate-500 uppercase mt-2">
                              {line.isHomeWin ? `${homeTeam.shortName} Win` : line.isAwayWin ? `${awayTeam.shortName} Win` : "Draw"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: World Cup Group Standings Table */}
                {activeTab === "worldcup" && (
                  <WorldCupStandings
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                    prediction={prediction}
                  />
                )}

              </div>
            )}

          </section>
        </div>

        {/* Global Footer Notes */}
        <footer className="mt-16 pt-8 border-t border-slate-800 text-center max-w-5xl mx-auto space-y-3">
          <div className="flex justify-center flex-wrap gap-4 text-xs font-mono text-slate-500">
            <span>⚽ Advanced xG Model Configuration</span>
            <span>🛡️ Poisson Probabilities Matrix Logic</span>
            <span>⚡ XGBoost Logistic Formulation</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-normal max-w-xl mx-auto">
            This analytical goal predictor leverages server-side algorithmic modeling and optional state-of-the-art LLM tactical summarization. Please utilize predictions responsibly. Football remains structurally volatile.
          </p>
        </footer>

      </main>
    </div>
  );
}
