import { NextRequest, NextResponse } from 'next/server';
import { ICT_ANALYSIS_SYSTEM_PROMPT, ICT_KNOWLEDGE } from '@/lib/ict-knowledge';
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

    const aiAnalysis = await chatCompletion({
      systemPrompt: ICT_ANALYSIS_SYSTEM_PROMPT + '\n\n' + CANDLESTICK_KNOWLEDGE + '\n\n' + ICT_KNOWLEDGE + `

You are a professional market analyst combining Japanese Candlesticks (Fred K.H. Tam's book) and ICT Smart Money (Ayub Rana's book).
The current price of ${pair} is ${currentPrice} (real-time market price).
You are using TradingView to analyze the chart.

Provide a comprehensive, realistic analysis including:
1. Current trend (bullish/bearish/sideways) with reasoning
2. Potential candlestick patterns on the chart
3. ICT elements (Order Blocks, FVG, Liquidity, Market Structure Shift)
4. Technical indicators (RSI, MACD, Moving Averages)
5. Real support and resistance levels
6. Final recommendation

Be realistic and professional. Prices you mention should be close to the current price of ${currentPrice}.
Respond in English. Be detailed but organized.`,
      userMessage: `Perform a comprehensive analysis for ${pair} on the ${timeframe} timeframe.

Current real price: ${currentPrice}
Today's high: ${marketData.high}
Today's low: ${marketData.low}

As if you're looking at a TradingView chart right now - what do you see? What are the trading opportunities?`,
      temperature: 0.7,
      maxTokens: 1500,
    });

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

  return `📊 Comprehensive Analysis for ${pair}

🔷 Current Price: ${currentPrice}
🔷 Trend: ${trend}
🔷 Daily Range: ${marketData.low} - ${marketData.high}
🔷 Price Position: ${position}% of daily range

🕯️ Candlestick Analysis:
Price is trading ${parseFloat(position) < 40 ? 'in the lower zone, indicating potential bullish reversal' : parseFloat(position) > 60 ? 'in the upper zone, indicating potential bearish correction' : 'near the middle, indicating indecision'}

🏦 ICT Analysis:
${parseFloat(position) < 40 ? '✅ Price is in Discount zone - favorable environment for buying' : '⚠️ Price is in Premium zone - wait for correction'}
💧 Liquidity: ${parseFloat(position) < 40 ? 'Sell Side Liquidity likely below the lows' : 'Buy Side Liquidity likely above the highs'}

💡 Recommendation: ${trend === 'Bullish' ? 'Look for buying opportunities at support' : trend === 'Bearish' ? 'Look for selling opportunities at resistance' : 'Wait for clear directional confirmation'}`;
}
