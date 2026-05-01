import { NextRequest, NextResponse } from 'next/server';
import { ICT_SIGNAL_SYSTEM_PROMPT, ICT_KNOWLEDGE } from '@/lib/ict-knowledge';
import { CANDLESTICK_KNOWLEDGE } from '@/lib/trading-knowledge';
import { chatCompletion } from '@/lib/ai';
import { fetchRealPrice } from '@/lib/market-data';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    // Check if user is asking about a specific pair's price
    const pairMatch = message.match(/(?:price|analysis|analyze|rate)\s*(?:of|for)?\s*(EUR\/USD|GBP\/USD|USD\/JPY|XAU\/USD|BTC\/USD|ETH\/USD|US30|NAS100|US500|GBP\/JPY|AUD\/USD|USD\/CAD|NZD\/USD)/i);

    let priceContext = '';
    if (pairMatch) {
      const pair = pairMatch[1].toUpperCase();
      const marketData = await fetchRealPrice(pair);
      if (marketData.price > 0) {
        priceContext = `\n\nInfo: The current price of ${pair} is ${marketData.price} (real-time price). Today's range: ${marketData.low} - ${marketData.high}.`;
      }
    }

    const aiResponse = await chatCompletion({
      systemPrompt: ICT_SIGNAL_SYSTEM_PROMPT + '\n\n' + CANDLESTICK_KNOWLEDGE + '\n\n' + ICT_KNOWLEDGE + `

You are now in chat mode. You are a professional trader combining:
🕯️ Japanese Candlesticks (Fred K.H. Tam's book)
🏦 ICT / Smart Money (Ayub Rana's book)
📊 TradingView Analysis

The user may ask you about:
1. Japanese candlestick patterns and how to identify them
2. ICT concepts: Order Block, Breaker Block, FVG, IFVG, BPR
3. Institutional liquidity: BSL, SSL, liquidity sweeps
4. Market Structure Shift: MSS, CISD, BOS
5. AMD Pattern (Accumulation-Manipulation-Distribution)
6. Time & Price Theory: Kill Zones, Silver Bullet
7. Trading strategies and risk management
8. Pair prices and analysis

Respond in English. Be helpful, educational, and realistic. Use emojis appropriately.
If asked about the price or analysis of a specific pair, use the real-time price available to you.`,
      userMessage: message + priceContext,
      temperature: 0.8,
      maxTokens: 1000,
    });

    if (aiResponse) {
      return NextResponse.json({
        success: true,
        response: aiResponse,
        timestamp: new Date().toISOString(),
      });
    }

    // Fallback
    return NextResponse.json({
      success: true,
      response: '🤖 Hey! I\'m your Smart Trading Bot. Ask me about Japanese candlesticks, ICT Smart Money concepts, or any pair you want me to analyze!',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process message. Please try again.' }, { status: 500 });
  }
}
