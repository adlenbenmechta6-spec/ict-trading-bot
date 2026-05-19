/**
 * ICT 2022 Mentorship - Complete Course Knowledge for Trading Bot
 *
 * Extracted from: "Unlocking Success in ICT 2022 Mentorship" by Darya Filipenka / LumiTraders
 * Based on concepts by Michael J. Huddleston (The Inner Circle Trader)
 *
 * All times are in NY (Eastern) Time Zone unless otherwise specified.
 * ES/SP500 point references are used throughout as the primary instrument.
 */

// ============================================================================
// 1. ICT_2022_COURSE — Complete course knowledge string for AI prompts
// ============================================================================

export const ICT_2022_COURSE = `
ICT 2022 MENTORSHIP — SMART MONEY DAY TRADING MODEL (COMPLETE REFERENCE)

═══════════════════════════════════════════════════════════════
CHAPTER 1: INTRODUCTION & CORE PRINCIPLES
═══════════════════════════════════════════════════════════════
- Intraday trading focuses on short-term price fluctuations within same trading day
- Learn to take 5 handles out of E-mini S&P to build skills gradually
- Concepts repeat frequently; setups have common characteristics but may not be identical
- Use demo accounts to practice risk-free; treat as if live
- Focus on specific trading models to avoid analysis paralysis
- Progress from "yearner" → "structured learner" → "earner"

═══════════════════════════════════════════════════════════════
CHAPTER 2: FOUR ELEMENTS OF A TRADE SETUP
═══════════════════════════════════════════════════════════════
KEY TIME ZONE RULE: Calibrate all charts to NY time zone. All times in ICT are NY time.

BEST TRADE EXECUTION WINDOW: 8:30 AM - 11:00 AM NY Time

THE FOUR ELEMENTS (ALL must be present):
1. Run on Liquidity — See a run on BSL or SSL
2. Market Structure Shift (MSS) — Price breaks short-term high/low with displacement
3. Entry in FVG — Enter trade in a Fair Value Gap
4. Target Liquidity or Imbalances — Target opposite liquidity or imbalances

PREMIUM/DISCOUNT (Fibonacci 50%):
- Above 50% = Premium market (look to sell)
- Below 50% = Discount market (look to buy)

INSTITUTIONAL SWING POINTS — 2 TYPES:
1. Stop Runs (Turtle Soup) — HIGHEST PROBABILITY
   - Market trades to key level, fails to immediately react
   - Best taken when short-term MSS breaking point is retested
   - Trade like institutional trader: sell at top as price trades through STH/STL
   - Alternative: Wait for MSS, then buy/sell on return to breaker
   - Since stop run already occurred, no reason for that high/low to be taken out again
2. Failure Swings
   - Market trades through key level but fails to continue
   - Want to see V-shape move away from PD array

KEY RULE: We do NOT buy at the break of the old HIGH and we do NOT sell at the break of the old LOW!

═══════════════════════════════════════════════════════════════
CHAPTER 3: LIQUIDITY
═══════════════════════════════════════════════════════════════
TWO PARTICIPANT GROUPS:
1. Central banks, algorithms, institutions
2. Retail traders (90%+ lose money)

BUYSELL LIQUIDITY:
- Long position stop = Sell Side Liquidity (SSL)
- Short position stop = Buy Side Liquidity (BSL)

THREE TYPES OF LIQUIDITY:
1. Major — Highs/lows on session, daily, weekly, monthly charts
2. Medium — Highs/lows on 15m and 1h charts (best for day trader market structure)
3. Minor — Highs/lows on 1m-5m charts

LIQUIDITY LOCATIONS: Equal Lows/Highs (EQL/EQH), Swing Points, Range extremes, Trendlines

KEY RULE: The more liquidity accumulates above a significant price level, the more likely it will be taken.

DRAW ON LIQUIDITY (DOL):
- PWH/PWL, PDH/PDL, Session Highs/Lows, EQH/EQL with LRLR condition
- Price is always either rebalancing or taking liquidity
- Price goes from PD array to PD array
- DO NOT FLIP FLOP between DOL ideas

HIGH/LOW RESISTANCE LIQUIDITY RUNS:
- HRLR: On the side of our structure (harder to break through)
- LRLR: On the opposite side of our structure (ideal, "like knife through butter")
- LRLR = most ideal trading conditions
- Low-Hanging Fruit: 5 handles or 10 handles (ES) — easily achievable

═══════════════════════════════════════════════════════════════
CHAPTER 4: MARKET STRUCTURE SHIFT (MSS)
═══════════════════════════════════════════════════════════════
- MSS = shift in direction of price delivery
- MSS must be ENERGETIC and leave behind DISPLACEMENT
- Structure means nothing without narrative
- Bullish MSS: Price drops below old low, then quickly shifts higher with displacement
- Bearish MSS: Price rallies above old high, then quickly shifts lower with displacement
- Displacement = NOT a small candle or wick only; must be obvious after candle close

═══════════════════════════════════════════════════════════════
CHAPTER 5: LONDON SESSION HIGHS AND LOWS
═══════════════════════════════════════════════════════════════
- London Session: 2:00 AM - 5:00 AM NY Time
- London typically creates LOD when Bullish, HOD when Bearish
- Trading hours: 8:30 AM - 11:00 AM (extend to NY lunch)
- Avoid trades after noon NY time
- Wait for 1:30 PM - 4:00 PM for afternoon trend

═══════════════════════════════════════════════════════════════
CHAPTER 6: INTRADAY ORDER FLOW & DAILY RANGE
═══════════════════════════════════════════════════════════════
- 15-minute chart: identify key H/L, imbalances, FVGs, OBs
- Trading routine: 8:30 AM - 12:00 PM
- Aim to be in a trade before 11:00 AM
- After 15m analysis, switch to 5m for precise entries
- Afternoon acceleration around 20 min and 10 min before 4:00 PM

═══════════════════════════════════════════════════════════════
CHAPTER 7: THREE DRIVES PATTERN
═══════════════════════════════════════════════════════════════
- Price moves in 3 drives: HH+HL (uptrend) or LL+LH (downtrend)
- NOT necessary for 3rd high to take out old high
- KEY RULE: If we see 3 Drives towards a Liquidity Pool, we do NOT need to see that pool hunted with the 3rd drive
- After 3 Drives → look for Displacement → then FVG for entry
- Inverted FVG (price does NOT reach liquidity zone and reverts) = even more powerful signal
- If NOT seeing 3 Drives → anticipate Stop Hunt

═══════════════════════════════════════════════════════════════
CHAPTER 8: MORNING TRADE & POSITIONING
═══════════════════════════════════════════════════════════════
SELL DAY: Catch Judas swing ABOVE 8:30 open and midnight open
BUY DAY: Look for Judas swing BELOW 8:30 open and midnight open

8:30 OPEN / MIDNIGHT OPEN:
- Price above 8:30/midnight open = Premium = selling opportunities
- Price below 8:30/midnight open = Discount = buying opportunities

PO3 INTEGRATION:
- NMO (NY Midnight Opening) at 00:00 NY Time
- Manipulation between 8:30 AM - 9:45 AM EST
- Afternoon: use 1:30 PM NY Time opening the same way as Midnight/8:30 open

MORNING TRADE STEP-BY-STEP:
1. Before 8:30 AM: Identify liquidity pool
2. 15m chart ready → drop to 5m for entries
3. Look for displacement below/above liquidity pool
4. Use FVG for entry point

THREE AFTERNOON TEMPLATES:
- Template 1: Morning Trend → Afternoon Reversal
- Template 2: Morning Trend → Afternoon Continuation (1:1 measured move)
- Template 3: Morning Consolidation → Afternoon Trend

═══════════════════════════════════════════════════════════════
CHAPTER 9: MARKET EFFICIENCY & INSTITUTIONAL ORDER FLOW
═══════════════════════════════════════════════════════════════
CORE PRINCIPLES:
- Do NOT trade patterns for pattern's sake
- Do NOT trade indicator readings or momentum
- Enter Longs when Retail Sells; Enter Shorts when Retail Buys
- Anticipate Price seeking opposite liquidity
- Time of Day is vital

BUYSIDE ORIENTED MARKET (Step-by-Step):
1. Wait for big bearish displacement after news embargo
2. Don't trade first 10 minutes of news (if news at 10:00 AM, look from 10:10 AM)
3. Wait for Bearish PD arrays to fail, want Bullish displacement + change in order flow
4. Down-close candles act as support
5. Up-close candles invalidated; Premium arrays invalidated; Discount arrays respected
6. Buy at discount arrays: FVG/IFVG, OB, Breaker
7. MAX 5 points SL. Aim for 10 points TP.

SELLSIDE ORIENTED MARKET (Step-by-Step):
1. Wait for big bullish displacement (30+ points) after news embargo
2. Don't trade first 10 minutes of news
3. Wait for Bullish PD arrays to fail, want Bearish displacement + change in order flow
4. Up-close candles act as support
5. Down-close candles invalidated; Discount arrays invalidated; Premium arrays respected
6. Sell at premium arrays: FVG/IFVG, OB, Breaker
7. MAX 5 points SL. Aim for 10 points TP.

WHEN TO TRADE THIS MODEL: NFP, CPI, FOMC, FED talks. Trending days.

MARKET MECHANICS: After large displacement, market typically retraces at least 50% before continuing.
Target: max 10 points (ES), but 50% BISI/SIBI can be final objective.

═══════════════════════════════════════════════════════════════
CHAPTER 10-11: KILL ZONES
═══════════════════════════════════════════════════════════════
ASIA KILL ZONE: 8:00 PM - 12:00 AM NY Time (20:00-00:00)
- Asia typically trades COUNTER to NY session direction
- Asia range: usually consolidation, rarely >15 points ES
- Narrow Asian range = huge trending opportunity
- AUDJPY Model: Bullish = 15m swing low run (TSL); Bearish = 15m swing high run (TSS)
- Downtrend: Short in premium above NMO or upper border of Asian session
- Uptrend: Long in discount below NMO or lower border of Asian session

LONDON KILL ZONE: 2:00 AM - 5:00 AM NY Time
- Creates LOD when Bullish, HOD when Bearish
- BUY Model: Raid Asian High stops → price moves lower → buy below opening price & Asian Swing Low
- SELL Model: Raid Asian Low stops → price moves higher → sell above opening price & Asian Swing High
- If Asian range >15-20 points ES, wait for NY trade

NY KILL ZONE: 7:00 AM - 10:00 AM EST
- Two scenarios: Continuation of London OR Complete reversal
- Continuation is easier to trade
- NY Reversal: unless NY opens at HTF premium/discount array, NY = continuation of London
- Best time: 8:30 AM - 11:00 AM EST
- At 8:30 AM, look for old H/L to be swept, then wait for model

LONDON CLOSE KZ: 10:00 AM - 12:00 PM (as late as 13:00 EST)
- Large range day exceeding 5 ADR tends to retrace ~20% at 10:00 AM - Noon
- Can be reversal point for day/week
- 5-minute OTE setup common

═══════════════════════════════════════════════════════════════
CHAPTER 12: DAILY BIAS
═══════════════════════════════════════════════════════════════
- Daily bias is NOT preconceived — relies on experience and rules
- Being bullish ≠ buying every day; being bearish ≠ selling every day
- Wait for conditions: discounted arrays for bullish, premium arrays for bearish

NARRATIVE QUESTIONS:
- Have we taken out Liquidity? → Likely to retrace inside Range
- Have we rebalanced an FVG? → Likely to expand towards Liquidity

PDH/PDL AS LIQUIDITY POOLS:
- Uptrend: PDH becomes DOL → if fails to close above PDH → reversal → expect PDL
- Downtrend: PDL becomes DOL → if fails to close below PDL → reversal → expect PDH

SMT DIVERGENCE (Confirmation Tool, NOT entry pattern):
- Symmetrical: BTC-ETH, EUR-GBP, ES-NQ-YM
- Inverse: BTC-DXY, DXY-EUR
- EUR lower low + GBP higher low = Bullish
- EUR higher high + GBP lower high = Bearish
- SMT MUST follow Time & Price Theory

═══════════════════════════════════════════════════════════════
CHAPTER 13: POWER OF 3 (AMD)
═══════════════════════════════════════════════════════════════
THREE PHASES:
1. Accumulation — Range-bound, low volatility
2. Manipulation — False breakouts, stop runs, Judas Swing
3. Distribution — Smart money unwinds positions

WEEKLY PO3 — BULLISH:
- Expect move below weekly opening (Judas Swing)
- Week low forms Mon-Wed, most often Tue or Wed
- If price returns beyond opening level → reversal possible

WEEKLY PO3 — BEARISH:
- Expect move above weekly opening (Judas Swing)
- Week high forms Mon-Wed, most often Tue or Wed

DAILY PO3 — BULLISH:
- Manipulation UNDER midnight opening price
- Confirm: MSS + price gets back and stays ABOVE midnight open

DAILY PO3 — BEARISH:
- Manipulation ABOVE midnight opening price
- Confirm: MSS + price gets back and stays BELOW midnight open

DAILY RANGE STRUCTURE (Chronological):
1. Price Equilibrium — Asian range (Consolidation)
2. Manipulation — Through news event (Judas Swing)
3. Expansion — Quick move from equilibrium (before 5:00 AM NY)
4. Retracement — 8:00-8:30 AM EST, think FVG/imbalance
5. Reversal — 5:00-8:00 AM EST, at Liquidity Pools
6. Consolidation — End of day ~16:00 EST

CRITICAL RULES:
- Consolidation is ALWAYS followed by Expansion
- After Expansion comes Retracement OR Reversal
- Consolidation → Expansion → Consolidation does NOT happen
- Nothing can happen without consolidation

═══════════════════════════════════════════════════════════════
JUDAS SWING
═══════════════════════════════════════════════════════════════
- Deceptive move to shake out retail before market turns
- Targets: Key S/R, Previous H/L, OTE, PW/PD H/L, Session H/L

LONDON JUDAS SWING:
- Look for Asian stops to be raided
- Anticipate sweep of ~5-10 points ES / 20-25 points NQ / 10-20 pips
- Creates LOD/HOD inside London session

NY JUDAS SWING:
- Scenario 1 (9:30 AM): Short-term SSL/BSL taken out, then immediate reversal
- Scenario 2 (News at 10:00 AM): Do NOT expect Judas at 9:30 AM. Wait 10:00-10:10 AM
- If major news at 8:30 AM → often no Judas Swing at 9:30 AM

═══════════════════════════════════════════════════════════════
CHAPTER 14: ECONOMIC CALENDAR
═══════════════════════════════════════════════════════════════
- Focus on HIGH and MEDIUM impact news
- Key events: NFP, CPI, FOMC, FED talks
- Pair high-impact news with HTF PD Array for bias
- FOMC: 8 meetings/year, taboo day for trading
- NFP: First Friday of every month, taboo day
- FOMC event at 2:00 PM is TWO-STAGE: First run is often FAKE move
- Seek and Destroy Profile: Buy stops triggered → Sell stops triggered → Both sides blown out

═══════════════════════════════════════════════════════════════
WEEKLY TEMPLATES
═══════════════════════════════════════════════════════════════
MONDAY — NOT ideal to day trade:
- Weekly Open, small trading range, Accumulation
- Judas Swing from Weekly Open (Manipulation)
- High probability price returns to Monday London Accumulation Close/Fix

TUESDAY — GOOD to day trade:
- Typically Low/High of the Week
- Judas Swing / Raid of Monday HL / FVG Fill (Manipulation)
- London Open/Close/Fix Pivotal
- Monitor for SMR/MMxM

WEDNESDAY — GOOD to day trade (Expansion):
- Above Weekly Open & PW Range EQ → Longs; Below → Shorts
- Monitor for Premium/Discount of Previous Days Range & Internal BSL/SSL Raid
- Continuation of Trend (Distribution)

THURSDAY — GOOD to day trade:
- Continuation of Trend (Distribution)
- Take Profit by 10:00 EST or once DOL is taken
- Trend Reversal at London Close/Fix 1:00 EST
- Typically Low/High of the Week

FRIDAY — NOT ideal to day trade:
- Return into the Range, small trading range
- Reversal to complete Weekly AMD Profile
- Profit Taking (20-30% of weekly range)
- Weekly Close

WEEKLY H/L FORMATION: 80% of the time forms between Sunday/Monday Open and Tuesday London Open. When fails, between Tue London Open and Wed London Open.

═══════════════════════════════════════════════════════════════
CHAPTER 15: MARKET STRUCTURE & BIAS
═══════════════════════════════════════════════════════════════
BEARISH BIAS: Every UP candle = SELLING OPPORTUNITY; target Old Lows/PDL
BULLISH BIAS: Every DOWN candle = BUYING OPPORTUNITY; target Old Highs/PDH

DEALING RANGE: New range formed after BSL and SSL both taken
PD Array = distinction between Premium and Discount inside dealing range

═══════════════════════════════════════════════════════════════
CLOSE PROXIMITY ENTRIES (CPE)
═══════════════════════════════════════════════════════════════
- When price at/above Opening Price → Smart Money accumulating short
- CPE Calculation: Opening Range = Open + HOD; CPE = Opening Range - Opening Price
- Want to see 1:1 deviation below
- Distribution expected around 3:30-3:45 PM NY Time

PYRAMIDING: Biggest position on FIRST entry, reduce for each subsequent entry

═══════════════════════════════════════════════════════════════
TOP-DOWN ANALYSIS
═══════════════════════════════════════════════════════════════
Step 1: 4H chart — identify major trend + SSL/BSL levels
Step 2: 1H chart — key consolidation areas, buystops, sellstops
Step 3: 15m chart — refine entry/exit, confluence with SSL/BSL, SMT, FVG
Step 4: 5m chart — confirm entry timing with HTF analysis
Step 5: 1m chart — fine-tune entry, set SL/TP

ENTRY DRILL-DOWN: Within displacement, do 5m→4m→3m→2m→1m
- Once you find a FVG, do NOT go any lower
- If you can't find a FVG on 1m → there is no trade

═══════════════════════════════════════════════════════════════
CHAPTER 16: OTE (OPTIMAL TRADE ENTRY)
═══════════════════════════════════════════════════════════════
OTE ZONE: Fibonacci levels 0.62 (62%), 0.705 (70.5%), 0.79 (79%)
- These have highest probability of price reversal
- Usually pullback between 0.62 and 0.705
- Works 80% of the time (with proper risk management)
- R/R: at least 3:1

FIBONACCI RULES:
- Fib levels do NOT act as S/R themselves
- Use Fib to search for Liquidity Blocks (FVG, OB, etc.)
- Draw Fib from initial swing (1) to logical conclusion (0)
- Disregard 0.236 and 0.382 levels
- Sometimes 50% adjustment is enough

PREMIUM MARKET: Above equilibrium → algorithm looks to sell
DISCOUNT MARKET: Below equilibrium → algorithm looks to buy

═══════════════════════════════════════════════════════════════
CHAPTER 17: INTERMARKET ANALYSIS
═══════════════════════════════════════════════════════════════
DXY vs ES: Broadly OPPOSITE directions
- DXY higher (risk-off) → Indices tend to fall
- DXY lower (risk-on) → Indices tend to rise
- DXY consolidating → Indices tend to rise
- Cross pairs make major moves when DXY consolidates

SMT TOOLS: ES, NQ, YM, DXY for divergence analysis

═══════════════════════════════════════════════════════════════
SEASONAL TENDENCIES
═══════════════════════════════════════════════════════════════
Dec-Jan: Consolidation, least favorable, low liquidity
Feb-Apr: Markets trend, smart capital enters, HIGHLY probabilistic
May-Aug: "Sell in May", summer depression, low volatility
Sep-Nov: Market moves again, stocks tend to rise, new cycle

═══════════════════════════════════════════════════════════════
CHAPTER 18: FIBONACCI & CONFLUENCE ZONES
═══════════════════════════════════════════════════════════════
FIBONACCI IN ICT METHODOLOGY:
- Fibonacci is NOT used for traditional retracement/extension targets
- ICT uses Fibonacci to identify Premium and Discount zones
- 50% level = Equilibrium (the dividing line between premium and discount)
- Above 50% = Premium zone (favors SELLING)
- Below 50% = Discount zone (favors BUYING)

KEY FIBONACCI LEVELS:
- 0.618 (618): Primary retracement level — often used for first pullback entry
- 0.705 (OTE Sweet Spot): The optimal trade entry zone — works 80% of the time
- 0.786 (786): Deep retracement — last valid discount zone before structure break
- 0.618-0.786 range = OTE (Optimal Trade Entry) zone
- 1.0 (100%): Full retracement = structure break zone

HOW TO DRAW FIBONACCI:
- For bullish setup: Draw from swing LOW to swing HIGH — look for entry below 50%
- For bearish setup: Draw from swing HIGH to swing LOW — look for entry above 50%
- ALWAYS draw from the liquidity sweep point to the displacement extreme
- The FVG should be on the 50% line or the better side (discount for buy, premium for sell)

CONFLUENCE ZONES:
- When Fibonacci level aligns with an Order Block, FVG, or key level = HIGH probability entry
- OTE zone (0.618-0.786) + Order Block = Gold standard entry
- Equilibrium (50%) + Kill Zone timing = Strong confluence
- Multiple timeframes showing same Fibonacci level = Very powerful

═══════════════════════════════════════════════════════════════
CHAPTER 19: ICT 2022 MODEL (STEP-BY-STEP)
═══════════════════════════════════════════════════════════════
1. Price trades through major BSL/SSL (Asian H/L, London H/L, PDH/PDL)
2. Price reverses with FVG + Displacement (institutional sponsorship)
3. Swing H/L must be exactly horizontal to one of three FVG candles = MSS
   (Swing can occur BEFORE or AFTER liquidity grab)
4. Draw 50% Fib: Option A: From liquidity sweep swing to other side of FVG
                   Option B: From prominent swing after liquidity sweep to other side of FVG
5. FVG gap must be on 50% line or on the better side (liquidity side)
6. Place Limit Order inside FVG at Equilibrium or better side

FVG VALIDATION:
- Draw 50% Fib from lowest swing low (that took liquidity) to swing high above FVG
- FVG valid if gap is at least on 50% level or below
- SL: Below lowest low

MODEL SEQUENCE: Liquidity Sweep → Displacement → MSS → FVG/OB → Return to FVG/OB → Solid R:R

DISPLACEMENT RANGE: Range between displacement high/low and displacement low/high

═══════════════════════════════════════════════════════════════
ATM METHOD (60-minute charts)
═══════════════════════════════════════════════════════════════
ATM SELL: Key high on 1h + pair of broken swing highs → pullback to Breaker → Sell
- SL: Low or Breaker; TP: Above 2nd STH
ATM BUY: Key low on 1h + pair of broken swing lows → pullback to Breaker → Buy
- SL: High or Breaker; TP: Below 2nd STL

═══════════════════════════════════════════════════════════════
CHAPTER 20: DAILY REBALANCE THEORY
═══════════════════════════════════════════════════════════════
- At 08:30 NY time, algorithm starts looking for liquidity
- Stock market opens at 09:30 — manipulation time
- When bearish: market rises to premium to take BSL, then sells
- PO3 at 08:30: price rises above BSL = Judas swing/manipulation
- Immediate Rebalance: Quick adjustment to new price level, "rocket fuel"

═══════════════════════════════════════════════════════════════
CHAPTER 21-22: RANGE TRADING
═══════════════════════════════════════════════════════════════
RANGEBOUND MARKET MODEL:
1. Identify market profile (consolidating or trending)
2. See BSL (EQH) taken → Price breaks down → Bearish Breaker → Wait for revisit to sell
3. SMT Divergence confluence for confirmation

4 TYPES OF RANGE:
1. H/L that led to sweep of opposite side
2. H/L before sweep of same side
3. Equal Highs & Lows
4. Previous Daily/Weekly/Monthly Range

MONDAY RANGE TRADING:
1. Monday = observe only
2. After Monday close, mark H/L
3. Tuesday: look for liquidity grab → MSS → enter at BB/OB/FVG → target opposite liquidity
4. If price goes too far and doesn't break back inside → stay away

ASIA SESSION → LONDON → NY FRAMEWORK:
- Asia consolidating (10-15 pts ES): London takes BSL/SSL (Judas Swing) → NY reverses
- Asia trending (>15 pts ES): Avoid LOKZ, wait for NYKZ

═══════════════════════════════════════════════════════════════
CHAPTER 23-24: NWOG, NDOG, LIQUIDITY VOID
═══════════════════════════════════════════════════════════════
NWOG (New Week Opening Gap):
- Range between Friday close and Sunday open
- Real dynamic fair value level; real liquidity void
- Price likely to re-visit and react to NWOGs
- Up-gap = support; Down-gap = resistance
- Record at least 5 most recent NWOGs
- CE (Consequent Encroachment) = 50% midpoint of NWOG
- Event Horizon PD Array = Halfway between two closest NWOGs

NDOG (New Day Opening Gap):
- Difference between 5pm Close and 6pm Open
- CE = midpoint of any gap
- Institutions want to fill gap before big moves

LIQUIDITY VOID:
- Sudden movement in one direction over large range
- Large beefy bodies with tiny wicks; price spent little time there
- Eventually price WILL return to close the void
- When on other side of void, it's considered Fair Value

FAIR VALUATION:
- Fair Value in Discount → MM buy
- Fair Value in Premium → MM sell
- Equilibrium = 50% line between swing H/L

═══════════════════════════════════════════════════════════════
CHAPTER 25: TIME OF DAY / TIME OF WEEK
═══════════════════════════════════════════════════════════════
WEEKLY H/L: 80% forms between Sun/Mon Open and Tue London Open
DAILY H/L: Monitor 4 hours after midnight; forms most around 04:00-04:30 AM EST

SELL DAY TIMING:
- HOD: 02:00-05:00 EST (London KZ)
- LOD: 10:00-11:00 AM EST
BUY DAY: Vice versa

KEY TIME WINDOWS (EST):
- 12:00 AM - 02:00 AM: Market rallies up on sell day
- 02:00 AM - 04:00 AM: Price forms HOD/LOD
- 05:00 AM: Judas Swing or Divergence; forms swing H/L
- 05:00-06:00 AM: Pause after London move
- 07:20 AM: Futures begin trading; start looking for setups
- 09:30 AM: NY Opening Bell
- 10:00 AM - 11:00 AM: Silver Bullet displacement; London Close KZ
- 11:00 AM: Profit taking (London close, NY lunch)
- 12:00 PM - 1:30 PM: NY Lunch consolidation
- 1:30 PM - 4:00 PM: PM Session
- 2:00 PM - 8:00 PM: CBDR

NY TRADE ENTRY RULES:
- Buy: 10pts ES below 07:20 open price
- Sell: 10pts ES above 07:20 open price

05:00 AM RULE: Mark 05:00 AM opening price — sets up NY OTE. If no London Judas, expect it at 05:00 AM.

═══════════════════════════════════════════════════════════════
CHAPTER 27: ADVANCED ENTRY TECHNIQUES & REFINEMENTS
═══════════════════════════════════════════════════════════════
ENTRY REFINEMENT RULES:
- Never enter on the first FVG after displacement — wait for the SECOND FVG for higher probability
- The best entries are at the Consequent Encroachment (50%) of the FVG, not at the extremes
- If price gaps through the FVG without filling it, the FVG is still valid for future reference
- FVGs from higher timeframes (H1/H4) are more reliable than M5/M15 FVGs

LIQUIDITY SWEEP CONFIRMATION:
- A true liquidity sweep must CLOSE beyond the old high/low, not just wick through it
- Wicks through old highs/lows without a close = weak sweep, likely to continue
- The strongest sweeps have displacement (large-body candle) immediately after
- If the sweep candle is small (doji-like), it may not be a real sweep — wait for confirmation

DISPLACEMENT CRITERIA:
- Displacement = a large-body candle that shows institutional intent
- On ES/SP500: Displacement candle should be 10+ points
- On Forex majors: Displacement should be clearly visible (not a small wick)
- On XAU/USD: Displacement should be $15-30+ depending on timeframe
- On XAG/USD: Displacement should be $0.30-0.60+ due to higher volatility
- If displacement is weak, the MSS may fail — reduce position size or skip

MULTI-TIMEFRAME ENTRY ALIGNMENT:
- HTF (H4/D1) shows the BIAS and direction
- MTF (H1) shows the PD Arrays and structure
- LTF (M5/M15) shows the precise entry timing
- Entry is valid when ALL three timeframes align — if they conflict, step aside
- The HTF bias MUST be respected — never trade against the H4/D1 trend

═══════════════════════════════════════════════════════════════
CHAPTER 28: HOURS OF OPERATION — SESSION RANGES
═══════════════════════════════════════════════════════════════
PM SESSION: 13:30 - 16:00 EST
- After 9:30 Opening Bell, 30-min Opening Range
- PM Session BSL/SSL grab = significant liquidity for Silver Bullet or Judas Swing

LONDON SESSION RAID: Range 2:00 AM - 5:00 AM (ETH chart)

DAILY ROUTINE:
- First 30 min after 9:30 bell: assess vs PM/London session
- Wait for Displacement 10:00-11:00 AM (Silver Bullet setup)

NY LUNCH RAID: Noon - 13:30; sets pace for PM Silver Bullet

AM SESSION RANGES: 9:30 - 12:00; target AM BSL or NY Lunch BSL

═══════════════════════════════════════════════════════════════
CHAPTER 29: PD ARRAY TYPES (COMPLETE)
═══════════════════════════════════════════════════════════════
ORDER BLOCK (OB):
- Last bearish candle before impulse up = Bullish OB
- Last bullish candle before impulse down = Bearish OB
- 5 Criteria for Valid OB: Trend, Liquidity grab, Structural (MSS), Imbalance (FVG), LTF entry
- Validated when high of lowest down-close (bullish) or low of highest up-close (bearish) is traded through
- Mean Threshold = 50% of OB range; price should respect
- Preferably large body + small wicks
- Use bodies (not wicks) for best results
- Entry: at open of OB candle; SL: below/above OB; TP: buy/sell stops

BREAKER BLOCK (BB):
- OB broken by strong impulse without pullback reaction
- Bullish BB: Bearish OB fails as resistance, price jumps above → now acts as support
- Bearish BB: Bullish OB fails as support, price breaks below → now acts as resistance
- Bullish BB elements: Low→High→Lower Low→Higher High
- Bearish BB elements: High→Low→Higher High→Lower Low
- Best breakers engage 2 levels of liquidity (short-term + HTF)
- Target: 1 STD of A→B leg
- Scaling: 6 contracts near breaker, 3 above/below point A, 1 at liquidity peak
- If BB trade fails: re-enter with half position size if nothing changed

MITIGATION BLOCK:
- Reversal pattern from FAILURE swing (no new HH/LL)
- No liquidity grab before impulse (unlike Breaker)
- Forms 'M' pattern (bearish) or 'W' pattern (bullish)
- Broken support turns into resistance ("buyers' remorse")
- ICT uses entire down candle (including wick) as mitigation block

REJECTION BLOCK (RB):
- Swing H/L with long wicks showing BSL/SSL sweep before reversal
- Bearish RB: Long wicks on high(s), runs BSL before declining
- Bullish RB: Long wicks on low(s), runs SSL before rallying
- Self trigger: when price trades back to low of RB range
- SL: slightly above highest wick

PROPULSION BLOCK:
- Candle inside OB taking on support role for continuation
- Bearish: When price trades back to low of propulsion block = sell trigger

VACUUM BLOCK:
- Gap from volatile event (e.g., NFP, session opening)
- Most often during NY news events
- Not all gaps fill completely; bullish OB may stop fill
- Time of day matters: early NY likely fills; late evening likely leaves open
- Exhaustion gap: last impulse of prolonged trend

═══════════════════════════════════════════════════════════════
CHAPTER 30: BREAKAWAY GAPS & RDRB
═══════════════════════════════════════════════════════════════
Breakaway Gap: After consolidation, marks new trend
Balanced Price Range: Both buying and selling pressure = equilibrium
Bullish BPR: BSL→SSL→BSL again (up, down, up)
Bearish BPR: SSL→BSL→SSL again (down, up, down)
RDRB: FVG stays open because BPR above/below; open FVG- below / FVG+ above

═══════════════════════════════════════════════════════════════
CHAPTER 31: CBDR (CENTRAL BANK DEALERS RANGE)
═══════════════════════════════════════════════════════════════
TIMING: 2:00 PM - 8:00 PM NY Time (continues into Asian session)
CALCULATION:
1. 1H chart: mark H/L of 14:00-20:00 NY Time (bodies, ignore wicks)
2. If range < 20-25 points ES → better understanding of London H/L
3. Use with daily bias + standard deviations (up to 4)
4. Mark middle of range; draw deviations above/below

CBDR TRADING RULES:
- Sell: HOD at 1 STD above flout; target (LOD) at 2 STD below
- Buy: Opposite
- Ideal H/L of day: 1 STD above/below flout (can go to 2 STD for reversal)
- Ideal TP: 2 STD (can go to 3)
- Most accurate Tuesday through Thursday
- Daily candle ~40-50 points ES generally

LONDON NORMAL PROTRACTION CHECKLIST:
✓ CBDR < 20 points ES
✓ Asian Range 10-15 points ES
✓ 00:00-02:00 trends against bias
✓ Protraction max 1-2 STD of CBDR

═══════════════════════════════════════════════════════════════
CHAPTER 32: HIGH PROBABILITY DAYTRADE SETUPS
═══════════════════════════════════════════════════════════════
HIGHEST IMPORTANCE: HTF Daily or 4H direction

WHEN DAILY/4H BULLISH:
1. Use Previous Day's Low→High for retracement entries
2. Use Previous Day's NY Session Low→High for retracement entries
3. Use Previous Day's Low for Sell Stop Raid → accumulate longs
4. Focus on Discount→Premium PD Arrays

WHEN DAILY/4H BEARISH:
1. Use Previous Day's High→Low for retracement entries
2. Use Previous Day's NY Session High→Low for retracement entries
3. Use Previous Day's High for Buy Stop Raid → accumulate shorts
4. Focus on Premium→Discount PD Arrays

WHEN TO LOOK TO BUY:
- Seasonally bullish periods; Quarterly bullish
- After positive reaction on Discount PD Array
- Clear unobstructed path to Premium Array
- Ideal days: Mon, Tue, Wed
- CBDR < 20 points ES; Asian Range 10-15 points ES
- Buying 2:00-4:00 AM EST seeking LOD
- Buy 1-2 STD of CBDR + Asian Range + Discount PD Array
- Execute on 5m or 15m chart
- If no retracement post-MNO, buy 1st bullish OB at 2:00 PM EST

WHEN TO LOOK TO SHORT:
- Seasonally bearish periods; Quarterly bearish
- After positive reaction on Premium PD Array
- Clear unobstructed path to Discount Array
- Ideal days: Mon, Tue, Wed
- CBDR < 20 points ES; Asian Range 10-15 points ES
- Shorting 2:00-4:00 AM EST seeking HOD
- Sell 1-2 STD of CBDR + Asian Range + Premium PD Array
- Execute on 5m or 15m chart

WHERE TO LOOK TO BUY:
- Below Asian Range minus 2-5 points ES
- FVG below STL from Previous Day's NY Session
- Bullish OB below STL (Previous Day or today)
- 1 STD with any Discount PD Array in London KZ
- Inside protraction lower post 12:00-2:00 AM with PD Array
- 1-2 STD in Asian Range + Discount PD Array
- If STL taken out twice with no upside → Turtle Soup Long

WHERE TO LOOK TO SHORT:
- Above Asian Range plus 2-5 points ES
- FVG above STH from Previous Day's NY Session
- Bearish OB above STH (Previous Day or today)
- 1 STD with any Premium PD Array in London KZ
- Inside protraction higher post 12:00-2:00 AM with PD Array
- 1-2 STD in Asian Range + Premium PD Array
- If STH taken out twice with no downside → Turtle Soup Short

STOP-LOSS RULES (ES/SP500):
- CBDR overlap with PDA: 15 points above entry
- Run above Asian Range: 20 points above
- ANY Buy Stop Raid: 15 points above high/entry
- 1st retracement into -OB: 5 points above HOD
- 2nd return for Buy Stops: 15 points above HOD
- Any other: 50% ADR (last 5 days) added to Asian Range High
- DO NOT RUSH moving your initial stop-loss

TAKE-PROFIT RULES (ES/SP500):
- Always take something off at 10-15 points
- Scale off every 2 STD of Asian Range/CBDR
- Take off at PDL -2 to -7 points (for shorts)
- Take off at 50% of Price Range trading inside 1H
- 60-80% off at 5-day ADR projections. ALWAYS.
- Below Previous Week Low → take something off
- Below Previous Month Low → take something off
- Time-based: Scale out at 5:00 AM, at STL before 7:00 AM NYO, 10:00-11:00 AM

BULLISH DAYTRADE GUIDE:
1. Confirm London was bullish
2. Wait for 7:00 AM NY to stalk longs
3. Setup forms 7:00-9:00 AM
4. Wait for price retracement lower (at least 7-10 pts ES)
5. If no 7-10 pt retracement by 9 AM → don't take anything
6. Enter on 62% Fib as it drops
7. Target: retest HOD or PDH → Fib targets 1 & 2

BEARISH DAYTRADE GUIDE:
1. Confirm London was bearish
2. Wait for 7:00 AM NY to stalk shorts
3. Setup forms 7:00-9:00 AM
4. Wait for price retracement higher (at least 10 pts ES)
5. If no 10 pt retracement by 9 AM → don't take anything
6. Enter on 62% Fib as it rallies
7. Target: retest LOD or PDL → Fib targets 1 & 2

═══════════════════════════════════════════════════════════════
CHAPTER 33: QUARTERLY SHIFTS & IPDA
═══════════════════════════════════════════════════════════════
QUARTERLY SHIFTS:
- Every ~3/4 months: intermediate-term turning point
- Influenced by institutional order flow + seasonal tendencies
- May cause consolidation or retracement
- Every 3/4 months: sentiment shift to create new interest

IPDA (Interbank Price Delivery Algorithm):
- Delivers price quotes to global institutions/banks
- Determines trading range within day, week, month, season, year
- Seeks new levels for liquidity

SMT DIVERGENCE (Underlying vs Benchmark):
Buy Programs: DXY LL + ES HL; ES LL + DXY LH; DXY HH + ES HL
Sell Programs: DXY HH + ES LH; ES HH + DXY HL; DXY LL + ES LH

IPDA DATA RANGES:
Look Back: 20, 40, 60 trading days
- Identify IOF, Old H/L, OBs, FVGs, Liquidity Voids
- Anchor to Previous Market Shift
Cast Forward: Anticipate shift in 20-60 trading days
- 20 days when last shift was 40 days ago
- 40 days when last shift was 20 days ago
- 3-month limit

IPDA PRACTICAL:
- Use Daily TF ONLY
- Don't include weekends
- Find highest high and lowest low within each look back (20, 40, 60)
- Cut 60-day range in half; locate premium/discount arrays
- Use on first trading day of every month
- IPDA alone does NOT tell where to buy/sell; blend with time and price

═══════════════════════════════════════════════════════════════
VOLUME IMBALANCE (VI)
═══════════════════════════════════════════════════════════════
- Volume Imbalance: A range between where one candle's body and another candle's body
  doesn't touch but there are wicks that overlap in between
- Can be a difference between a lower close with a higher opening OR
  a volume imbalance between a higher close and a lower opening
- Volume imbalances can be traded through MULTIPLE times
- If you know your bias and where price is likely to draw to at a later time,
  you can come right back up and go back to respecting the very specific levels:
  • The Low of the volume imbalance
  • The Consequent Encroachment midpoint (CE = 50% of VI range)
  • The High of the volume imbalance
- VI acts as a magnet for price; price will rebalance through the VI

═══════════════════════════════════════════════════════════════
RECLAIMED ORDER BLOCK
═══════════════════════════════════════════════════════════════
BULLISH RECLAIMED OB:
- Previously used to buy; short-term bounce confirms minor displacement
- In buy side of curve = reclaimed longs
- When price is dropping and has a small displacement upside = smart money
  new long accumulation
- Look for reclaimed OBs on the buy side of the premium/discount curve

BEARISH RECLAIMED OB:
- Previously used to sell; short-term decline confirms minor displacement
- In sell side of curve = reclaimed shorts
- When price is rallying and has a small displacement downside = smart money
  new short accumulation
- Look for reclaimed OBs on the sell side of the premium/discount curve

═══════════════════════════════════════════════════════════════
DETAILED SEASONAL PATTERNS
═══════════════════════════════════════════════════════════════
EUR/USD SEASONAL:
- Bottom mid-February → higher into mid-March → pullback → climb into end of April
- Low in June → climb into late July/early August
- Decline early August → early September
- Good time early-late September → decline early October
- After October: averages diverge, less reliable

GBP/USD SEASONAL:
- Bottom early-late March → higher into end of April
- Early-mid May bearish
- Bottom mid-May → higher into early August
- Peak early August → decline into early September
- Top early November → slides into mid-late November

DXY SEASONAL (5, 10, 15 year):
- Start of year to mid-February: upward bias
- Tops mid-February → declines into mid-March
- Last half of March strong → sells off into late April
- Beginning-mid May strong → falls into short-term low by end of May
- End May to mid-June: some appreciation
- Mid-June short-term high → declines into end of July
- Rally early August to early September
- Early to late November: rise
- Late December: bearish

═══════════════════════════════════════════════════════════════
DETAILED DAILY TEMPLATES (CHAPTER 26)
═══════════════════════════════════════════════════════════════
TEMPLATE 1: LONDON SWING TO NY OPEN / LONDON CLOSE REVERSAL
- Bullish version begins like Classic Buy (decline below opening price → rallies)
- Buy entry forms → rallies to HTF POI (bearish OB, FVG)
- On bullish day: LOD in London → runs up → HOD in NY around London Close
  → runs back down clearing initial London low
- Monitor last hour of London (4-5 AM) and first hour of NY (7-8 AM)
  for reversal signs

TEMPLATE 2: CLASSIC BUY OR SELL DAY (BEST template for making money)
- Wide range trending day; unfolds mostly Mon/Tue (latest Wed)
  during London session
- NY gives retracement to continue London trend
- Daily range lasts 7-8 hours once established
- Buy Day: Buy when market drops at right time at key support
  (below opening price); if starts above opening price, wait for it
  to trade below
- Distance from open to support: 7-12 points ES average
- If move > 12 points → wait for NY trade
- Always take small profit of 5-7 points by 12:00
- Trend usually lasts into 11:00 EST

TEMPLATE 3: RANGE TO NY OPEN / LONDON CLOSE RALLY
- Most often during NFP, FOMC, Interest Rate announcements
- Market originally in consolidation → breaks London lows
  → rallies after news release

TEMPLATE 4: CONSOLIDATION RAID ON NEWS RELEASE
- Most often during NFP, FOMC, Interest Rates
- After opening price → consolidates before news
- During news: drops to induce traders / take stops
  (break consolidation)
- After clearing stops and inducing → moves into true direction
- Identify key S/R or OB below consolidation
- If price doesn't reject at S/R within 5 minutes after news
  → leave trade

═══════════════════════════════════════════════════════════════
INSIDE BAR CONCEPT FOR DOL
═══════════════════════════════════════════════════════════════
- Inside Bar: Forms inside a larger mother bar after a large move
- Represents a period of consolidation
- All inside bars on S&P futures mean the previous day's high or low
  is likely to get taken out as DOL for day traders
- When an inside day forms (candle completely contained by previous),
  expect PDH/PDL to be raided
- Inside bar = consolidation → expansion sequence applies
- Expansion direction determined by HTF bias and draw on liquidity

═══════════════════════════════════════════════════════════════
MARKET MAKER BUY MODEL (DETAILED)
═══════════════════════════════════════════════════════════════
MARKET MAKER BUY MODEL = Understanding market goes lower to go higher:
1. Engineering Liquidity: Bearish move creating lower highs
   (accumulating buy stops above)
2. Smart Money Reversal: At PD-Array (bottom of the move)
   — displacement + MSS confirms reversal
3. Liquidity Hunt: Sweeping old highs (distribution phase)
   — price targets BSL above after accumulating from discount

MARKET MAKER SELL MODEL = Same components reversed:
1. Engineering Liquidity: Bullish move creating higher lows
   (accumulating sell stops below)
2. Smart Money Reversal: At PD-Array (top of the move)
   — displacement + MSS confirms reversal
3. Liquidity Hunt: Sweeping old lows (distribution phase)
   — price targets SSL below after distributing from premium

═══════════════════════════════════════════════════════════════
ORDER FLOW FORMATION (DETAILED)
═══════════════════════════════════════════════════════════════
BEARISH ORDER FLOW FORMATION:
1. Ascending structure broken / liquidity grab along trend
2. Grab of liquidity to buy (smart money accumulates longs at discount)
3. New lower low and lower high formed
- Confirmed when price breaks internal buy liquidity and touches bearish zone

BULLISH ORDER FLOW FORMATION:
1. Descending structure broken / liquidity grab along trend
2. Grab of liquidity for short (smart money accumulates shorts at premium)
3. New higher high and higher low formed
- Confirmed when price breaks internal sell liquidity and touches bullish POI
  / takes external liquidity

═══════════════════════════════════════════════════════════════
FOMC/NFP AVOIDANCE RULES (DETAILED)
═══════════════════════════════════════════════════════════════
- Avoid Thursday and Friday of NFP Weeks
- Avoid London Open after FOMC events (whipsaw likely)
- FOMC 2:00 PM event: First run is often FAKE MOVE (Judas Swing),
  real move during conference
- NFP Monday following NFP: If no holiday early in week → avoid
- When holiday on Mon/Tue/Wed of NFP week → Thu/Fri after NFP
  become focus
- Do NOT trade first 10 minutes after NFP release
- FOMC days: Two-stage move; wait for conference before committing
- Seek and Destroy profile common on NFP/FOMC: both sides blown out

═══════════════════════════════════════════════════════════════
BULL/BEAR LIQUIDITY TRAPS
═══════════════════════════════════════════════════════════════
BULL TRAP:
- Bullish structure where next high and low is higher
- Large player lures traders into buying at the break
- Reverses after collecting liquidity
- Do NOT buy at the break of the old HIGH
- Trapped buyers become fuel (sell stops) for the reversal lower

BEAR TRAP:
- Bearish structure where next high and low is lower
- Large player lures traders into selling at the break
- Reverses after collecting liquidity
- Do NOT sell at the break of the old LOW
- Trapped sellers become fuel (buy stops) for the reversal higher

═══════════════════════════════════════════════════════════════
RISK MANAGEMENT & DISCIPLINE
═══════════════════════════════════════════════════════════════
- Stick & Stay with Your Bias Only
- If Bearish → only short. If Bullish → only long. NO flip-flopping
- Be PROCESS-ORIENTATED, not results-oriented
- Find comfort in NOT taking trades
- Not every day gives high-probability opportunity
- Don't fall in love with winning or being correct
- Overleveraging magnifies losses; use leverage responsibly
- Overtrading: increased costs, reduced focus, poor decisions
- Missing a move ≠ losing trade

═══════════════════════════════════════════════════════════════
KEY ES/SP500 POINT REFERENCES
═══════════════════════════════════════════════════════════════
- Daily candle range: 40-50 points
- CBDR ideal range: < 20-25 points
- Asian Range ideal: 10-15 points
- Scalp targets: 5-10 points
- Min retracement for bullish entry: 7-10 points
- Min retracement for bearish entry: 10 points
- First TP level: 10-15 points
- Max SL (Buyside/Sellside Oriented): 5 points
- Target TP (Buyside/Sellside Oriented): 10 points
- ADR approximate: ~50 points
`;

