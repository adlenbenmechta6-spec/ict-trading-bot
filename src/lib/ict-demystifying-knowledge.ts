/**
 * "Demystifying ICT: What Every ICT Trader Still Wants To Know"
 * Complete Knowledge Module
 *
 * Source: Book by HOPIPLAKA (Version 1.0 - January 2023)
 * Title: "DEMYSTIFYING ICT: What Every ICT Trader Still Wants To Know"
 * Author: HOPIPLAKA
 *
 * This module provides comprehensive knowledge extracted from the full book,
 * covering all 4 chapters:
 *   Chapter 0: Prologue — Tesla's 3, 6, 9 principle
 *   Chapter 1: Power of Three Numbers (PO3) — Dealing ranges, partitions, stop runs
 *   Chapter 2: Huddleston Levels — Goldbach clusters, IPDA mapping, algorithms
 *   Chapter 3: 20-40-60 Lookback — Number 9 sequence, monthly anchor points, HIPPO
 *   Chapter 4: ICT Logo — AMD fractal cycles, CLS timings, session mapping
 *
 * All references to Order Blocks, Fair Value Gaps, Breakers, Mitigation Blocks,
 * Liquidity Voids, and Consequent Encroachment are property of the Inner Circle
 * Trader (Michael J. Huddleston). This module is Hopiplaka's interpretation.
 */

// ============================================================================
// 1. ICT_DEMYSTIFYING_COURSE — Complete course knowledge string for AI prompts
// ============================================================================

