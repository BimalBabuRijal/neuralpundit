/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Team, PredictionResult } from "../types";
import { TEAMS_DATABASE } from "../teamsData";
import { Trophy, Info, Sparkles, CheckCircle2, Search, Globe } from "lucide-react";

interface WorldCupStandingsProps {
  homeTeam: Team;
  awayTeam: Team;
  prediction: PredictionResult | null;
}

interface StandingRow {
  id: string;
  name: string;
  logo: string;
  color: string;
  secondaryColor: string;
  shortName: string;
  gp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

// World Cup contenders with realistic simulation baselines
const BASE_STANDINGS: Record<string, { gp: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number }> = {
  argentina:    { gp: 3, w: 2, d: 1, l: 0, gf: 6, ga: 2, gd: 4, pts: 7 },
  uruguay:      { gp: 3, w: 2, d: 1, l: 0, gf: 5, ga: 2, gd: 3, pts: 7 },
  netherlands:  { gp: 3, w: 2, d: 1, l: 0, gf: 6, ga: 2, gd: 4, pts: 7 },
  spain:        { gp: 3, w: 2, d: 0, l: 1, gf: 7, ga: 3, gd: 4, pts: 6 },
  france:       { gp: 3, w: 2, d: 0, l: 1, gf: 5, ga: 3, gd: 2, pts: 6 },
  colombia:     { gp: 3, w: 2, d: 0, l: 1, gf: 6, ga: 3, gd: 3, pts: 6 },
  italy:        { gp: 3, w: 2, d: 0, l: 1, gf: 4, ga: 2, gd: 2, pts: 6 },
  portugal:     { gp: 3, w: 1, d: 2, l: 0, gf: 4, ga: 3, gd: 1, pts: 5 },
  japan:        { gp: 3, w: 1, d: 2, l: 0, gf: 5, ga: 4, gd: 1, pts: 5 },
  iran:         { gp: 3, w: 1, d: 2, l: 0, gf: 4, ga: 3, gd: 1, pts: 5 },
  brazil:       { gp: 3, w: 1, d: 1, l: 1, gf: 3, ga: 3, gd: 0, pts: 4 },
  england:      { gp: 3, w: 1, d: 1, l: 1, gf: 3, ga: 4, gd: -1, pts: 4 },
  croatia:      { gp: 3, w: 1, d: 1, l: 1, gf: 4, ga: 3, gd: 1, pts: 4 },
  usa:          { gp: 3, w: 1, d: 1, l: 1, gf: 4, ga: 4, gd: 0, pts: 4 },
  senegal:      { gp: 3, w: 1, d: 1, l: 1, gf: 3, ga: 3, gd: 0, pts: 4 },
  belgium:      { gp: 3, w: 1, d: 1, l: 1, gf: 3, ga: 4, gd: -1, pts: 4 },
  austria:      { gp: 3, w: 1, d: 1, l: 1, gf: 4, ga: 4, gd: 0, pts: 4 },
  ecuador:      { gp: 3, w: 1, d: 1, l: 1, gf: 3, ga: 3, gd: 0, pts: 4 },
  ivorycoast:   { gp: 3, w: 1, d: 1, l: 1, gf: 4, ga: 4, gd: 0, pts: 4 },
  egypt:        { gp: 3, w: 1, d: 1, l: 1, gf: 4, ga: 4, gd: 0, pts: 4 },
  southkorea:   { gp: 3, w: 1, d: 0, l: 2, gf: 3, ga: 5, gd: -2, pts: 3 },
  switzerland:  { gp: 3, w: 1, d: 0, l: 2, gf: 2, ga: 4, gd: -2, pts: 3 },
  turkiye:      { gp: 3, w: 1, d: 0, l: 2, gf: 3, ga: 5, gd: -2, pts: 3 },
  norway:       { gp: 3, w: 1, d: 0, l: 2, gf: 4, ga: 6, gd: -2, pts: 3 },
  algeria:      { gp: 3, w: 1, d: 0, l: 2, gf: 3, ga: 5, gd: -2, pts: 3 },
  qatar:        { gp: 3, w: 1, d: 0, l: 2, gf: 3, ga: 5, gd: -2, pts: 3 },
  jordan:       { gp: 3, w: 1, d: 0, l: 2, gf: 2, ga: 4, gd: -2, pts: 3 },
  panama:       { gp: 3, w: 1, d: 0, l: 2, gf: 3, ga: 5, gd: -2, pts: 3 },
  denmark:      { gp: 3, w: 0, d: 2, l: 1, gf: 2, ga: 4, gd: -2, pts: 2 },
  australia:    { gp: 3, w: 0, d: 2, l: 1, gf: 1, ga: 3, gd: -2, pts: 2 },
  sweden:       { gp: 3, w: 0, d: 2, l: 1, gf: 2, ga: 4, gd: -2, pts: 2 },
  morocco:      { gp: 3, w: 0, d: 1, l: 2, gf: 2, ga: 6, gd: -4, pts: 1 },
  mexico:       { gp: 3, w: 0, d: 1, l: 2, gf: 2, ga: 5, gd: -3, pts: 1 },
  canada:       { gp: 3, w: 0, d: 1, l: 2, gf: 1, ga: 5, gd: -4, pts: 1 },
  paraguay:     { gp: 3, w: 0, d: 1, l: 2, gf: 1, ga: 4, gd: -3, pts: 1 },
  iraq:         { gp: 3, w: 0, d: 1, l: 2, gf: 2, ga: 5, gd: -3, pts: 1 },
  uzbekistan:   { gp: 3, w: 0, d: 1, l: 2, gf: 1, ga: 4, gd: -3, pts: 1 },
  capeverde:    { gp: 3, w: 0, d: 1, l: 2, gf: 2, ga: 6, gd: -4, pts: 1 },
  congodr:      { gp: 3, w: 0, d: 1, l: 2, gf: 2, ga: 5, gd: -3, pts: 1 },
  ghana:        { gp: 3, w: 0, d: 1, l: 2, gf: 2, ga: 6, gd: -4, pts: 1 },
  southafrica:  { gp: 3, w: 0, d: 1, l: 2, gf: 1, ga: 4, gd: -3, pts: 1 },
  tunisia:      { gp: 3, w: 0, d: 1, l: 2, gf: 1, ga: 4, gd: -3, pts: 1 },
  haiti:        { gp: 3, w: 0, d: 1, l: 2, gf: 2, ga: 6, gd: -4, pts: 1 },
  scotland:     { gp: 3, w: 0, d: 1, l: 2, gf: 1, ga: 5, gd: -4, pts: 1 },
  bosnia:       { gp: 3, w: 0, d: 1, l: 2, gf: 2, ga: 6, gd: -4, pts: 1 },
  czechia:      { gp: 3, w: 0, d: 1, l: 2, gf: 2, ga: 5, gd: -3, pts: 1 },
  germany:      { gp: 3, w: 0, d: 0, l: 3, gf: 2, ga: 8, gd: -6, pts: 0 },
  saudiarabia:  { gp: 3, w: 0, d: 0, l: 3, gf: 1, ga: 7, gd: -6, pts: 0 },
  curacao:      { gp: 3, w: 0, d: 0, l: 3, gf: 1, ga: 8, gd: -7, pts: 0 },
  newzealand:   { gp: 3, w: 0, d: 0, l: 3, gf: 1, ga: 8, gd: -7, pts: 0 }
};

// Federation region mappings
const TEAM_REGIONS: Record<string, "UEFA" | "CONMEBOL" | "CONCACAF" | "AFC" | "CAF" | "OFC"> = {
  // UEFA (Europe)
  france: "UEFA",
  germany: "UEFA",
  spain: "UEFA",
  england: "UEFA",
  portugal: "UEFA",
  italy: "UEFA",
  netherlands: "UEFA",
  belgium: "UEFA",
  croatia: "UEFA",
  switzerland: "UEFA",
  denmark: "UEFA",
  austria: "UEFA",
  bosnia: "UEFA",
  czechia: "UEFA",
  norway: "UEFA",
  scotland: "UEFA",
  sweden: "UEFA",
  turkiye: "UEFA",

  // CONMEBOL (South America)
  argentina: "CONMEBOL",
  brazil: "CONMEBOL",
  uruguay: "CONMEBOL",
  colombia: "CONMEBOL",
  ecuador: "CONMEBOL",
  paraguay: "CONMEBOL",

  // CONCACAF (North/Central America)
  usa: "CONCACAF",
  mexico: "CONCACAF",
  canada: "CONCACAF",
  curacao: "CONCACAF",
  haiti: "CONCACAF",
  panama: "CONCACAF",

  // AFC (Asia)
  japan: "AFC",
  southkorea: "AFC",
  australia: "AFC",
  saudiarabia: "AFC",
  iran: "AFC",
  iraq: "AFC",
  jordan: "AFC",
  qatar: "AFC",
  uzbekistan: "AFC",

  // CAF (Africa)
  morocco: "CAF",
  senegal: "CAF",
  algeria: "CAF",
  capeverde: "CAF",
  congodr: "CAF",
  ivorycoast: "CAF",
  egypt: "CAF",
  ghana: "CAF",
  southafrica: "CAF",
  tunisia: "CAF",

  // OFC (Oceania)
  newzealand: "OFC",
};

export const WorldCupStandings: React.FC<WorldCupStandingsProps> = ({
  homeTeam,
  awayTeam,
  prediction,
}) => {
  const [includePrediction, setIncludePrediction] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("ALL");

  // Filter national teams from database
  const nationalTeams = useMemo(() => {
    return TEAMS_DATABASE.filter((t) => t.category === "national");
  }, []);

  const isHomeNational = homeTeam.category === "national";
  const isAwayNational = awayTeam.category === "national";
  const isMatchNational = isHomeNational && isAwayNational;

  // Compute live rankings
  const standings = useMemo(() => {
    // 1. Setup base row list
    const rows: Record<string, StandingRow> = {};
    
    nationalTeams.forEach((team) => {
      const base = BASE_STANDINGS[team.id] || { gp: 3, w: 1, d: 1, l: 1, gf: 3, ga: 3, gd: 0, pts: 4 };
      rows[team.id] = {
        id: team.id,
        name: team.name,
        logo: team.logo,
        color: team.color,
        secondaryColor: team.secondaryColor,
        shortName: team.shortName,
        ...base,
      };
    });

    // 2. Inject prediction result if toggle active and both teams are national
    if (includePrediction && prediction && isMatchNational) {
      const scoreParts = prediction.predictedScore.split(" - ");
      if (scoreParts.length === 2) {
        const homeGoals = parseInt(scoreParts[0], 10);
        const awayGoals = parseInt(scoreParts[1], 10);

        if (!isNaN(homeGoals) && !isNaN(awayGoals)) {
          const hId = homeTeam.id;
          const aId = awayTeam.id;

          if (rows[hId] && rows[aId]) {
            // Update Games Played
            rows[hId].gp += 1;
            rows[aId].gp += 1;

            // Goals For / Against
            rows[hId].gf += homeGoals;
            rows[hId].ga += awayGoals;
            rows[hId].gd = rows[hId].gf - rows[hId].ga;

            rows[aId].gf += awayGoals;
            rows[aId].ga += homeGoals;
            rows[aId].gd = rows[aId].gf - rows[aId].ga;

            if (homeGoals > awayGoals) {
              // Home Win
              rows[hId].w += 1;
              rows[hId].pts += 3;

              rows[aId].l += 1;
            } else if (homeGoals < awayGoals) {
              // Away Win
              rows[aId].w += 1;
              rows[aId].pts += 3;

              rows[hId].l += 1;
            } else {
              // Draw
              rows[hId].d += 1;
              rows[hId].pts += 1;

              rows[aId].d += 1;
              rows[aId].pts += 1;
            }
          }
        }
      }
    }

    // 3. Sort by Points desc, Goal Difference desc, Goals For desc, Alphabetical asc
    return Object.values(rows).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.name.localeCompare(b.name);
    });
  }, [nationalTeams, includePrediction, prediction, isMatchNational, homeTeam.id, awayTeam.id]);

  // Assign global ranks and filter them based on search and region selection
  const filteredStandings = useMemo(() => {
    // Add globalRank based on sorted total array
    const ranked = standings.map((item, index) => ({
      ...item,
      globalRank: index + 1
    }));

    return ranked.filter((item) => {
      // Filter by Region
      const regionMatch = selectedRegion === "ALL" || TEAM_REGIONS[item.id] === selectedRegion;
      
      // Filter by Search Query
      const searchMatch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.shortName.toLowerCase().includes(searchQuery.toLowerCase());

      return regionMatch && searchMatch;
    });
  }, [standings, searchQuery, selectedRegion]);

  // Extract match outcome text for reporting card
  const matchOutcomeDetail = useMemo(() => {
    if (!prediction) return null;
    const scoreParts = prediction.predictedScore.split(" - ");
    if (scoreParts.length !== 2) return null;

    const hGoals = parseInt(scoreParts[0], 10);
    const aGoals = parseInt(scoreParts[1], 10);
    if (isNaN(hGoals) || isNaN(aGoals)) return null;

    if (hGoals > aGoals) {
      return {
        winnerId: homeTeam.id,
        wName: homeTeam.name,
        wLogo: homeTeam.logo,
        lName: awayTeam.name,
        lLogo: awayTeam.logo,
        ptsAdded: 3,
        text: `${homeTeam.name} (${homeTeam.shortName}) wins the simulation ${prediction.predictedScore}, earning +3 points.`,
      };
    } else if (hGoals < aGoals) {
      return {
        winnerId: awayTeam.id,
        wName: awayTeam.name,
        wLogo: awayTeam.logo,
        lName: homeTeam.name,
        lLogo: homeTeam.logo,
        ptsAdded: 3,
        text: `${awayTeam.name} (${awayTeam.shortName}) wins the simulation ${prediction.predictedScore}, earning +3 points.`,
      };
    } else {
      return {
        winnerId: null,
        text: `The match ends in a ${prediction.predictedScore} draw. Both team records receive +1 point and +1 game played.`,
      };
    }
  }, [prediction, homeTeam, awayTeam]);

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-md space-y-5">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/85">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500 fill-amber-500/20" />
          <h3 className="font-semibold text-sm text-slate-200 font-display">
            World Cup 2026 Contenders & Standings
          </h3>
        </div>
        
        {isMatchNational ? (
          <div className="flex items-center gap-1.5 self-start">
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includePrediction}
                onChange={(e) => setIncludePrediction(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-7 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-350 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white peer-checked:after:border-emerald-600"></div>
              <span className="ml-1.5 text-[10px] sm:text-xs font-mono text-slate-400">
                Simulate Match Impact
              </span>
            </label>
          </div>
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-850 font-mono">
            Baseline Simulation Mode
          </span>
        )}
      </div>

      {/* BANNER FOR ACTIVE SIMULATION STATUS */}
      {isMatchNational ? (
        <div className={`p-3.5 rounded-xl border flex flex-col md:flex-row items-start md:items-center gap-3 transition-colors ${
          includePrediction 
            ? "bg-slate-950/40 border-indigo-500/30" 
            : "bg-slate-950/25 border-slate-800/60"
        }`}>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1 space-y-0.5">
            <p className="text-xs font-semibold font-display text-slate-200">
              {includePrediction ? "🟢 Live Group Standings Simulating Match Impact" : "⚪ Showcasing Baseline Standings (Offline)"}
            </p>
            <p className="text-[11px] text-slate-400">
              {includePrediction && matchOutcomeDetail 
                ? matchOutcomeDetail.text 
                : "Match impact is currently disabled. Enable to see prediction results inject live points."}
            </p>
          </div>
          {includePrediction && (
            <span className="text-[10px] font-mono font-bold text-center px-2 py-0.5 bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 uppercase rounded-full tracking-wider">
              Live +1 Match
            </span>
          )}
        </div>
      ) : (
        <div className="bg-slate-950/40 border border-slate-800 p-3.5 rounded-xl flex items-start gap-3">
          <Info className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-350 font-display">Simulate Championship Standings</p>
            <p className="text-[11px] text-slate-500 leading-normal">
              Selecting two national contenders (e.g. <span className="text-slate-300">Argentina 🇦🇷</span> & <span className="text-slate-300">United States 🇺🇸</span>) lets you inject the simulated match outcome directly into this mock league standings table!
            </p>
          </div>
        </div>
      )}

      {/* FILTERS & SEARCH CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/30 p-3 rounded-xl border border-slate-800/60">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-slate-500" />
          </span>
          <input
            type="text"
            placeholder="Search teams by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 text-xs text-white rounded-lg pl-9 pr-3.5 py-2 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none transition placeholder-slate-500"
          />
        </div>

        {/* Region Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: "ALL", label: "All Regions" },
            { id: "UEFA", label: "UEFA 🇪🇺" },
            { id: "CONMEBOL", label: "CONMEBOL 🌎" },
            { id: "CONCACAF", label: "CONCACAF 🦅" },
            { id: "AFC", label: "AFC 🌏" },
            { id: "CAF", label: "CAF 🦁" },
            { id: "OFC", label: "OFC 🥝" },
          ].map((region) => (
            <button
              key={region.id}
              onClick={() => setSelectedRegion(region.id)}
              className={`px-2.5 py-1.5 text-[10px] font-mono font-medium rounded-md transition-all ${
                selectedRegion === region.id
                  ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                  : "bg-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {region.label}
            </button>
          ))}
        </div>
      </div>

      {/* STANDINGS TABLE */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/70">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider bg-slate-950">
              <th className="py-3 px-4 text-center w-12">Rk</th>
              <th className="py-3 px-3">Team</th>
              <th className="py-3 px-3 text-center">GP</th>
              <th className="py-3 px-2 text-center hidden sm:table-cell">W</th>
              <th className="py-3 px-2 text-center hidden sm:table-cell">D</th>
              <th className="py-3 px-2 text-center hidden sm:table-cell">L</th>
              <th className="py-3 px-3 text-center">GD</th>
              <th className="py-3 px-4 text-right">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850/50 text-xs">
            {filteredStandings.length > 0 ? (
              filteredStandings.map((row) => {
                const isSelectedHome = row.id === homeTeam.id;
                const isSelectedAway = row.id === awayTeam.id;
                const isSelected = isSelectedHome || isSelectedAway;

                return (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      isSelected
                        ? "bg-slate-800/20 font-medium"
                        : "hover:bg-slate-900/30"
                    }`}
                    style={
                      isSelected
                        ? { borderLeft: `3px solid ${isSelectedHome ? homeTeam.color : awayTeam.color}` }
                        : undefined
                    }
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md font-mono font-bold text-[11px] ${
                        row.globalRank === 1
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : row.globalRank === 2
                          ? "bg-slate-350/10 text-slate-300 border border-slate-300/20"
                          : row.globalRank === 3
                          ? "bg-orange-500/10 text-orange-400 border border-orange-400/20"
                          : "text-slate-400"
                      }`}>
                        {row.globalRank}
                      </span>
                    </td>

                    {/* Team Logo & Flags */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg leading-none" role="img" aria-label={row.name}>
                          {row.logo}
                        </span>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-200 font-display">
                              {row.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1 py-0.2 rounded">
                              {row.shortName}
                            </span>
                          </div>
                          {isSelected && (
                            <span 
                              style={{ color: isSelectedHome ? homeTeam.color : awayTeam.color }} 
                              className="text-[9px] font-mono font-bold uppercase tracking-wider mt-0.5"
                            >
                              {isSelectedHome ? "Selected Home Target" : "Selected Away Target"}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Games Played */}
                    <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                      {row.gp}
                    </td>

                    {/* Wins */}
                    <td className="py-3.5 px-2 text-center font-mono text-slate-400 hidden sm:table-cell">
                      {row.w}
                    </td>

                    {/* Draws */}
                    <td className="py-3.5 px-2 text-center font-mono text-slate-400 hidden sm:table-cell">
                      {row.d}
                    </td>

                    {/* Loss */}
                    <td className="py-3.5 px-2 text-center font-mono text-slate-400 hidden sm:table-cell">
                      {row.l}
                    </td>

                    {/* Goal Difference */}
                    <td className="py-3.5 px-3 text-center">
                      <span className={`font-mono font-semibold ${
                        row.gd > 0 
                          ? "text-emerald-400" 
                          : row.gd < 0 
                          ? "text-rose-400" 
                          : "text-slate-400"
                      }`}>
                        {row.gd > 0 ? `+${row.gd}` : row.gd}
                      </span>
                    </td>

                    {/* Points */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono text-sm font-extrabold text-white">
                        {row.pts}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="py-8 text-center text-xs text-slate-500 font-mono">
                  No matching World Cup contenders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER REMINDER INFO */}
      <p className="text-[10px] font-mono text-slate-500 text-center leading-normal">
        *Group Stage Standings are computed under simulated match conditions. Total points, goal difference, and record parameters simulate real-world match outcomes based on live algorithmic regressions.
      </p>
    </div>
  );
};