// ============================================================================
// 2. ICT_2022_SETUPS — Named trading setups
// ============================================================================

export const ICT_2022_SETUPS = {
  // Turtle Soup (Stop Run) — Highest Probability
  TURTLE_SOUP_LONG: 'Turtle Soup Long (TSL)',
  TURTLE_SOUP_SHORT: 'Turtle Soup Short (TSS)',

  // Three Drives Pattern
  THREE_DRIVES_BULL: 'Three Drives Bullish',
  THREE_DRIVES_BEAR: 'Three Drives Bearish',

  // Judas Swing
  JUDAS_SWING_BUY: 'Judas Swing Buy (Buy Day)',
  JUDAS_SWING_SELL: 'Judas Swing Sell (Sell Day)',

  // Market Efficiency / News-Oriented
  BUYSIDE_ORIENTED: 'Buyside Oriented Market (Buy after bearish news displacement)',
  SELLSIDE_ORIENTED: 'Sellside Oriented Market (Sell after bullish news displacement)',

  // Silver Bullet
  SILVER_BULLET_AM: 'Silver Bullet AM (10:00-11:00 AM displacement)',
  SILVER_BULLET_PM: 'Silver Bullet PM (PM session displacement)',

  // CBDR
  CBDR_LONG: 'CBDR Buy (1 STD below flout + Discount PD Array)',
  CBDR_SHORT: 'CBDR Sell (1 STD above flout + Premium PD Array)',

  // Gap-based
  NWOG_SETUP: 'NWOG Setup (New Week Opening Gap retest)',
  NDOG_SETUP: 'NDOG Setup (New Day Opening Gap retest)',

  // Power of 3
  PO3_DAILY_BULL: 'PO3 Daily Bullish (Manipulation below NMO → MSS → back above NMO)',
  PO3_DAILY_BEAR: 'PO3 Daily Bearish (Manipulation above NMO → MSS → back below NMO)',
  PO3_WEEKLY_BULL: 'PO3 Weekly Bullish (Weekly Judas Swing below open)',
  PO3_WEEKLY_BEAR: 'PO3 Weekly Bearish (Weekly Judas Swing above open)',

  // PD Array entries
  FVG_ENTRY: 'FVG Entry (Fair Value Gap at 50% Fib or better)',
  ORDER_BLOCK_ENTRY: 'Order Block Entry (Valid OB with liquidity grab + MSS)',
  BREAKER_BLOCK_ENTRY: 'Breaker Block Entry (Failed OB retest)',
  MITIGATION_BLOCK_ENTRY: 'Mitigation Block Entry (Failure swing retest)',

  // ATM Method
  ATM_SELL: 'ATM Sell (1H Key High + Breaker pullback)',
  ATM_BUY: 'ATM Buy (1H Key Low + Breaker pullback)',

  // Range Trading
  MONDAY_RANGE: 'Monday Range Trading (Tuesday entry after Monday range)',
  ASIAN_RANGE_BREAKOUT: 'Asian Range Breakout (London Judas Swing of Asian H/L)',

  // CPE
  CPE_SHORT: 'CPE Short (Close Proximity Entry above Opening Price)',
  CPE_LONG: 'CPE Long (Close Proximity Entry below Opening Price)',

  // Scalps
  HIGH_PROBABILITY_SCALP_BULL: 'High Probability Scalp Bullish (5-10 pts ES)',
  HIGH_PROBABILITY_SCALP_BEAR: 'High Probability Scalp Bearish (5-10 pts ES)',
} as const;

