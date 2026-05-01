import { NextRequest, NextResponse } from 'next/server';
import { ICT_SCAN_SYSTEM_PROMPT, ICT_KNOWLEDGE } from '@/lib/ict-knowledge';
import { CANDLESTICK_KNOWLEDGE, PAIRS } from '@/lib/trading-knowledge';
import { chatCompletion } from '@/lib/ai';
import { fetchMultiplePrices } from '@/lib/market-data';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const pairsToScan = PAIRS.map(p => p.symbol);

    // Fetch REAL prices for all pairs
    const prices = await fetchMultiplePrices(pairsToScan);

    // Filter pairs with valid prices
    const validPairs = Object.entries(prices)
      .filter(([_, data]) => data.price > 0)
      .map(([pair, data]) => ({
        pair,
        price: data.price,
        high: data.high,
        low: data.low,
        name: PAIRS.find(p => p.symbol === pair)?.name || pair,
        category: PAIRS.find(p => p.symbol === pair)?.category || 'Other',
      }));

    if (validPairs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Could not fetch market prices. Please try again.',
      });
    }

    // Create summary for AI - concise
    const summaryData = validPairs
      .map(p => `${p.pair}: ${p.price} (${p.low}-${p.high})`)
      .join(' | ');

    const aiSummary = await chatCompletion({
      systemPrompt: `You are a market scanner. Given real prices, identify the top 3 trading opportunities. Be concise - 150 words max. Respond in English.`,
      userMessage: `Scan: ${summaryData}. Top 3 opportunities?`,
      maxTokens: 300,
    });

    // Score pairs
    const results = validPairs.map(p => {
      const range = p.high - p.low;
      const position = range > 0 ? (p.price - p.low) / range : 0.5;
      let score = 50;
      let opportunity = 'Medium';
      let trend = 'Sideways';

      if (position < 0.3) {
        score += 20;
        trend = 'Potentially Bullish';
      } else if (position > 0.7) {
        score += 20;
        trend = 'Potentially Bearish';
      }

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
        rsi: position < 0.3 ? 28 : position > 0.7 ? 72 : 50,
        opportunity,
        score,
      };
    });

    results.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      results,
      aiSummary: aiSummary || `🔍 Market Scan:\n\n${results.slice(0, 5).map((r, i) => `${i + 1}. ${r.pair} - ${r.currentPrice} - ${r.opportunity} Opportunity`).join('\n')}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ success: false, error: 'Market scan failed. Please try again.' }, { status: 500 });
  }
}
