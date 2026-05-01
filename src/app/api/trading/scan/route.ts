import { NextRequest, NextResponse } from 'next/server';
import { CANDLESTICK_KNOWLEDGE, PAIRS } from '@/lib/trading-knowledge';
import { chatCompletion } from '@/lib/ai';
import { fetchMultiplePrices } from '@/lib/market-data';

export const maxDuration = 30;

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

    const summaryData = validPairs
      .map(p => `${p.pair}: ${p.price} (${p.changePercent >= 0 ? '+' : ''}${p.changePercent.toFixed(2)}%)`)
      .join(' | ');

    const aiSummary = await chatCompletion({
      systemPrompt: `You are a market scanner. Given real prices, identify the top 3 trading opportunities. Be concise - 150 words max. Respond in English.`,
      userMessage: `Scan: ${summaryData}. Top 3 opportunities?`,
      maxTokens: 300,
    });

    // Score pairs with enhanced logic
    const results = validPairs.map(p => {
      const range = p.high - p.low;
      const position = range > 0 ? (p.price - p.low) / range : 0.5;
      let score = 50;
      let opportunity = 'Medium';
      let trend = 'Sideways';

      // Use change percent for better trend detection
      if (p.changePercent < -0.5) {
        score += 15;
        trend = 'Oversold — Potential Bounce';
      } else if (p.changePercent > 0.5) {
        score += 15;
        trend = 'Overbought — Potential Reversal';
      } else if (position < 0.3) {
        score += 10;
        trend = 'Potentially Bullish';
      } else if (position > 0.7) {
        score += 10;
        trend = 'Potentially Bearish';
      }

      // High volatility = more opportunity
      const volatility = range / p.price * 100;
      if (volatility > 1.5) score += 5;

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
        rsi: position < 0.3 ? 28 : position > 0.7 ? 72 : Math.round(40 + position * 20),
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