// ============================================================================
// 3. ICT_2022_SESSIONS — Session times (NY timezone)
// ============================================================================

export const ICT_2022_SESSIONS = {
  ASIA_KZ: { start: '20:00', end: '00:00', name: 'Asia Kill Zone' },
  LONDON_KZ: { start: '02:00', end: '05:00', name: 'London Kill Zone' },
  NY_KZ: { start: '07:00', end: '10:00', name: 'NY Kill Zone' },
  LONDON_CLOSE_KZ: { start: '10:00', end: '12:00', name: 'London Close Kill Zone' },
  NY_PM_SESSION: { start: '13:30', end: '16:00', name: 'NY PM Session' },
  CBDR: { start: '14:00', end: '20:00', name: 'Central Bank Dealers Range' },
  NY_LUNCH: { start: '12:00', end: '13:30', name: 'NY Lunch Raid' },
  AM_SESSION: { start: '09:30', end: '12:00', name: 'AM Session (RTH)' },
  PROTRACTION: { start: '00:00', end: '02:00', name: 'Protraction Period' },
} as const;

// ============================================================================
// 4. ICT_2022_RULES — Specific numeric rules the bot must follow
// ============================================================================

export const ICT_2022_RULES = {
  // The Four Elements of a Trade Setup
  FOUR_ELEMENTS: ['Run on Liquidity', 'Market Structure Shift', 'Entry in FVG', 'Target Liquidity or Imbalances'],

  // SL/TP for Buyside/Sellside Oriented Market
  SL_MAX_ES: 5,          // Maximum SL in ES points (Buyside/Sellside Oriented)
  TP_TARGET_ES: 10,      // Target TP in ES points (Buyside/Sellside Oriented)

  // Best trading window
  BEST_TRADING_WINDOW: '08:30-11:00',
  TRADING_ROUTINE_END: '12:00',
  NO_TRADE_AFTER: '12:00',    // Avoid new trades after noon NY time

  // News rules
  NEWS_WAIT_MINUTES: 10,           // Don't trade first 10 min after news
  SELLSIDE_DISPLACEMENT_MIN_ES: 30, // Minimum displacement for Sellside Oriented (ES points)

  // Session ranges
  ASIA_RANGE_IDEAL_MAX_ES: 15,     // Asia range 10-15 points ES ideal
  ASIA_RANGE_AVOID_ES: 20,         // Avoid London Open if Asian > 15-20 points
  CBDR_IDEAL_MAX_ES: 20,           // CBDR < 20 points ES ideal
  DAILY_CANDLE_RANGE_ES: 45,       // ~40-50 points ES average

  // Scalp targets
  SCALP_TARGET_MIN_ES: 5,
  SCALP_TARGET_MAX_ES: 10,
  FIRST_TP_ES: 10,                  // First TP at 10-15 points

  // Retracement minimums for NY entry
  BULLISH_RETRACE_MIN_ES: 7,       // Minimum 7-10 pts retracement for bullish entry
  BEARISH_RETRACE_MIN_ES: 10,      // Minimum 10 pts retracement for bearish entry

  // NY trade entry rules
  NY_BUY_OFFSET_ES: 10,            // Buy 10 pts below 07:20 open
  NY_SELL_OFFSET_ES: 10,           // Sell 10 pts above 07:20 open

  // OTE Fibonacci levels
  OTE_LEVELS: [0.62, 0.705, 0.79],
  EQUILIBRIUM: 0.50,

  // SL rules for specific setups (ES points above entry for shorts)
  SL_CBDR_OVERLAP: 15,
  SL_ASIAN_RANGE_RUN: 20,
  SL_BUY_STOP_RAID: 15,
  SL_FIRST_RETRACE_OB: 5,
  SL_SECOND_RETURN: 15,

  // R:R
  MIN_RR_RATIO: 3,                 // Minimum 3:1 R:R

  // IPDA lookback periods (trading days)
  IPDA_LOOKBACK_SHORT: 20,
  IPDA_LOOKBACK_MEDIUM: 40,
  IPDA_LOOKBACK_LONG: 60,

  // Weekly H/L formation probability
  WEEKLY_HL_BY_TUE_LONDON_PCT: 80, // 80% of weekly H/L form by Tue London Open

  // CBDR Standard Deviation targets
  CBDR_HOD_STD: 1,                 // HOD at 1 STD above flout
  CBDR_LOD_STD: 1,                 // LOD at 1 STD below flout
  CBDR_TP_STD: 2,                  // TP at 2 STD
  CBDR_REVERSAL_STD: 2,            // Reversal can go to 2 STD
  CBDR_MAX_STD: 4,                 // Max STD (high impact news)

  // London Judas Swing sweep size
  LONDON_SWEEP_ES_MIN: 5,
  LONDON_SWEEP_ES_MAX: 10,
  LONDON_SWEEP_NQ_MIN: 20,
  LONDON_SWEEP_NQ_MAX: 25,
  LONDON_SWEEP_PIPS_MIN: 10,
  LONDON_SWEEP_PIPS_MAX: 20,

  // TP scaling
  TP_SCALE_FIRST: 10,              // Take something off at 10-15 pts
  TP_SCALE_SECOND: 15,
  TP_ADR_PERCENT: 60,              // 60-80% off at 5-day ADR projections
  TP_ADR_PERCENT_MAX: 80,
} as const;

