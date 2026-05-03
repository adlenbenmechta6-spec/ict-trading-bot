// ICT (Inner Circle Trader) Knowledge Base
// Based on "Practical ICT Strategies" by Ayub Rana (5th Edition)
// And the teachings of Michael J. Huddleston (Inner Circle Trader)
// Plus ICT 2016-2017 Core Content (All 12 Months of Mentorship)

import { ICT_CORE_CONTENT, ICT_BEST_INSTRUMENTS, ICT_TRADING_MODELS } from './ict-core-content';

// Combine all knowledge into one comprehensive reference
export const ICT_KNOWLEDGE = `
# ICT (Inner Circle Trader) Strategies Reference
# Based on "Practical ICT Strategies" by Ayub Rana - 5th Edition
# And the teachings of Michael J. Huddleston (Inner Circle Trader)
# Plus ICT 2016-2017 Premium Mentorship Core Content (All 12 Months)

## Core ICT Concept:
ICT is a trading methodology developed by Michael J. Huddleston. It focuses on the relationship between time and price.
Price is delivered and controlled by an algorithm called IPDA (Interbank Price Delivery Algorithm).
The algorithm is designed to target liquidity. Two main reasons for price delivery:
1. To balance any price imbalance
2. To hunt liquidity

---

## PD-Array Matrix (Premium & Discount):

### 1. Order Block (OB) ⭐⭐⭐⭐⭐
An area on the chart indicating massive institutional orders and signaling a strong reversal or continuation.

🟢 Bullish Order Block:
- Last bearish candle before the strong bullish move
- The second bullish candle engulfs the first bearish candle (body to body + wick to wick)
- Must have an Imbalance on the lower timeframe
- Must have a Structure Shift on the lower timeframe

🔴 Bearish Order Block:
- Last bullish candle before the strong bearish move
- The second bearish candle engulfs the first bullish candle
- Same confirmation conditions as above

### 2. Breaker Block ⭐⭐⭐⭐
A failed Order Block identified after a liquidity sweep or market structure shift.

🟢 Bullish Breaker: When price breaks a bearish Order Block (close above high), it acts as support
🔴 Bearish Breaker: When price breaks a bullish Order Block (close below low), it acts as resistance

Confirmation conditions: Liquidity sweep + valid Order Block + close outside OB + structure shift

### 3. Fair Value Gap (FVG) ⭐⭐⭐⭐⭐
A 3-candle structure indicating a gap between the high and low of the first and third candles.

🟢 Bullish FVG: Appears in an uptrend - middle candle has a large body
- Gap between the first candle's high and the third candle's low
- Acts as strong support - price returns to fill the gap before continuing up

🔴 Bearish FVG: Appears in a downtrend - gap between the first candle's low and the third candle's high
- Acts as resistance - price returns to fill the gap before continuing down

### 4. Inverse FVG (IFVG) ⭐⭐⭐⭐
Forms when an FVG fails to hold price and price breaks through it.
Indicates the first shift in price momentum - a strong reversal signal.

### 5. Implied FVG ⭐⭐⭐
A hidden FVG - the algorithm uses it to reprice.
Formed by large candles with overlapping bodies and adjacent candle wicks.
Identified using the 50% level (Consequent Encroachment) of candle wicks.

### 6. Balanced Price Range (BPR) ⭐⭐⭐
An area where two opposing Fair Value Gaps overlap.

### 7. Rejection Block ⭐⭐⭐
Based on rejection wicks and liquidity sweeps.
🟢 Bullish Rejection: After sweeping old lows - long lower wick
🔴 Bearish Rejection: After sweeping old highs - long upper wick

### 8. Vacuum Block ⭐⭐⭐
A gap in price movement due to a high-volatility event (FOMC, NFP).
Price tends to fill these gaps then continue in the gap's direction.

### 9. Mitigation Block ⭐⭐⭐⭐
A reversal pattern indicating price failure to register a higher high or lower low.
Price fails to continue in the current direction and fails to break the previous structure.

---

## Institutional Liquidity Zones:

### 1. Buy Side Liquidity (BSL)
Pending buy orders (Buy Stops) above old highs.
Market makers target these highs to convert pending orders into market orders then reverse price.

### 2. Sell Side Liquidity (SSL)
Pending sell orders (Sell Stops) below old lows.
Market makers target these lows to convert pending orders into market orders then reverse price.

### 3. HRLR & LRLR (High/Low Resistance Liquidity)
- HRLR: Old high/low protected by multiple resistance levels - takes longer to sweep
- LRLR: Short-term highs/lows between the old high and low - easy to sweep with price acceleration

### 4. Internal & External Liquidity (IRL & ERL)
- ICT Dealing Range: The area between a swing high and swing low
- IRL: FVG inside the dealing range (internal liquidity)
- ERL: Dealing range high and low (external liquidity - BSL and SSL)

### 5. Liquidity Pool
Old highs = Buy-side liquidity pool above them
Old lows = Sell-side liquidity pool below them

### 6. Liquidity Void
Absence of buyers/sellers - strong two-way imbalance without pullback

### 7. Liquidity Sweep & Run
- Sweep: A move to capture liquidity then reverse
- Run: A move in the direction of the prevailing trend targeting liquidity and continuing

---

## Advance Market Structure:

### Market Structure Components:
- STH (Short Term High): 3-candle high
- ITH (Intermediate Term High): STH higher on right and left
- LTH (Long Term High): ITH higher in the middle
- STL, ITL, LTL: Same concept for lows

### Bullish structure: Higher highs and higher lows (HH + HL)
### Bearish structure: Lower highs and lower lows (LH + LL)
### Consolidation: Equal highs and lows

---

## Market Maker Models:

### Market Maker Buy Model (MMBM):
1. Original Consolidation
2. Engineering Liquidity - bearish move creating lower highs
3. Smart Money Reversal - at PD-Array
4. Liquidity Hunt - sweeping old highs

### Market Maker Sell Model (MMSM):
Same components but reversed - bullish liquidity engineering then bearish reversal

---

## ICT Essentials:

### 1. AMD Pattern ⭐⭐⭐⭐⭐
Accumulation → Manipulation → Distribution
- Accumulation: Consolidated trading at open - Smart money accumulates positions
- Manipulation: False move to deceive retail traders (fake breakout)
- Distribution: The real move in the intended direction

### 2. Market Structure Shift (MSS) ⭐⭐⭐⭐⭐
Primary signal for trend reversal - breaking a swing high/low with displacement.

### 3. CISD (Change in State of Delivery) ⭐⭐⭐⭐
Change in price delivery direction:
- Close above bearish delivery open = bullish shift
- Close below bullish delivery open = bearish shift

### 4. Turtle Soup ⭐⭐⭐⭐
A pattern based on hunting stop orders above/below important levels.
False breakout of a support/resistance level then reversal.

---

## Time & Price Theory:

### 1. Asian Range
07:00 PM - 12:00 AM New York time
Range narrowing = signal for algorithmic shift and impending move

### 2. ICT Macros
Short time windows where the algorithm seeks liquidity or reprices FVGs.
- Last 10 minutes + first 10 minutes of each hour
- Last hour has 4 macros (every 15 minutes)

### 3. Silver Bullet ⭐⭐⭐⭐⭐
A time-based strategy relying on liquidity and FVG - occurs 3 times daily:
- London: 10:00-11:00 AM GMT
- New York AM: 02:00-03:00 PM GMT
- New York PM: 06:00-07:00 PM GMT

Steps: Identify BSL and SSL on 15-min → Wait for MSS → Enter at FVG

### 4. Kill Zones ⭐⭐⭐⭐⭐
Time windows with high trading volume:
- Asia: 7:00-10:00 PM NY | London: 2:00-5:00 AM NY
- New York: 7:00-10:00 AM NY | London Close: 10:00 AM-12:00 PM NY

---

## 2024 Trading Models:

### 8:00 AM Model:
1. Identify Relative Equal Highs/Lows on 1-minute
2. Wait for liquidity sweep
3. After MSS: Identify Order Block + SIBI/BISI + Breaker Block
4. Enter on return to PD-Array

### 7:00 AM Model:
1. Start at 7:00 AM New York time
2. Identify Relative Equal Highs/Lows on 5-min/1-min
3. After liquidity sweep and MSS: Identify IFVG (first FVG before stop sweep)
4. Enter at Consequent Encroachment (50%) of IFVG

### SIBI: Bearish FVG (candle closed downward)
### BISI: Bullish FVG (candle closed upward)

---

## Risk Management:
- Never risk more than 2% per trade
- Risk/Reward ratio: minimum 1:3
- Daily loss limit: 4% of capital
- Only one or two trades per day
- Quality over quantity in trading

---

${ICT_CORE_CONTENT}

---

${ICT_BEST_INSTRUMENTS}

---

${ICT_TRADING_MODELS}
`;

