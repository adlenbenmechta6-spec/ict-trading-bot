import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ai';
import { fetchRealPrice } from '@/lib/market-data';

// Set max duration for this API route
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

    // Use AI with timeout for faster response
    let aiAnalysis: string | null = null;
    try {
      const aiPromise = chatCompletion({
        systemPrompt: `You are a professional market analyst combining Japanese Candlesticks and ICT Smart Money.

You are reading the TradingView chart for ${pair} on ${timeframe} timeframe right now.
The live price from TradingView is: ${currentPrice}

Analyze as if you are looking at the TradingView chart. Provide:
1. Current trend (bullish/bearish/sideways) with reason
2. Candlestick patterns visible on the TradingView chart
3. ICT elements (Order Block, FVG, Liquidity, MSS)
4. TradingView indicators (RSI, MACD, Moving Averages, Bollinger Bands)
5. Support & Resistance levels
6. Trading recommendation

All prices must be realistic and near the TradingView price of ${currentPrice}.
Be concise and professional. Respond in English.`,
        userMessage: `Analyze ${pair} on TradingView ${timeframe} chart. Live price from TradingView: ${currentPrice}, Today's high: ${marketData.high}, Today's low: ${marketData.low}. Be concise - 400 words max.`,
        temperature: 0.7,
        maxTokens: 600,
      });

      const aiTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000));
      aiAnalysis = await Promise.race([aiPromise, aiTimeout]);
    } catch {
      // AI analysis failed, use fallback
    }

    // Determine trend from analysis text
    let trend = 'Sideways';
    if (aiAnalysis) {
      const lowerText = aiAnalysis.toLowerCase();
      if ((lowerText.includes('bullish') || lowerText.includes('uptrend')) && !lowerText.includes('not bullish')) {
        trend = 'Bullish';
      } else if ((lowerText.includes('bearish') || lowerText.includes('downtrend')) && !lowerText.includes('not bearish')) {
        trend = 'Bearish';
      }
    }

    return NextResponse.json({
      success: true,
      pair,
      timeframe,
      currentPrice,
      trend,
      high: marketData.high,
      low: marketData.low,
      aiAnalysis: aiAnalysis || generateLocalAnalysis(pair, currentPrice, marketData, trend),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ success: false, error: 'Analysis failed. Please try again.' }, { status: 500 });
  }
}

function generateLocalAnalysis(
  pair: string, currentPrice: number,
  marketData: { high: number; low: number }, trend: string
): string {
  const range = marketData.high - marketData.low;
  const position = range > 0 ? ((currentPrice - marketData.low) / range * 100).toFixed(0) : '50';

  return `📊 ${pair} Analysis (${trend})

🔷 Price: ${currentPrice} | Range: ${marketData.low} - ${marketData.high}
🔷 Position: ${position}% of daily range

🕯️ Candlestick Analysis:
Price is ${parseFloat(position) < 40 ? 'in the lower zone - potential bullish reversal' : parseFloat(position) > 60 ? 'in the upper zone - potential bearish correction' : 'near middle - indecision'}

🏦 ICT Analysis:
${parseFloat(position) < 40 ? '✅ Discount zone - favorable for buying' : '⚠️ Premium zone - wait for correction'}
💧 Liquidity: ${parseFloat(position) < 40 ? 'Sell Side Liquidity below lows' : 'Buy Side Liquidity above highs'}

💡 Recommendation: ${trend === 'Bullish' ? 'Look for buy setups at support' : trend === 'Bearish' ? 'Look for sell setups at resistance' : 'Wait for clear directional confirmation'}`;
}
