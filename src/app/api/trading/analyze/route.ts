import { NextRequest, NextResponse } from 'next/server';
import { ANALYSIS_SYSTEM_PROMPT, CANDLESTICK_KNOWLEDGE } from '@/lib/trading-knowledge';
import { chatCompletion } from '@/lib/ai';
import {
  generateSimulatedCandles,
  detectAllPatterns,
  calculateRSI,
  calculateMACD,
  calculateMovingAverage,
  calculateBollingerBands,
  calculateStochastic,
} from '@/lib/trading-patterns';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pair = 'EUR/USD', timeframe = 'H4' } = body;

    const basePrices: Record<string, number> = {
      'EUR/USD': 1.0850, 'GBP/USD': 1.2650, 'USD/JPY': 149.50,
      'XAU/USD': 2340.00, 'BTC/USD': 67500.00, 'ETH/USD': 3450.00,
      'US30': 39500.00, 'NAS100': 18500.00, 'GBP/JPY': 189.20,
      'AUD/USD': 0.6520, 'USD/CAD': 1.3650, 'NZD/USD': 0.6050,
    };

    const basePrice = basePrices[pair] || 1.0850;
    const trend = Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'sideways';
    const candles = generateSimulatedCandles(50, basePrice, trend);

    const patterns = detectAllPatterns(candles);
    const rsi = calculateRSI(candles);
    const macd = calculateMACD(candles);
    const ma5 = calculateMovingAverage(candles, 5);
    const ma20 = calculateMovingAverage(candles, 20);
    const ma50 = calculateMovingAverage(candles, 50);
    const bb = calculateBollingerBands(candles);
    const stoch = calculateStochastic(candles);
    const currentPrice = candles[candles.length - 1].close;

    let trendDirection = 'عرضي';
    if (ma5 > ma20 && ma20 > ma50) trendDirection = 'صاعد';
    else if (ma5 < ma20 && ma20 < ma50) trendDirection = 'هبوطي';

    const recentHighs = candles.slice(-20).map(c => c.high);
    const recentLows = candles.slice(-20).map(c => c.low);
    const resistance = Math.max(...recentHighs);
    const support = Math.min(...recentLows);

    const analysis: Record<string, unknown> = {
      success: true,
      pair,
      timeframe,
      currentPrice,
      trend: trendDirection,
      patterns: patterns.map(p => ({
        name: p.name, nameAr: p.nameAr, type: p.type,
        reliability: p.reliability, descriptionAr: p.descriptionAr,
      })),
      indicators: {
        rsi: { value: rsi, status: rsi < 30 ? 'تشبع بيعي' : rsi > 70 ? 'تشبع شرائي' : 'محايد' },
        macd: { value: macd.macd, signal: macd.signal, histogram: macd.histogram, status: macd.histogram > 0 ? 'صعودي' : 'هبوطي' },
        ma: { ma5, ma20, ma50, status: ma5 > ma20 ? 'تقاطع ذهبي' : 'تقاطع ميت' },
        bb: { upper: bb.upper, middle: bb.middle, lower: bb.lower },
        stoch: { k: stoch.k, d: stoch.d, status: stoch.k < 20 ? 'تشبع بيعي' : stoch.k > 80 ? 'تشبع شرائي' : 'محايد' },
      },
      levels: {
        resistance, support,
        pivot: parseFloat(((resistance + support + currentPrice) / 3).toFixed(5)),
      },
      timestamp: new Date().toISOString(),
    };

    const aiAnalysis = await chatCompletion({
      systemPrompt: ANALYSIS_SYSTEM_PROMPT + '\n\n' + CANDLESTICK_KNOWLEDGE,
      userMessage: `قم بتحليل شامل لزوج ${pair} على الإطار الزمني ${timeframe}.

السعر الحالي: ${currentPrice}
الاتجاه: ${trendDirection}

الأنماط المكتشفة: ${patterns.map(p => `${p.nameAr} (${p.name})`).join(', ') || 'لا توجد'}

المؤشرات التقنية:
- RSI: ${rsi}
- MACD: ${macd.macd}, Signal: ${macd.signal}, Histogram: ${macd.histogram}
- MA5: ${ma5}, MA20: ${ma20}, MA50: ${ma50}
- Bollinger Bands: ${bb.upper} / ${bb.middle} / ${bb.lower}
- Stochastic: %K=${stoch.k}, %D=${stoch.d}

مستويات: مقاومة: ${resistance} | دعم: ${support}

قدم تحليلاً شاملاً ومفصلاً بالعربية يتضمن التوصية النهائية. كن مختصراً ومفيداً.`,
      maxTokens: 1000,
    });

    analysis.aiAnalysis = aiAnalysis || generateLocalAnalysis(analysis);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ success: false, error: 'فشل في التحليل' }, { status: 500 });
  }
}

function generateLocalAnalysis(data: Record<string, unknown>): string {
  const pair = data.pair as string;
  const trend = data.trend as string;
  const patterns = data.patterns as Array<{ nameAr: string; type: string; reliability: number }>;
  const indicators = data.indicators as Record<string, Record<string, unknown>>;
  const levels = data.levels as Record<string, number>;

  return `📊 تحليل شامل لزوج ${pair}

🔷 الاتجاه: ${trend}
🕯️ الأنماط: ${patterns.length > 0 ? patterns.map(p => p.nameAr).join(', ') : 'لا توجد أنماط واضحة'}
📈 المؤشرات: RSI ${indicators.rsi?.value} (${indicators.rsi?.status}) | MACD ${indicators.macd?.status} | MA ${indicators.ma?.status}
🎯 مستويات: مقاومة ${levels.resistance} | دعم ${levels.support}

💡 التوصية: ${trend === 'صاعد' ? 'ابحث عن فرص شراء عند الدعم' : trend === 'هبوطي' ? 'ابحث عن فرص بيع عند المقاومة' : 'انتظر اختراق واضح'}`;
}