// ============================================================================
// 5. ICT_2022_WEEKLY_TEMPLATE — Day-by-day weekly template
// ============================================================================

export const ICT_2022_WEEKLY_TEMPLATE = {
  monday: {
    phase: 'Accumulation',
    dayTrade: false,
    activities: [
      'Weekly Open',
      'Small trading range — Accumulation',
      'Judas Swing from Weekly Open — Manipulation',
      'High probability price returns to Monday London Accumulation Close/Fix',
      'Lack high-impact news',
    ],
  },
  tuesday: {
    phase: 'Manipulation',
    dayTrade: true,
    activities: [
      'Typically Low/High of the Week',
      'Judas Swing / Raid of Monday HL / FVG Fill',
      'London Open/Close/Fix Pivotal',
      'Monitor for SMR/MMxM',
    ],
  },
  wednesday: {
    phase: 'Expansion',
    dayTrade: true,
    activities: [
      'If above Weekly Open & PW Range EQ → look for Longs',
      'If below Weekly Open & PW EQ → look for Shorts',
      'Monitor for move into Premium/Discount of Previous Days Range',
      'Monitor for Internal BSL/SSL Raid',
      'Continuation of Trend — Distribution',
    ],
  },
  thursday: {
    phase: 'Distribution',
    dayTrade: true,
    activities: [
      'Continuation of Trend — Distribution',
      'Take Profit by 10:00 EST or once DOL is taken',
      'Trend Reversal at London Close/Fix 1:00 EST',
      'Typically Low/High of the Week',
    ],
  },
  friday: {
    phase: 'Return into Range',
    dayTrade: false,
    activities: [
      'Return into the Range',
      'Small Trading Range',
      'Reversal to complete Weekly AMD Profile',
      'Profit Taking — 20-30% of weekly range',
      'Weekly Close',
    ],
  },
} as const;

