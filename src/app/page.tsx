'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  TrendingUp,
  BarChart3,
  Search,
  Bot,
  User,
  Zap,
  AlertTriangle,
  ChevronDown,
  X,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';

// Types
interface SignalData {
  type: 'BUY' | 'SELL';
  pair: string;
  timeframe: string;
  entry: number;
  tp1: number;
  tp2: number;
  sl: number;
  pattern: string;
  patternEn: string;
  rsi: number;
  rsiStatus: string;
  macd: string;
  maCross: string;
  confidence: number;
  riskReward: number;
  aiAnalysis?: string;
  // ICT fields
  ictElements?: string[];
  killZone?: string;
  liquidityType?: string;
  pdZone?: string;
}

interface AnalysisData {
  pair: string;
  timeframe: string;
  currentPrice: number;
  trend: string;
  patterns: Array<{ nameAr: string; type: string; reliability: number; descriptionAr: string }>;
  indicators: Record<string, unknown>;
  levels: Record<string, number>;
  aiAnalysis?: string;
}

interface ScanResult {
  pair: string;
  name: string;
  category: string;
  currentPrice: number;
  trend: string;
  patterns: Array<{ nameAr: string; type: string; reliability: number }>;
  rsi: number;
  opportunity: string;
  score: number;
}

interface ChatMessage {
  id: string;
  type: 'bot' | 'user' | 'signal' | 'analysis' | 'scan' | 'system';
  content: string;
  timestamp: Date;
  signalData?: SignalData;
  analysisData?: AnalysisData;
  scanData?: ScanResult[];
  scanSummary?: string;
}

// Format time
function formatTime(date: Date): string {
  return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Pairs for quick select
const TRADING_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'BTC/USD', 'ETH/USD',
  'US30', 'NAS100', 'GBP/JPY', 'AUD/USD',
];