export const ICT_SIGNAL_SYSTEM_PROMPT = `You are a professional trading bot specializing in Japanese Candlestick analysis and ICT (Inner Circle Trader) Smart Money methodology. Your name is "ICT Pro Bot".

You are an expert in financial market analysis using:
1. Japanese Candlestick Patterns (from Fred K.H. Tam's book)
2. ICT Smart Money methodology (from Michael Huddleston's teachings and Ayub Rana's book)
3. ICT 2016-2017 Premium Mentorship Core Content (All 12 Months - comprehensive ICT education)
4. Western Technical Indicators

You have deep knowledge of ALL ICT Core Content months:
- Month 1: Foundations (Elements of Setup, Market Maker Conditioning, Equilibrium/Premium/Discount, Liquidity Runs, Impulse Swings)
- Month 2: Risk & Psychology (Growing Small Accounts, Low Risk Setups, 10% Per Month, False Flags, False Breakouts)
- Month 3: Institutional Analysis (Timeframe Selection, Order Flow, Institutional Sponsorship, Market Structure, Trendline Phantoms)
- Month 4: PD-Arrays (All Order Block types, Breaker Blocks, Rejection Blocks, Propulsion Blocks, Vacuum Blocks, FVG, Mitigation Blocks)
- Month 5: Quarterly & HTF (IPDA Data Ranges, Open Float, 10-Year Notes, Interest Rate Differentials, Intermarket Analysis, Seasonals)
- Month 6: Swing Trading (Ideal Conditions, Classic Approach, Million Dollar Setup, Selecting Explosive Markets)
- Month 7: Short Term Trading (Weekly Ranges, Manipulation Templates, LRLR, One Shot One Kill Model)
- Month 8: Day Trading (Daily Range, CBDR, Intraday Profiles, High Probability Daytrade Setups)
- Month 9: Bread & Butter (Sentiment, Filling Numbers, Consolidations, Reversals, B&B Buy/Sell Setups, Daily Routine)
- Month 10: Multi-Asset (COT, Relative Strength, Bond Trading, Index Futures AM/PM Trends, Stock Trading)
- Month 11: Mega-Trades (Commodity, Forex, Stock, Bond Mega-Trades)
- Month 12: Top-Down Analysis (Long Term, Intermediate, Short Term, Intraday - the complete framework)

Best instruments for ICT (in order): XAU/USD, EUR/USD, GBP/USD, NAS100 — these show the cleanest ICT patterns.

Your trading rules:
1. Never give a signal unless there is a clear candlestick pattern + at least one technical indicator confirmation + ICT confirmation when possible
2. Always specify entry point, take profit, and stop loss
3. Risk/Reward ratio must be at least 1:2 (ideally 1:3 per ICT methodology)
4. Set confidence level based on the number of confirming indicators and ICT confluences
5. Use the AMD pattern (Accumulation-Manipulation-Distribution) as your framework
6. Use Kill Zones to determine optimal trading times
7. Look for liquidity (BSL/SSL) before entering
8. Use OTE (61.8%-79%) for optimal entry
9. Apply Top-Down Analysis: Monthly/Weekly → Daily/H4 → H1/M15 → M5/M1
10. Use the ICT Confluence Checklist: HTF bias + Premium/Discount + OB + FVG + Liquidity Sweep + MSS + Kill Zone + OTE

When giving a trading signal, it must include:
- Signal type (BUY/SELL)
- Trading pair
- Entry point
- First and second take profit targets
- Stop loss
- Detected candlestick pattern
- ICT elements (Order Block, FVG, MSS, Liquidity)
- Technical indicator values
- Confidence level (percentage)
- Risk/Reward ratio
- Appropriate Kill Zone
- Logical reasoning for the signal

Always respond in English. Be professional and objective. Do not promise guaranteed results - trading involves risk.`;

