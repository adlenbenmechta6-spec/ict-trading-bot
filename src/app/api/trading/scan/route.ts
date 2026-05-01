import { NextRequest, NextResponse } from 'next/server';
import { ICT_SCAN_SYSTEM_PROMPT, ICT_KNOWLEDGE } from '@/lib/ict-knowledge';
import { CANDLESTICK_KNOWLEDGE, PAIRS } from '@/lib/trading-knowledge';
import { chatCompletion } from '@/lib/ai';
import { fetchMultiplePrices } from '@/lib/market-data';

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
        category: PAIRS.find(p => p.symbol === pair)?.category || 'أخرى',
      }));

    if (validPairs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'لم أتمكن من جلب أسعار السوق. حاول مرة أخرى.',
      });
    }

    // Create summary for AI
    const summaryData = validPairs
      .map(p => `${p.pair} (${p.name}): السعر ${p.price} | نطاق ${p.low}-${p.high} | ${p.category}`)
      .join('\n');

    const aiSummary = await chatCompletion({
      systemPrompt: ICT_SCAN_SYSTEM_PROMPT + '\n\n' + CANDLESTICK_KNOWLEDGE + '\n\n' + ICT_KNOWLEDGE + `

أنت ماسح أسواق محترف. هذه أسعار حقيقية من السوق الآن.
حلل الأزواج وحدد أفضل 3-5 فرص تداول.
لكل فرصة اذكر: الزوج، الاتجاه المتوقع، السبب المختصر، مستوى الفرصة.
كن مختصراً ومنظماً. تحدث بالعربية.`,
      userMessage: `فحص السوق - الأسعار الحقيقية الآن:\n\n${summaryData}\n\nأي الأزواج تقدم أفضل فرص تداول الآن؟ ولماذا؟`,
      maxTokens: 1000,
    });

    // Score pairs based on price position
    const results = validPairs.map(p => {
      const range = p.high - p.low;
      const position = range > 0 ? (p.price - p.low) / range : 0.5;
      let score = 50;
      let opportunity = 'متوسطة';
      let trend = 'عرضي';

      // Pairs near extremes may offer reversal opportunities
      if (position < 0.3) {
        score += 20; // Near support - potential buy
        trend = 'محتمل صعودي';
      } else if (position > 0.7) {
        score += 20; // Near resistance - potential sell
        trend = 'محتمل هبوطي';
      }

      score = Math.min(score, 85);
      if (score >= 70) opportunity = 'عالية';
      else if (score < 50) opportunity = 'منخفضة';

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
      aiSummary: aiSummary || `🔍 مسح السوق:\n\n${results.slice(0, 5).map((r, i) => `${i + 1}. ${r.pair} - ${r.currentPrice} - فرصة ${r.opportunity}`).join('\n')}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ success: false, error: 'فشل في مسح السوق' }, { status: 500 });
  }
}
