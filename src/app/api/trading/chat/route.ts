import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ai';
import { fetchRealPrice } from '@/lib/market-data';
import { ICT_KNOWLEDGE, ICT_SIGNAL_SYSTEM_PROMPT } from '@/lib/ict-knowledge';
import { ICT_BEST_INSTRUMENTS, ICT_TRADING_MODELS } from '@/lib/ict-core-content';
import { SMC_KNOWLEDGE, SMC_SETUPS, SMC_CONFLUENCE_FACTORS } from '@/lib/smc-knowledge';
import { PROFESSIONAL_TRADER_MINDSET } from '@/lib/professional-trading-rules';
import { VOLMAN_SCALPING_SYSTEM_PROMPT, VOLMAN_SCALPING_PAIRS, VOLMAN_SCALPING_PAIR_CONFIGS } from '@/lib/volman-scalping-knowledge';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    // Check if user is asking about a specific pair's price
    const pairMatch = message.match(/(?:price|analysis|analyze|rate)\s*(?:of|for)?\s*(EUR\/USD|GBP\/USD|USD\/JPY|XAU\/USD|XAG\/USD|BTC\/USD|ETH\/USD|US30|NAS100|US500|GBP\/JPY|AUD\/USD|USD\/CAD|NZD\/USD|USD\/CHF|GBP\/CHF|GBP\/CAD|AUD\/CAD|NZD\/CAD|NZD\/JPY)/i);

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

    // Try AI first — now using FULL knowledge pipeline (all 8 sources)
    const aiResponse = await chatCompletion({
      systemPrompt: `${ICT_SIGNAL_SYSTEM_PROMPT}

${PROFESSIONAL_TRADER_MINDSET}

You are ICT Pro Bot - a professional trading assistant trained on 8 comprehensive knowledge sources:

📚 **Source 1: Japanese Candlesticks** (Fred K.H. Tam) — All major/reversal/continuation patterns, volume analysis, practical application
📚 **Source 2: ICT 2016-2017 Core Content** — All 12 Months of Mentorship by Michael J. Huddleston
📚 **Source 3: ICT 2022 Mentorship** — 33 Chapters covering the complete 2022 algorithmic trading model
📚 **Source 4: Smart Money Concepts (SMC)** — All setups (Turtle Soup, SH+BMS+RTO, SMS+BMS+RTO), confluence factors, trading rules
📚 **Source 5: Professional Trading Rules** — 10 Commandments, Signal Quality Tiers (A+/A/B/C/F), Entry Sequence, Exit Management
📚 **Source 6: ICT Pattern Detection** — Real-time OB, FVG, MSS, Liquidity Sweep detection in OHLCV data
📚 **Source 7: Forex Price Action Scalping** (Bob Volman) — 7 Professional Scalping Setups (DDB, FB, SB, BB, RB, IRB, ARB), Tipping Point Technique, 20ema trend guide, tick chart analysis, scalping pair selection
📚 **Source 8: Demystifying ICT — What Every ICT Trader Still Wants To Know** (HOPIPLAKA, 2023) — The 3-6-9 mathematical backbone of ICT:
   • Number 3 → PO3 dealing ranges (3, 9, 27, 81, 243, 729, 2187, 6561, 19683) and the formula DR Low = FLOOR(price/PO3) × PO3, DR High = DR Low + PO3
   • Number 6 → Huddleston / Goldbach clusters (7 prime pairs summing to 100) and the 14 IPDA levels (0=HIGH, 3=Rejection Block, 11=OB, 17=FVG, 29=Liquidity Void, 41=Breaker, 47=Mitigation Block, 53=Mitigation Block, 59=Breaker, 71=Liquidity Void, 83=FVG, 89=OB, 97=Rejection Block, 100=LOW)
   • Number 9 → 20-40-60 Lookback partitions (18=Jan 8, 27=Feb 7, 36=Mar 6, 45=Apr 5, 54=May 4, 63=Jun 3, 72=Jul 2, 81=Aug 1, 99=Sep 9, 108=Oct 8, 117=Nov 7, 126=Dec 6) and the HIPPO (Hidden Interbank Price Point Objective)
   • Plus: CE vs Mean Threshold, External Range Demarkers (1.111 / -0.111 → PO3^(-2) stop runs), Algo 1 (MMxM) vs Algo 2 (Trending/OTE), fractal AMD cycles and CLS true-day timings (20:00–20:00 CET, London 05:00–11:00 CET, sweet spots London 07:30–08:30 CET & NY 14:30–16:30 CET)

Best instruments for ICT:
- Tier 1 (BEST): XAU/USD, EUR/USD, GBP/USD, NAS100
- Tier 2 (Good): USD/JPY, GBP/JPY, US30, XAG/USD
- Tier 3 (Acceptable): BTC/USD, ETH/USD, US500

Best instruments for SCALPING (Bob Volman method):
- Tier 1 (BEST): EUR/USD (#1 — tightest spread), GBP/USD (#2), USD/JPY (#3)
- Tier 2 (Good): EUR/GBP, AUD/USD, USD/CAD
- NOT recommended for scalping: XAU/USD, XAG/USD (spreads too wide), exotic pairs, crypto

Trading Style Recommendations:
- SWING: Best for XAU/USD, XAG/USD, GBP/JPY, BTC/USD, ETH/USD, US500 (1:3-1:5 R:R, 40-55% win rate)
- DAY: Best for EUR/USD, GBP/USD, USD/JPY, NAS100, US30 (1:2 R:R, 50-60% win rate)
- SCALP: Only EUR/USD, GBP/USD, USD/JPY on ECN accounts (tightest spreads required, 10-pip target, Volman 7 setups)

Answer questions about: candlestick patterns, ICT concepts (OB, FVG, BSL/SSL, Kill Zones, Silver Bullet, MSS, AMD, OSOK, CBDR, Bread & Butter), all PD-Arrays, SMC setups, trading models, risk management, top-down analysis, best instruments, trading style recommendations, exit management (break-even, trailing stop, partial close), SCALPING (Volman 7 setups, DDB, FB, SB, BB, RB, IRB, ARB, Tipping Point, 20ema, tick charts, best scalping pairs).

Be concise (250 words max), helpful, educational. Use emojis. Respond in the same language as the user's message.`,
      userMessage: message + priceContext,
      temperature: 0.8,
      maxTokens: 500,
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
    } else if (lowerMsg.includes('scalp') || lowerMsg.includes('scalping') || lowerMsg.includes('سكالب')) {
      response = `⚡ **Professional Forex Scalping** — Bob Volman Method

**7 Scalping Setups (all based on 20ema):**

1️⃣ **DDB (Double Doji Break)** ⭐⭐⭐⭐
Two Doji candles near 20ema → breakout in trend direction

2️⃣ **FB (First Break)** ⭐⭐⭐⭐⭐ — HIGHEST PRIORITY
First pullback to 20ema after new trend begins — best entry

3️⃣ **SB (Second Break)** ⭐⭐⭐⭐
Second pullback to 20ema in established trend

4️⃣ **BB (Block Break)** ⭐⭐⭐⭐
3-5 small candles near 20ema → block breakout

5️⃣ **RB (Range Break)** ⭐⭐⭐
Breakout from clearly defined horizontal range

6️⃣ **IRB (Inside Range Break)** ⭐⭐⭐⭐
Smaller range inside larger → higher probability

7️⃣ **ARB (Advanced Range Break)** ⭐⭐⭐⭐⭐
Range + 20ema slope = highest probability range setup

**Key Rules:**
• 20ema is your PRIMARY guide — if flat, DON'T SCALP
• Target: 10 pips (EUR/USD) | Stop: 5-6 pips at technical level
• Use the Tipping Point Technique — strict exit discipline
• Best pairs: EUR/USD (#1), GBP/USD (#2), USD/JPY (#3)
• Never scalp XAU/USD or XAG/USD — spreads too wide
• Kill Zones only: London (2-5AM NY), NY (7-10AM NY)
• Max 5-10 scalps/day — quality over quantity

💡 Per Volman: "The professional scalper spends MORE TIME WAITING than trading."`;
    } else if (lowerMsg.includes('tipping point') || lowerMsg.includes('نقطة التحول')) {
      response = `🎯 **Tipping Point Technique** — Bob Volman's Trade Management

The CORE of professional scalping — strict exit discipline:

**What is the Tipping Point?**
A price level that determines if your trade is still valid. If price passes it by even 1 pip → EXIT IMMEDIATELY.

**How to Set It:**
1. Initial: Below/above signal bar (5-6 pip SL)
2. After 3-4 pips in favor → Move to breakeven
3. After 7-8 pips → Lock in 5 pips profit
4. At 10 pips (target) → Take profit or lock in 8 pips

**Key Rules:**
• NEVER widen your stop — that's gambling
• NEVER move tipping point further from entry
• Only move it CLOSER (tightening) as trade progresses
• A "stall" near tipping point = WARNING → consider early exit
• If trade not working in 5-10 candles → consider scratching

💡 Per Volman: "If the tipping point is surpassed by even 1 pip, the trade is scratched with no questions asked."`;
    } else if (lowerMsg.includes('best') && (lowerMsg.includes('scalp') || lowerMsg.includes('سكالب'))) {
      response = `🏆 **Best Currency Pairs for Scalping** (Bob Volman Method)

**Tier 1 — BEST (Lowest Spread + Highest Liquidity):**
1. 🥇 **EUR/USD** — Spread: 0.1-0.5 pips | Win rate: 70-75%
   • Volman's PRIMARY pair — all examples use it
   • 10-pip target, 5-6 pip SL, best R:R
2. 🥈 **GBP/USD** — Spread: 0.5-1.0 pips | Win rate: 65-70%
   • Larger moves (80-120 pips daily) → target 12-15 pips
3. 🥉 **USD/JPY** — Spread: 0.2-0.6 pips | Win rate: 68-73%
   • Active in Asian session (unique)

**Tier 2 — GOOD:**
4. EUR/GBP — Tight range, great for RB/IRB/ARB setups (72-78% win rate)
5. AUD/USD — Clean pullbacks, active in Asia+London
6. USD/CAD — Good NY session pair

**❌ NOT for Scalping:**
• XAU/USD (Gold) — Spread 20-50 cents, use for DAY/SWING only
• XAG/USD (Silver) — Too volatile proportionally for scalping
• Exotic pairs — Massive spreads
• Crypto — Different market structure

💡 Key: Spread ≤1 pip on ECN is ESSENTIAL — it's your #1 cost as a scalper!`;
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
    } else if (lowerMsg.includes('po3') || lowerMsg.includes('power of three') || lowerMsg.includes('dealing range')) {
      response = `🔢 **Power of Three (PO3) — Dealing Ranges** — *Demystifying ICT, Chapter 1*

PO3 numbers are powers of 3: 3, 9, 27, 81, 243, 729, 2187, 6561, 19683...

**Trader Style Mapping:**
• 27 → Scalping
• 81 → Daily Range
• 243 → Weekly Range
• 729 → Monthly Range
• 2187 → Yearly Range

**How to Calculate a PO3 Dealing Range:**
1. Normalize current price (remove decimal, keep first 5 digits). Example: EURUSD 1.2345 → 12345
2. **DR Low** = FLOOR(price / PO3) × PO3 → e.g. FLOOR(12345/243)×243 = 50×243 = 12150
3. **DR High** = DR Low + PO3 → 12150 + 243 = 12393
4. Restore decimal point → DR Low = 1.2150, DR High = 1.2393

**PO3 Stop Runs (2 types):**
1. Real stop run — sweeps BSL/SSL by 27, 81 or 243 pips
2. PO3-sized wick — forms a rejection block (use open/close to enter)

**Range Expansion/Contraction:**
• Breakout → expand to next PO3 (9 → 27 → 81 → 243 → 729 ...)
• Retracement → contract to smaller PO3

💡 Per Hopiplaka: Price tends to STAY INSIDE the current PO3 partition unless it breaks out — then it moves to the next partition.`;
    } else if (lowerMsg.includes('huddleston') || lowerMsg.includes('goldbach') || lowerMsg.includes('ipda level')) {
      response = `🎯 **Huddleston Levels = Goldbach Clusters** — *Demystifying ICT, Chapter 2*

The name "Huddleston" decodes to "7 clusters of 100" (Michael = 7 letters, 7 archangels).

**Goldbach's Conjecture:** Every even number > 2 is the sum of two primes. For 100, there are 7 prime pairs:

| Cluster | Discount | Premium |
|---------|----------|---------|
| 1 | 0 | 100 |
| 2 | 3 | 97 |
| 3 | 11 | 89 |
| 4 | 17 | 83 |
| 5 | 29 | 71 |
| 6 | 41 | 59 |
| 7 | 47 | 53 |

**14 IPDA Levels Mapped from Goldbach:**
0=HIGH | 3=Rejection Block | 11=Order Block | 17=FVG | 29=Liquidity Void | 41=Breaker | 47=Mitigation Block | 53=Mitigation Block | 59=Breaker | 71=Liquidity Void | 83=FVG | 89=Order Block | 97=Rejection Block | 100=LOW

**Key Insights:**
• Levels are 6% apart (the number 6 from Tesla's quote)
• The 29/71 cluster jumps 12% → this is the **Liquidity Void**
• Consequent Encroachment (CE) = middle of a 6% block (every 3%)
• Mean Threshold = middle of an 8% block (the order-block band, 3→11)
• External Range Demarkers (ERD): Fib 1.111 / -0.111 → project PO3^(-2) stop run levels

💡 Per Hopiplaka: The 14 IPDA levels inside any PO3 dealing range form the wireframe that price respects.`;
    } else if (lowerMsg.includes('lookback') || lowerMsg.includes('20-40-60') || lowerMsg.includes('hippo') || lowerMsg.includes('20 40 60')) {
      response = `📅 **20-40-60 Lookback Partitions** — *Demystifying ICT, Chapter 3*

Uses the number 9 sequence: **18-27-36-45-54-63-72-81-99-108-117-126**

**Anchor Points (12 per year, on daily chart):**
• 18 = January 8
• 27 = February 7
• 36 = March 6
• 45 = April 5
• 54 = May 4
• 63 = June 3
• 72 = July 2
• 81 = August 1
• 99 = September 9 (no day 0, so add 9)
• 108 = October 8
• 117 = November 7
• 126 = December 6

*If the day falls on a weekend, use the next trading day (typically Monday).*

**How to Use:**
1. At the start of each new partition, look for a clue based on the partition number (e.g. October = 108)
2. Look for a **stop run / FVG / OB** of that pip size in the previous 3 partitions (20-40-60 lookback)
3. Expect price to aggressively reverse from this level
4. Wait for a PO3 stop run in the opposite direction

**HIPPO — Hidden Interbank Price Point Objective:**
A "hidden" order block constructed from the wicks of 2 consecutive bars that form an FVG:
• Take the top of the wick of the first candle
• Connect it to the bottom of the wick of the second candle
• The resulting zone is a high-probability reaction level

💡 Per Hopiplaka: December is typically a consolidation profile; the PO3 stop run often sits below the current partition low — a hallmark of consolidation.`;
    } else if (lowerMsg.includes('amd') || lowerMsg.includes('cls') || lowerMsg.includes('ict logo') || lowerMsg.includes('manipulation phase')) {
      response = `🌀 **ICT Logo = Fractal AMD Cycle** — *Demystifying ICT, Chapter 4*

The ICT logo is NOT a small circle with a big circle — it's a SMALL circle between TWO BIGGER circles = **Accumulation → Manipulation → Distribution**.

**CLS True Day:** 20:00–20:00 CET (19:00–19:00 BST / 14:00–14:00 EST)

**Daily AMD Mapping:**
• **Accumulation** = Asian Session (9 hours)
• **Manipulation** = London Open (6 hours, 05:00–11:00 CET) — forms the Judas swing
• **Distribution** = New York Session (9 hours)

**3-6-9 Encoded:**
• 3 sessions
• 6-hour manipulation window
• 9-hour accumulation & distribution windows

**Sweet Spots (Highest-Probability Manipulation Entries):**
• London: 07:30–08:30 CET (01:30–02:30 EST)
• New York: 14:30–16:30 CET (08:30–12:30 EST)

**Fractal AMD inside each phase:**
1. Small consolidation (accumulation)
2. Market Structure Shift (MSS) — breaks the consolidation
3. Retracement back into the broken zone → forms an OTE
4. Expansion into a pool of interest (liquidity, FVG, OB)
5. Reversal — typically occurs in the MIDDLE of the distribution cycle

💡 Per Hopiplaka: Each phase contains a smaller AMD cycle because price is FRACTAL — yearly AMD → monthly AMD → daily AMD → intraday AMD.`;
    } else if (lowerMsg.includes('erd') || lowerMsg.includes('external range') || lowerMsg.includes('consequent encroachment') || lowerMsg.includes('mean threshold')) {
      response = `📐 **CE, Mean Threshold & External Range Demarkers** — *Demystifying ICT, Chapter 2*

**Consequent Encroachment (CE):**
- The middle of a 6% Goldbach block
- Therefore a CE level exists every 3% inside the dealing range

**Mean Threshold:**
- The middle of the 8% Order Block band (3→11 or 97→89)
- ICT uses a different name because the block is 8% (not 6%)
- Located at 4% from the rejection block

**External Range Demarkers (ERD):**
- Add Fib values **1.111** (range high) and **-0.111** (range low) to your Fibonacci tool
- These project a **PO3^(-2)** level outside the current dealing range
- Examples:
  • 2187 PO3 range → ERD shows a 243 stop run target (2 PO3 numbers below)
  • 243 PO3 range → ERD shows a 27 stop run target
- Use ERD to anticipate where price will go when it briefly breaches the dealing range
- ERD can be cut in half — the middle of the ERD is highly sensitive

💡 Per Hopiplaka: Big moves often START from an External Range Demarker — watch for reversals at these levels.`;
    } else {
      response = `🤖 I'm ICT Pro Bot! I'm trained on 8 comprehensive knowledge sources — including the complete ICT 2016-2017 Core Content (All 12 Months) AND "Demystifying ICT" by HOPIPLAKA (2023).

🕯️ **Candlestick Patterns:** Hammer, Engulfing, Morning/Evening Star, Doji, Harami, Three Soldiers/Crows
🏦 **ICT PD-Arrays:** Order Blocks, FVG, Breaker Blocks, Rejection Blocks, Propulsion Blocks, Mitigation Blocks
💧 **Liquidity:** BSL/SSL, Liquidity Sweeps/Runs, HRLR/LRLR, Liquidity Voids/Pools
📊 **ICT Models:** AMD, Silver Bullet, OSOK, Bread & Butter, 2022 Models, Market Maker Models
⏰ **Timing:** Kill Zones, Silver Bullet Windows, ICT Macros, CBDR, CLS True Day
🔢 **PO3 Dealing Ranges (NEW):** Power of Three — 27/81/243/729/2187, FLOOR formula, partitions, stop runs
🎯 **Huddleston / Goldbach (NEW):** 7 prime clusters of 100, 14 IPDA levels, CE & Mean Threshold, ERD
📅 **20-40-60 Lookback (NEW):** 12 monthly anchor points (18→126), HIPPO hidden OB
🌀 **ICT Logo (NEW):** Fractal AMD cycles, CLS timings, London/NY sweet spots
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
• "What is PO3 dealing range?" (NEW)
• "What are Huddleston/Goldbach levels?" (NEW)
• "Explain the 20-40-60 lookback" (NEW)
• "What does the ICT logo mean?" (NEW)
• "What is a HIPPO?" (NEW)

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