// ============================================================================
// 6. ICT_2022_PD_ARRAYS — Complete PD Array reference
// ============================================================================

export const ICT_2022_PD_ARRAYS = {
  premium: {
    // For shorts/sells — from highest premium to equilibrium
    arrays: [
      { name: 'Old High', description: 'Previous high acting as resistance; buy stops above' },
      { name: 'Rejection Block (Bearish)', description: 'Long wicks on high(s); runs BSL before declining' },
      { name: 'Bearish Order Block', description: 'Last consecutive up candles before down move; resistance' },
      { name: 'FVG (Bearish Premium)', description: 'Fair Value Gap in premium zone; bearish entry' },
      { name: 'Liquidity Void (Bearish)', description: 'Lack of buyside liquidity; aggressive lower move' },
      { name: 'Bearish Breaker Block', description: 'Failed bullish OB now acting as resistance; H→L→HH→LL' },
      { name: 'Mitigation Block (Bearish)', description: 'Failure swing; no new HH; broken support = resistance' },
    ],
  },
  equilibrium: {
    name: 'Equilibrium',
    description: '50% midpoint between dealing range high and low; fair value; price can go either direction',
  },
  discount: {
    // For longs/buys — from equilibrium to deepest discount
    arrays: [
      { name: 'Mitigation Block (Bullish)', description: 'Failure swing; no new LL; broken resistance = support' },
      { name: 'Bullish Breaker Block', description: 'Failed bearish OB now acting as support; L→H→LL→HH' },
      { name: 'Liquidity Void (Bullish)', description: 'Lack of sellside liquidity; aggressive higher move' },
      { name: 'FVG (Bullish Discount)', description: 'Fair Value Gap in discount zone; bullish entry' },
      { name: 'Bullish Order Block', description: 'Last consecutive down candles before up move; support' },
      { name: 'Rejection Block (Bullish)', description: 'Long wicks on low(s); runs SSL before rallying' },
      { name: 'Old Low', description: 'Previous low acting as support; sell stops below' },
    ],
  },
  special: {
    nwog: { name: 'NWOG', description: 'New Week Opening Gap; Friday close to Sunday open; up-gap=support, down-gap=resistance' },
    ndog: { name: 'NDOG', description: 'New Day Opening Gap; 5pm close to 6pm open' },
    propulsionBlock: { name: 'Propulsion Block', description: 'Candle inside OB acting as continuation support' },
    vacuumBlock: { name: 'Vacuum Block', description: 'Gap from volatile event (NFP); may fill partially or fully' },
    rdrb: { name: 'RDRB', description: 'Redelivered Rebalanced PD Array; BPR between open FVGs' },
    breakawayGap: { name: 'Breakaway Gap', description: 'Gap after consolidation marking new trend' },
    eventHorizon: { name: 'Event Horizon PD Array', description: 'Halfway between two closest NWOGs' },
  },
  otfAlignment: {
    monthly: 'Daily OBs',
    weekly: '4H OBs',
    daily: '1H OBs',
    h4: '15m OBs',
    h1: '5m OBs',
  },
} as const;

