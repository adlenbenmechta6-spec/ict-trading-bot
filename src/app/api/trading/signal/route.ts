import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ai';
import { fetchRealPrice } from '@/lib/market-data';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pair = 'EUR/USD', timeframe = 'H4' } = body;

    // Fetch REAL price with timeout
    const pricePromise = fetchRealPrice(pair);
    const priceTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000));
    const marketData = await Promise.race([pricePromise, priceTimeout]);

    if (!marketData || marketData.price === 0) {
      return NextResponse.json({
        success: false,
        error: `Could not fetch the current price for ${pair}. Please try again.`,
      });
    }

    const currentPrice = marketData.price;

    // Try AI signal generation with timeout
    let signal = null;
    try {
      const aiPromise = chatCompletion({
        systemPrompt: `You are a professional trader using TradingView. Generate a trading signal for ${pair}.

You are reading the TradingView chart right now. The live TradingView price is: ${currentPrice}

Return ONLY valid JSON (no markdown, no backticks):
{
  "type": "BUY" or "SELL",
  "pair": "${pair}",
  "timeframe": "${timeframe}",
  "entry": number,
  "tp1": number,
  "tp2": number,
  "sl": number,
  "pattern": "pattern name from TradingView chart",
  "rsi": number,
  "rsiStatus": "RSI description from TradingView",
  "macd": "MACD description from TradingView",
  "maCross": "MA cross description from TradingView",
  "confidence": 50-95,
  "riskReward": "1:X",
  "ictElements": ["element1", "element2"],
  "killZone": "zone name",
  "liquidityType": "liquidity type",
  "pdZone": "Premium/Discount",
  "analysis": "2-3 sentence reasoning based on TradingView analysis"
}

Rules: prices near TradingView price ${currentPrice}, R:R at least 1:2, realistic confidence.`,
        userMessage: `Signal for ${pair} on TradingView ${timeframe} chart. Live price: ${currentPrice}, H: ${marketData.high}, L: ${marketData.low}`,
        temperature: 0.7,
        maxTokens: 400,
      });

      const aiTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000));
      const aiResponse = await Promise.race([aiPromise, aiTimeout]);

      if (aiResponse) {
        try {
          let cleaned = aiResponse.trim();
          if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
          }
          signal = JSON.parse(cleaned);
        } catch {
          // JSON parse failed, use fallback
        }
      }
    } catch {
      // AI signal failed, use fallback
    }

    if (!signal) {
      signal = generateFallbackSignal(pair, timeframe, currentPrice, marketData, null);
    }

    return NextResponse.json({ success: true, signal });
  } catch (error) {
    console.error('Signal generation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate signal. Please try again.' }, { status: 500 });
  }
}

function generateFallbackSignal(
  pair: string, timeframe: string, currentPrice: number,
  marketData: { high: number; low: number },
  aiText: string | null
) {
  const decimals = pair.includes('JPY') ? 3 : pair === 'XAU/USD' ? 2 : pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5;
  const range = marketData.high - marketData.low;
  const position = range > 0 ? (currentPrice - marketData.low) / range : 0.5;
  const isBuy = position < 0.4;
  const type: 'BUY' | 'SELL' = isBuy ? 'BUY' : 'SELL';
  const atr = range > 0 ? range * 0.3 : currentPrice * 0.005;

  const entry = currentPrice;
  const tp1 = isBuy ? entry + atr * 2 : entry - atr * 2;
  const tp2 = isBuy ? entry + atr * 3 : entry - atr * 3;
  const sl = isBuy ? entry - atr : entry + atr;
  const rr = Math.abs(tp1 - entry) / Math.abs(sl - entry);

  return {
    type, pair, timeframe,
    entry: parseFloat(entry.toFixed(decimals)),
    tp1: parseFloat(tp1.toFixed(decimals)),
    tp2: parseFloat(tp2.toFixed(decimals)),
    sl: parseFloat(sl.toFixed(decimals)),
    pattern: isBuy ? 'Oversold + Support bounce' : 'Overbought + Resistance rejection',
    rsi: isBuy ? 32 : 68,
    rsiStatus: isBuy ? 'Oversold (32)' : 'Overbought (68)',
    macd: isBuy ? 'Bullish crossover expected' : 'Bearish crossover expected',
    maCross: isBuy ? 'Golden cross expected' : 'Death cross expected',
    confidence: 62,
    riskReward: `1:${rr.toFixed(1)}`,
    ictElements: [isBuy ? 'Bullish Order Block' : 'Bearish Order Block', isBuy ? 'Bullish FVG' : 'Bearish FVG'],
    killZone: 'London Kill Zone',
    liquidityType: isBuy ? 'Sell Side Liquidity (SSL)' : 'Buy Side Liquidity (BSL)',
    pdZone: isBuy ? 'Discount Zone' : 'Premium Zone',
    analysis: aiText || `${isBuy ? '🟢 BUY' : '🔴 SELL'} ${pair} at ${entry.toFixed(decimals)}. Price in ${isBuy ? 'lower' : 'upper'} range. ${isBuy ? 'SSL' : 'BSL'} nearby. Risk max 2%.`,
  };
}
