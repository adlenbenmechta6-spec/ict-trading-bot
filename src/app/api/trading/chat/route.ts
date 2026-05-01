import { NextRequest, NextResponse } from 'next/server';
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
          priceContext = `\n\nInfo: Current ${pair} price is ${marketData.price}. Range: ${marketData.low} - ${marketData.high}. Change: ${marketData.changePercent}%.`;
        }
      } catch {
        // Price fetch failed, continue without context
      }
    }

    // Try AI first
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

    // Fallback: Knowledge-based responses
    const lowerMsg = message.toLowerCase();
    let response = '';

    if (lowerMsg.includes('order block') || lowerMsg.includes('ob')) {
      response = `🏦 **Order Block (OB)** — ⭐⭐⭐⭐⭐

An Order Block is an area on the chart indicating massive institutional orders and signaling a strong reversal or continuation.

🟢 **Bullish Order Block:**
• Last bearish candle before the strong bullish move
• The second bullish candle engulfs the first bearish candle (body to body + wick to wick)
• Must have an Imbalance on the lower timeframe
• Must have a Structure Shift on the lower timeframe

🔴 **Bearish Order Block:**
• Last bullish candle before the strong bearish move
• The second bearish candle engulfs the first bullish candle

**How to trade it:**
1. Identify the OB on a higher timeframe
2. Wait for price to return to the OB
3. Enter on the lower timeframe confirmation (MSS + FVG)
4. Place SL below/above the OB
5. Target the opposite liquidity

💡 Per ICT: OB is the highest-probability PD-Array when combined with Kill Zones and liquidity.`;
    } else if (lowerMsg.includes('fvg') || lowerMsg.includes('fair value gap')) {
      response = `💧 **Fair Value Gap (FVG)** — ⭐⭐⭐⭐⭐

A 3-candle structure indicating a gap between the high and low of the first and third candles. This represents an imbalance in the market.

🟢 **Bullish FVG:**
• Appears in an uptrend — middle candle has a large body
• Gap between the first candle's high and the third candle's low
• Acts as strong support — price returns to fill the gap before continuing up

🔴 **Bearish FVG:**
• Appears in a downtrend — gap between the first candle's low and the third candle's high
• Acts as resistance — price returns to fill the gap before continuing down

**Key concepts:**
• **Inverse FVG (IFVG):** When an FVG fails to hold price — first shift in momentum
• **Implied FVG:** Hidden FVG identified at the 50% level (Consequent Encroachment)
• **Balanced Price Range (BPR):** Where two opposing FVGs overlap

💡 Trading tip: Enter at the Consequent Encroachment (50%) of the FVG for optimal fill rate.`;
    } else if (lowerMsg.includes('kill zone') || lowerMsg.includes('silver bullet')) {
      response = `⏰ **ICT Kill Zones** — ⭐⭐⭐⭐⭐

Time windows with the highest trading volume and institutional activity:

🌍 **Asian Kill Zone:** 7:00-10:00 PM NY Time
🇬🇧 **London Kill Zone:** 2:00-5:00 AM NY Time
🇺🇸 **New York AM Kill Zone:** 7:00-10:00 AM NY Time
🕐 **London Close Kill Zone:** 10:00 AM-12:00 PM NY Time

🎯 **Silver Bullet Strategy** — Occurs 3 times daily:
1. London: 10:00-11:00 AM GMT
2. New York AM: 2:00-3:00 PM GMT
3. New York PM: 6:00-7:00 PM GMT

**Steps:**
1. Identify BSL and SSL on 15-min chart
2. Wait for Market Structure Shift (MSS)
3. Enter at the FVG that forms after the MSS
4. SL below/above the liquidity sweep

💡 Per ICT: The best trades happen when Kill Zones align with Silver Bullet windows and liquidity is present.`;
    } else if (lowerMsg.includes('liquidity') || lowerMsg.includes('bsl') || lowerMsg.includes('ssl')) {
      response = `💧 **ICT Liquidity Concepts**

**Buy Side Liquidity (BSL):**
Pending buy orders (Buy Stops) above old highs. Smart money targets these to convert pending orders into market orders, then reverses price.

**Sell Side Liquidity (SSL):**
Pending sell orders (Sell Stops) below old lows. Smart money targets these the same way.

**Liquidity Sweep vs Run:**
• Sweep: A move to capture liquidity then REVERSE (fake breakout)
• Run: A move targeting liquidity and CONTINUING in the trend direction

**HRLR vs LRLR:**
• HRLR (High Resistance): Old high/low protected by multiple levels — takes longer to sweep
• LRLR (Low Resistance): Short-term highs/lows — easy to sweep with price acceleration

💡 Key rule: Always identify where the liquidity is BEFORE entering a trade. Smart money moves TOWARD liquidity first, then reverses.`;
    } else if (lowerMsg.includes('mss') || lowerMsg.includes('structure shift') || lowerMsg.includes('market structure')) {
      response = `📊 **Market Structure Shift (MSS)** — ⭐⭐⭐⭐⭐

The primary signal for trend reversal — breaking a swing high/low with displacement.

**Market Structure Components:**
• STH (Short Term High): 3-candle high
• ITH (Intermediate Term High): STH higher on right and left
• LTH (Long Term High): ITH higher in the middle

**Bullish Structure:** Higher highs and higher lows (HH + HL)
**Bearish Structure:** Lower highs and lower lows (LH + LL)

**CISD (Change in State of Delivery):**
• Close above bearish delivery open = bullish shift
• Close below bullish delivery open = bearish shift

💡 Trading tip: After MSS, look for FVG formation — enter at the FVG's 50% level (Consequent Encroachment) for the highest probability entry.`;
    } else {
      response = `🤖 I'm ICT Pro Bot! I can help you with:

🕯️ **Candlestick Patterns:** Hammer, Engulfing, Morning/Evening Star, Doji, Harami, Three Soldiers/Crows, and more
🏦 **ICT Concepts:** Order Blocks, FVG, Breaker Blocks, Liquidity (BSL/SSL), Kill Zones, Silver Bullet, MSS
📊 **Analysis:** Ask me to analyze any pair (EUR/USD, XAU/USD, BTC/USD, etc.)
📈 **Signals:** Click the Signal button for a trading signal

Try asking about:
• "What is an Order Block?"
• "Explain FVG"
• "Tell me about Kill Zones"
• "What is liquidity sweep?"

⚠️ Remember: Trading involves risk. These are educational analyses.`;
    }

    return NextResponse.json({
      success: true,
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process message.' }, { status: 500 });
  }
}