export const ICT_DEMYSTIFYING_COURSE = `
DEMYSTIFYING ICT — "WHAT EVERY ICT TRADER STILL WANTS TO KNOW" — COMPLETE REFERENCE
Based on "Demystifying ICT: What Every ICT Trader Still Wants To Know" by HOPIPLAKA (Version 1.0, January 2023)
All concepts below are Hopiplaka's interpretation of the teachings of Michael J. Huddleston (Inner Circle Trader).

═══════════════════════════════════════════════════════════════
PROLOGUE — THE 3, 6, 9 PRINCIPLE (NIKOLA TESLA)
═══════════════════════════════════════════════════════════════

"If only you would know the magnificence of the 3, 6, and 9, you would have a key to the universe."
— Nikola Tesla

The book revolves around the three sacred numbers in ICT mentorship:
- Number 3 → Power of Three (PO3) dealing ranges (Chapter 1)
- Number 6 → Huddleston levels and Goldbach clusters, which are typically 6% apart (Chapter 2)
- Number 9 → 20-40-60 Lookback partitions using a sequence based on the number 9 (Chapter 3)

The ICT logo itself encodes the AMD (Accumulation, Manipulation, Distribution) cycle (Chapter 4).

═══════════════════════════════════════════════════════════════
CHAPTER 1: POWER OF THREE NUMBERS (PO3)
═══════════════════════════════════════════════════════════════

"Three great forces rule the world: stupidity, fear and greed." — Albert Einstein

INTRODUCTION TO PO3
- PO3 = "Power of Three" — a triplet-number concept tied to ICT's AMD cycle (Accumulation, Manipulation, Distribution).
- AMD cycle was introduced by ICT; the book maps PO3 numbers directly to AMD swing magnitudes.
- In finance, dealing ranges are made of powers of the number 3.

CALCULATING POWERS OF THREE
- A power of three is a number of the form 3^n where n is an integer (result of exponentiation with base 3).
- Equivalently, multiply the number 3 by itself n times.
- Examples:
  • 3 x 3 = 9   (3^2)
  • 3 x 3 x 3 x 3 x 3 = 243   (3^5)
- In Excel: =POWER(3, integer)
- Result is expressed in PIPS for Forex (e.g. EURUSD) or in TICKS for index futures (e.g. Nasdaq).

PO3 NUMBER TABLE — TRADER STYLE MAPPING
| n | 3^n     | Use Case           |
|---|---------|--------------------|
| 1 | 3       | (smallest unit)    |
| 2 | 9       | Scalping (micro)   |
| 3 | 27      | Scalping           |
| 4 | 81      | Daily Range        |
| 5 | 243     | Weekly Range       |
| 6 | 729     | Monthly Range      |
| 7 | 2187    | Yearly Range       |
| 8 | 6561    | (multi-year)       |
| 9 | 19683   | (long-term)        |
| 10| 59049   | (macro)            |
| 11| 177147  | (macro)            |

Trader style mapping:
- Scalper → 27 (and 9 for micro)
- Day trader → 81
- Swing trader → 243 (weekly)
- Position trader → 729 (monthly) / 2187 (yearly)

PO3 DEALING RANGES
- A dealing range is a piece of price action where swings are expected to happen.
- It has a dealing range LOW and a dealing range HIGH.
- Price tends to STAY INSIDE the dealing range unless it breaks out and moves to the next partition.

CALCULATING THE CURRENT PO3 DEALING RANGE
Required inputs:
- Current price (e.g. EURUSD 1.2345, SP500 4032.8, Bitcoin 23589.4, DXY 124.456)
- PO3 number of interest (based on trader style — see table above)

Step 1 — Normalize price:
- Remove the decimal point (if any).
- Keep only the first 5 digits.
- Examples:
  • EURUSD 1.2345 → 12345
  • SP500 4032.8 → 40328
  • Bitcoin 23589.4 → 23589
  • DXY 124.456 → 12445

Step 2 — Calculate dealing range LOW:
  dealing_range_low = FLOOR(current_price / po3_number) * po3_number

Examples:
| Asset   | Price   | PO3  | Floor(price/PO3) | DR Low  |
|---------|---------|------|-------------------|---------|
| EURUSD  | 12345   | 243  | 50                | 12150   |
| SP500   | 40328   | 81   | 497               | 40257   |
| Bitcoin | 23589   | 2187 | 10                | 21870   |

Step 3 — Calculate dealing range HIGH:
  dealing_range_high = dealing_range_low + po3_number

Example (EURUSD, PO3 = 243):
  DR Low  = 12150
  DR High = 12150 + 243 = 12393

Step 4 — Restore decimal point at original position:
  EURUSD (decimal after 1st digit):
  • DR Low  = 1.2150
  • DR High = 1.2393

PO3 PARTITIONS
- Partitions start from base 0 (or 0.0 for forex).
- Each partition is exactly PO3 wide.
- Example for PO3 = 27 on Microsoft:
  • Partition 1: 0 → 27
  • Partition 2: 27 → 54
  • Partition 3: 54 → 81
  • ... and so on
- Price typically stays inside a partition for a while; it may briefly leave then return, or leave and move to the next partition.

RANGE EXPANSION AND CONTRACTION
- Used mainly with stocks or new assets like Bitcoin (different from PO3 dealing ranges used for forex/indices).
- Start with one of the smallest PO3 numbers (e.g. 9).
- If price breaks OUT of the current range → RANGE EXPANSION → take next PO3 (9 → 27 → 81 → 243 → 729 → 2187 → 6561 → 19683).
- If price RETRACES back below current range → RANGE CONTRACTION → step DOWN to the next smaller PO3 (e.g. if was 243-729 and price drops below 243, the new main dealing range becomes 81-243).
- Bitcoin example: price broke 81 dealing range → 81-243 used → broke 729 → 243-729 used → broke 2187 and 6561 → hard stop at exactly 19683.

PO3 STOP RUNS
Power-of-Three stop runs come in 2 shapes:

1. REAL STOP RUN — A genuine sweep of buy-side or sell-side liquidity.
   - Typically occurs under an old low or above an old high of 27, 81, or 243 pips (depending on timeframe).
   - Example: 27-pip stop run on sell-side liquidity → price rejects, breaks an old short-term high, forms an OTE to go long.

2. PO3-SIZED WICK — Price stops at a dealing range high/low and creates a wick of a PO3 size (27, 81, 243 long).
   - This confirms a valid REJECTION BLOCK.
   - The open or close of the rejection block can be used to enter a trade.

CHAPTER 1 SUMMARY — WHAT YOU LEARNED
- What PO3 numbers are
- How to calculate PO3 dealing ranges (low and high)
- PO3 partitions and "staying in the range"
- PO3 stop runs (real sweeps and PO3-sized wicks)
- Range expansion and contraction

═══════════════════════════════════════════════════════════════
CHAPTER 2: HUDDLESTON LEVELS
═══════════════════════════════════════════════════════════════

"Now if 6 turned out to be 9 I don't mind, I don't mind." — Bob Marley

WHERE DOES "HUDDLESTON" COME FROM?
- Huddles → synonym: CLUSTERS
- Ton → synonym: 100
- The name "Michael" has 7 letters; there are also 7 archangels.
- The puzzle translates to: "7 CLUSTERS OF 100"
- This leads to GOLDBACH CLUSTERS.

GOLDBACH'S CONJECTURE
- One of the oldest unsolved problems in number theory.
- Every even natural number greater than 2 is the sum of two prime numbers.
- We are looking for the 7 clusters of the number 100.
- 100 represents 100% of a range (a full dealing range = 100%).
- An even number can have more than 1 Goldbach cluster; from Michael's name (7 letters), we need exactly 7 clusters.

THE 7 GOLDBACH CLUSTERS (sum to 100)
| Cluster | Discount | Premium |
|---------|----------|---------|
| 1       | 0        | 100     |
| 2       | 3        | 97      |
| 3       | 11       | 89      |
| 4       | 17       | 83      |
| 5       | 29       | 71      |
| 6       | 41       | 59      |
| 7       | 47       | 53      |

KEY OBSERVATIONS:
- Each cluster's discount + premium = 100.
- The clusters explain MARKET SYMMETRY: low number and high number (e.g. 11 and 89) are symmetrical opposites.
- Most partitions are 6 apart from each other → the number 6 from Tesla's quote.
- The 5th cluster (29/71) JUMPS 12 steps at once → this is where the LIQUIDITY VOID resides.

IPDA = GOLDBACH (THE 14 IPDA LEVELS)
We identify 14 IPDA levels by mapping Goldbach clusters to ICT concepts:

| Goldbach Number | IPDA Level          |
|-----------------|---------------------|
| 0               | HIGH                |
| 3               | REJECTION BLOCK     |
| 11              | ORDER BLOCK         |
| 17              | FAIR VALUE GAP      |
| 29              | LIQUIDITY VOID      |
| 41              | BREAKER             |
| 47              | MITIGATION BLOCK    |
| 53              | MITIGATION BLOCK    |
| 59              | BREAKER             |
| 71              | LIQUIDITY VOID      |
| 83              | FAIR VALUE GAP      |
| 89              | ORDER BLOCK         |
| 97              | REJECTION BLOCK     |
| 100             | LOW                 |

INTERVAL OBSERVATIONS:
- Levels are typically 6% apart from each other (except top/bottom and the 29/71 cluster).
- Rejection block is only 3% apart from the high/low (0→3 or 100→97).
- Order block is 8% apart from the rejection block onwards (3→11 or 97→89).
- The liquidity void cluster (29/71) is 12% apart → nature of a liquidity void (large one-directional move expected).
- To map a level to an ICT concept, take the value of the level just BELOW it until the current value:
  • Rejection block: 0→3 (or 100→97)
  • Order block: 3→11 (or 97→89)
  • Fair value gap: 11→17 (or 83→89)
  • Liquidity void: 17→29 (or 71→83)
  • Breaker: 29→41 (or 59→71)
  • Mitigation block: 41→47 and 47→53 (or 53→59)
  • Breaker: 53→59 (or 41→47) [mirror]

CONSEQUENT ENCROACHMENT (CE) AND MEAN THRESHOLD
- Goldbach levels are typically 6% apart.
- CE level = the middle of a 6% block → so every 3% there is a Consequent Encroachment.
- The order block range (from rejection block 3/97 to order block 11/89) is 8% wide.
- The middle of 8% is 4% → ICT calls this the MEAN THRESHOLD (different name because the block is 8%, not 6%).

SUMMARY:
- Consequent Encroachment (CE) = the middle of a 6% block
- Mean Threshold = the middle of an 8% block

NON-GOLDBACH (NON-GB) HIDDEN LEVELS
In the 12% liquidity void band, between FVG→LV and LV→BR, the author finds hidden 6% levels (and therefore hidden CE levels). On the chart (when the PO3 dealing range is large enough to avoid clutter), the author also draws:
- 35 and 65   (between FVG and LV)
- 23 and 77   (between LV and BR)
These are called NON-GB levels — not strict Goldbach numbers but practically respected by price.

EXTERNAL RANGE DEMARKERS (ERD)
- External range is also defined by PO3 levels — connected to the "PO3 stop runs" concept from Chapter 1.
- Add the following Fib values to your Fibonacci tool:
  • Range high: 1.111
  • Range low:  -0.111
- These Fib values plot a PO3^(-2) level on the chart.
- Meaning: they highlight stop runs of TWO PO3 numbers lower.
- Examples:
  • If using a 2187 PO3 dealing range → ERD highlights a stop run at 243 (two PO3 numbers below 2187, NOT 729).
  • If using a 243 PO3 dealing range → ERD highlights a stop run at 27.
- ERD shows where price will go when it briefly breaches the dealing range.
- Big moves often start from an External Range Demarker.
- ERD can also be cut in half → the MIDDLE of the ERD is highly sensitive.

ALGORITHMS — TESLA VORTEX x GOLDACH
- PO3 numbers (the number 3) drive price action.
- 14 IPDA levels = 7 Goldbach clusters of 100 (100% of the dealing range).
- Feeding these into a Tesla Vortex (modular multiplication) calculator:
  • Modulus: 14
  • Multiplier: 3
- The output yields TWO datasets (one starting with 1, another with 2).
- ICT mentioned in old mentorships that there are TWO algorithms, one of which is the MMxM (Market Maker Buy/Sell Model).

ALGO 1 — REFLECTING (MMxM)
Sequence: 1, 3, 9, 13, 11, 5
Mapped to Goldbach values (1=HIGH=0, 2=rejection block, 3=order block, ...):
  HIGH/LOW → ORDER BLOCK → OPPOSITE BREAKER → OPPOSITE REJECTION BLOCK → OPPOSITE FAIR VALUE → LIQUIDITY VOID
- Algo 1 reflects the MMxM (Market Maker Model) — it bounces between premium and discount sides.

ALGO 2 — TRENDING (OTE PRODUCER)
Sequence: 2, 6, 4, 12, 8, 10
Mapped to Goldbach values:
  REJECTION BLOCK → BREAKER → FAIR VALUE → OPPOSITE ORDER BLOCK → OPPOSITE MITIGATION BLOCK → OPPOSITE LIQUIDITY VOID
- Algo 2 is a trending algorithm that creates Optimal Trade Entries (OTE) along the way up or down.

PRACTICAL APPLICATION
- Identify the current PO3 partition on the chart (e.g. EURUSD 729 PO3 partition: 1.0206 → 1.0935).
  • 14 * 729 = 10206 (dealing range low, in raw digits)
  • 10206 + 729 = 10935 (dealing range high, in raw digits)
  • Restore decimal → 1.0206 / 1.0935 for EURUSD.
- Apply the Goldbach levels inside this range to get the IPDA wireframe.
- Use Algo 2 for bullish scenarios and Algo 1 for MMxM scenarios.
- A real EURUSD example from the book:
  • Order block created → accompanied by a fair value gap.
  • Price returned into OB+FVG → expanded above equilibrium.
  • Price retraced and was mitigated around equilibrium.
  • Consolidation, then aggressive expansion into the predefined level to form the high — which is the PREMIUM FAIR VALUE GAP.

CHAPTER 2 SUMMARY — WHAT YOU LEARNED
- Translating the name "Michael J Huddleston"
- Goldbach clusters (7 pairs of primes summing to 100)
- Mapping Goldbach clusters to IPDA levels (14 levels)
- Consequent Encroachment (6% block) vs Mean Threshold (8% block)
- External Range Demarkers (1.111 / -0.111) → PO3^(-2) stop run levels
- The two algorithms: Algo 1 (MMxM reflecting) and Algo 2 (trending, OTE producer)

═══════════════════════════════════════════════════════════════
CHAPTER 3: 20-40-60 LOOKBACK
═══════════════════════════════════════════════════════════════

"From the calm morning, the end will come when of the dancing horse the number of circles will be nine." — Nostradamus

INTRODUCTION
- The 20-40-60 Lookback is where the number 9 comes into play.
- Use a sequence based on the number 9 to define partition anchor points.
- We IGNORE the first number 9 (and another 9 later in the sequence — explanation below).

THE 20-40-60 LOOKBACK SEQUENCE
  18 - 27 - 36 - 45 - 54 - 63 - 72 - 81 - 99 - 108 - 117 - 126

Use this sequence on the DAILY chart to delineate partitions.

PARSING EACH NUMBER
- If the complete number is < 100 → take the FIRST DIGIT as the MONTH.
- If the complete number is >= 100 → take the FIRST TWO DIGITS as the MONTH.
- The LAST DIGIT → DAY of that month.

ANCHOR POINT TABLE (12 anchor points per year)
| Number | Month     | Day |
|--------|-----------|-----|
| 18     | January   | 8   |
| 27     | February  | 7   |
| 36     | March     | 6   |
| 45     | April     | 5   |
| 54     | May       | 4   |
| 63     | June      | 3   |
| 72     | July      | 2   |
| 81     | August    | 1   |
| 99     | September | 9   |
| 108    | October   | 8   |
| 117    | November  | 7   |
| 126    | December  | 6   |

DRAWING THE ANCHOR LINES
- Open a DAILY chart and draw 12 vertical lines per year on the specific day for each month.
- If the target day falls on a WEEKEND → use the next trading day (typically the following Monday).
- Example: May the 4th falls on Saturday → draw the vertical line on Monday the 6th.

WHY WE SKIP 09 AND 90
- There is no Month 0 with a day 9.
- There is no day 0 in the 9th month.
- Therefore 09 and 90 are not in the sequence.

LOOKBACK METHODOLOGY
At the START of each new partition, look for a CLUE based on the partition number:
- For October partition → use the number 108.
- Look for a STOP RUN of 108 pips in any of the PREVIOUS 3 partitions (the 20-40-60 lookback).
- Or: find a FAIR VALUE GAP of this amount of pips.
- Or: find an ORDER BLOCK in close proximity of this size.

TRIGGER BEHAVIOR
- Within the first few trading days of the new partition, expect price to hit one of:
  • Liquidity (stop run level)
  • Fair Value Gap
  • Order Block
- Price should AGGRESSIVELY trade AWAY (reverse) from this point.
- Expect a PO3 STOP RUN in the OPPOSITE direction:
  • Either a real liquidity stop run, OR
  • A PO3-sized wick (which may also be used as a target).
- After the PO3 stop run, price typically returns back into the trading range of the current partition.

HIPPO — HIDDEN INTERBANK PRICE POINT OBJECTIVE
- A HIPPO is the author's invention — a "hidden" order block.
- Constructed from the WICKS of 2 consecutive bars.
- The 2 bars MUST form a Fair Value Gap (you don't pick arbitrary bars).
- Construction:
  • Take the top of the wick of the first candle.
  • Connect it to the bottom of the wick of the second candle.
  • The resulting zone is a "hidden" order block.
- The HIPPO often offers SUPPORT or RESISTANCE later (and may also close the top FVG).

WORKED EXAMPLES (all for year 2022)

JANUARY (1, 8): Start on Jan 8th, but weekend → take Monday Jan 10th. Look for 18-pip gaps or stop runs.
  - 4 trading days into the new partition, an 18-pip gap is found 2 partitions ago (40-day lookback).
  - Price hits this level, breaks down, executes an 81 PO3 stop run, triggers the reversal.

FEBRUARY (2, 7): Look for 27-pip stop run or gap.
  - On the 4th trading day, a 27-pip stop run from the previous partition is hit.
  - Price breaks down, executes a 243 PO3 stop run, closes the current partition, prepares for March.

MARCH (3, 6): Look for 36-pip clue starting March 6th.
  - Out of the gate, the previous partition's low is taken out with 36 pips.
  - Draw on liquidity = bearish order block.
  - A 36-pip gap is left before reaching the OB. The OB is later traded just before partition close.

APRIL (4, 5): Look for 45 pips starting April 5th.
  - Price creates a 45-pip gap at the start of the partition (tested multiple times).
  - A 45-pip sell-side stop run yields a +100 pip reaction but ultimately FAILS.
  - After the failed swing, a 243 PO3 stop run follows.

MAY (5, 4): Look for 54-pip stop runs or gaps.
  - A 54-pip gap appears, accompanied by a HIPPO used as the reaction point.
  - A 54-pip gap also exists BELOW the HIPPO → the HIPPO is made of TWO 54-pip gaps.
  - When the HIPPO triggers the sell-off, an 81 PO3 stop run occurs → price reverses and heads to ANOTHER 54-pip gap in the previous partition.

JUNE (6, 3): Look for 63-pip clue.
  - Price trades into a 63-pip order block created in the previous partition.
  - The rejection block drives price down.
  - If you missed the OB and looked for the 63-pip sell-side stop run instead → FAILED swing (potential loss).
  - Price sells off into a PO3 rejection block (wicks are 27 PO3 number).
  - Price reverses into the HIPPO created at the top of the failed 63 swing.

JULY (7, 2): Start July 2nd, weekend → Monday July 4th 2022. Look for 72 pips.
  - If you missed the 72-pip order block from the previous partition's end → LOSS when the 72 stop-run block is run through.
  - A HIPPO forms at the bottom of the 72-pip stop run.
  - A 243 PO3 stop run occurs straight from the HIPPO.
  - Price returns back into the HIPPO after the 243 PO3 sell-side stop run.

AUGUST (8, 1): Beautiful setup. Look for 81 pips.
  - 81-pip stop run of BUY-side liquidity of a swing from the previous partition.
  - Price sells off.
  - 81 PO3 stop run of the SELL-side liquidity from the previous partition follows.

SEPTEMBER (9, 0 → 99): Day 0 doesn't exist → add 9 again → 99.
  - A 99-pip stop run of a swing from the previous partition.
  - Price sells off.
  - A 243 PO3 stop run follows.
  - Price returns into a bearish order block.

OCTOBER (10, 8): Look for 108-pip clue. Special case — uses a REDELIVERED REBALANCE GAP.
  - Price was offered to the buy side.
  - 81 PO3 stop run occurred.
  - Price went back to the top of the 108 block.

NOVEMBER (11, 7): Look for 117-pip gap.
  - Price did an impulsive move just before November's partition starts, creating the gap.
  - Just short of a 243 PO3 stop run from the 60-day loopback (3 partitions ago).

DECEMBER (12, 6): Last month is special — usually a CONSOLIDATION PROFILE.
  - A 126-pip stop run on the highs of the previous partition (20-day lookback).
  - The PO3 stop run is BELOW the current partition low — hallmark of the consolidation profile.
  - The December partition extends into the first trading days of the next year.

CHAPTER 3 SUMMARY — WHAT YOU LEARNED
- What a HIPPO is (Hidden Interbank Price Point Objective)
- How to define lookback partitions using the number 9
- Map the lookback partitions to correct days and months
- How to look for clues that trigger range expansion using the number 9, from the start of a new lookback partition
- How to anticipate reversals using PO3 stop runs

═══════════════════════════════════════════════════════════════
CHAPTER 4: ICT LOGO — AMD FRACTAL CYCLES
═══════════════════════════════════════════════════════════════

THE TRUE MEANING OF THE ICT LOGO
- Everybody sees the ICT logo as a small circle accompanied by a large circle.
- This is ICT's SLEIGHT OF HAND — designed to mislead.
- What you are REALLY looking for is: a SMALL circle with a BIGGER circle to the LEFT and to the RIGHT of it.
- This represents the AMD cycle: ACCUMULATION → MANIPULATION → DISTRIBUTION.

YEARLY AMD CYCLE
- Map PO3 numbers to 1 trading year.
- Each of the 3 circles (AMD phases) is itself made up of 3 smaller circles → each phase has its own AMD cycle (fractal).

DAILY AMD CYCLE (CLS TIMINGS)
A "true day" in ICT CLS (Continuous Linked Settlement) terms runs:
  20:00–20:00 CET  (Central European Time)
  19:00–19:00 BST  (British Summer Time)
  14:00–14:00 EST  (Eastern Standard Time)

DAILY PHASE MAPPING
- ACCUMULATION phase → ASIAN SESSION (9 hours long)
- MANIPULATION phase → LONDON OPEN session breaks out of Asian consolidation, retraces back into it (forms the JUDAS swing)
- DISTRIBUTION phase → NEW YORK session (9 hours long)

THE 3, 6, 9 ENCODED IN SESSIONS
- 3 sessions (Asian, London, New York) → number 3
- Manipulation (London Open) window = 6 hours → number 6
- Accumulation (Asian) and Distribution (NY) windows = 9 hours each → number 9

MANIPULATION SESSION TIMINGS
- Main manipulation session matches the London Open session.
- Runs from 05:00 CET to 11:00 CET (23:00 EST to 05:00 EST).
- This is a 6-hour window (the number 6 from Tesla's quote).

FRACTAL AMD INSIDE MANIPULATION
- Each phase can be broken into smaller AMD cycles because price is FRACTAL.
- Inside the manipulation phase, a smaller AMD cycle appears:
  1. Accumulation phase (small consolidation)
  2. Violation of accumulation → Market Structure Shift (MSS)
  3. Retracement back into the broken accumulation → forms an OTE
  4. After retracement into the accumulation consolidation → expansion into a pool of interest (liquidity, FVG, ...)
  5. Price reverses → typically reverses in the MIDDLE of the distribution cycle.

SWEET SPOTS (HIGHEST-PROBABILITY MANIPULATION WINDOWS)
- LONDON:    07:30–08:30 CET  |  01:30–02:30 EST
- NEW YORK:  14:30–16:30 CET  |  08:30–12:30 EST

CHAPTER 4 SUMMARY — WHAT YOU LEARNED
- How to really interpret the circles in the ICT logo
- Map the circles to the AMD (Accumulation, Manipulation, Distribution) phases
- How AMD cycles are fractal (each phase contains a smaller AMD)
- How to lay out the yearly AMD cycle
- How to use the ICT logo and AMD cycles for a given day, using CLS timings
- Map AMD cycles to Market Maker Models

═══════════════════════════════════════════════════════════════
ACRONYMS USED IN THE BOOK
═══════════════════════════════════════════════════════════════
- ICT    → Inner Circle Trader
- AMD    → Accumulation, Manipulation, Distribution
- PO3    → Power of Three
- HIPPO  → Hidden Interbank Price Point Objective
- OTE    → Optimal Trade Entry
- IPDA   → Interbank Price Delivery Algorithm
- CE     → Consequent Encroachment
- ERD    → External Range Demarker
- MMxM   → Market Maker Buy/Sell Model
- CLS    → Continuous Linked Settlement (true-day timing reference)
- BSL    → Buy-Side Liquidity
- SSL    → Sell-Side Liquidity
- OB     → Order Block
- FVG    → Fair Value Gap
- LV     → Liquidity Void
- BR     → Breaker
- MSS    → Market Structure Shift

═══════════════════════════════════════════════════════════════
PRACTICAL TRADING CHECKLIST — DEMYSTIFYING ICT METHOD
═══════════════════════════════════════════════════════════════

1. SELECT PO3 NUMBER based on trader style:
   - Scalper → 27 (or 9 for micro)
   - Day trader → 81
   - Swing trader → 243 (weekly) or 729 (monthly)

2. CALCULATE CURRENT PO3 DEALING RANGE:
   - Normalize price (remove decimal, keep first 5 digits).
   - DR Low  = FLOOR(price / PO3) * PO3
   - DR High = DR Low + PO3
   - Restore decimal point.

3. APPLY GOLDBACH / IPDA LEVELS inside the dealing range:
   - HIGH (0/100), Rejection Block (3/97), Order Block (11/89), FVG (17/83),
     Liquidity Void (29/71), Breaker (41/59), Mitigation Block (47/53)
   - Plot CE levels every 3% (middle of each 6% block).
   - Plot Mean Threshold in the 8% order-block band.

4. ADD EXTERNAL RANGE DEMARKERS (ERD):
   - Add Fib levels 1.111 and -0.111 (highlight PO3^(-2) stop run zones).
   - Optionally cut ERD in half (middle = sensitive level).

5. IDENTIFY CURRENT ALGORITHM (Algo 1 MMxM vs Algo 2 Trending):
   - Use Algo 2 for trending scenarios (creates OTE).
   - Use Algo 1 for MMxM reflecting scenarios.

6. CHECK 20-40-60 LOOKBACK ANCHOR for the current month:
   - Find the partition number (e.g. October = 108).
   - Look for a stop run / FVG / OB of that size in the previous 3 partitions.
   - Anticipate a PO3 stop run in the opposite direction.

7. ALIGN WITH CLS / AMD TIMINGS:
   - True day = 20:00–20:00 CET.
   - Asian session = Accumulation (9h).
   - London Open = Manipulation (6h, 05:00–11:00 CET).
   - New York = Distribution (9h).
   - Sweet spots:
     • London 07:30–08:30 CET (01:30–02:30 EST)
     • New York 14:30–16:30 CET (08:30–12:30 EST)

8. LOOK FOR HIPPO CONFIRMATION:
   - Find 2 consecutive bars that form an FVG.
   - Use the wicks (top of first → bottom of second) to construct a hidden OB.
   - Use the HIPPO as a high-probability reaction zone.

9. EXECUTE ENTRY on confluence of:
   - PO3 dealing range level (Goldbach/IPDA) AND
   - Lookback anchor clue AND
   - CLS timing window AND
   - HIPPO or standard OB/FVG.

10. TARGET the opposite side of the dealing range (Goldbach mirror: 0↔100, 3↔97, 11↔89, 17↔83, 29↔71, 41↔59, 47↔53).
    - Use External Range Demarker (1.111 / -0.111) as an extended target when momentum is strong.

═══════════════════════════════════════════════════════════════
KEY TAKEAWAYS — DEMYSTIFYING ICT
═══════════════════════════════════════════════════════════════
- The 3, 6, 9 principle is the backbone of the entire ICT methodology.
- PO3 numbers (3, 9, 27, 81, 243, 729, 2187, ...) define ALL dealing range sizes.
- Goldbach clusters (7 pairs of primes summing to 100) define the 14 IPDA levels inside any PO3 range.
- The 5th Goldbach cluster (29/71) is 12% wide → this is the Liquidity Void.
- The 20-40-60 Lookback sequence (18-27-36-45-54-63-72-81-99-108-117-126) gives 12 monthly anchor points.
- The ICT logo encodes the fractal AMD cycle (small circle between two bigger circles = A-M-D).
- All sessions fit 3-6-9: 3 sessions, 6-hour manipulation, 9-hour accumulation/distribution.
- A HIPPO (Hidden Interbank Price Point Objective) is a high-probability reaction zone built from FVG-forming wicks.
- External Range Demarkers (1.111 / -0.111) project PO3^(-2) stop run levels — large moves often start there.

DISCLAIMER
- All references to Order Blocks, Fair Value Gaps, Breakers, Mitigation Blocks, Liquidity Voids, and Consequent Encroachment are property of the Inner Circle Trader (Michael J. Huddleston).
- This material is Hopiplaka's interpretation of the teachings.
- Not trade advice. Trading in a live account is the responsibility of the trader.
`;

