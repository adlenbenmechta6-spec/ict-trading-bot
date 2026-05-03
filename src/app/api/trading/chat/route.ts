import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ai';
import { fetchRealPrice } from '@/lib/market-data';
import { ICT_KNOWLEDGE } from '@/lib/ict-knowledge';
import { ICT_BEST_INSTRUMENTS, ICT_TRADING_MODELS } from '@/lib/ict-core-content';

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
      systemPrompt: `You are ICT Pro Bot - a professional trading assistant trained on the complete ICT 2016-2017 Core Content (All 12 Months of Mentorship by Michael J. Huddleston). You combine Japanese Candlesticks (Fred K.H. Tam) and ICT Smart Money methodology.

Your knowledge includes ALL 12 months of ICT Core Content:
- Month 1: Trade elements, market maker conditioning, equilibrium, premium/discount, fair valuation, liquidity runs, impulse swings
- Month 2: Risk management, growing small accounts, false flags, false breakouts, 10% per month
- Month 3: Institutional order flow, market structure, trendline phantoms, head & shoulders traps
- Month 4: ALL PD-Arrays (OB, Breaker, Rejection, Propulsion, Vacuum, Mitigation, Reclaimed OB, FVG, IFVG, BPR, Liquidity Voids/Pools)
- Month 5: IPDA data ranges, 10-year yields, interest rate differentials, intermarket analysis, seasonals, money management
- Month 6: Swing trading (ideal conditions, classic approach, million dollar setup, selecting explosive markets)
- Month 7: Short term trading (weekly ranges, manipulation templates, LRLR, One Shot One Kill model)
- Month 8: Day trading (CBDR, daily range, intraday profiles, high probability setups)
- Month 9: Bread & Butter setups, sentiment effect, filling numbers, daily routine
- Month 10: Multi-asset analysis (COT, bonds, index futures AM/PM trends, stocks)
- Month 11: Mega-trades (commodity, forex, stock, bond mega-trades)
- Month 12: Complete Top-Down Analysis framework (Long → Intermediate → Short → Intraday)

Best instruments for ICT: XAU/USD (#1), EUR/USD (#2), GBP/USD (#3), NAS100 (#4) — these show cleanest patterns.

Answer questions about: candlestick patterns, ICT concepts (OB, FVG, BSL/SSL, Kill Zones, Silver Bullet, MSS, AMD, OSOK, CBDR, Bread & Butter), all PD-Arrays, trading models, risk management, top-down analysis, best instruments.

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

💡 Per ICT Core Content Month 1 & 8: The best trades happen when Kill Zones align with Silver Bullet windows and liquidity is present. The Silver Bullet is a time-based model — during these windows, the algorithm actively hunts liquidity and fills FVGs.`;
    } else if (lowerMsg.includes('best') && (lowerMsg.includes('pair') || lowerMsg.includes('instrument') || lowerMsg.includes('currency') || lowerMsg.includes('صنف') || lowerMsg.includes('عمل'))) {
      response = `🏆 **Best Instruments for ICT Smart Money Trading**

**Tier 1 — BEST for ICT (Cleanest patterns):**
1. 🥇 **XAU/USD (Gold)** — Smart money favorite, respects OB/FVG exceptionally well, FVG fill rate ~75-80%
2. 🥈 **EUR/USD** — Ultra-tight spreads, massive liquidity, smooth moves, FVG fill rate ~75-80%
3. 🥉 **GBP/USD** — Larger swings, explosive moves, great for NY Kill Zone, FVG fill rate ~70-75%
4. 🏅 **NAS100** — Clean AM/PM trend model, excellent for day trading

**Tier 2 — Very Good:**
5. USD/JPY — Active in Asian session, good for swing trading
6. GBP/JPY — High volatility, experienced traders only
7. US30 — Similar to NAS100, less volatile

**Key Insight:** ICT works best on highly liquid instruments. EUR/USD and XAU/USD consistently show the MOST ICT confluences (OB + FVG + Liquidity + MSS + Kill Zone all aligning).

💡 Start with XAU/USD or EUR/USD and master them before adding more pairs!`;
    } else if (lowerMsg.includes('top down') || lowerMsg.includes('تحليل من أعلى')) {
      response = `📊 **ICT Top-Down Analysis (Month 12 — Complete Framework)**

The most important skill in ICT is Top-Down Analysis:

1️⃣ **Long Term (Monthly/Weekly)**:
- Quarterly IPDA range: Premium or Discount?
- Major liquidity levels (yearly highs/lows)
- Weekly OB and FVG
- Done once per week

2️⃣ **Intermediate (Daily/H4)**:
- Weekly dealing range
- Daily OB and FVG
- MSS on daily chart
- Done daily

3️⃣ **Short Term (H1/M15)**:
- Intraday OB and FVG
- MSS on M15
- Nearest liquidity pools
- Done at session start

4️⃣ **Intraday (M5/M1)**:
- Kill Zone alignment
- Silver Bullet timing
- ICT Macros (first/last 10 min of hour)
- Precise entry at FVG 50%

💡 When ALL 4 levels align → highest probability trade possible!`;
    } else if (lowerMsg.includes('osok') || lowerMsg.includes('one shot')) {
      response = `🎯 **One Shot One Kill (OSOK) Model** — ICT Month 7

ICT's most precise trading model:

1. Find **relative equal highs/lows** on M5/M15
2. Wait for **liquidity sweep** of those levels
3. After sweep, wait for **MSS** (Market Structure Shift)
4. Identify the **FVG** that forms after MSS
5. Enter at **FVG 50%** (Consequent Encroachment)
6. SL at **sweep extreme** (very tight!)
7. TP at **opposite liquidity pool**

Why it works:
- Very tight SL = low risk
- Target is opposite liquidity = high reward
- R:R often 1:5 or better
- Works best during Silver Bullet windows

💡 One trade per day with this model is sufficient — quality over quantity!`;
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
      response = `🤖 I'm ICT Pro Bot! I'm trained on the complete ICT 2016-2017 Core Content (All 12 Months). I can help you with:

🕯️ **Candlestick Patterns:** Hammer, Engulfing, Morning/Evening Star, Doji, Harami, Three Soldiers/Crows
🏦 **ICT PD-Arrays:** Order Blocks, FVG, Breaker Blocks, Rejection Blocks, Propulsion Blocks, Mitigation Blocks
💧 **Liquidity:** BSL/SSL, Liquidity Sweeps/Runs, HRLR/LRLR, Liquidity Voids/Pools
📊 **ICT Models:** AMD, Silver Bullet, OSOK, Bread & Butter, 2022 Models, Market Maker Models
⏰ **Timing:** Kill Zones, Silver Bullet Windows, ICT Macros, CBDR
📈 **Trading Styles:** Swing (Month 6), Day Trading (Month 8), Scalping (Month 7-9)
🔍 **Analysis:** Top-Down Analysis (Month 12), Multi-Asset (Month 10)
🏆 **Best Pairs:** Ask "best pairs for ICT" to learn which instruments work best

Try asking about:
• "What is an Order Block?"
• "Explain FVG and IFVG"
• "Best pairs for ICT trading"
• "What is the OSOK model?"
• "Explain Top-Down Analysis"
• "What is the Bread & Butter setup?"

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
