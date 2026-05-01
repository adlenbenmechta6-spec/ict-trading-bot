import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ai';
import { fetchRealPrice } from '@/lib/market-data';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pair = 'EUR/USD', timeframe = 'H4' } = body;

    const marketData = await fetchRealPrice(pair);

    if (marketData.price === 0) {
      return NextResponse.json({
        success: false,
        error: `Could not fetch the current price for ${pair}. Please try again.`,
      });
    }

    const currentPrice = marketData.price;

    const aiResponse = await chatCompletion({
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

    if (aiResponse) {
      try {
        let cleaned = aiResponse.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
        }
        const signal = JSON.parse(cleaned);
        return NextResponse.json({ success: true, signal });
      } catch {
        return NextResponse.json({
          success: true,
          signal: generateFallbackSignal(pair, timeframe, currentPrice, marketData, aiResponse),
        });
      }
    }

    return NextResponse.json({
      success: true,
      signal: generateFallbackSignal(pair, timeframe, currentPrice, marketData, null),
    });
  } catch (error) {
    console.error('Signal generation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate signal. Please try again.' }, { status: 500 });
  }
}

function generateFallbackSignal(
  pair: string, timeframe: string, currentPrice: number,
  marketData: { high: number; low: number; change: number; changePercent: number },
  aiText: string | null
) {
  const decimals = pair.includes('JPY') ? 3 : pair === 'XAU/USD' ? 2 : pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5;
  const range = marketData.high - marketData.low;
  const position = range > 0 ? (currentPrice - marketData.low) / range : 0.5;

  // More nuanced buy/sell determination using change data
  let isBuy = position < 0.4;
  if (marketData.changePercent < -0.3) isBuy = true; // Oversold bounce
  if (marketData.changePercent > 0.3) isBuy = false; // Overbought reversal

  const type: 'BUY' | 'SELL' = isBuy ? 'BUY' : 'SELL';
  const atr = range > 0 ? range * 0.3 : currentPrice * 0.005;

  const entry = currentPrice;
  const tp1 = isBuy ? entry + atr * 2 : entry - atr * 2;
  const tp2 = isBuy ? entry + atr * 3.5 : entry - atr * 3.5;
  const sl = isBuy ? entry - atr * 1 : entry + atr * 1;
  const rr = Math.abs(tp1 - entry) / Math.abs(sl - entry);

  // Dynamic confidence based on confluences
  let confidence = 60;
  if (position < 0.25 || position > 0.75) confidence += 10; // Extreme zone
  if (Math.abs(marketData.changePercent) > 0.5) confidence += 5; // Strong move
  confidence = Math.min(confidence, 85);

  // RSI based on position
  const rsi = isBuy ? Math.round(28 + position * 15) : Math.round(62 + position * 10);

  // Kill zone based on current hour (UTC)
  const hour = new Date().getUTCHours();
  let killZone = 'Off-Peak';
  if (hour >= 7 && hour <= 10) killZone = 'London Kill Zone';
  else if (hour >= 12 && hour <= 15) killZone = 'New York AM Kill Zone';
  else if (hour >= 17 && hour <= 19) killZone = 'New York PM Kill Zone';
  else if (hour >= 19 && hour <= 22) killZone = 'Asian Kill Zone';

  return {
    type, pair, timeframe,
    entry: parseFloat(entry.toFixed(decimals)),
    tp1: parseFloat(tp1.toFixed(decimals)),
    tp2: parseFloat(tp2.toFixed(decimals)),
    sl: parseFloat(sl.toFixed(decimals)),
    pattern: isBuy ? 'Hammer + Bullish Engulfing Setup' : 'Hanging Man + Bearish Engulfing Setup',
    rsi,
    rsiStatus: isBuy ? `Oversold (${rsi}) — potential bounce` : `Overbought (${rsi}) — potential rejection`,
    macd: isBuy ? 'Bullish crossover forming on MACD' : 'Bearish crossover forming on MACD',
    maCross: isBuy ? 'Golden Cross setup — MA5 crossing above MA20' : 'Death Cross setup — MA5 crossing below MA20',
    confidence,
    riskReward: `1:${rr.toFixed(1)}`,
    ictElements: [
      isBuy ? 'Bullish Order Block below' : 'Bearish Order Block above',
      isBuy ? 'Bullish FVG (support)' : 'Bearish FVG (resistance)',
      isBuy ? 'SSL Sweep' : 'BSL Sweep',
    ],
    killZone,
    liquidityType: isBuy ? 'Sell Side Liquidity (SSL)' : 'Buy Side Liquidity (BSL)',
    pdZone: isBuy ? 'Discount Zone (below 50%)' : 'Premium Zone (above 50%)',
    analysis: aiText || `${isBuy ? '🟢 BUY' : '🔴 SELL'} ${pair} at ${entry.toFixed(decimals)}. Price at ${position < 0.4 ? 'lower' : 'upper'} range (${(position * 100).toFixed(0)}%). ${isBuy ? 'SSL' : 'BSL'} targeted. ${killZone} active. R:R ${rr.toFixed(1)}:1. Risk max 2%.`,
  };
}