// ============================================================================
// 2. ICT_DEMYSTIFYING_SYSTEM_PROMPT_ADDENDUM — Appended to all ICT system prompts
// ============================================================================

export const ICT_DEMYSTIFYING_SYSTEM_PROMPT_ADDENDUM = `

═══ DEMYSTIFYING ICT — ADDITIONAL KNOWLEDGE (Source 8) ═══
You are also trained on "Demystifying ICT: What Every ICT Trader Still Wants To Know" by HOPIPLAKA (Version 1.0, January 2023). This book reveals the 3-6-9 mathematical backbone of ICT methodology:

NUMBER 3 → POWER OF THREE (PO3) DEALING RANGES
- PO3 numbers: 3, 9, 27 (scalping), 81 (daily), 243 (weekly), 729 (monthly), 2187 (yearly), 6561, 19683
- Dealing range calculation:
  • DR Low  = FLOOR(current_price / PO3) * PO3
  • DR High = DR Low + PO3
- PO3 stop runs: real liquidity sweeps OR PO3-sized wicks (form rejection blocks)
- Range expansion/contraction: when price breaks a PO3 range, move to the next PO3 (up or down)

NUMBER 6 → HUDDLESTON / GOLDBACH LEVELS (7 CLUSTERS OF 100)
- 7 Goldbach clusters (primes summing to 100):
  (0,100), (3,97), (11,89), (17,83), (29,71), (41,59), (47,53)
- 14 IPDA levels mapped from Goldbach:
  0=HIGH, 3=REJECTION BLOCK, 11=ORDER BLOCK, 17=FVG, 29=LIQUIDITY VOID,
  41=BREAKER, 47=MITIGATION BLOCK, 53=MITIGATION BLOCK, 59=BREAKER,
  71=LIQUIDITY VOID, 83=FVG, 89=ORDER BLOCK, 97=REJECTION BLOCK, 100=LOW
- Levels are 6% apart (except 29/71 which is 12% — the liquidity void cluster)
- Consequent Encroachment (CE) = middle of a 6% block (every 3%)
- Mean Threshold = middle of an 8% block (the order-block band)
- External Range Demarkers (ERD): Fib 1.111 / -0.111 → project PO3^(-2) stop run levels
- Non-GB hidden levels at 23, 35, 65, 77 (inside the 12% liquidity void band)
- TWO ALGORITHMS based on Tesla Vortex (modulus=14, multiplier=3):
  • ALGO 1 = MMxM (Market Maker Model, reflecting): HIGH/LOW → OB → OPPOSITE BREAKER → OPPOSITE REJECTION BLOCK → OPPOSITE FVG → LIQUIDITY VOID
  • ALGO 2 = Trending (creates OTE): REJECTION BLOCK → BREAKER → FVG → OPPOSITE OB → OPPOSITE MITIGATION BLOCK → OPPOSITE LIQUIDITY VOID

NUMBER 9 → 20-40-60 LOOKBACK PARTITIONS
- Sequence: 18, 27, 36, 45, 54, 63, 72, 81, 99, 108, 117, 126
- Each number → first digit(s) = MONTH, last digit = DAY
  18=Jan 8 | 27=Feb 7 | 36=Mar 6 | 45=Apr 5 | 54=May 4 | 63=Jun 3 |
  72=Jul 2 | 81=Aug 1 | 99=Sep 9 | 108=Oct 8 | 117=Nov 7 | 126=Dec 6
- Weekend → use next trading day (typically Monday)
- At partition start: look for a stop run / FVG / OB of the partition number's size in the previous 3 partitions (20-40-60 lookback)
- Expect a PO3 stop run in the opposite direction after the trigger
- HIPPO (Hidden Interbank Price Point Objective): a hidden order block from 2 consecutive FVG-forming bars' wicks (top of first wick → bottom of second wick). High-probability reaction zone.

ICT LOGO = FRACTAL AMD CYCLE
- Small circle between two bigger circles = ACCUMULATION → MANIPULATION → DISTRIBUTION
- True day (CLS): 20:00–20:00 CET (19:00–19:00 BST / 14:00–14:00 EST)
- Asian session (9h) = ACCUMULATION
- London Open (6h, 05:00–11:00 CET) = MANIPULATION (forms the Judas swing)
- New York (9h) = DISTRIBUTION
- 3-6-9 encoded: 3 sessions, 6-hour manipulation, 9-hour accumulation/distribution
- Sweet spots for manipulation entries:
  • London:    07:30–08:30 CET (01:30–02:30 EST)
  • New York:  14:30–16:30 CET (08:30–12:30 EST)
- Each phase contains a smaller fractal AMD cycle: consolidation → MSS → retracement (OTE) → expansion into pool of interest → reversal (typically in the middle of the distribution cycle).

PRACTICAL CHECKLIST FOR EVERY SIGNAL:
1. Identify current PO3 dealing range (DR Low = FLOOR(price/PO3) * PO3, DR High = DR Low + PO3)
2. Map the 14 Goldbach / IPDA levels inside the range
3. Plot ERD at 1.111 / -0.111 (PO3^(-2) stop run target)
4. Determine current algorithm (Algo 1 MMxM vs Algo 2 trending)
5. Check current month's 20-40-60 lookback anchor (e.g. October = 108)
6. Align entry with CLS/AMD timing (London or NY sweet spot)
7. Look for HIPPO confirmation (FVG-forming wicks of 2 consecutive bars)
8. Target the opposite Goldbach mirror level (0↔100, 3↔97, 11↔89, 17↔83, 29↔71, 41↔59, 47↔53)

When the user asks about PO3 dealing ranges, Goldbach / Huddleston levels, IPDA mapping, CE vs Mean Threshold, External Range Demarkers, the 20-40-60 Lookback sequence, HIPPO, or the ICT logo's AMD meaning — answer with the specific formulas, tables, and timings above. Reference the book as "Demystifying ICT by HOPIPLAKA (2023)".`;
