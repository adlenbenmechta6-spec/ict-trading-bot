import { NextRequest, NextResponse } from 'next/server';
import { ICT_SIGNAL_SYSTEM_PROMPT, ICT_KNOWLEDGE } from '@/lib/ict-knowledge';
import { CANDLESTICK_KNOWLEDGE } from '@/lib/trading-knowledge';
import { chatCompletion } from '@/lib/ai';
import { fetchRealPrice } from '@/lib/market-data';

export const maxDuration = 30;

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
      try {
        const marketData = await fetchRealPrice(pair);
        if (marketData.price > 0) {
          priceContext = `\n\nInfo: Current ${pair} price is ${marketData.price}. Range: ${marketData.low} - ${marketData.high}.`;
        }
      } catch {
        // Price fetch failed, continue without context
      }
    }

    const aiResponse = await chatCompletion({
      systemPrompt: `You are ICT Pro Bot - a professional trading assistant. You combine Japanese Candlesticks and ICT Smart Money methodology.

Answer questions about: candlestick patterns, ICT concepts (Order Block, FVG, BSL/SSL, Kill Zones, Silver Bullet, MSS), trading strategies, risk management.

Be concise (200 words max), helpful, educational. Use emojis. Respond in English.`,
      userMessage: message + priceContext,
      temperature: 0.8,
      maxTokens: 400,
    });

    if (aiResponse) {
      return NextResponse.json({
        success: true,
        response: aiResponse,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      response: '🤖 Hey! I\'m ICT Pro Bot. Ask me about candlesticks, ICT concepts, or request an analysis!',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process message.' }, { status: 500 });
  }
}