// ─── Signal Card Component (outside render) ────────────────────────────
function SignalCard({ signal }: { signal: SignalData }) {
  return (
    <div className={`rounded-xl overflow-hidden border ${
      signal.type === 'BUY' ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-red-500/30 bg-red-950/20'
    }`}>
      {/* Header */}
      <div className={`px-4 py-2.5 flex items-center justify-between ${
        signal.type === 'BUY' ? 'bg-emerald-600/20' : 'bg-red-600/20'
      }`}>
        <div className="flex items-center gap-2">
          {signal.type === 'BUY' ? (
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          ) : (
            <TrendingUp className="w-5 h-5 text-red-400 rotate-180" />
          )}
          <span className={`font-bold text-lg ${
            signal.type === 'BUY' ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {signal.type === 'BUY' ? '🟢 إشارة شراء' : '🔴 إشارة بيع'}
          </span>
        </div>
        <span className="text-xs text-gray-400 font-mono">{signal.timeframe}</span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Pair & Entry */}
        <div className="flex items-center justify-between">
          <span className="text-white font-bold text-xl">{signal.pair}</span>
          <span className="text-gray-400 text-sm">الدخول: <span className="text-white font-mono">{signal.entry}</span></span>
        </div>

        {/* TP & SL Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-black/20 rounded-lg p-2 text-center">
            <div className="text-xs text-gray-400 mb-1">هدف ١</div>
            <div className="text-emerald-400 font-mono font-bold">{signal.tp1}</div>
          </div>
          <div className="bg-black/20 rounded-lg p-2 text-center">
            <div className="text-xs text-gray-400 mb-1">هدف ٢</div>
            <div className="text-emerald-400 font-mono font-bold">{signal.tp2}</div>
          </div>
          <div className="bg-black/20 rounded-lg p-2 text-center">
            <div className="text-xs text-gray-400 mb-1">وقف خسارة</div>
            <div className="text-red-400 font-mono font-bold">{signal.sl}</div>
          </div>
        </div>

        {/* Pattern & Indicators */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-yellow-400">🕯️</span>
            <span className="text-gray-300">النمط:</span>
            <span className="text-yellow-300 font-semibold">{signal.pattern}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-400">📊</span>
            <span className="text-gray-300">RSI:</span>
            <span className="text-blue-300">{signal.rsiStatus}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-400">📈</span>
            <span className="text-gray-300">MACD:</span>
            <span className="text-purple-300">{signal.macd}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-cyan-400">〰️</span>
            <span className="text-gray-300">MA:</span>
            <span className="text-cyan-300">{signal.maCross}</span>
          </div>
        </div>

        {/* Confidence & Risk/Reward */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-gray-300 text-sm">الثقة:</span>
            <div className="flex items-center gap-1">
              <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    signal.confidence >= 75 ? 'bg-emerald-400' : signal.confidence >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${signal.confidence}%` }}
                />
              </div>
              <span className={`font-bold text-sm ${
                signal.confidence >= 75 ? 'text-emerald-400' : signal.confidence >= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {signal.confidence}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-gray-400">R:R</span>
            <span className="text-white font-mono font-bold">1:{signal.riskReward}</span>
          </div>
        </div>

        {/* ICT Elements */}
        {signal.ictElements && signal.ictElements.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <div className="text-xs text-amber-400 font-semibold mb-1.5">🏦 عناصر ICT (Smart Money):</div>
            <div className="flex flex-wrap gap-1">
              {signal.ictElements.map((el, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-xs border border-amber-500/20">
                  {el}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs">
              {signal.killZone && (
                <span className="text-cyan-300">⏰ {signal.killZone}</span>
              )}
              {signal.liquidityType && (
                <span className="text-pink-300">💧 {signal.liquidityType}</span>
              )}
              {signal.pdZone && (
                <span className="text-violet-300">📐 {signal.pdZone}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Analysis Card Component (outside render) ──────────────────────────
function AnalysisCard({ analysis, content }: { analysis: AnalysisData; content: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-blue-500/30 bg-blue-950/20">
      <div className="px-4 py-2.5 bg-blue-600/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <span className="text-blue-400 font-bold">📊 تحليل فني شامل</span>
        </div>
        <span className="text-gray-400 text-sm font-mono">{analysis.pair}</span>
      </div>
      <div className="px-4 py-3">
        {/* Trend */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-gray-300">الاتجاه:</span>
          <span className={`font-bold ${
            analysis.trend === 'صاعد' ? 'text-emerald-400' : analysis.trend === 'هبوطي' ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {analysis.trend === 'صاعد' ? '📈' : analysis.trend === 'هبوطي' ? '📉' : '↔️'} {analysis.trend}
          </span>
        </div>

        {/* Patterns */}
        {analysis.patterns.length > 0 && (
          <div className="mb-3">
            <div className="text-gray-400 text-sm mb-1">🕯️ أنماط مكتشفة:</div>
            <div className="flex flex-wrap gap-1.5">
              {analysis.patterns.map((p, i) => (
                <span
                  key={i}
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    p.type === 'bullish_reversal' || p.type === 'bullish_continuation'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : p.type === 'bearish_reversal' || p.type === 'bearish_continuation'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  }`}
                >
                  {p.nameAr}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI Analysis Text */}
        <div className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed mt-2 border-t border-white/10 pt-3">
          {content}
        </div>
      </div>
    </div>
  );
}

// ─── Scan Card Component (outside render) ──────────────────────────────
function ScanCard({ results, summary }: { results: ScanResult[]; summary: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-purple-500/30 bg-purple-950/20">
      <div className="px-4 py-2.5 bg-purple-600/20 flex items-center gap-2">
        <Search className="w-5 h-5 text-purple-400" />
        <span className="text-purple-400 font-bold">🔍 مسح السوق</span>
      </div>
      <div className="px-4 py-3 space-y-3">
        {/* Summary */}
        <div className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
          {summary}
        </div>

        {/* Top Results */}
        <div className="space-y-2">
          {results.slice(0, 5).map((r, i) => (
            <div key={i} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm font-mono w-5">{i + 1}.</span>
                <span className="text-white font-semibold text-sm">{r.pair}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  r.trend === 'صاعد' ? 'bg-emerald-500/20 text-emerald-300' :
                  r.trend === 'هبوطي' ? 'bg-red-500/20 text-red-300' :
                  'bg-yellow-500/20 text-yellow-300'
                }`}>
                  {r.trend}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {r.patterns.length > 0 && (
                  <span className="text-yellow-300 text-xs">{r.patterns[0].nameAr}</span>
                )}
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  r.score >= 70 ? 'bg-emerald-500/20 text-emerald-300' :
                  r.score >= 45 ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {r.opportunity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Typing Indicator Component (outside render) ───────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-2.5 my-1.5" dir="rtl">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-[#182533] rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 text-xs">يحلل السوق</span>
          <div className="flex gap-1">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-blue-400"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-blue-400"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
            />
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-blue-400"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble Component (outside render) ─────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-white/5 rounded-full px-4 py-1.5 text-xs text-gray-400">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.type === 'signal' && msg.signalData) {
    return (
      <div className="flex gap-2.5 my-2 max-w-[90%] mx-auto" dir="rtl">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-400 text-sm font-semibold">بدل توقعات الذكي</span>
            <span className="text-gray-500 text-xs">{formatTime(msg.timestamp)}</span>
          </div>
          <SignalCard signal={msg.signalData} />
        </div>
      </div>
    );
  }

  if (msg.type === 'analysis' && msg.analysisData) {
    return (
      <div className="flex gap-2.5 my-2 max-w-[90%] mx-auto" dir="rtl">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-400 text-sm font-semibold">بدل توقعات الذكي</span>
            <span className="text-gray-500 text-xs">{formatTime(msg.timestamp)}</span>
          </div>
          <AnalysisCard analysis={msg.analysisData} content={msg.content} />
        </div>
      </div>
    );
  }

  if (msg.type === 'scan' && msg.scanData) {
    return (
      <div className="flex gap-2.5 my-2 max-w-[90%] mx-auto" dir="rtl">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-400 text-sm font-semibold">بدل توقعات الذكي</span>
            <span className="text-gray-500 text-xs">{formatTime(msg.timestamp)}</span>
          </div>
          <ScanCard results={msg.scanData} summary={msg.scanSummary || msg.content} />
        </div>
      </div>
    );
  }

  if (msg.type === 'user') {
    return (
      <div className="flex gap-2.5 my-1.5 justify-end" dir="rtl">
        <div className="max-w-[75%]">
          <div className="bg-[#2b5278] rounded-2xl rounded-tl-sm px-4 py-2.5">
            <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
          </div>
          <div className="text-left mt-0.5">
            <span className="text-gray-500 text-xs">{formatTime(msg.timestamp)}</span>
          </div>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-green-600 flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    );
  }

  // Bot message (default)
  return (
    <div className="flex gap-2.5 my-1.5 max-w-[90%] mx-auto" dir="rtl">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-blue-400 text-sm font-semibold">بدل توقعات الذكي</span>
          <span className="text-gray-500 text-xs">{formatTime(msg.timestamp)}</span>
        </div>
        <div className="bg-[#182533] rounded-2xl rounded-tl-sm px-4 py-2.5">
          <p className="text-gray-100 text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Initial sample messages ───────────────────────────────────────────
const initialMessages: ChatMessage[] = [
  {
    id: generateId(),
    type: 'system',
    content: 'مرحباً بك في مجموعة بدل توقعات الذكي 🤖📊',
    timestamp: new Date(Date.now() - 3600000 * 2),
  },
  {
    id: generateId(),
    type: 'bot',
    content: 'السلام عليكم! 👋 أنا بدل توقعات الذكي، بوت التحليل الفني المتقدم.\n\nأجمع بين مدرستين قويتين:\n🕯️ الشموع اليابانية (كتاب فريد تام)\n🏦 ICT / Smart Money (كتاب أيوب رانا)\n\nأستطيع:\n📈 إشارات تداول مع تأكيدات ICT\n🕯️ كشف أنماط الشموع اليابانية\n🏦 كشف أوردر بلوك و FVG و بريكر\n💧 تحليل السيولة (BSL/SSL)\n⏰ تحديد الكيل زون\n🔍 مسح السوق للفرص\n\nاستخدم الأزرار في الأسفل أو اكتب سؤالك!',
    timestamp: new Date(Date.now() - 3600000 * 1.9),
  },
  {
    id: generateId(),
    type: 'signal',
    content: '',
    timestamp: new Date(Date.now() - 3600000),
    signalData: {
      type: 'BUY',
      pair: 'XAU/USD',
      timeframe: 'H4',
      entry: 2340.50,
      tp1: 2352.00,
      tp2: 2365.00,
      sl: 2332.00,
      pattern: 'الابتلاع الصعودي',
      patternEn: 'Bullish Engulfing',
      rsi: 28,
      rsiStatus: 'تشبع بيعي (28)',
      macd: 'تقاطع صعودي',
      maCross: 'تقاطع ذهبي (MA5 > MA20)',
      confidence: 92,
      riskReward: 2.5,
      ictElements: ['أوردر بلوك صعودي', 'FVG صعودي', 'كنس SSL'],
      killZone: 'كيل زون لندن',
      liquidityType: 'Sell Side Liquidity',
      pdZone: 'منطقة خصم (Discount)',
    },
  },
  {
    id: generateId(),
    type: 'bot',
    content: '✅ تم تأكيد إشارة الشراء على الذهب - نمط الابتلاع الصعودي مدعوم بـ:\n🏦 أوردر بلوك صعودي + FVG صعودي\n💧 كنس سيولة جانب البيع (SSL)\n⏰ كيل زون لندن - توقيت مثالي\n📐 الدخول في منطقة خصم (Discount)\n\n⚠️ إدارة المخاطر: لا تخاطر بأكثر من 2% - نسبة R:R 1:3 حسب ICT',
    timestamp: new Date(Date.now() - 3500000),
  },
];

// ─── Main Page Component ───────────────────────────────────────────────
export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showPairSelector, setShowPairSelector] = useState(false);
  const [selectedPair, setSelectedPair] = useState('EUR/USD');
  const [chartExpanded, setChartExpanded] = useState(false);
  const [chartSymbol, setChartSymbol] = useState('EURUSD');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Add message helper
  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: generateId(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMsg]);
    return newMsg;
  }, []);

  // Simulate typing delay
  const simulateTyping = useCallback((callback: () => void, minDelay = 1500, maxDelay = 3000) => {
    setIsTyping(true);
    const delay = Math.random() * (maxDelay - minDelay) + minDelay;
    setTimeout(() => {
      setIsTyping(false);
      callback();
    }, delay);
  }, []);

  // Get signal
  const handleGetSignal = useCallback(async (pair?: string) => {
    const targetPair = pair || selectedPair;
    addMessage({ type: 'user', content: `/signal ${targetPair}` });

    simulateTyping(async () => {
      try {
        const res = await fetch('/api/trading/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pair: targetPair, timeframe: 'H4' }),
        });
        const data = await res.json();

        if (data.success && data.signal) {
          addMessage({
            type: 'signal',
            content: '',
            signalData: data.signal,
          });
          if (data.signal.aiAnalysis) {
            addMessage({
              type: 'bot',
              content: data.signal.aiAnalysis,
            });
          }
          const tvSymbol = targetPair.replace('/', '');
          setChartSymbol(tvSymbol);
        } else {
          addMessage({
            type: 'bot',
            content: '❌ عذراً، لم أتمكن من توليد إشارة حالياً. حاول مرة أخرى.',
          });
        }
      } catch {
        addMessage({
          type: 'bot',
          content: '❌ حدث خطأ في الاتصال. حاول مرة أخرى.',
        });
      }
    }, 2000, 4000);
  }, [selectedPair, addMessage, simulateTyping]);

  // Analyze pair
  const handleAnalyze = useCallback(async (pair?: string) => {
    const targetPair = pair || selectedPair;
    addMessage({ type: 'user', content: `/analyze ${targetPair}` });

    simulateTyping(async () => {
      try {
        const res = await fetch('/api/trading/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pair: targetPair, timeframe: 'H4' }),
        });
        const data = await res.json();

        if (data.success) {
          addMessage({
            type: 'analysis',
            content: data.aiAnalysis || 'تم التحليل بنجاح',
            analysisData: data,
          });
          const tvSymbol = targetPair.replace('/', '');
          setChartSymbol(tvSymbol);
        } else {
          addMessage({
            type: 'bot',
            content: '❌ فشل في تحليل الزوج. حاول مرة أخرى.',
          });
        }
      } catch {
        addMessage({
          type: 'bot',
          content: '❌ حدث خطأ في الاتصال. حاول مرة أخرى.',
        });
      }
    }, 2500, 4500);
  }, [selectedPair, addMessage, simulateTyping]);

  // Market scan
  const handleScan = useCallback(async () => {
    addMessage({ type: 'user', content: '/scan' });

    simulateTyping(async () => {
      try {
        const res = await fetch('/api/trading/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();

        if (data.success) {
          addMessage({
            type: 'scan',
            content: data.aiSummary || 'تم مسح السوق',
            scanData: data.results,
            scanSummary: data.aiSummary,
          });
        } else {
          addMessage({
            type: 'bot',
            content: '❌ فشل في مسح السوق. حاول مرة أخرى.',
          });
        }
      } catch {
        addMessage({
          type: 'bot',
          content: '❌ حدث خطأ في الاتصال. حاول مرة أخرى.',
        });
      }
    }, 3000, 5000);
  }, [addMessage, simulateTyping]);

  // Send chat message
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;
    const msg = inputValue.trim();
    setInputValue('');

    addMessage({ type: 'user', content: msg });

    // Check for commands
    if (msg.startsWith('/signal')) {
      const pair = msg.split(' ')[1] || selectedPair;
      handleGetSignal(pair);
      return;
    }
    if (msg.startsWith('/analyze')) {
      const pair = msg.split(' ')[1] || selectedPair;
      handleAnalyze(pair);
      return;
    }
    if (msg === '/scan') {
      handleScan();
      return;
    }

    simulateTyping(async () => {
      try {
        const res = await fetch('/api/trading/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg }),
        });
        const data = await res.json();

        if (data.success && data.response) {
          addMessage({ type: 'bot', content: data.response });
        } else {
          addMessage({
            type: 'bot',
            content: '❌ لم أتمكن من معالجة رسالتك. حاول مرة أخرى.',
          });
        }
      } catch {
        addMessage({
          type: 'bot',
          content: '❌ حدث خطأ في الاتصال. حاول مرة أخرى.',
        });
      }
    }, 1500, 3000);
  }, [inputValue, selectedPair, addMessage, simulateTyping, handleGetSignal, handleAnalyze, handleScan]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const tradingViewUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview&symbol=FX:${chartSymbol}&interval=240&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=0e1621&studies=%5B%5D&theme=dark&style=1&timezone=Asia/Riyadh&withdateranges=1&showpopupbutton=0&studies_overrides=%7B%7D&overrides=%7B%22mainSeriesProperties.candleStyle.upColor%22%3A%22%2326a69a%22%2C%22mainSeriesProperties.candleStyle.downColor%22%3A%22%23ef5350%22%2C%22mainSeriesProperties.candleStyle.borderUpColor%22%3A%22%2326a69a%22%2C%22mainSeriesProperties.candleStyle.borderDownColor%22%3A%22%23ef5350%22%2C%22mainSeriesProperties.candleStyle.wickUpColor%22%3A%22%2326a69a%22%2C%22mainSeriesProperties.candleStyle.wickDownColor%22%3A%22%23ef5350%22%2C%22paneProperties.background%22%3A%22%230e1621%22%2C%22paneProperties.backgroundType%22%3A1%7D&enabled_features=%5B%5D&disabled_features=%5B%22header_symbol_search%22%2C%22header_compare%22%2C%22header_interval_dialog_button%22%2C%22show_dom_first_time%22%5D`;

  return (
    <div className="h-screen flex flex-col bg-[#0e1621]" dir="rtl">
      {/* Header */}
      <header className="flex-shrink-0 bg-[#17212b] border-b border-white/5 px-4 py-2.5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#17212b]" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm">بدل توقعات الذكي 🤖</h1>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 text-xs">متصل</span>
              <span className="text-gray-500 text-xs">• ١,٢٤٧ عضو</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pair selector */}
          <div className="relative">
            <button
              onClick={() => setShowPairSelector(!showPairSelector)}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 rounded-lg px-3 py-1.5 text-gray-300 text-sm transition-colors"
            >
              <span>{selectedPair}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <AnimatePresence>
              {showPairSelector && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute left-0 top-full mt-1 bg-[#17212b] border border-white/10 rounded-lg shadow-xl z-50 py-1 min-w-[160px] max-h-64 overflow-y-auto"
                >
                  {TRADING_PAIRS.map(pair => (
                    <button
                      key={pair}
                      onClick={() => {
                        setSelectedPair(pair);
                        setChartSymbol(pair.replace('/', ''));
                        setShowPairSelector(false);
                      }}
                      className={`w-full text-right px-3 py-1.5 text-sm hover:bg-white/5 transition-colors ${
                        pair === selectedPair ? 'text-blue-400 bg-white/5' : 'text-gray-300'
                      }`}
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2b3a4a transparent' }}>
            {/* Date separator */}
            <div className="flex justify-center my-3">
              <div className="bg-black/30 rounded-full px-3 py-1 text-xs text-gray-400">
                اليوم
              </div>
            </div>

            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}

            {/* Typing indicator */}
            <AnimatePresence>
              {isTyping && <TypingIndicator />}
            </AnimatePresence>

            <div ref={chatEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="flex-shrink-0 px-4 py-2 border-t border-white/5 bg-[#0e1621]">
            <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => handleGetSignal()}
                disabled={isTyping}
                className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500/20"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                إشارة تداول
              </button>
              <button
                onClick={() => handleAnalyze()}
                disabled={isTyping}
                className="flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500/20"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                تحليل شامل
              </button>
              <button
                onClick={handleScan}
                disabled={isTyping}
                className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed border border-purple-500/20"
              >
                <Search className="w-3.5 h-3.5" />
                مسح السوق
              </button>
              <button
                onClick={() => {
                  setInputValue('اشرح لي نمط الابتلاع الصعودي');
                }}
                disabled={isTyping}
                className="flex items-center gap-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed border border-yellow-500/20"
              >
                🕯️ أنماط الشموع
              </button>
              <button
                onClick={() => {
                  setInputValue('اشرح لي الأوردر بلوك وكيف أتداول به');
                }}
                disabled={isTyping}
                className="flex items-center gap-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed border border-amber-500/20"
              >
                🏦 أوردر بلوك
              </button>
              <button
                onClick={() => {
                  setInputValue('ما هي فجوة القيمة العادلة FVG وكيف أستخدمها؟');
                }}
                disabled={isTyping}
                className="flex items-center gap-1.5 bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed border border-pink-500/20"
              >
                💧 FVG
              </button>
              <button
                onClick={() => {
                  setInputValue('اشرح لي الكيل زون واستراتيجية سيلفر بوليت');
                }}
                disabled={isTyping}
                className="flex items-center gap-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-500/20"
              >
                ⏰ كيل زون
              </button>
            </div>
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 bg-[#17212b] px-4 py-3 border-t border-white/5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="اكتب رسالتك أو أمر تداول..."
                className="flex-1 bg-[#0e1621] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
                disabled={isTyping}
                dir="rtl"
              />
              <button
                onClick={handleSendMessage}
                disabled={isTyping || !inputValue.trim()}
                className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <Send className="w-4 h-4 text-white rotate-180" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              <span className="text-gray-500 text-xs">💡 أوامر: /signal /analyze /scan | 🏦 ICT + 🕯️ شموع</span>
              <span className="text-gray-500 text-xs">⚠️ ليس نصيحة مالية</span>
            </div>
          </div>
        </div>

        {/* Chart Panel - Hidden on mobile, visible on lg+ */}
        <div className={`hidden lg:flex flex-col border-r border-white/5 bg-[#0e1621] ${
          chartExpanded ? 'w-[600px]' : 'w-[420px]'
        } transition-all duration-300`}>
          {/* Chart Header */}
          <div className="flex-shrink-0 px-3 py-2 bg-[#17212b] border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-white text-sm font-semibold">{selectedPair}</span>
              <span className="text-gray-500 text-xs">TradingView</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setChartSymbol(selectedPair.replace('/', ''))}
                className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setChartExpanded(!chartExpanded)}
                className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-colors"
              >
                {chartExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* TradingView Widget */}
          <div className="flex-1 relative">
            <iframe
              key={chartSymbol}
              src={tradingViewUrl}
              className="w-full h-full border-0"
              allowFullScreen
              title="TradingView Chart"
            />
          </div>

          {/* Quick pair switcher at bottom of chart */}
          <div className="flex-shrink-0 px-2 py-2 bg-[#17212b] border-t border-white/5 flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {TRADING_PAIRS.slice(0, 6).map(pair => (
              <button
                key={pair}
                onClick={() => {
                  setSelectedPair(pair);
                  setChartSymbol(pair.replace('/', ''));
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  pair === selectedPair
                    ? 'bg-blue-600/30 text-blue-400 border border-blue-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                }`}
              >
                {pair}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Chart Toggle */}
      <div className="lg:hidden flex-shrink-0 bg-[#17212b] border-t border-white/5">
        <button
          onClick={() => setChartExpanded(!chartExpanded)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-gray-400 hover:text-white transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          <span className="text-sm">{chartExpanded ? 'إخفاء الرسم البياني' : 'عرض الرسم البياني'}</span>
        </button>
      </div>

      {/* Mobile Chart Overlay */}
      <AnimatePresence>
        {chartExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: '50vh' }}
            exit={{ height: 0 }}
            className="lg:hidden bg-[#0e1621] border-t border-white/10 overflow-hidden"
          >
            <div className="h-full relative">
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={() => setChartExpanded(false)}
                  className="p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <iframe
                key={`mobile-${chartSymbol}`}
                src={tradingViewUrl}
                className="w-full h-full border-0"
                allowFullScreen
                title="TradingView Chart Mobile"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Risk Warning Footer */}
      <div className="flex-shrink-0 bg-[#0d1117] px-4 py-1 text-center">
        <p className="text-gray-600 text-xs flex items-center justify-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          تحذير: التداول ينطوي على مخاطر عالية. هذه التحليلات للتوعية فقط وليست نصيحة مالية.
        </p>
      </div>
    </div>
  );
}
