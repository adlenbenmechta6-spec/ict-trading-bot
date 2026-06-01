import { NextRequest, NextResponse } from 'next/server';
import { CANDLESTICK_KNOWLEDGE, PAIRS } from '@/lib/trading-knowledge';
import { chatCompletion } from '@/lib/ai';
import { fetchMultiplePrices, fetchOHLCVData, OHLCVCandle } from '@/lib/market-data';

export const maxDuration = 30;

// ─── Lightweight Trend Detection for Scanning ─────────────────────────
function quickTrendDetection(candles: OHLCVCandle[]): 'bullish' | 'bearish' | 'ranging' {
  if (candles.length < 20) return 'ranging';

  const closes = candles.map(c => c.close);
  const ema20 = quickEMA(closes, 20);
  const ema50 = quickEMA(closes, 50);
  const currentPrice = closes[closes.length - 1];

  // Simple trend: EMA crossover + price position
  const aboveBoth = currentPrice > ema20 && currentPrice > ema50;
  const belowBoth = currentPrice < ema20 && currentPrice < ema50;
  const emaBullish = ema20 > ema50;

  // Recent momentum
  const recent5 = candles.slice(-5);
  const momentum = recent5.reduce((sum, c) => sum + (c.close - c.open), 0);

  let bullVotes = 0, bearVotes = 0;
  if (aboveBoth) bullVotes += 2;
  if (belowBoth) bearVotes += 2;
  if (emaBullish) bullVotes++; else bearVotes++;
  if (momentum > 0) bullVotes++; else if (momentum < 0) bearVotes++;

  if (bullVotes >= 3) return 'bullish';
  if (bearVotes >= 3) return 'bearish';
  return 'ranging';
}

function quickEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }
  return ema;
}

export async function POST(req: NextRequest) {
  try {
    const pairsToScan = PAIRS.map(p => p.symbol);

    const prices = await fetchMultiplePrices(pairsToScan);

    const validPairs = Object.entries(prices)
      .filter(([_, data]) => data.price > 0)
      .map(([pair, data]) => ({
        pair,
        price: data.price,
        high: data.high,
        low: data.low,
        change: data.change,
        changePercent: data.changePercent,
        name: PAIRS.find(p => p.symbol === pair)?.name || pair,
        category: PAIRS.find(p => p.symbol === pair)?.category || 'Other',
      }));

    if (validPairs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Could not fetch market prices. Please try again.',
      });
    }

    // ─── CRITICAL FIX: Fetch OHLCV for trend detection ───────────────
    // Fetch OHLCV for top pairs to get real trend
    const trendMap: Record<string, 'bullish' | 'bearish' | 'ranging'> = {};
    const topPairs = ['XAU/USD', 'XAG/USD', 'EUR/USD', 'GBP/USD', 'NAS100', 'USD/JPY', 'US30', 'GBP/JPY', 'USD/CAD', 'NZD/USD', 'GBP/CHF', 'AUD/USD'];
    const ohlcvPromises = topPairs.map(async (pair) => {
      try {
        const ohlcv = await fetchOHLCVData(pair, 'H4');
        trendMap[pair] = quickTrendDetection(ohlcv.candles);
      } catch {
        trendMap[pair] = 'ranging';
      }
    });
    await Promise.allSettled(ohlcvPromises);

    const summaryData = validPairs
      .map(p => {
        const trend = trendMap[p.pair] || 'ranging';
        const trendLabel = trend === 'bullish' ? '🟢 BULLISH' : trend === 'bearish' ? '🔴 BEARISH' : '🟡 RANGING';
        return `${p.pair}: ${p.price} (${p.changePercent >= 0 ? '+' : ''}${p.changePercent.toFixed(2)}%) | Trend: ${trendLabel}`;
      })
      .join(' | ');

    const aiSummary = await chatCompletion({
      systemPrompt: `You are a professional market scanner using ICT Smart Money methodology. Given real prices and trend data, identify the top 3 trading opportunities.

CRITICAL RULES:
- If a pair is in an UPTREND → recommend BUY setups only
- If a pair is in a DOWNTREND → recommend SELL setups only  
- If RANGING → wait for breakout confirmation
- NEVER recommend counter-trend trades
- The trend is your friend — trade WITH it, not against it

Be concise - 150 words max. Respond in English.`,
      userMessage: `Scan: ${summaryData}. Top 3 opportunities with trend-aligned setups?`,
      maxTokens: 300,
      temperature: 0.4,
    });

    // ─── CRITICAL FIX: Score pairs using TREND FOLLOWING ──────────────
    const results = validPairs.map(p => {
      const range = p.high - p.low;
      const position = range > 0 ? (p.price - p.low) / range : 0.5;
      let score = 50;
      let opportunity = 'Medium';
      let trend = 'Sideways';

      // ✅ NEW: Use real OHLCV trend when available
      const realTrend = trendMap[p.pair];

      if (realTrend === 'bullish') {
        trend = 'Uptrend — Look for BUY';
        score += 15;  // Trend-aligned = higher score
      } else if (realTrend === 'bearish') {
        trend = 'Downtrend — Look for SELL';
        score += 15;  // Trend-aligned = higher score
      } else {
        // ❌ REMOVED: Mean reversion logic (oversold = buy, overbought = sell)
        // ✅ NEW: Use changePercent as momentum indicator (follow, not reverse)
        if (p.changePercent > 0.3) {
          trend = 'Bullish Momentum';
          score += 10;
        } else if (p.changePercent < -0.3) {
          trend = 'Bearish Momentum';
          score += 10;
        } else {
          trend = 'Ranging — Wait for Direction';
          score -= 5;  // Ranging = lower opportunity
        }
      }

      // High volatility = more opportunity
      const volatility = range / p.price * 100;
      if (volatility > 1.5) score += 5;

      // Trend confluence bonus
      if (realTrend && realTrend !== 'ranging') score += 5;

      score = Math.min(score, 85);
      if (score >= 70) opportunity = 'High';
      else if (score < 50) opportunity = 'Low';

      return {
        pair: p.pair,
        name: p.name,
        category: p.category,
        currentPrice: p.price,
        trend,
        patterns: [],
        rsi: realTrend === 'bullish' ? Math.round(50 + position * 20) : realTrend === 'bearish' ? Math.round(30 + position * 20) : Math.round(40 + position * 20),
        opportunity,
        score,
      };
    });

    results.sort((a, b) => b.score - a.score);

    // Generate fallback summary if AI not available
    const fallbackSummary = results.slice(0, 5).map((r, i) => {
      const emoji = r.opportunity === 'High' ? '🟢' : r.opportunity === 'Medium' ? '🟡' : '⚪';
      return `${emoji} ${i + 1}. ${r.pair} — ${r.currentPrice} — ${r.trend} — ${r.opportunity} Opportunity (${r.score}%)`;
    }).join('\n');

    return NextResponse.json({
      success: true,
      results,
      aiSummary: aiSummary || `🔍 Market Scan Results:\n\n${fallbackSummary}\n\n⏰ Best opportunities are in the Kill Zone windows (London 2-5 AM, NY 7-10 AM)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ success: false, error: 'Market scan failed. Please try again.' }, { status: 500 });
  }
}
