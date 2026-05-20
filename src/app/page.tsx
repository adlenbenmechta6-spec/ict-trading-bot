'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, TrendingUp, BarChart3, Search, Bot, User, Zap, AlertTriangle, ChevronDown, Clock, CalendarDays, X,
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Canvas
const TradingViewChart = dynamic(() => import('@/components/TradingViewChart'), { ssr: false });

// ─── Trading Modes & Timeframes ─────────────────────────────────────
type TradingMode = 'swing' | 'daytrading' | 'scalping' | 'fundednext';

interface TradingModeConfig {
  id: TradingMode;
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
  timeframes: string[];
  defaultTF: string;
  holdTime: string;
}

const TRADING_MODES: TradingModeConfig[] = [
  {
    id: 'swing',
    label: 'Swing Trading',
    shortLabel: 'Swing',
    emoji: '📅',
    description: '1-7 days',
    timeframes: ['H4', 'D1'],
    defaultTF: 'H4',
    holdTime: '1-7 days',
  },
  {
    id: 'daytrading',
    label: 'Day Trading',
    shortLabel: 'Day',
    emoji: '📊',
    description: 'Same day',
    timeframes: ['M15', 'M30', 'H1'],
    defaultTF: 'M30',
    holdTime: 'Min - Hours',
  },
  {
    id: 'scalping',
    label: 'Scalping',
    shortLabel: 'Scalp',
    emoji: '⚡',
    description: 'Advanced',
    timeframes: ['M1', 'M5'],
    defaultTF: 'M5',
    holdTime: 'Sec - Min',
  },
  {
    id: 'fundednext',
    label: 'FundedNext 6K',
    shortLabel: 'Funded',
    emoji: '🏆',
    description: 'Stellar 2-Step',
    timeframes: ['H4', 'D1'],
    defaultTF: 'H4',
    holdTime: '1-7 days',
  },
];

// Types
interface ChartData {
  pair: string;
  timeframe: string;
  currentPrice: number;
  high: number;
  low: number;
  type: 'BUY' | 'SELL';
  entry: number;
  tp1: number;
  tp2: number;
  sl: number;
  confidence: number;
  riskReward: string;
  pattern: string;
  killZone: string;
  liquidityType: string;
  pdZone: string;
  ictElements: string[];
  changePercent: number;
  candles?: Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }>;
  dataSource?: string;
  dataDelay?: string;
  priceQuality?: 'realtime' | 'near-realtime' | 'delayed' | 'stale';
  delayMinutes?: number;
  isRealtime?: boolean;
  priceSource?: string;
  recommendedStyle?: { style: string; reason: string; warning?: string };
  scalpingWarning?: string | null;
  exitManagement?: {
    breakevenPrice: number;
    earlyBETrigger: number;
    partialClose1Pct: number;
    partialClose2Pct: number;
    trailingStopSteps: Array<{ triggerPrice: number; newSL: number; reason: string }>;
    exitRules: string[];
  };
}

interface SignalData {
  type: 'BUY' | 'SELL';
  pair: string;
  timeframe: string;
  entry: number;
  tp1: number;
  tp2: number;
  sl: number;
  pattern: string;
  rsi: number;
  rsiStatus: string;
  macd: string;
  maCross: string;
  confidence: number;
  riskReward: string;
  ictElements: string[];
  killZone: string;
  liquidityType: string;
  pdZone: string;
  analysis?: string;
  chartData?: ChartData;
}

interface ChatMessage {
  id: string;
  type: 'bot' | 'user' | 'signal' | 'analysis' | 'scan' | 'system';
  content: string;
  timestamp: Date;
  signalData?: SignalData;
  scanData?: Array<{ pair: string; name: string; currentPrice: number; trend: string; opportunity: string; score: number }>;
  scanSummary?: string;
  chartData?: ChartData;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

const TRADING_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'XAG/USD', 'BTC/USD', 'ETH/USD',
  'US30', 'NAS100', 'GBP/JPY', 'AUD/USD',
];

// Mode badge colors for SignalCard
const MODE_BADGE: Record<TradingMode, string> = {
  swing: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20',
  daytrading: 'bg-blue-500/20 text-blue-300 border-blue-500/20',
  scalping: 'bg-orange-500/20 text-orange-300 border-orange-500/20',
  fundednext: 'bg-purple-500/20 text-purple-300 border-purple-500/20',
};

