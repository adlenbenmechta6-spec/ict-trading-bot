import { NextRequest, NextResponse } from 'next/server';
import { SCAN_SYSTEM_PROMPT, CANDLESTICK_KNOWLEDGE, PAIRS } from '@/lib/trading-knowledge';
import { chatCompletion } from '@/lib/ai';
import {
  generateSimulatedCandles,
  detectAllPatterns,
  calculateRSI,
  calculateMACD,
  calculateMovingAverage,
} from '@/lib/trading-patterns';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category } = body || {};
    const pairsToScan = category ? PAIRS.filter(p => p.category === category) : PAIRS;

    const basePrices: Record<string, number> = {
      'EUR/USD': 1.0850, 'GBP/USD': 1.2650, 'USD/JPY': 149.50,
      'XAU/USD': 2340.00, 'BTC/USD': 67500.00, 'ETH/USD': 3450.00,
      'US30': 39500.00, 'NAS100': 18500.00, 'GBP/JPY': 189.20,
      'AUD/USD': 0.6520, 'USD/CAD': 1.3650, 'NZD/USD': 0.6050,
    };

    interface ScanResult {
      pair: string; name: string; category: string; currentPrice: number;
      trend: string; patterns: Array<{ nameAr: string; type: string; reliability: number }>;
      rsi: number; opportunity: string; score: number;
    }

    const results: ScanResult[] = [];

    for (const pairInfo of pairsToScan) {
      const basePrice = basePrices[pairInfo.symbol] || 1.0;
      const trend = Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'sideways';
      const candles = generateSimulatedCandles(50, basePrice, trend);
      const patterns = detectAllPatterns(candles);
      const rsi = calculateRSI(candles);
      const macd = calculateMACD(candles);
      const ma5 = calculateMovingAverage(candles, 5);
      const ma20 = calculateMovingAverage(candles, 20);
      const currentPrice = candles[candles.length - 1].close;

      let score = 0;
      if (patterns.length > 0) score += patterns.length * 15;
      if (rsi < 30 || rsi > 70) score += 20;
      if (macd.histogram > 0 && ma5 > ma20) score += 15;
      if (macd.histogram < 0 && ma5 < ma20) score += 15;
      score = Math.min(score, 95);

      let opportunity = 'منخفضة';
      if (score >= 70) opportunity = 'عالية 🔥';
      else if (score >= 45) opportunity = 'متوسطة ⚡';

      const trendDirection = ma5 > ma20 ? 'صاعد' : ma5 < ma20 ? 'هبوطي' : 'عرضي';

      results.push({
        pair: pairInfo.symbol, name: pairInfo.name, category: pairInfo.category,
        currentPrice, trend: trendDirection,
        patterns: patterns.map(p => ({ nameAr: p.nameAr, type: p.type, reliability: p.reliability })),
        rsi, opportunity, score,
      });
    }

    results.sort((a, b) => b.score - a.score);

    const topPairs = results.filter(r => r.score >= 45);
    const summaryData = topPairs.map(r =>
      `${r.pair} (${r.name}): اتجاه ${r.trend}, أنماط: ${r.patterns.map(p => p.nameAr).join(', ') || 'لا توجد'}, RSI: ${r.rsi}, فرصة: ${r.opportunity}`
    ).join('\n');

    const aiSummary = await chatCompletion({
      systemPrompt: SCAN_SYSTEM_PROMPT + '\n\n' + CANDLESTICK_KNOWLEDGE,
      userMessage: `قم بفحص السوق ولخص الفرص التالية:\n\n${summaryData || 'لا توجد فرص عالية حالياً'}\n\nأعطني ملخص مختصر بالعربية مع ترتيب الفرص حسب الأولوية. كن مختصراً في 4-5 أسطر.`,
      maxTokens: 600,
    }) || `🔍 مسح السوق:\n\n${topPairs.length > 0
      ? topPairs.map((r, i) => `${i + 1}. ${r.pair} - فرصة ${r.opportunity} (اتجاه: ${r.trend})`).join('\n')
      : 'لا توجد فرص عالية حالياً. انتظر فرص أفضل.'}`;

    return NextResponse.json({
      success: true, results, aiSummary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ success: false, error: 'فشل في مسح السوق' }, { status: 500 });
  }
}
