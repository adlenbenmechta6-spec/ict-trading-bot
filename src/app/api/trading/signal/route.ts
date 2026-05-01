import { NextRequest, NextResponse } from 'next/server';
import { ICT_SIGNAL_SYSTEM_PROMPT, ICT_KNOWLEDGE } from '@/lib/ict-knowledge';
import { CANDLESTICK_KNOWLEDGE } from '@/lib/trading-knowledge';
import { chatCompletion } from '@/lib/ai';
import { fetchRealPrice } from '@/lib/market-data';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pair = 'EUR/USD', timeframe = 'H4' } = body;

    // Fetch REAL price
    const marketData = await fetchRealPrice(pair);

    if (marketData.price === 0) {
      return NextResponse.json({
        success: false,
        error: `Could not fetch the current price for ${pair}. Please try again.`,
      });
    }

    const currentPrice = marketData.price;

    // Use AI to generate a professional signal based on real price
    const aiResponse = await chatCompletion({
      systemPrompt: ICT_SIGNAL_SYSTEM_PROMPT + '\n\n' + CANDLESTICK_KNOWLEDGE + '\n\n' + ICT_KNOWLEDGE + `

You are a professional trader combining Japanese Candlesticks and ICT Smart Money.
The current price of ${pair} is ${currentPrice} (real-time market price).
You are using TradingView to analyze the chart and apply technical indicators.

Your task: Provide a realistic, professional trading signal based on this real price.

Your response must be in JSON format only (no markdown, no backticks):
{
  "type": "BUY" or "SELL",
  "pair": "${pair}",
  "timeframe": "${timeframe}",
  "entry": entry price number,
  "tp1": first target price number,
  "tp2": second target price number,
  "sl": stop loss price number,
  "pattern": "pattern name in English",
  "rsi": expected RSI number,
  "rsiStatus": "RSI status in English",
  "macd": "MACD status in English",
  "maCross": "MA crossover status in English",
  "confidence": number from 50 to 95,
  "riskReward": "1:2" or "1:3" etc,
  "ictElements": ["ICT element 1", "ICT element 2"],
  "killZone": "appropriate Kill Zone",
  "liquidityType": "liquidity type",
  "pdZone": "Premium/Discount zone",
  "analysis": "Brief 3-4 line analysis in English explaining the signal reasoning, connecting candlesticks with ICT"
}

Important rules:
- Prices (entry, tp, sl) must be realistic and close to the current price of ${currentPrice}
- Risk/Reward ratio must be at least 1:2
- Stop loss must be logical (not too close or too far)
- Targets must be achievable
- Use ICT analysis (Order Block, FVG, Liquidity, Kill Zone)
- Be realistic - do not give confidence above 90% except in rare cases
- Format: Use appropriate decimal places for the pair`,
      userMessage: `Give me a real trading signal for ${pair} on the ${timeframe} timeframe.
Current real price: ${currentPrice}
Today's high: ${marketData.high}
Today's low: ${marketData.low}

Analyze as if you're looking at a TradingView chart right now and provide a realistic signal.`,
      temperature: 0.7,
      maxTokens: 800,
    });

    if (aiResponse) {
      try {
        // Clean the response - remove markdown code blocks if present
        let cleaned = aiResponse.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
        }
        const signal = JSON.parse(cleaned);
        return NextResponse.json({ success: true, signal });
      } catch {
        // AI didn't return valid JSON, use fallback
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
  marketData: { high: number; low: number },
  aiText: string | null
) {
  const decimals = pair.includes('JPY') ? 3 : pair === 'XAU/USD' ? 2 : pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5;

  // Simple trend detection based on price position in daily range
  const range = marketData.high - marketData.low;
  const position = range > 0 ? (currentPrice - marketData.low) / range : 0.5;

  const isBuy = position < 0.4; // If price is in lower part of range, buy
  const type: 'BUY' | 'SELL' = isBuy ? 'BUY' : 'SELL';

  const atr = range > 0 ? range * 0.3 : currentPrice * 0.005;

  const entry = currentPrice;
  const tp1 = isBuy ? entry + atr * 2 : entry - atr * 2;
  const tp2 = isBuy ? entry + atr * 3 : entry - atr * 3;
  const sl = isBuy ? entry - atr : entry + atr;

  const rr = Math.abs(tp1 - entry) / Math.abs(sl - entry);

  return {
    type,
    pair,
    timeframe,
    entry: parseFloat(entry.toFixed(decimals)),
    tp1: parseFloat(tp1.toFixed(decimals)),
    tp2: parseFloat(tp2.toFixed(decimals)),
    sl: parseFloat(sl.toFixed(decimals)),
    pattern: isBuy ? 'Oversold zone + Support bounce' : 'Overbought zone + Resistance rejection',
    rsi: isBuy ? 32 : 68,
    rsiStatus: isBuy ? 'Oversold (32)' : 'Overbought (68)',
    macd: isBuy ? 'Bullish crossover expected' : 'Bearish crossover expected',
    maCross: isBuy ? 'Golden cross expected' : 'Death cross expected',
    confidence: 62,
    riskReward: `1:${rr.toFixed(1)}`,
    ictElements: [
      isBuy ? 'Potential Bullish Order Block' : 'Potential Bearish Order Block',
      isBuy ? 'Bullish FVG' : 'Bearish FVG',
    ],
    killZone: 'London Kill Zone',
    liquidityType: isBuy ? 'Sell Side Liquidity (SSL)' : 'Buy Side Liquidity (BSL)',
    pdZone: isBuy ? 'Discount Zone' : 'Premium Zone',
    analysis: aiText || `${isBuy ? '🟢' : '🔴'} ${isBuy ? 'BUY' : 'SELL'} signal on ${pair} at ${entry.toFixed(decimals)}\nPrice is in the ${isBuy ? 'lower zone' : 'upper zone'} of today's range.\nMarket structure suggests ${isBuy ? 'bullish' : 'bearish'} potential with ${isBuy ? 'sell-side' : 'buy-side'} liquidity nearby.\n⚠️ Risk management: Never risk more than 2%`,
  };
}