// ─── Signal Card ─────────────────────────────────────────────────────
function SignalCard({ signal, mode }: { signal: SignalData; mode: TradingMode }) {
  return (
    <div className={`rounded-xl overflow-hidden border ${
      signal.type === 'BUY' ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-red-500/30 bg-red-950/20'
    }`}>
      <div className={`px-4 py-2 flex items-center justify-between ${
        signal.type === 'BUY' ? 'bg-emerald-600/20' : 'bg-red-600/20'
      }`}>
        <div className="flex items-center gap-2">
          <TrendingUp className={`w-5 h-5 ${signal.type === 'BUY' ? 'text-emerald-400' : 'text-red-400 rotate-180'}`} />
          <span className={`font-bold text-lg ${signal.type === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
            {signal.type === 'BUY' ? '🟢 BUY' : '🔴 SELL'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${MODE_BADGE[mode]}`}>
            {TRADING_MODES.find(m => m.id === mode)?.emoji} {TRADING_MODES.find(m => m.id === mode)?.label}
          </span>
          <span className="text-xs text-gray-400 font-mono">{signal.timeframe}</span>
        </div>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-white font-bold text-xl">{signal.pair}</span>
          <span className="text-gray-400 text-sm">Entry: <span className="text-white font-mono">{signal.entry}</span></span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-black/20 rounded-lg p-2 text-center">
            <div className="text-xs text-gray-400 mb-1">TP 1</div>
            <div className="text-emerald-400 font-mono font-bold">{signal.tp1}</div>
          </div>
          <div className="bg-black/20 rounded-lg p-2 text-center">
            <div className="text-xs text-gray-400 mb-1">TP 2</div>
            <div className="text-emerald-400 font-mono font-bold">{signal.tp2}</div>
          </div>
          <div className="bg-black/20 rounded-lg p-2 text-center">
            <div className="text-xs text-gray-400 mb-1">Stop Loss</div>
            <div className="text-red-400 font-mono font-bold">{signal.sl}</div>
          </div>
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">🕯️</span>
            <span className="text-gray-300">Pattern:</span>
            <span className="text-yellow-300 font-semibold">{signal.pattern}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-400">📊</span>
            <span className="text-gray-300">RSI:</span>
            <span className="text-blue-300">{signal.rsiStatus}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-400">📈</span>
            <span className="text-gray-300">MACD:</span>
            <span className="text-purple-300">{signal.macd}</span>
          </div>
        </div>
        {signal.ictElements && signal.ictElements.length > 0 && (
          <div className="pt-2 border-t border-white/10">
            <div className="text-xs text-amber-400 font-semibold mb-1.5">🏦 ICT:</div>
            <div className="flex flex-wrap gap-1">
              {signal.ictElements.map((el, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-xs border border-amber-500/20">{el}</span>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs">
              {signal.killZone && <span className="text-cyan-300">⏰ {signal.killZone}</span>}
              {signal.liquidityType && <span className="text-pink-300">💧 {signal.liquidityType}</span>}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-gray-300 text-sm">Confidence:</span>
            <div className="flex items-center gap-1">
              <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${signal.confidence >= 75 ? 'bg-emerald-400' : signal.confidence >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${signal.confidence}%` }} />
              </div>
              <span className={`font-bold text-sm ${signal.confidence >= 75 ? 'text-emerald-400' : signal.confidence >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{signal.confidence}%</span>
            </div>
          </div>
          <span className="text-white font-mono font-bold text-sm">R:R {signal.riskReward}</span>
        </div>
        {signal.chartData && (
          <div className="pt-2 border-t border-white/10">
            <div className="text-xs text-gray-400 mb-1.5">📊 Live Chart Analysis:</div>
            <TradingViewChart data={signal.chartData} />
          </div>
        )}
        {/* Data Quality & Trading Style */}
        {signal.chartData && (signal.chartData.priceQuality || signal.chartData.recommendedStyle) && (
          <div className="pt-2 border-t border-white/10">
            <div className={`rounded-lg border overflow-hidden ${
              signal.chartData.priceQuality === 'realtime' ? 'border-emerald-500/30' :
              signal.chartData.priceQuality === 'near-realtime' ? 'border-yellow-500/30' :
              signal.chartData.priceQuality === 'delayed' ? 'border-orange-500/30' :
              signal.chartData.priceQuality === 'stale' ? 'border-red-500/30' :
              'border-white/10'
            }`}>
              {/* Header bar */}
              <div className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 ${
                signal.chartData.priceQuality === 'realtime' ? 'bg-emerald-600/20 text-emerald-400' :
                signal.chartData.priceQuality === 'near-realtime' ? 'bg-yellow-600/20 text-yellow-400' :
                signal.chartData.priceQuality === 'delayed' ? 'bg-orange-600/20 text-orange-400' :
                signal.chartData.priceQuality === 'stale' ? 'bg-red-600/20 text-red-400' :
                'bg-white/5 text-gray-400'
              }`}>
                🛡️ Data Quality & Trading Style
              </div>
              <div className={`px-3 py-2.5 space-y-2 text-xs ${
                signal.chartData.priceQuality === 'realtime' ? 'bg-emerald-950/30' :
                signal.chartData.priceQuality === 'near-realtime' ? 'bg-yellow-950/20' :
                signal.chartData.priceQuality === 'delayed' ? 'bg-orange-950/20' :
                signal.chartData.priceQuality === 'stale' ? 'bg-red-950/20' :
                'bg-black/20'
              }`}>
                {/* Price Source & Quality Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">Source:</span>
                    <span className="text-gray-200 font-medium">{signal.chartData.priceSource || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      signal.chartData.priceQuality === 'realtime' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      signal.chartData.priceQuality === 'near-realtime' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                      signal.chartData.priceQuality === 'delayed' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                      signal.chartData.priceQuality === 'stale' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      {signal.chartData.isRealtime ? '⚡ Real-time' : signal.chartData.priceQuality === 'near-realtime' ? 'Near Real-time' : signal.chartData.priceQuality === 'delayed' ? 'Delayed' : signal.chartData.priceQuality === 'stale' ? 'Stale' : 'Unknown'}
                    </span>
                    <span className={`font-mono font-bold ${
                      signal.chartData.isRealtime ? 'text-emerald-400' :
                      (signal.chartData.delayMinutes && signal.chartData.delayMinutes > 5) ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {signal.chartData.isRealtime ? 'Live' : signal.chartData.delayMinutes ? `~${signal.chartData.delayMinutes}min` : 'N/A'}
                    </span>
                  </div>
                </div>
                {/* Recommended Trading Style */}
                {signal.chartData.recommendedStyle && (
                  <div className="pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Recommended:</span>
                      <span className={`font-bold ${
                        signal.chartData.recommendedStyle.style === 'swing' ? 'text-emerald-400' :
                        signal.chartData.recommendedStyle.style === 'daytrading' ? 'text-blue-400' :
                        'text-orange-400'
                      }`}>
                        {signal.chartData.recommendedStyle.style === 'swing' ? '✅ Swing Trading' :
                         signal.chartData.recommendedStyle.style === 'daytrading' ? '⚡ Day Trading' :
                         signal.chartData.recommendedStyle.style === 'scalping' ? '🔥 Scalping' :
                         signal.chartData.recommendedStyle.style}
                      </span>
                    </div>
                    <div className="text-gray-400 mt-0.5 leading-relaxed">{signal.chartData.recommendedStyle.reason}</div>
                  </div>
                )}
                {/* Warning */}
                {(signal.chartData.scalpingWarning || signal.chartData.recommendedStyle?.warning) && (
                  <div className="pt-2 border-t border-white/5">
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                      <div className="text-orange-300 font-medium leading-relaxed">
                        {signal.chartData.scalpingWarning || signal.chartData.recommendedStyle?.warning}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Exit Management - Breakeven & Trailing Stop Rules */}
        {signal.chartData?.exitManagement && (
          <div className="pt-2 border-t border-white/10">
            <div className="rounded-lg border border-cyan-500/30 overflow-hidden">
              <div className="px-3 py-1.5 bg-cyan-600/20 text-xs font-bold flex items-center gap-1.5 text-cyan-400">
                📋 Exit Management — Protect Your Profits!
              </div>
              <div className="px-3 py-2.5 space-y-2 text-xs bg-cyan-950/20">
                {/* BE + Partial Close */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/20 rounded-lg p-2">
                    <div className="text-gray-400 mb-0.5">Breakeven Price</div>
                    <div className="text-cyan-300 font-mono font-bold">{signal.chartData.exitManagement.breakevenPrice}</div>
                    <div className="text-gray-500 text-[10px]">Move SL here after TP1</div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2">
                    <div className="text-gray-400 mb-0.5">Early BE Trigger</div>
                    <div className="text-yellow-300 font-mono font-bold">{signal.chartData.exitManagement.earlyBETrigger}</div>
                    <div className="text-gray-500 text-[10px]">Move SL to BE at this price</div>
                  </div>
                </div>
                {/* Partial Close Rules */}
                <div className="flex items-center gap-3 bg-black/20 rounded-lg p-2">
                  <div className="text-center flex-1">
                    <div className="text-gray-400 text-[10px]">Close at TP1</div>
                    <div className="text-emerald-400 font-bold">{signal.chartData.exitManagement.partialClose1Pct}%</div>
                  </div>
                  <div className="text-gray-600">→</div>
                  <div className="text-center flex-1">
                    <div className="text-gray-400 text-[10px]">Move SL to</div>
                    <div className="text-cyan-400 font-bold font-mono">{signal.chartData.exitManagement.breakevenPrice}</div>
                  </div>
                  <div className="text-gray-600">→</div>
                  <div className="text-center flex-1">
                    <div className="text-gray-400 text-[10px]">Close at TP2</div>
                    <div className="text-emerald-400 font-bold">{signal.chartData.exitManagement.partialClose2Pct}%</div>
                  </div>
                </div>
                {/* Trailing Stop Steps */}
                {signal.chartData.exitManagement.trailingStopSteps.length > 0 && (
                  <div className="pt-1 border-t border-white/5">
                    <div className="text-gray-400 mb-1">Trailing Stop Steps:</div>
                    <div className="space-y-1">
                      {signal.chartData.exitManagement.trailingStopSteps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px]">
                          <span className="text-cyan-500 font-mono w-4">{i + 1}.</span>
                          <span className="text-gray-300">Price → <span className="text-white font-mono">{step.triggerPrice}</span></span>
                          <span className="text-gray-500">|</span>
                          <span className="text-gray-300">Trail SL → <span className="text-cyan-300 font-mono">{step.newSL}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Critical Warning */}
                <div className="flex items-start gap-1.5 pt-1 border-t border-white/5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-red-300 font-medium text-[11px] leading-relaxed">
                    NEVER let a winning trade turn into a loser! Take 50% at TP1, move SL to breakeven, then trail the rest.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {signal.analysis && (
          <div className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed pt-2 border-t border-white/10">
            {signal.analysis}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Scan Card ───────────────────────────────────────────────────────
function ScanCard({ results, summary }: { results: ChatMessage['scanData']; summary: string }) {
  if (!results) return null;
  return (
    <div className="rounded-xl overflow-hidden border border-purple-500/30 bg-purple-950/20">
      <div className="px-4 py-2 bg-purple-600/20 flex items-center gap-2">
        <Search className="w-5 h-5 text-purple-400" />
        <span className="text-purple-400 font-bold">🔍 Market Scan</span>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">{summary}</div>
        <div className="space-y-2">
          {results.slice(0, 5).map((r, i) => (
            <div key={i} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm font-mono">{i + 1}.</span>
                <span className="text-white font-semibold text-sm">{r.pair}</span>
                <span className="text-gray-400 text-xs font-mono">{r.currentPrice}</span>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                r.score >= 70 ? 'bg-emerald-500/20 text-emerald-300' : r.score >= 50 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-gray-500/20 text-gray-400'
              }`}>{r.opportunity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Typing Indicator ────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-2.5 my-1.5">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-[#182533] rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 text-xs">Analyzing market</span>
          <div className="flex gap-1">
            <motion.div className="w-1.5 h-1.5 rounded-full bg-blue-400" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
            <motion.div className="w-1.5 h-1.5 rounded-full bg-blue-400" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }} />
            <motion.div className="w-1.5 h-1.5 rounded-full bg-blue-400" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────
function MessageBubble({ msg, mode }: { msg: ChatMessage; mode: TradingMode }) {
  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-white/5 rounded-full px-4 py-1.5 text-xs text-gray-400">{msg.content}</div>
      </div>
    );
  }

  if (msg.type === 'signal' && msg.signalData) {
    return (
      <div className="flex gap-2.5 my-2 max-w-[95%]">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-400 text-sm font-semibold">ICT Pro Bot</span>
            <span className="text-gray-500 text-xs">{formatTime(msg.timestamp)}</span>
          </div>
          <SignalCard signal={msg.signalData} mode={mode} />
        </div>
      </div>
    );
  }

  if (msg.type === 'scan' && msg.scanData) {
    return (
      <div className="flex gap-2.5 my-2 max-w-[95%]">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-400 text-sm font-semibold">ICT Pro Bot</span>
            <span className="text-gray-500 text-xs">{formatTime(msg.timestamp)}</span>
          </div>
          <ScanCard results={msg.scanData} summary={msg.scanSummary || msg.content} />
        </div>
      </div>
    );
  }

  if (msg.type === 'user') {
    return (
      <div className="flex gap-2.5 my-1.5 justify-end">
        <div className="max-w-[75%]">
          <div className="bg-[#2b5278] rounded-2xl rounded-tl-sm px-4 py-2.5">
            <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
          </div>
          <div className="text-right mt-0.5"><span className="text-gray-500 text-xs">{formatTime(msg.timestamp)}</span></div>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-green-600 flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    );
  }

  // Bot message (default + analysis with optional chart)
  return (
    <div className="flex gap-2.5 my-1.5 max-w-[90%]">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-blue-400 text-sm font-semibold">ICT Pro Bot</span>
          <span className="text-gray-500 text-xs">{formatTime(msg.timestamp)}</span>
        </div>
        <div className="bg-[#182533] rounded-2xl rounded-tl-sm px-4 py-3">
          <p className="text-gray-100 text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
        </div>
        {msg.chartData && (
          <div className="mt-2">
            <TradingViewChart data={msg.chartData} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Initial Messages ────────────────────────────────────────────────
const initialMessages: ChatMessage[] = [
  {
    id: generateId(),
    type: 'system',
    content: 'Welcome to ICT Pro Bot 🤖📊',
    timestamp: new Date(Date.now() - 120000),
  },
  {
    id: generateId(),
    type: 'bot',
    content: `Hey there! 👋 I'm ICT Pro Bot — your professional trading assistant.

I combine two powerful methodologies:
🕯️ Japanese Candlesticks (Fred K.H. Tam's book)
🏦 ICT Smart Money (Ayub Rana's book)

📊 My prices come directly from TradingView
🔍 I analyze as if I'm reading a TradingView chart

📅 Swing Trading — H4/D1 (1-7 days)
📊 Day Trading — M15/M30/H1 (same day)
⚡ Scalping — M1/M5 (seconds-minutes)
🏆 FundedNext 6K — Strict rules for prop firm challenge

Choose your style in the header, then use the buttons below!
⚠️ Trading involves risk — these are educational analyses`,
    timestamp: new Date(Date.now() - 60000),
  },
];

// ─── Main Page ───────────────────────────────────────────────────────
export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showPairSelector, setShowPairSelector] = useState(false);
  const [selectedPair, setSelectedPair] = useState('XAU/USD');
  const [tradingMode, setTradingMode] = useState<TradingMode>('swing');
  const [selectedTimeframe, setSelectedTimeframe] = useState('H4');
  const [showGuide, setShowGuide] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Close pair selector when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-pair-selector]')) {
        setShowPairSelector(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // When mode changes, reset timeframe to default
  const handleModeChange = useCallback((newMode: TradingMode) => {
    const modeConfig = TRADING_MODES.find(m => m.id === newMode)!;
    setTradingMode(newMode);
    setSelectedTimeframe(modeConfig.defaultTF);
  }, []);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = { ...msg, id: generateId(), timestamp: new Date() };
    setMessages(prev => [...prev, newMsg]);
    return newMsg;
  }, []);

  const simulateTyping = useCallback((callback: () => void, minDelay = 1500, maxDelay = 3000) => {
    setIsTyping(true);
    const delay = Math.random() * (maxDelay - minDelay) + minDelay;
    setTimeout(() => { setIsTyping(false); callback(); }, delay);
  }, []);

  // Get signal
  const handleGetSignal = useCallback(async (pair?: string) => {
    const targetPair = pair || selectedPair;
    const modeLabel = TRADING_MODES.find(m => m.id === tradingMode)?.label || 'Swing';
    addMessage({ type: 'user', content: `📊 Give me a ${modeLabel} signal for ${targetPair} (${selectedTimeframe})` });
    simulateTyping(async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);
        const res = await fetch('/api/trading/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pair: targetPair, timeframe: selectedTimeframe, mode: tradingMode }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await res.json();
        if (data.success && data.signal) {
          addMessage({ type: 'signal', content: '', signalData: data.signal });
        } else {
          addMessage({ type: 'bot', content: `❌ ${data.error || 'Could not generate a signal. Please try again.'}` });
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          addMessage({ type: 'bot', content: '⏱️ Request timed out. The market is taking too long to respond. Please try again.' });
        } else {
          addMessage({ type: 'bot', content: '❌ Connection error. Please try again.' });
        }
      }
    }, 1000, 2000);
  }, [selectedPair, selectedTimeframe, tradingMode, addMessage, simulateTyping]);

  // Analyze pair
  const handleAnalyze = useCallback(async (pair?: string) => {
    const targetPair = pair || selectedPair;
    const modeLabel = TRADING_MODES.find(m => m.id === tradingMode)?.label || 'Swing';
    addMessage({ type: 'user', content: `🔍 ${modeLabel} analysis for ${targetPair} (${selectedTimeframe})` });
    simulateTyping(async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);
        const res = await fetch('/api/trading/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pair: targetPair, timeframe: selectedTimeframe, mode: tradingMode }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await res.json();
        if (data.success && data.aiAnalysis) {
          const chartData: ChartData | undefined = data.chartData;
          addMessage({ type: 'analysis', content: data.aiAnalysis, chartData });
        } else {
          addMessage({ type: 'bot', content: `❌ ${data.error || 'Analysis failed.'}` });
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          addMessage({ type: 'bot', content: '⏱️ Request timed out. Please try again.' });
        } else {
          addMessage({ type: 'bot', content: '❌ Connection error. Please try again.' });
        }
      }
    }, 1000, 2000);
  }, [selectedPair, selectedTimeframe, tradingMode, addMessage, simulateTyping]);

  // Market scan
  const handleScan = useCallback(async () => {
    addMessage({ type: 'user', content: '🔍 Scan the market' });
    simulateTyping(async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const res = await fetch('/api/trading/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}), signal: controller.signal });
        clearTimeout(timeout);
        const data = await res.json();
        if (data.success) {
          addMessage({ type: 'scan', content: '', scanData: data.results, scanSummary: data.aiSummary });
        } else {
          addMessage({ type: 'bot', content: `❌ ${data.error || 'Scan failed.'}` });
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          addMessage({ type: 'bot', content: '⏱️ Scan timed out. Please try again.' });
        } else {
          addMessage({ type: 'bot', content: '❌ Connection error. Please try again.' });
        }
      }
    }, 1000, 2000);
  }, [addMessage, simulateTyping]);

  // Send chat message
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isTyping) return;
    const msg = inputValue.trim();
    setInputValue('');

    addMessage({ type: 'user', content: msg });

    // Quick command detection
    if (msg.toLowerCase().includes('signal') || msg.toLowerCase().includes('trade')) {
      const pairMatch = msg.match(/(EUR\/USD|GBP\/USD|USD\/JPY|XAU\/USD|BTC\/USD|ETH\/USD|US30|NAS100|GBP\/JPY|AUD\/USD)/i);
      handleGetSignal(pairMatch ? pairMatch[1].toUpperCase() : undefined);
      return;
    }
    if (msg.toLowerCase().includes('analyze') || msg.toLowerCase().includes('analysis')) {
      const pairMatch = msg.match(/(EUR\/USD|GBP\/USD|USD\/JPY|XAU\/USD|BTC\/USD|ETH\/USD|US30|NAS100|GBP\/JPY|AUD\/USD)/i);
      handleAnalyze(pairMatch ? pairMatch[1].toUpperCase() : undefined);
      return;
    }
    if (msg.toLowerCase().includes('scan') || msg.toLowerCase().includes('market')) {
      handleScan();
      return;
    }

    simulateTyping(async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);
        const res = await fetch('/api/trading/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await res.json();
        if (data.success && data.response) {
          addMessage({ type: 'bot', content: data.response });
        } else {
          addMessage({ type: 'bot', content: '❌ Could not respond. Please try again.' });
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          addMessage({ type: 'bot', content: '⏱️ Request timed out. Please try again.' });
        } else {
          addMessage({ type: 'bot', content: '❌ Connection error. Please try again.' });
        }
      }
    }, 1000, 2000);
  }, [inputValue, isTyping, addMessage, simulateTyping, handleGetSignal, handleAnalyze, handleScan]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const currentMode = TRADING_MODES.find(m => m.id === tradingMode)!;

  // Mode button styles
  const getModeBtnClass = (modeId: TradingMode, isActive: boolean) => {
    const base = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border whitespace-nowrap';
    if (!isActive) return `${base} bg-white/5 text-gray-400 border-white/10 hover:bg-white/10`;
    switch (modeId) {
      case 'swing': return `${base} bg-emerald-600/30 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/10`;
      case 'daytrading': return `${base} bg-blue-600/30 text-blue-300 border-blue-500/40 shadow-lg shadow-blue-500/10`;
      case 'scalping': return `${base} bg-orange-600/30 text-orange-300 border-orange-500/40 shadow-lg shadow-orange-500/10`;
      case 'fundednext': return `${base} bg-purple-600/30 text-purple-300 border-purple-500/40 shadow-lg shadow-purple-500/10`;
    }
  };

  // Timeframe button styles
  const getTfBtnClass = (tf: string, isActive: boolean) => {
    const base = 'px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer';
    if (!isActive) return `${base} bg-white/5 text-gray-400 hover:bg-white/10`;
    switch (tradingMode) {
      case 'swing': return `${base} bg-emerald-600/40 text-emerald-300`;
      case 'daytrading': return `${base} bg-blue-600/40 text-blue-300`;
      case 'scalping': return `${base} bg-orange-600/40 text-orange-300`;
      case 'fundednext': return `${base} bg-purple-600/40 text-purple-300`;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0e1621]">
      {/* Header */}
      <header className="flex-shrink-0 bg-[#17212b] border-b border-white/5 px-3 py-2 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#17212b]" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm">ICT Pro Bot 🤖</h1>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 text-xs">Online</span>
                <span className="text-gray-500 text-xs">• TradingView</span>
              </div>
            </div>
          </div>

          {/* Pair Selector */}
          <div className="relative" data-pair-selector>
            <button
              onClick={() => setShowPairSelector(!showPairSelector)}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 rounded-lg px-3 py-1.5 text-gray-300 text-sm transition-colors"
            >
              <span className="font-mono font-bold">{selectedPair}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <AnimatePresence>
              {showPairSelector && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute right-0 top-full mt-1 bg-[#17212b] border border-white/10 rounded-lg shadow-xl z-50 py-1 min-w-[140px] max-h-64 overflow-y-auto"
                >
                  {TRADING_PAIRS.map(pair => (
                    <button
                      key={pair}
                      onClick={() => { setSelectedPair(pair); setShowPairSelector(false); }}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-white/5 transition-colors ${pair === selectedPair ? 'text-blue-400 bg-white/5' : 'text-gray-300'}`}
                    >
                      {pair}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Mode & Timeframe Selector Bar — ALWAYS VISIBLE, DIRECT BUTTONS */}
      <div className="flex-shrink-0 bg-[#0e1621] border-b border-white/5 px-3 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Buttons — Direct click, no dropdown */}
          <div className="flex items-center gap-1.5">
            {TRADING_MODES.map(m => (
              <button
                key={m.id}
                onClick={() => handleModeChange(m.id)}
                className={getModeBtnClass(m.id, tradingMode === m.id)}
              >
                {m.emoji} {m.shortLabel}
              </button>
            ))}
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Separator 2 */}
          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Trading Guide Button */}
          <button
            onClick={() => setShowGuide(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border whitespace-nowrap bg-amber-600/20 text-amber-300 border-amber-500/30 hover:bg-amber-600/30"
          >
            📖 دليل التداول
          </button>

          {/* Timeframe Buttons — Change based on selected mode */}
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-gray-500 mr-0.5" />
            {currentMode.timeframes.map(tf => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={getTfBtnClass(tf, selectedTimeframe === tf)}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Hold time indicator */}
          <span className="text-gray-500 text-xs">
            ⏱ {currentMode.holdTime}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2b3a4a transparent' }}>
        <div className="flex justify-center my-3">
          <div className="bg-black/30 rounded-full px-3 py-1 text-xs text-gray-400">Today</div>
        </div>
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} mode={tradingMode} />)}
        <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="flex-shrink-0 px-3 py-2 border-t border-white/5 bg-[#0e1621]">
        <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <button onClick={() => handleGetSignal()} disabled={isTyping} className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-50 border border-emerald-500/20">
            <TrendingUp className="w-3.5 h-3.5" /> Signal
          </button>
          <button onClick={() => handleAnalyze()} disabled={isTyping} className="flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-50 border border-blue-500/20">
            <BarChart3 className="w-3.5 h-3.5" /> Analyze
          </button>
          <button onClick={handleScan} disabled={isTyping} className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-50 border border-purple-500/20">
            <Search className="w-3.5 h-3.5" /> Scan
          </button>
          <button onClick={() => { setInputValue('What is an Order Block?'); }} disabled={isTyping} className="flex items-center gap-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-50 border border-amber-500/20">
            🏦 OB
          </button>
          <button onClick={() => { setInputValue('What is a Fair Value Gap (FVG)?'); }} disabled={isTyping} className="flex items-center gap-1.5 bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-50 border border-pink-500/20">
            💧 FVG
          </button>
          <button onClick={() => { setInputValue('Explain Kill Zones and Silver Bullet'); }} disabled={isTyping} className="flex items-center gap-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-50 border border-cyan-500/20">
            ⏰ KZ
          </button>
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-[#17212b] px-4 py-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your question or analysis request..."
            className="flex-1 bg-[#0e1621] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
            disabled={isTyping}
          />
          <button onClick={handleSendMessage} disabled={isTyping || !inputValue.trim()} className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1">
          <span className="text-gray-500 text-xs">💡 Signal / Analyze / Scan | 🏦 ICT + 🕯️ Candlesticks | 📊 TradingView</span>
          <span className="text-gray-600 text-xs">⚠️ Edu only</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 bg-[#0d1117] px-4 py-1 text-center">
        <p className="text-gray-600 text-xs flex items-center justify-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Trading involves high risk. Educational analyses only.
        </p>
      </div>

      {/* Trading Guide Modal */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setShowGuide(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#17212b] rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-[#17212b] border-b border-white/10 px-5 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-6 h-6 text-amber-400" />
                  <div>
                    <h2 className="text-white font-bold text-lg">دليل التداول - التوقيت الجزائري</h2>
                    <p className="text-gray-400 text-xs">الايام والاوقات المثالية لكل عملة ونمط تداول</p>
                  </div>
                </div>
                <button onClick={() => setShowGuide(false)} className="text-gray-400 hover:text-white transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-5">
                {/* Best Days Section */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 overflow-hidden">
                  <div className="px-4 py-2.5 bg-emerald-600/15 flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <span className="text-emerald-400 font-bold text-sm">افضل ايام التداول في الاسبوع</span>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-3 bg-black/20 rounded-lg px-3 py-2">
                      <span className="text-emerald-400 font-bold text-sm w-24">الثلاثاء</span>
                      <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full font-bold">A+</span>
                      <span className="text-gray-300 text-xs flex-1">افضل يوم على الاطلاق - Smart Money ينفذ صفقاته الحقيقية بعد اكتمال تراكم الاثنين</span>
                    </div>
                    <div className="flex items-center gap-3 bg-black/20 rounded-lg px-3 py-2">
                      <span className="text-emerald-400 font-bold text-sm w-24">الاربعاء</span>
                      <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full font-bold">A+</span>
                      <span className="text-gray-300 text-xs flex-1">ثاني افضل يوم - استمرار الاتجاه الاسبوعي مع حجم تداول عالي و Kill Zones واضحة</span>
                    </div>
                    <div className="flex items-center gap-3 bg-black/20 rounded-lg px-3 py-2">
                      <span className="text-yellow-400 font-bold text-sm w-24">الخميس</span>
                      <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-0.5 rounded-full font-bold">A</span>
                      <span className="text-gray-300 text-xs flex-1">يوم جيد لكن يحتاج حذر - غالباً يحدث reversal لاتجاه الاسبوع</span>
                    </div>
                    <div className="flex items-center gap-3 bg-black/20 rounded-lg px-3 py-2">
                      <span className="text-orange-400 font-bold text-sm w-24">الجمعة صباحاً</span>
                      <span className="bg-orange-500/20 text-orange-300 text-xs px-2 py-0.5 rounded-full font-bold">B</span>
                      <span className="text-gray-300 text-xs flex-1">فقط حتى 12:00 ظهراً بتوقيت الجزائر - بعد ذلك السيولة تنخفض</span>
                    </div>
                    <div className="flex items-center gap-3 bg-red-950/30 rounded-lg px-3 py-2 border border-red-500/10">
                      <span className="text-red-400 font-bold text-sm w-24">الاثنين</span>
                      <span className="bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full font-bold">C</span>
                      <span className="text-red-300 text-xs flex-1">يوم تراكم - تجنب! Smart Money يؤسس النطاق الاسبوعي فقط</span>
                    </div>
                  </div>
                </div>

                {/* Kill Zones - Algerian Time */}
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 overflow-hidden">
                  <div className="px-4 py-2.5 bg-cyan-600/15 flex items-center gap-2">
                    <span className="text-lg">⏰</span>
                    <span className="text-cyan-400 font-bold text-sm">Kill Zones - التوقيت الجزائري (UTC+1)</span>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-black/20 rounded-lg p-2.5 text-center">
                        <div className="text-gray-400 mb-1">London KZ</div>
                        <div className="text-cyan-300 font-bold text-sm">07:00 - 10:00</div>
                        <div className="text-gray-500 text-[10px] mt-1">ممتاز لـ EUR/USD, GBP/USD</div>
                      </div>
                      <div className="bg-black/20 rounded-lg p-2.5 text-center border border-cyan-500/30">
                        <div className="text-gray-400 mb-1">NY KZ</div>
                        <div className="text-emerald-300 font-bold text-sm">12:00 - 15:00</div>
                        <div className="text-gray-500 text-[10px] mt-1">الافضل لجميع العملات</div>
                      </div>
                      <div className="bg-black/20 rounded-lg p-2.5 text-center">
                        <div className="text-gray-400 mb-1">London Close</div>
                        <div className="text-cyan-300 font-bold text-sm">15:00 - 17:00</div>
                        <div className="text-gray-500 text-[10px] mt-1">جيد لـ XAU/USD</div>
                      </div>
                    </div>
                    <div className="bg-red-950/20 border border-red-500/10 rounded-lg px-3 py-2 flex items-center gap-2">
                      <span className="text-red-400 text-xs">⚠️</span>
                      <span className="text-red-300 text-xs">تجنب: 17:00 - 19:30 (غداء نيويورك - سيولة منخفضة) | الجمعة بعد 17:00 (اغلاق اسبوعي)</span>
                    </div>
                  </div>
                </div>

                {/* Per-Currency Schedule Table */}
                <div className="rounded-xl border border-purple-500/20 bg-purple-950/10 overflow-hidden">
                  <div className="px-4 py-2.5 bg-purple-600/15 flex items-center gap-2">
                    <span className="text-lg">💱</span>
                    <span className="text-purple-400 font-bold text-sm">جدول التداول لكل عملة - الايام والاوقات والنمط المثالي</span>
                  </div>
                  <div className="px-4 py-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400 border-b border-white/10">
                            <th className="text-left py-2 px-2 font-semibold">العملة</th>
                            <th className="text-center py-2 px-1 font-semibold">النمط</th>
                            <th className="text-center py-2 px-1 font-semibold">الايام</th>
                            <th className="text-center py-2 px-1 font-semibold">الوقت (جزائري)</th>
                            <th className="text-center py-2 px-1 font-semibold">الجودة</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-white/5">
                            <td className="py-2 px-2 text-white font-bold">XAU/USD</td>
                            <td className="py-2 px-1 text-center"><span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-bold">SWING</span></td>
                            <td className="py-2 px-1 text-center text-gray-300">ثلاثاء-خميس</td>
                            <td className="py-2 px-1 text-center text-cyan-300 font-mono">12:00-17:00</td>
                            <td className="py-2 px-1 text-center"><span className="text-emerald-400 font-bold">A+</span></td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-2 px-2 text-white font-bold">XAU/USD</td>
                            <td className="py-2 px-1 text-center"><span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-bold">DAY</span></td>
                            <td className="py-2 px-1 text-center text-gray-300">ثلاثاء-خميس</td>
                            <td className="py-2 px-1 text-center text-cyan-300 font-mono">12:00-15:00</td>
                            <td className="py-2 px-1 text-center"><span className="text-emerald-400 font-bold">A</span></td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-2 px-2 text-white font-bold">GBP/JPY</td>
                            <td className="py-2 px-1 text-center"><span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-bold">SWING</span></td>
                            <td className="py-2 px-1 text-center text-gray-300">ثلاثاء-خميس</td>
                            <td className="py-2 px-1 text-center text-cyan-300 font-mono">07:00-15:00</td>
                            <td className="py-2 px-1 text-center"><span className="text-emerald-400 font-bold">A+</span></td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-2 px-2 text-white font-bold">EUR/USD</td>
                            <td className="py-2 px-1 text-center"><span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-bold">DAY</span></td>
                            <td className="py-2 px-1 text-center text-gray-300">ثلاثاء-خميس</td>
                            <td className="py-2 px-1 text-center text-cyan-300 font-mono">07:00-15:00</td>
                            <td className="py-2 px-1 text-center"><span className="text-emerald-400 font-bold">A</span></td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-2 px-2 text-white font-bold">GBP/USD</td>
                            <td className="py-2 px-1 text-center"><span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-bold">DAY</span></td>
                            <td className="py-2 px-1 text-center text-gray-300">ثلاثاء-خميس</td>
                            <td className="py-2 px-1 text-center text-cyan-300 font-mono">07:00-15:00</td>
                            <td className="py-2 px-1 text-center"><span className="text-emerald-400 font-bold">A</span></td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-2 px-2 text-white font-bold">USD/JPY</td>
                            <td className="py-2 px-1 text-center"><span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-bold">DAY</span></td>
                            <td className="py-2 px-1 text-center text-gray-300">ثلاثاء-خميس</td>
                            <td className="py-2 px-1 text-center text-cyan-300 font-mono">07:00-15:00</td>
                            <td className="py-2 px-1 text-center"><span className="text-yellow-400 font-bold">A-</span></td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-2 px-2 text-white font-bold">BTC/USD</td>
                            <td className="py-2 px-1 text-center"><span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-bold">SWING</span></td>
                            <td className="py-2 px-1 text-center text-gray-300">ثلاثاء-خميس</td>
                            <td className="py-2 px-1 text-center text-cyan-300 font-mono">12:00-17:00</td>
                            <td className="py-2 px-1 text-center"><span className="text-yellow-400 font-bold">A-</span></td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-2 px-2 text-white font-bold">ETH/USD</td>
                            <td className="py-2 px-1 text-center"><span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-bold">SWING</span></td>
                            <td className="py-2 px-1 text-center text-gray-300">ثلاثاء-خميس</td>
                            <td className="py-2 px-1 text-center text-cyan-300 font-mono">12:00-17:00</td>
                            <td className="py-2 px-1 text-center"><span className="text-yellow-400 font-bold">B+</span></td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-2 px-2 text-white font-bold">US30</td>
                            <td className="py-2 px-1 text-center"><span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-bold">SWING</span></td>
                            <td className="py-2 px-1 text-center text-gray-300">ثلاثاء-خميس</td>
                            <td className="py-2 px-1 text-center text-cyan-300 font-mono">14:30-17:00</td>
                            <td className="py-2 px-1 text-center"><span className="text-emerald-400 font-bold">A</span></td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-2 px-2 text-white font-bold">NAS100</td>
                            <td className="py-2 px-1 text-center"><span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-bold">SWING</span></td>
                            <td className="py-2 px-1 text-center text-gray-300">ثلاثاء-خميس</td>
                            <td className="py-2 px-1 text-center text-cyan-300 font-mono">14:30-17:00</td>
                            <td className="py-2 px-1 text-center"><span className="text-emerald-400 font-bold">A</span></td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-2 px-2 text-white font-bold">XAG/USD</td>
                            <td className="py-2 px-1 text-center"><span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-bold">SWING</span></td>
                            <td className="py-2 px-1 text-center text-gray-300">ثلاثاء-خميس</td>
                            <td className="py-2 px-1 text-center text-cyan-300 font-mono">12:00-17:00</td>
                            <td className="py-2 px-1 text-center"><span className="text-yellow-400 font-bold">B+</span></td>
                          </tr>
                          <tr>
                            <td className="py-2 px-2 text-white font-bold">AUD/USD</td>
                            <td className="py-2 px-1 text-center"><span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-bold">DAY</span></td>
                            <td className="py-2 px-1 text-center text-gray-300">ثلاثاء-خميس</td>
                            <td className="py-2 px-1 text-center text-cyan-300 font-mono">22:00-02:00</td>
                            <td className="py-2 px-1 text-center"><span className="text-orange-400 font-bold">B</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* FundedNext Special Schedule */}
                <div className="rounded-xl border border-purple-500/20 bg-purple-950/10 overflow-hidden">
                  <div className="px-4 py-2.5 bg-purple-600/15 flex items-center gap-2">
                    <span className="text-lg">🏆</span>
                    <span className="text-purple-400 font-bold text-sm">خطة FundedNext 6K - النمط المثالي</span>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="bg-black/20 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-300 font-bold text-xs">النمط:</span>
                        <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-xs font-bold">SWING (H4/D1)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-purple-300 font-bold text-xs">الايام:</span>
                        <span className="text-gray-300 text-xs">الثلاثاء + الاربعاء + الخميس فقط</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-purple-300 font-bold text-xs">الوقت:</span>
                        <span className="text-cyan-300 text-xs font-mono">12:00 - 17:00 (توقيت جزائري)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-purple-300 font-bold text-xs">العملات:</span>
                        <span className="text-gray-300 text-xs">XAU/USD (افضل) | GBP/JPY | US30</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-purple-300 font-bold text-xs">المخاطرة:</span>
                        <span className="text-red-300 text-xs">1% كحد اقصى = $60 لكل صفقة</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-purple-300 font-bold text-xs">الهدف الاسبوعي:</span>
                        <span className="text-emerald-300 text-xs">3 صفقات عالية الجودة فقط</span>
                      </div>
                    </div>
                    <div className="bg-purple-950/30 border border-purple-500/10 rounded-lg px-3 py-2">
                      <div className="text-purple-300 text-xs font-bold mb-1">قواعد FundedNext Stellar 2-Step:</div>
                      <div className="grid grid-cols-2 gap-1 text-[10px]">
                        <span className="text-gray-400">Phase 1 هدف: <span className="text-white font-bold">8% ($480)</span></span>
                        <span className="text-gray-400">Phase 2 هدف: <span className="text-white font-bold">5% ($300)</span></span>
                        <span className="text-gray-400">Max Loss: <span className="text-red-300 font-bold">10% ($600)</span></span>
                        <span className="text-gray-400">Daily Loss: <span className="text-red-300 font-bold">5% ($300)</span></span>
                        <span className="text-gray-400">Min Days: <span className="text-white font-bold">5 ايام</span></span>
                        <span className="text-gray-400">Performance: <span className="text-emerald-300 font-bold">95%</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Rules */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 overflow-hidden">
                  <div className="px-4 py-2.5 bg-amber-600/15 flex items-center gap-2">
                    <span className="text-lg">⚡</span>
                    <span className="text-amber-400 font-bold text-sm">قواعد ذهبية سريعة</span>
                  </div>
                  <div className="px-4 py-3 space-y-1.5 text-xs">
                    <div className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✅</span><span className="text-gray-300">3 ايام فقط × صفقة واحدة عالية الجودة = افضل من 5 ايام × صفقات عشوائية</span></div>
                    <div className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✅</span><span className="text-gray-300">SWING مع البيانات المتأخرة اكثر اماناً من DAY او SCALP</span></div>
                    <div className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✅</span><span className="text-gray-300">XAU/USD و GBP/JPY افضل عملات للارباح مع SWING</span></div>
                    <div className="flex items-start gap-2"><span className="text-red-400 mt-0.5">❌</span><span className="text-gray-300">لا تتداول يوم الاثنين (يوم تراكم - اتجاه غير واضح)</span></div>
                    <div className="flex items-start gap-2"><span className="text-red-400 mt-0.5">❌</span><span className="text-gray-300">لا تتداول الجمعة بعد الظهر (Smart Money يغلق صفقاته)</span></div>
                    <div className="flex items-start gap-2"><span className="text-red-400 mt-0.5">❌</span><span className="text-gray-300">تجنب SCALPING مع البيانات المتأخرة - النتائج غير دقيقة</span></div>
                    <div className="flex items-start gap-2"><span className="text-red-400 mt-0.5">❌</span><span className="text-gray-300">لا تفتح صفقات خلال 10 دقائق بعد اخبار FOMC/NFP</span></div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
// Force rebuild Mon May 18 02:25:02 UTC 2026
