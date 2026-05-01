'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, TrendingUp, BarChart3, Search, Bot, User, Zap, AlertTriangle, ChevronDown, Clock,
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Canvas
const TradingViewChart = dynamic(() => import('@/components/TradingViewChart'), { ssr: false });

// ─── Trading Modes & Timeframes ─────────────────────────────────────
type TradingMode = 'swing' | 'daytrading' | 'scalping';

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
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'BTC/USD', 'ETH/USD',
  'US30', 'NAS100', 'GBP/JPY', 'AUD/USD',
];

// Mode badge colors for SignalCard
const MODE_BADGE: Record<TradingMode, string> = {
  swing: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20',
  daytrading: 'bg-blue-500/20 text-blue-300 border-blue-500/20',
  scalping: 'bg-orange-500/20 text-orange-300 border-orange-500/20',
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
    </div>
  );
}
