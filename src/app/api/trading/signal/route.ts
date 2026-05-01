import { NextRequest, NextResponse } from 'next/server';
import { SIGNAL_SYSTEM_PROMPT, CANDLESTICK_KNOWLEDGE } from '@/lib/trading-knowledge';
import { ICT_KNOWLEDGE, ICT_SIGNAL_SYSTEM_PROMPT } from '@/lib/ict-knowledge';
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
import {
  detectAllICTPatterns,
  calculatePDZones,
  getCurrentKillZone,
} from '@/lib/ict-patterns';

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

    // Candlestick patterns
    const patterns = detectAllPatterns(candles);

    // ICT patterns
    const ictPatterns = detectAllICTPatterns(candles);
    const pdZones = calculatePDZones(candles);
    const killZone = getCurrentKillZone();

    // Technical indicators
    const rsi = calculateRSI(candles);
    const macd = calculateMACD(candles);
    const ma5 = calculateMovingAverage(candles, 5);
    const ma20 = calculateMovingAverage(candles, 20);
    const bb = calculateBollingerBands(candles);
    const stoch = calculateStochastic(candles);

    // Determine signal direction using BOTH candlestick + ICT
    const bullishCandlePatterns = patterns.filter(p => p.type === 'bullish_reversal' || p.type === 'bullish_continuation');
    const bearishCandlePatterns = patterns.filter(p => p.type === 'bearish_reversal' || p.type === 'bearish_continuation');
    const bullishICT = ictPatterns.filter(p => p.type === 'bullish');
    const bearishICT = ictPatterns.filter(p => p.type === 'bearish');

    let signalType: 'BUY' | 'SELL' = 'BUY';
    let confidence = 50;
    let dominantPattern = patterns[0];

    const bullScore = bullishCandlePatterns.length + bullishICT.length * 1.5;
    const bearScore = bearishCandlePatterns.length + bearishICT.length * 1.5;

    if (bullScore > bearScore) {
      signalType = 'BUY';
      dominantPattern = bullishCandlePatterns[0] || bullishICT[0];
      confidence = 55 + Math.floor(bullScore * 8);
    } else if (bearScore > bullScore) {
      signalType = 'SELL';
      dominantPattern = bearishCandlePatterns[0] || bearishICT[0];
      confidence = 55 + Math.floor(bearScore * 8);
    }

    // Indicator confluence
    if (signalType === 'BUY') {
      if (rsi < 30) confidence += 10;
      if (macd.histogram > 0) confidence += 8;
      if (ma5 > ma20) confidence += 7;
      if (stoch.k < 20) confidence += 5;
      // ICT confluence
      const currentPrice = candles[candles.length - 1].close;
      if (currentPrice < pdZones.equilibrium) confidence += 8; // In discount zone
    } else {
      if (rsi > 70) confidence += 10;
      if (macd.histogram < 0) confidence += 8;
      if (ma5 < ma20) confidence += 7;
      if (stoch.k > 80) confidence += 5;
      const currentPrice = candles[candles.length - 1].close;
      if (currentPrice > pdZones.equilibrium) confidence += 8; // In premium zone
    }

    confidence = Math.min(confidence, 96);

    // Calculate entry, TP, SL (ICT-style: R:R 1:3)
    const currentPrice = candles[candles.length - 1].close;
    const atr = candles[candles.length - 1].high - candles[candles.length - 1].low;
    const decimals = pair.includes('JPY') ? 3 : pair === 'XAU/USD' ? 2 : 5;

    const entry = currentPrice;
    let tp1: number, tp2: number, sl: number;

    if (signalType === 'BUY') {
      tp1 = parseFloat((entry + atr * 2).toFixed(decimals));
      tp2 = parseFloat((entry + atr * 3).toFixed(decimals));
      sl = parseFloat((entry - atr * 1).toFixed(decimals));
    } else {
      tp1 = parseFloat((entry - atr * 2).toFixed(decimals));
      tp2 = parseFloat((entry - atr * 3).toFixed(decimals));
      sl = parseFloat((entry + atr * 1).toFixed(decimals));
    }

    const riskReward = parseFloat((Math.abs(tp1 - entry) / Math.abs(sl - entry)).toFixed(1));

    // Build ICT elements list
    const ictElements: string[] = [];
    const liquidityType = signalType === 'BUY' ? 'Sell Side Liquidity (SSL)' : 'Buy Side Liquidity (BSL)';
    const pdZone = signalType === 'BUY' ? 'منطقة خصم (Discount)' : 'منطقة علاوة (Premium)';

    for (const p of ictPatterns.slice(0, 3)) {
      ictElements.push(p.nameAr);
    }
    if (ictElements.length === 0) {
      ictElements.push(signalType === 'BUY' ? 'أوردر بلوك صعودي محتمل' : 'أوردر بلوك هبوطي محتمل');
      ictElements.push(signalType === 'BUY' ? 'FVG صعودي محتمل' : 'FVG هبوطي محتمل');
    }

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
        ictElements,
        killZone: killZone.active ? killZone.nameAr : killZone.nextKillZoneAr,
        liquidityType,
        pdZone,
        timestamp: new Date().toISOString(),
      },
    };

    // AI enhanced analysis with ICT knowledge
    const ictPatternsStr = ictPatterns.map(p => `${p.nameAr} (${p.name}) - ${p.descriptionAr}`).join('\n');

    const aiAnalysis = await chatCompletion({
      systemPrompt: ICT_SIGNAL_SYSTEM_PROMPT + '\n\n' + CANDLESTICK_KNOWLEDGE + '\n\n' + ICT_KNOWLEDGE,
      userMessage: `حلل زوج ${pair} على الإطار ${timeframe} وأعطني إشارة تداول تجمع بين الشموع اليابانية و ICT.

أنماط الشموع: ${patterns.map(p => p.nameAr).join(', ') || 'لا توجد'}
عناصر ICT: ${ictPatternsStr || 'لا توجد'}
المؤشرات: RSI=${rsi}, MACD=${macdCross}, MA=${maCross}
السيولة: ${liquidityType}
المنطقة: ${pdZone}
الكيل زون: ${killZone.active ? killZone.nameAr : killZone.nextKillZoneAr}
السعر: ${currentPrice}

أعطني تحليلاً مختصراً بالعربية (3-4 أسطر) يربط الشموع بـ ICT مع التوصية.`,
      maxTokens: 500,
    });

    (result.signal as Record<string, unknown>).aiAnalysis = aiAnalysis || generateLocalAnalysis(
      signalType, pair, dominantPattern, rsiStatus, macdCross, maCross, confidence, ictElements, killZone
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Signal generation error:', error);
    return NextResponse.json({ success: false, error: 'فشل في توليد الإشارة' }, { status: 500 });
  }
}

function generateLocalAnalysis(
  signalType: string, pair: string,
  pattern: { nameAr: string; descriptionAr: string } | undefined,
  rsiStatus: string, macdCross: string, maCross: string, confidence: number,
  ictElements: string[], killZone: { nameAr: string; active: boolean; nextKillZoneAr: string }
): string {
  const dir = signalType === 'BUY' ? 'شراء' : 'بيع';
  const emoji = signalType === 'BUY' ? '🟢' : '🔴';
  return `${emoji} إشارة ${dir} على ${pair}

🕯️ النمط: ${pattern?.nameAr || 'غير واضح'}
🏦 ICT: ${ictElements.join(' + ')}
📊 RSI: ${rsiStatus} | MACD: ${macdCross}
⏰ ${killZone.active ? killZone.nameAr : `التالي: ${killZone.nextKillZoneAr}`}
📈 الثقة: ${confidence}% | ⚠️ R:R 1:3 حسب ICT`;
}
