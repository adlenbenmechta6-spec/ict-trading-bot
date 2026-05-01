import { NextRequest, NextResponse } from 'next/server';
import { SIGNAL_SYSTEM_PROMPT, CANDLESTICK_KNOWLEDGE } from '@/lib/trading-knowledge';
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
    const bb = calculateBollingerBands(candles);
    const stoch = calculateStochastic(candles);

    const bullishPatterns = patterns.filter(p => p.type === 'bullish_reversal' || p.type === 'bullish_continuation');
    const bearishPatterns = patterns.filter(p => p.type === 'bearish_reversal' || p.type === 'bearish_continuation');

    let signalType: 'BUY' | 'SELL' = 'BUY';
    let confidence = 50;
    let dominantPattern = patterns[0];

    if (bullishPatterns.length > bearishPatterns.length) {
      signalType = 'BUY';
      dominantPattern = bullishPatterns[0];
      confidence = 60 + bullishPatterns.length * 10;
    } else if (bearishPatterns.length > bullishPatterns.length) {
      signalType = 'SELL';
      dominantPattern = bearishPatterns[0];
      confidence = 60 + bearishPatterns.length * 10;
    }

    if (signalType === 'BUY') {
      if (rsi < 30) confidence += 10;
      if (macd.histogram > 0) confidence += 8;
      if (ma5 > ma20) confidence += 7;
      if (stoch.k < 20) confidence += 5;
    } else {
      if (rsi > 70) confidence += 10;
      if (macd.histogram < 0) confidence += 8;
      if (ma5 < ma20) confidence += 7;
      if (stoch.k > 80) confidence += 5;
    }

    confidence = Math.min(confidence, 95);

    const currentPrice = candles[candles.length - 1].close;
    const atr = candles[candles.length - 1].high - candles[candles.length - 1].low;
    const entry = currentPrice;
    let tp1: number, tp2: number, sl: number;
    const decimals = pair.includes('JPY') ? 3 : pair === 'XAU/USD' ? 2 : 5;

    if (signalType === 'BUY') {
      tp1 = parseFloat((entry + atr * 1.5).toFixed(decimals));
      tp2 = parseFloat((entry + atr * 3).toFixed(decimals));
      sl = parseFloat((entry - atr * 1).toFixed(decimals));
    } else {
      tp1 = parseFloat((entry - atr * 1.5).toFixed(decimals));
      tp2 = parseFloat((entry - atr * 3).toFixed(decimals));
      sl = parseFloat((entry + atr * 1).toFixed(decimals));
    }

    const riskReward = parseFloat((Math.abs(tp1 - entry) / Math.abs(sl - entry)).toFixed(1));
    const maCross = ma5 > ma20 ? 'تقاطع ذهبي (MA5 > MA20)' : 'تقاطع ميت (MA5 < MA20)';
    const rsiStatus = rsi < 30 ? `تشبع بيعي (${rsi})` : rsi > 70 ? `تشبع شرائي (${rsi})` : `محايد (${rsi})`;
    const macdCross = macd.histogram > 0 ? 'تقاطع صعودي' : 'تقاطع هبوطي';

    const result: Record<string, unknown> = {
      success: true,
      signal: {
        type: signalType,
        pair,
        timeframe,
        entry: parseFloat(entry.toFixed(decimals)),
        tp1, tp2, sl,
        pattern: dominantPattern?.nameAr || 'لا يوجد نمط واضح',
        patternEn: dominantPattern?.name || 'No clear pattern',
        rsi, rsiStatus,
        macd: macdCross,
        maCross,
        confidence,
        riskReward,
        timestamp: new Date().toISOString(),
      },
    };

    // AI enhanced analysis
    const aiAnalysis = await chatCompletion({
      systemPrompt: SIGNAL_SYSTEM_PROMPT + '\n\n' + CANDLESTICK_KNOWLEDGE,
      userMessage: `حلل زوج ${pair} على الإطار الزمني ${timeframe} وأعطني إشارة تداول.

بيانات المؤشرات التقنية:
- RSI: ${rsi}
- MACD: ${macd.macd}, Signal: ${macd.signal}, Histogram: ${macd.histogram}
- MA5: ${ma5}, MA20: ${ma20}
- Bollinger Bands: Upper ${bb.upper}, Middle ${bb.middle}, Lower ${bb.lower}
- Stochastic: %K=${stoch.k}, %D=${stoch.d}

الأنماط المكتشفة: ${patterns.map(p => p.nameAr).join(', ') || 'لا توجد أنماط واضحة'}

السعر الحالي: ${currentPrice}

أعطني إشارة تداول مفصلة بالعربية تتضمن التحليل والسبب المنطقي والتوصية. كن مختصراً في 3-4 أسطر.`,
      maxTokens: 600,
    });

    if (aiAnalysis) {
      (result.signal as Record<string, unknown>).aiAnalysis = aiAnalysis;
    } else {
      (result.signal as Record<string, unknown>).aiAnalysis = generateLocalAnalysis(signalType, pair, dominantPattern, rsiStatus, macdCross, maCross, confidence);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Signal generation error:', error);
    return NextResponse.json({ success: false, error: 'فشل في توليد الإشارة' }, { status: 500 });
  }
}

function generateLocalAnalysis(
  signalType: string, pair: string,
  pattern: { nameAr: string; name: string; descriptionAr: string } | undefined,
  rsiStatus: string, macdCross: string, maCross: string, confidence: number
): string {
  const direction = signalType === 'BUY' ? 'شراء' : 'بيع';
  const emoji = signalType === 'BUY' ? '🟢' : '🔴';
  return `${emoji} إشارة ${direction} على زوج ${pair}

📊 التحليل:
${pattern ? `• نمط الشموع: ${pattern.nameAr} - ${pattern.descriptionAr}` : '• لا يوجد نمط شموع واضح'}
• RSI: ${rsiStatus} | MACD: ${macdCross} | MA: ${maCross}
📈 الثقة: ${confidence}% | ⚠️ استخدم إدارة المخاطر دائماً`;
}
