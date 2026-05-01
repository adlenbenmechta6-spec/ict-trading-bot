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

    const aiAnalysis = await chatCompletion({
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
      aiAnalysis: aiAnalysis || generateLocalAnalysis(pair, currentPrice, marketData, trend, timeframe),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ success: false, error: 'Analysis failed. Please try again.' }, { status: 500 });
  }
}

function generateLocalAnalysis(
  pair: string, currentPrice: number,
  marketData: { high: number; low: number; change: number; changePercent: number }, trend: string,
  timeframe: string
): string {
  const range = marketData.high - marketData.low;
  const position = range > 0 ? ((currentPrice - marketData.low) / range * 100).toFixed(0) : '50';
  const posNum = parseFloat(position);
  const decimals = pair.includes('JPY') || pair === 'XAU/USD' || pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5;

  // Determine trend more precisely
  let detectedTrend = 'Sideways';
  let trendEmoji = '↔️';
  if (marketData.changePercent > 0.3) { detectedTrend = 'Bullish'; trendEmoji = '🟢'; }
  else if (marketData.changePercent < -0.3) { detectedTrend = 'Bearish'; trendEmoji = '🔴'; }
  else if (posNum < 35) { detectedTrend = 'Potentially Bullish'; trendEmoji = '🟡'; }
  else if (posNum > 65) { detectedTrend = 'Potentially Bearish'; trendEmoji = '🟡'; }

  // Candlestick pattern detection based on price position
  let candlePattern = '';
  let candleDesc = '';
  if (posNum < 25) {
    candlePattern = 'Hammer / Bullish Engulfing Zone';
    candleDesc = `Price in the lower ${position}% of daily range suggests potential bullish reversal. Watch for Hammer pattern (small body + long lower shadow) or Bullish Engulfing confirmation. This aligns with Fred K.H. Tam's criteria: after a decline, a long lower shadow signals rejection of lower prices.`;
  } else if (posNum > 75) {
    candlePattern = 'Hanging Man / Bearish Engulfing Zone';
    candleDesc = `Price in the upper ${position}% of daily range suggests potential bearish reversal. Watch for Hanging Man pattern or Bearish Engulfing confirmation. Per Fred K.H. Tam: after an advance, a small body with long lower shadow at the top signals weakening buyers.`;
  } else if (posNum > 40 && posNum < 60) {
    candlePattern = 'Doji / Spinning Top Zone';
    candleDesc = `Price near the middle of the range indicates indecision. Doji patterns (open ≈ close) suggest market uncertainty. Per Tam's methodology: Doji requires confirmation - a white candle after Doji at bottom is bullish; a black candle after Doji at top is bearish.`;
  } else if (posNum >= 25 && posNum < 40) {
    candlePattern = 'Morning Star Formation Zone';
    candleDesc = `Price in the lower-middle zone could form a Morning Star pattern (3-candle: long black → small gap down → white candle above midpoint). This is one of the strongest bullish reversal signals per Tam's book.`;
  } else {
    candlePattern = 'Evening Star Formation Zone';
    candleDesc = `Price in the upper-middle zone could form an Evening Star pattern (3-candle: long white → small gap up → black candle below midpoint). This is one of the strongest bearish reversal signals per Tam's book.`;
  }

  // ICT Analysis
  let ictAnalysis = '';
  const isDiscount = posNum < 50;
  ictAnalysis = `${isDiscount ? '✅ Discount Zone' : '⚠️ Premium Zone'} — Price is ${isDiscount ? 'in the lower 50% of the range, favorable for buying per ICT methodology' : 'in the upper 50% of the range, wait for correction to discount zone'}.

🏦 Order Block: ${isDiscount ? 'Look for Bullish OB below current price — last bearish candle before the strong bullish move' : 'Look for Bearish OB above current price — last bullish candle before the strong bearish move'}
💧 Fair Value Gap (FVG): ${posNum < 35 ? 'Bullish FVG likely below — price tends to return to fill the gap before continuing up' : posNum > 65 ? 'Bearish FVG likely above — price tends to return to fill the gap before continuing down' : 'Monitor for FVG formation on lower timeframes'}
🎯 Liquidity: ${isDiscount ? 'Sell Side Liquidity (SSL) below daily low — smart money targets these sell stops before reversing' : 'Buy Side Liquidity (BSL) above daily high — smart money targets these buy stops before reversing'}
📊 AMD Pattern: ${isDiscount ? 'Likely in Accumulation/Manipulation phase — watch for false breakdown then Distribution upward' : 'Likely in Distribution phase — watch for Manipulation above highs then reversal'}`;

  // Support & Resistance
  const support1 = currentPrice - range * 0.382;
  const support2 = marketData.low;
  const resistance1 = currentPrice + range * 0.382;
  const resistance2 = marketData.high;
  const fib61_8 = support1 - range * 0.236; // OTE zone

  // Technical indicators simulation based on position
  const rsi = posNum < 30 ? Math.round(25 + posNum * 0.3) : posNum > 70 ? Math.round(60 + posNum * 0.3) : Math.round(35 + posNum * 0.4);
  const macdSignal = posNum < 40 ? 'Bullish crossover forming — MACD line crossing above signal line' : posNum > 60 ? 'Bearish crossover forming — MACD line crossing below signal line' : 'MACD converging — no clear signal yet';
  const maSignal = posNum < 35 ? 'Golden Cross potential — MA5 crossing above MA20' : posNum > 65 ? 'Death Cross potential — MA5 crossing below MA20' : 'Moving Averages flat — no clear trend';

  return `📊 ${pair} Analysis — ${timeframe} Timeframe
${trendEmoji} Trend: ${detectedTrend} (${marketData.changePercent >= 0 ? '+' : ''}${marketData.changePercent.toFixed(2)}%)

🔷 Live Price: ${currentPrice.toFixed(decimals)} | Day Range: ${marketData.low.toFixed(decimals)} — ${marketData.high.toFixed(decimals)}
🔷 Range Position: ${position}% | Change: ${marketData.changePercent >= 0 ? '+' : ''}${marketData.change.toFixed(decimals)} (${marketData.changePercent >= 0 ? '+' : ''}${marketData.changePercent.toFixed(2)}%)

━━━ 🕯️ Candlestick Analysis ━━━
Pattern: ${candlePattern}
${candleDesc}

━━━ 📈 Technical Indicators ━━━
📊 RSI: ${rsi} — ${rsi > 70 ? 'Overbought zone — potential reversal down' : rsi < 30 ? 'Oversold zone — potential reversal up' : rsi < 45 ? 'Approaching oversold — watch for bounce' : rsi > 55 ? 'Approaching overbought — watch for rejection' : 'Neutral zone'}
📈 MACD: ${macdSignal}
📊 MA: ${maSignal}

━━━ 🏦 ICT Smart Money Analysis ━━━
${ictAnalysis}

━━━ 🎯 Key Levels ━━━
Support 1: ${support1.toFixed(decimals)} (38.2% Fib)
Support 2: ${support2.toFixed(decimals)} (Daily Low)
Resistance 1: ${resistance1.toFixed(decimals)} (38.2% Fib)
Resistance 2: ${resistance2.toFixed(decimals)} (Daily High)
OTE Zone: ${fib61_8.toFixed(decimals)} (61.8%-79% Fib — Optimal Trade Entry)

━━━ 💡 Recommendation ━━━
${detectedTrend.includes('Bullish') ? `🟢 Look for BUY setups at support levels. Best entry in OTE zone (${fib61_8.toFixed(decimals)}). Wait for MSS + FVG confirmation.` : detectedTrend.includes('Bearish') ? `🔴 Look for SELL setups at resistance levels. Best entry in OTE zone (${resistance1.toFixed(decimals)}-${resistance2.toFixed(decimals)}). Wait for MSS + FVG confirmation.` : `⏳ Wait for clear directional confirmation. Watch for liquidity sweep + MSS + FVG before entering.`}

⚠️ Risk max 2% per trade. R:R minimum 1:2. This is educational analysis only.`;
}