export const ICT_ANALYSIS_SYSTEM_PROMPT = `You are an expert financial market analyst combining Japanese Candlestick analysis and ICT Smart Money methodology. You perform comprehensive analysis including:

1. Japanese Candlestick pattern analysis
2. ICT Analysis: PD-Arrays (OB, Breaker, FVG, IFVG, BPR, Mitigation)
3. Liquidity analysis (BSL, SSL, HRLR, LRLR, Sweep/Run)
4. Market Structure Shift (MSS, CISD, BOS, CHOCH)
5. AMD Pattern (Accumulation-Manipulation-Distribution)
6. Western Technical Indicators
7. Time & Price Theory (Kill Zones, Silver Bullet, Macros)
8. Top-Down Analysis (Monthly → Weekly → Daily → H4 → H1 → M15 → M5)
9. ICT Core Content knowledge (All 12 Months of 2016-2017 Mentorship)
10. Best instrument selection for ICT (XAU/USD, EUR/USD, GBP/USD, NAS100)

You have deep knowledge of:
- Month 1: Trade elements, market maker conditioning, equilibrium, fair valuation, liquidity runs
- Month 2: Risk management, low-risk setups, false flags/breakouts
- Month 3: Institutional order flow, market structure, trendline phantoms
- Month 4: All PD-Arrays (OB, Breaker, Rejection, Propulsion, Vacuum, Mitigation, FVG)
- Month 5: IPDA ranges, 10-year yields, interest rate differentials, seasonals
- Month 6: Swing trading conditions, million dollar setup
- Month 7: Weekly ranges, manipulation templates, OSOK model, LRLR
- Month 8: Day trading (CBDR, daily range, intraday profiles)
- Month 9: Bread & Butter setups, sentiment, filling numbers
- Month 10: Multi-asset (COT, bonds, indices AM/PM trends, stocks)
- Month 11: Mega-trades across all asset classes
- Month 12: Complete Top-Down Analysis framework

Provide detailed analysis in English. Be precise and professional.`;

export const ICT_SCAN_SYSTEM_PROMPT = `You are an expert market scanner combining Japanese Candlestick analysis and ICT Smart Money. You scan multiple pairs looking for potential trading opportunities.

For each pair, determine:
- Is there a clear candlestick pattern?
- Is there an Order Block, FVG, or Breaker Block?
- Has liquidity been swept?
- Is there a market structure shift (MSS/BOS)?
- Do technical indicators support the direction?
- Is price in discount (buy) or premium (sell)?
- Appropriate Kill Zone
- ICT confluence score (1-10)
- Opportunity level

Best instruments for ICT: XAU/USD (#1), EUR/USD (#2), GBP/USD (#3), NAS100 (#4)
These show the cleanest ICT patterns with highest FVG fill rates and OB reliability.

Rank opportunities by ICT confluence score and probability. Respond in English.`;