// ============================================================================
// 7. ICT_2022_SIGNAL_CHECKLIST — Step-by-step signal generation checklist
// ============================================================================

export const ICT_2022_SIGNAL_CHECKLIST = {
  step1_bias: {
    title: 'Determine Directional Bias',
    checks: [
      'What is the HTF (Daily/4H) direction?',
      'What is the seasonal tendency?',
      'Are we in a quarterly bullish or bearish period?',
      'What do IPDA data ranges suggest?',
      'Is price at a discount array (bullish) or premium array (bearish)?',
      'What is the weekly template day? (Tue-Thu = tradeable)',
    ],
  },
  step2_liquidity: {
    title: 'Identify Liquidity & Draw on Liquidity',
    checks: [
      'Where is the PDH/PDL? PWH/PWL?',
      'Are there EQH/EQL pools nearby?',
      'Is there an LRLR (low resistance) path to target?',
      'What session H/L are nearby (Asia, London, NY)?',
      'What is the CBDR range and where is price relative to it?',
      'Has the Asian Range formed? (10-15 pts ideal)',
    ],
  },
  step3_time: {
    title: 'Verify Time of Day',
    checks: [
      'Is current time within a Kill Zone?',
      'Is it within the best trading window (8:30-11:00 AM NY)?',
      'Are we near a major news event? (Wait 10 min after)',
      'Is it a tradeable day of the week? (Tue-Thu preferred)',
      'Is the 05:00 AM or 07:20 AM open price relevant?',
    ],
  },
  step4_setup: {
    title: 'Confirm Trade Setup (4 Elements)',
    checks: [
      '1. Run on Liquidity: Has BSL/SSL been taken?',
      '2. Market Structure Shift: Is there energetic displacement + MSS?',
      '3. FVG: Is there a Fair Value Gap for entry?',
      '4. Target: Is there clear opposite liquidity or imbalance to target?',
    ],
  },
  step5_entry: {
    title: 'Validate Entry Conditions',
    checks: [
      'Is FVG at or below 50% Fib of displacement range (for buys)?',
      'Is FVG at or above 50% Fib of displacement range (for sells)?',
      'Is entry in discount array for longs / premium array for shorts?',
      'Does the OTE zone (0.62-0.705-0.79) align with FVG?',
      'Is there SMT divergence confluence?',
      'Has price returned to FVG/OB/Breaker for entry?',
    ],
  },
  step6_risk: {
    title: 'Set Risk Management',
    checks: [
      'SL: Is it below lowest low (for buys) / above highest high (for sells)?',
      'SL: Does it meet the max 5 points ES rule (for Buyside/Sellside setups)?',
      'SL: Does it meet setup-specific SL rules? (CBDR=15, Asian Range=20, etc.)',
      'TP: Is R:R at least 3:1?',
      'TP: First target at 10-15 points ES?',
      'TP: Scale out 60-80% at 5-day ADR?',
      'Is position size appropriate (pyramid: biggest first)?',
    ],
  },
  step7_execute: {
    title: 'Execute & Manage',
    checks: [
      'Place limit order inside FVG at equilibrium or better side',
      'Do NOT rush to move initial stop-loss',
      'Scale out at time-based targets (5:00 AM, 10:00-11:00 AM)',
      'Do NOT flip-flop bias mid-trade',
      'If stopped out on Breaker setup, consider re-entering at half size',
      'If trade not in position by 11:00 AM, avoid new entries (wait for PM)',
    ],
  },
} as const;

// ============================================================================
// Type exports for use in other modules
// ============================================================================

export type ICT2022Setup = typeof ICT_2022_SETUPS[keyof typeof ICT_2022_SETUPS];
export type ICT2022Session = typeof ICT_2022_SESSIONS[keyof typeof ICT_2022_SESSIONS];
export type ICT2022WeekDay = keyof typeof ICT_2022_WEEKLY_TEMPLATE;
export type ICT2022PDArray = typeof ICT_2022_PD_ARRAYS;
export type ICT2022ChecklistStep = keyof typeof ICT_2022_SIGNAL_CHECKLIST;
