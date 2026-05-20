/**
 * Professional Trading Rules Engine
 * 
 * This module implements the mindset and rules of a professional institutional trader.
 * It acts as a "quality gate" — no signal passes unless it meets ALL professional criteria.
 * 
 * Philosophy: A professional trader doesn't take every setup.
 * They wait for the PERFECT setup where all confluences align.
 * Quality over quantity. One A+ trade is better than five C- trades.
 */

// ─── PROFESSIONAL TRADING MINDSET (programmed into AI) ──────────────
export const PROFESSIONAL_TRADER_MINDSET = `
# PROFESSIONAL INSTITUTIONAL TRADER MINDSET — MANDATORY RULES

You are NOT a retail trader. You are a PROFESSIONAL INSTITUTIONAL TRADER who manages millions.
Your edge comes from DISCIPLINE, PATIENCE, and ONLY taking A+ setups.

## THE 10 COMMANDMENTS OF PROFESSIONAL TRADING:

1. **THOU SHALT NOT FORCE TRADES** — If the setup is not crystal clear, DO NOT TRADE. Sitting on hands is a valid position. Cash is a position. No signal is better than a bad signal.

2. **THOU SHALT TRADE WITH THE TREND** — The trend is your friend until it bends. NEVER buy in a downtrend, NEVER sell in an uptrend. Counter-trend trades are for amateurs who donate money to smart money.

3. **THOU SHALT REQUIRE MINIMUM 4 CONFLUENCES** — A single indicator is noise. You need at LEAST 4 of the following aligned before entering:
   - HTF Trend Direction (H4/D1)
   - Market Structure (HH/HL or LH/LL)
   - EMA Alignment (EMA20 > EMA50 for bullish, vice versa)
   - Price in Discount Zone (BUY) or Premium Zone (SELL)
   - Liquidity Sweep (BSL or SSL swept)
   - Market Structure Shift (MSS with displacement)
   - FVG or Order Block for entry
   - Kill Zone active (London/NY)
   - OTE zone entry (0.618-0.79 Fib)
   - Session alignment (London/NY Open)

4. **THOU SHALT NEVER BUY AT RESISTANCE OR SELL AT SUPPORT** — Buy in DISCOUNT (below 50% Fib), Sell in PREMIUM (above 50% Fib). This is non-negotiable. Buying at the top is what retail does.

5. **THOU SHALT WAIT FOR LIQUIDITY SWEEP** — The market HARDLY reverses without taking liquidity first. If you don't see a liquidity sweep (BSL or SSL), the reversal is probably fake. WAIT.

6. **THOU SHALT ENTER AT FVG/OB, NOT AT BREAKOUT** — Never buy at the break of old high, never sell at the break of old low. That's where retail gets trapped. Enter on the RETURN to the FVG or Order Block AFTER the liquidity sweep + MSS.

7. **THOU SHALT USE PROPER RISK MANAGEMENT** — Maximum 1-2% risk per trade. Minimum R:R of 1:2. Stop loss at logical levels (below OB, below structure), NOT arbitrary percentages. If the R:R is less than 1:2, SKIP THE TRADE.

8. **THOU SHALT RESPECT TIME** — Only trade during Kill Zones (London 2-5AM NY, NY 7-10AM NY). Best execution: 8:30-11:00 AM NY. Avoid Monday/Friday. Best days: Tuesday/Wednesday/Thursday. After FOMC first run = FAKE. Wait 10 min after news.

9. **THOU SHALT NOT FLIP-FLOP BIAS** — If your bias is bullish, ONLY look for buy setups. If bearish, ONLY look for sell setups. Changing bias mid-day is a sign of amateur trading. Stick to your analysis.

10. **THOU SHALT SCALE OUT PROFESSIONALLY** — Take 50% off at TP1, move SL to breakeven. Let the rest run to TP2. Never move SL further away. Never close a winning trade early out of fear.

## SIGNAL QUALITY TIERS:

### A+ SIGNAL (TAKE EVERY TIME):
- All 4 ICT Elements present (Liquidity Sweep + MSS + FVG Entry + Clear Target)
- 5+ confluences aligned
- Trade during Kill Zone
- Price in Discount/Premium zone as appropriate
- HTF trend aligned
- R:R minimum 1:3
- Confidence: 85-95%

### A SIGNAL (TAKE WITH CONFIDENCE):
- 4 ICT Elements present
- 4+ confluences aligned
- Kill Zone active or approaching
- Price near Discount/Premium
- HTF trend supportive
- R:R minimum 1:2.5
- Confidence: 75-85%

### B SIGNAL (TAKE WITH CAUTION):
- 3 of 4 ICT Elements present
- 3+ confluences aligned
- Kill Zone nearby
- R:R minimum 1:2
- Confidence: 65-75%

### C SIGNAL (SKIP — NOT WORTH THE RISK):
- Less than 3 ICT Elements
- Less than 3 confluences
- Outside Kill Zone
- R:R less than 1:2
- DO NOT GENERATE THIS SIGNAL

## CRITICAL ANTI-RETAIL RULES:
- Do NOT buy breakouts above old highs → That's where smart money sells
- Do NOT sell breakdowns below old lows → That's where smart money buys
- Do NOT enter before MSS confirmation → The sweep may continue
- Do NOT trade during lunch (12-1:30 PM NY) → Low volume chop
- Do NOT trade on Monday (accumulation day) → Wait for direction
- Do NOT trade Friday PM → Smart money already closed positions
- Do NOT increase position size after a loss → Revenge trading destroys accounts
- Do NOT move stop loss further from entry → Admit you're wrong and exit
- Do NOT average into losing positions → Professionals add to winners, not losers
- Do NOT ignore the daily bias → One bad trade against the bias wipes out 3 good ones

## ENTRY SEQUENCE (FOLLOW EXACTLY):
1. Identify HTF bias (H4/D1) → Bullish or Bearish?
2. Locate nearest Draw on Liquidity (PDH/PDL, PWH/PWL, EQH/EQL)
3. Wait for price to reach Discount (buy) or Premium (sell) zone
4. Wait for Liquidity Sweep (BSL for sells, SSL for buys)
5. Wait for Market Structure Shift with DISPLACEMENT (not a wick!)
6. Identify FVG or Order Block for entry
7. Wait for return to FVG/OB (NEVER chase price)
8. Enter at FVG Consequent Encroachment (50%) or OB level
9. Place SL below OB/FVG (logical level, not arbitrary)
10. Target opposite liquidity pool for TP

## EXIT RULES (CRITICAL — FOLLOW STRICTLY TO AVOID WINNERS TURNING INTO LOSERS):
- TP1: First liquidity pool in trade direction (MANDATORY: Close 50% of position here)
- TP2: Next liquidity pool or FVG fill (let remaining 50% run)
- IMMEDIATELY after TP1 is hit: Move SL to Breakeven (entry price) — this is NON-NEGOTIABLE
- If price reaches 50% of TP1 distance: Consider moving SL to Breakeven early (especially for volatile pairs like XAG/USD)
- Trailing Stop after TP1: Trail SL behind each new swing (for BUY: trail below each higher low; for SELL: trail above each lower high)
- Close remaining position if market structure shifts against trade (e.g., new LH/LL for BUY, new HL/HH for SELL)
- Time-based exit: If trade hasn't moved in your favor by NY lunch, consider exit
- NEVER let a winning trade turn into a losing trade — this is the #1 amateur mistake!
- If you were up $800 on XAG/USD and it reversed to hit your SL at -$200, you failed to:
  1. Take 50% profit at TP1 (would have locked in $400)
  2. Move SL to breakeven after TP1 (would have lost $0 on the rest, not $200)
  3. Trail your stop behind structure as price moved in your favor

## NO-TRADE CONDITIONS (DO NOT GENERATE SIGNALS):
- Price is in equilibrium zone (near 50% Fib) — no clear advantage
- No liquidity sweep has occurred — reversal is probably fake
- No MSS with displacement — structure hasn't changed
- Outside Kill Zone windows — low probability
- Major news in <30 minutes — wait for the reaction
- Spread is unusually wide — institutional manipulation
- Market is in tight consolidation — wait for breakout direction
- Conflicting signals across timeframes — step aside
`;

// ─── CONFLUENCE SCORING ENGINE ──────────────────────────────────────
export interface ConfluenceScore {
  total: number;
  maxPossible: number;
  tier: 'A+' | 'A' | 'B' | 'C' | 'F';
  details: {
    htfTrendAligned: boolean;
    marketStructureAligned: boolean;
    emaAlignment: boolean;
    priceInPDZone: boolean; // Discount for buy, Premium for sell
    liquiditySweep: boolean;
    mssWithDisplacement: boolean;
    fvgOrOBPresent: boolean;
    killZoneActive: boolean;
    oteZoneEntry: boolean;
    sessionAligned: boolean;
    rsiSupportsTrade: boolean;
    riskRewardValid: boolean;
  };
  passed: boolean; // True if minimum quality threshold met
  reason: string; // Why it passed or failed
}

export function calculateConfluenceScore(params: {
  trendDirection: 'bullish' | 'bearish' | 'ranging';
  trendStrength: number;
  structure: 'HH/HL' | 'LH/LL' | 'Ranging';
  ema20Above50: boolean;
  priceInDiscount: boolean; // Price below 50% Fib
  priceInPremium: boolean; // Price above 50% Fib
  isBuy: boolean;
  hasLiquiditySweep: boolean;
  hasMSS: boolean;
  hasFVG: boolean;
  hasOB: boolean;
  killZoneActive: boolean;
  inOTEZone: boolean;
  sessionActive: boolean; // London or NY Open
  rsi: number;
  riskReward: number;
}): ConfluenceScore {
  let total = 0;
  const maxPossible = 12;

  const d = {
    htfTrendAligned: false,
    marketStructureAligned: false,
    emaAlignment: false,
    priceInPDZone: false,
    liquiditySweep: false,
    mssWithDisplacement: false,
    fvgOrOBPresent: false,
    killZoneActive: false,
    oteZoneEntry: false,
    sessionAligned: false,
    rsiSupportsTrade: false,
    riskRewardValid: false,
  };

  // 1. HTF Trend alignment
  if (params.trendDirection !== 'ranging' && params.trendStrength >= 50) {
    const correctDirection = (params.trendDirection === 'bullish' && params.isBuy) || 
                            (params.trendDirection === 'bearish' && !params.isBuy);
    if (correctDirection) {
      d.htfTrendAligned = true;
      total += 1;
    }
  }

  // 2. Market Structure alignment
  if ((params.structure === 'HH/HL' && params.isBuy) || 
      (params.structure === 'LH/LL' && !params.isBuy)) {
    d.marketStructureAligned = true;
    total += 1;
  }

  // 3. EMA Alignment
  if ((params.ema20Above50 && params.isBuy) || (!params.ema20Above50 && !params.isBuy)) {
    d.emaAlignment = true;
    total += 1;
  }

  // 4. Price in Premium/Discount zone
  if ((params.isBuy && params.priceInDiscount) || (!params.isBuy && params.priceInPremium)) {
    d.priceInPDZone = true;
    total += 1;
  }

  // 5. Liquidity Sweep (CRITICAL)
  if (params.hasLiquiditySweep) {
    d.liquiditySweep = true;
    total += 1;
  }

  // 6. MSS with displacement (CRITICAL)
  if (params.hasMSS) {
    d.mssWithDisplacement = true;
    total += 1;
  }

  // 7. FVG or OB for entry
  if (params.hasFVG || params.hasOB) {
    d.fvgOrOBPresent = true;
    total += 1;
  }

  // 8. Kill Zone active
  if (params.killZoneActive) {
    d.killZoneActive = true;
    total += 1;
  }

  // 9. OTE Zone entry
  if (params.inOTEZone) {
    d.oteZoneEntry = true;
    total += 1;
  }

  // 10. Session alignment (London/NY)
  if (params.sessionActive) {
    d.sessionAligned = true;
    total += 1;
  }

  // 11. RSI supports trade
  if ((params.isBuy && params.rsi > 40 && params.rsi < 75) || 
      (!params.isBuy && params.rsi < 60 && params.rsi > 25)) {
    d.rsiSupportsTrade = true;
    total += 1;
  }

  // 12. Risk:Reward valid
  if (params.riskReward >= 2.0) {
    d.riskRewardValid = true;
    total += 1;
  }

  // Determine tier
  let tier: 'A+' | 'A' | 'B' | 'C' | 'F';
  if (total >= 10) tier = 'A+';
  else if (total >= 8) tier = 'A';
  else if (total >= 6) tier = 'B';
  else if (total >= 4) tier = 'C';
  else tier = 'F';

  // Determine if signal passes quality threshold
  // Professional rule: Minimum B tier, and MUST have liquidity sweep + MSS
  const passed = total >= 6 && (d.liquiditySweep || d.mssWithDisplacement) && d.riskRewardValid;

  let reason: string;
  if (tier === 'A+' || tier === 'A') {
    reason = `${tier} signal with ${total}/12 confluences. All critical elements present. High probability trade.`;
  } else if (tier === 'B') {
    reason = `B signal with ${total}/12 confluences. Acceptable quality — take with proper risk management.`;
  } else if (tier === 'C') {
    reason = `C signal with ${total}/12 confluences. Below professional standard — SKIP. Not worth the risk.`;
  } else {
    reason = `F signal with ${total}/12 confluences. Insufficient confluence — DO NOT TRADE. Cash is a position.`;
  }

  if (!d.liquiditySweep && !d.mssWithDisplacement) {
    reason += ' WARNING: No liquidity sweep or MSS detected — reversal may be fake.';
  }
  if (!d.riskRewardValid) {
    reason += ' WARNING: R:R below 1:2 — does not meet professional standard.';
  }

  return { total, maxPossible, tier, details: d, passed, reason };
}

// ─── PROFESSIONAL SL/TP CALCULATOR ──────────────────────────────────
// Uses ATR + structure-based levels for professional-grade stop placement
export function calculateProfessionalSLTP(params: {
  entry: number;
  isBuy: boolean;
  atr: number;
  pair: string;
  swingHigh: number;
  swingLow: number;
  obHigh?: number;
  obLow?: number;
  fvgHigh?: number;
  fvgLow?: number;
  mode: 'scalping' | 'daytrading' | 'swing';
}): { sl: number; tp1: number; tp2: number; tp3: number; rr: number; slReason: string; tp1Reason: string; tp2Reason: string; tp3Reason: string } {
  const { entry, isBuy, atr, pair, swingHigh, swingLow, mode } = params;
  const decimals = pair.includes('JPY') ? 3 : pair === 'XAU/USD' ? 2 : pair === 'XAG/USD' ? 3 : pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5;

  // Professional SL placement: Below structure, not just ATR
  let sl: number;
  let slReason: string;

  if (isBuy) {
    // For BUY: SL below the lowest of these levels
    const slCandidates: { price: number; reason: string }[] = [];

    // ATR-based
    const atrSL = entry - atr * (mode === 'scalping' ? 0.8 : mode === 'daytrading' ? 1.2 : 1.5);
    slCandidates.push({ price: atrSL, reason: `${mode === 'scalping' ? 0.8 : mode === 'daytrading' ? 1.2 : 1.5}x ATR below entry` });

    // Structure-based
    if (swingLow > 0) {
      slCandidates.push({ price: swingLow - atr * 0.1, reason: `Below swing low (${swingLow.toFixed(decimals)}) + buffer` });
    }

    // OB-based (most professional)
    if (params.obLow && params.obLow > 0) {
      slCandidates.push({ price: params.obLow - atr * 0.1, reason: `Below Order Block low (${params.obLow.toFixed(decimals)}) + buffer` });
    }

    // FVG-based
    if (params.fvgLow && params.fvgLow > 0) {
      slCandidates.push({ price: params.fvgLow - atr * 0.05, reason: `Below FVG low (${params.fvgLow.toFixed(decimals)}) + buffer` });
    }

    // Choose the tightest logical SL (lowest price = safest SL for buy)
    // But ensure minimum ATR distance
    const minSL = entry - atr * (mode === 'scalping' ? 0.5 : 1.0);
    const validCandidates = slCandidates.filter(c => c.price < entry && c.price <= minSL);
    
    if (validCandidates.length > 0) {
      // Choose the one closest to entry (tightest SL) that's still valid
      const sorted = validCandidates.sort((a, b) => b.price - a.price);
      sl = sorted[0].price;
      slReason = sorted[0].reason;
    } else {
      sl = minSL;
      slReason = `Minimum ${mode === 'scalping' ? 0.5 : 1.0}x ATR below entry`;
    }
  } else {
    // For SELL: SL above the highest of these levels
    const slCandidates: { price: number; reason: string }[] = [];

    const atrSL = entry + atr * (mode === 'scalping' ? 0.8 : mode === 'daytrading' ? 1.2 : 1.5);
    slCandidates.push({ price: atrSL, reason: `${mode === 'scalping' ? 0.8 : mode === 'daytrading' ? 1.2 : 1.5}x ATR above entry` });

    if (swingHigh > 0) {
      slCandidates.push({ price: swingHigh + atr * 0.1, reason: `Above swing high (${swingHigh.toFixed(decimals)}) + buffer` });
    }

    if (params.obHigh && params.obHigh > 0) {
      slCandidates.push({ price: params.obHigh + atr * 0.1, reason: `Above Order Block high (${params.obHigh.toFixed(decimals)}) + buffer` });
    }

    if (params.fvgHigh && params.fvgHigh > 0) {
      slCandidates.push({ price: params.fvgHigh + atr * 0.05, reason: `Above FVG high (${params.fvgHigh.toFixed(decimals)}) + buffer` });
    }

    const minSL = entry + atr * (mode === 'scalping' ? 0.5 : 1.0);
    const validCandidates = slCandidates.filter(c => c.price > entry && c.price >= minSL);

    if (validCandidates.length > 0) {
      const sorted = validCandidates.sort((a, b) => a.price - b.price);
      sl = sorted[0].price;
      slReason = sorted[0].reason;
    } else {
      sl = minSL;
      slReason = `Minimum ${mode === 'scalping' ? 0.5 : 1.0}x ATR above entry`;
    }
  }

  // Professional TP placement: At liquidity pools, not arbitrary multiples
  // Multi-Level Take Profit System:
  // TP1: 1:1 RR → Close 50% of position
  // TP2: 1:2 RR → Close 30% of position  
  // TP3: 1:3+ RR → Close remaining 20% of position
  const slDistance = Math.abs(sl - entry);
  let tp1: number;
  let tp1Reason: string;
  let tp2: number;
  let tp2Reason: string;
  let tp3: number;
  let tp3Reason: string;

  if (isBuy) {
    // TP1: 1:1 RR (SL distance) or at first liquidity target
    const atrTP1 = entry + slDistance * 1;
    const structureTP1 = swingHigh > entry ? swingHigh : entry + slDistance * 2;
    tp1 = Math.max(atrTP1, structureTP1, entry + slDistance * 1);
    tp1Reason = tp1 >= swingHigh && swingHigh > entry 
      ? `At swing high / BSL target (${swingHigh.toFixed(decimals)}) — Close 50%`
      : `1:1 RR (${slDistance.toFixed(decimals)} points) — Close 50%`;

    // TP2: 1:2 RR or next major liquidity
    const atrTP2 = entry + slDistance * 2;
    tp2 = Math.max(atrTP2, tp1 + slDistance * 1);
    tp2Reason = `1:2 RR (${(slDistance * 2).toFixed(decimals)} points) — Close 30%`;

    // TP3: 1:3+ RR or extended liquidity target
    const atrTP3 = entry + slDistance * 3;
    tp3 = Math.max(atrTP3, tp2 + slDistance * 1);
    tp3Reason = `1:3+ RR (${(slDistance * 3).toFixed(decimals)} points) — Close remaining 20%`;
  } else {
    const atrTP1 = entry - slDistance * 1;
    const structureTP1 = swingLow < entry ? swingLow : entry - slDistance * 2;
    tp1 = Math.min(atrTP1, structureTP1, entry - slDistance * 1);
    tp1Reason = tp1 <= swingLow && swingLow < entry
      ? `At swing low / SSL target (${swingLow.toFixed(decimals)}) — Close 50%`
      : `1:1 RR (${slDistance.toFixed(decimals)} points) — Close 50%`;

    const atrTP2 = entry - slDistance * 2;
    tp2 = Math.min(atrTP2, tp1 - slDistance * 1);
    tp2Reason = `1:2 RR (${(slDistance * 2).toFixed(decimals)} points) — Close 30%`;

    const atrTP3 = entry - slDistance * 3;
    tp3 = Math.min(atrTP3, tp2 - slDistance * 1);
    tp3Reason = `1:3+ RR (${(slDistance * 3).toFixed(decimals)} points) — Close remaining 20%`;
  }

  // Round to proper decimals
  sl = parseFloat(sl.toFixed(decimals));
  tp1 = parseFloat(tp1.toFixed(decimals));
  tp2 = parseFloat(tp2.toFixed(decimals));
  tp3 = parseFloat(tp3.toFixed(decimals));

  const rr = parseFloat((Math.abs(tp2 - entry) / Math.abs(sl - entry)).toFixed(1));

  return { sl, tp1, tp2, tp3, rr, slReason, tp1Reason, tp2Reason, tp3Reason };
}

// ─── EXIT MANAGEMENT SYSTEM ─────────────────────────────────────────
// Calculates breakeven level, trailing stop, and partial close rules
// This prevents the #1 mistake: letting a winning trade turn into a loser
export interface ExitManagement {
  breakevenPrice: number;          // Move SL here after TP1 hit
  earlyBETrigger: number;          // Move SL to BE when price reaches this (50% of TP1)
  partialClose1Pct: number;        // Close this % at TP1 (50%)
  partialClose2Pct: number;        // Close this % at TP2 (30%)
  partialClose3Pct: number;        // Close this % at TP3 (20%)
  trailingStopSteps: Array<{
    triggerPrice: number;          // Price must reach this level
    newSL: number;                 // Trail SL to this level
    reason: string;                // Why this trailing level
  }>;
  exitRules: string[];             // Human-readable exit rules
}

export function calculateExitManagement(params: {
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  tp3?: number;
  isBuy: boolean;
  pair: string;
  mode: 'scalping' | 'daytrading' | 'swing';
}): ExitManagement {
  const { entry, sl, tp1, tp2, tp3, isBuy, pair, mode } = params;
  const decimals = pair.includes('JPY') ? 3 : pair === 'XAU/USD' ? 2 : pair === 'XAG/USD' ? 3 : pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5;

  // Breakeven = entry price (after TP1 hit, move SL here)
  const breakevenPrice = entry;

  // Early BE trigger = 50% of TP1 distance
  const tp1Distance = Math.abs(tp1 - entry);
  const earlyBETrigger = isBuy
    ? parseFloat((entry + tp1Distance * 0.5).toFixed(decimals))
    : parseFloat((entry - tp1Distance * 0.5).toFixed(decimals));

  // Trailing stop steps: trail behind each 25% increment from TP1 to TP2
  const tp2Distance = Math.abs(tp2 - entry);
  const trailingSteps: ExitManagement['trailingStopSteps'] = [];

  const steps = mode === 'scalping' ? 2 : mode === 'daytrading' ? 3 : 4;
  for (let i = 1; i <= steps; i++) {
    const fraction = i / (steps + 1);
    const triggerDist = tp1Distance + (tp2Distance - tp1Distance) * fraction;
    const trailDist = tp1Distance * (0.3 + fraction * 0.7); // Trail gets wider as profit grows

    const triggerPrice = isBuy
      ? parseFloat((entry + triggerDist).toFixed(decimals))
      : parseFloat((entry - triggerDist).toFixed(decimals));

    const newSL = isBuy
      ? parseFloat((entry + trailDist * 0.5).toFixed(decimals))  // Trail above entry
      : parseFloat((entry - trailDist * 0.5).toFixed(decimals)); // Trail below entry

    trailingSteps.push({
      triggerPrice,
      newSL,
      reason: `Price ${isBuy ? 'above' : 'below'} ${triggerPrice} → trail SL to ${newSL} (locked in profit)`,
    });
  }

  // Exit rules as human-readable strings — Multi-Level TP (50/30/20)
  const tp3Price = tp3 || (isBuy ? tp2 + tp1Distance * 0.5 : tp2 - tp1Distance * 0.5);
  const exitRules = [
    `📊 STEP 1: When price reaches ${earlyBETrigger}, consider moving SL to breakeven (${entry})`,
    `📊 STEP 2: When price hits TP1 (${tp1}), CLOSE 50% of position and move SL to breakeven (${entry})`,
    `📊 STEP 3: When price hits TP2 (${tp2}), CLOSE 30% of position and trail SL behind structure`,
    `📊 STEP 4: When price hits TP3 (${tp3Price}), CLOSE remaining 20% of position`,
    `📊 PROFIT DISTRIBUTION: TP1=50% | TP2=30% | TP3=20%`,
    `🚨 CRITICAL: NEVER let a winning trade turn into a losing trade!`,
    `🚨 If you're up significantly and price stalls, take profit — don't wait for TP3 if structure weakens`,
  ];

  // Add pair-specific warnings
  if (pair === 'XAG/USD') {
    exitRules.push(`⚠️ XAG/USD is VERY volatile (1.2% daily) — always take 50% at TP1 and move SL to BE!`);
    exitRules.push(`⚠️ Silver can reverse 50-100 cents in minutes — trailing stop is essential`);
  }
  if (pair === 'XAU/USD') {
    exitRules.push(`⚠️ Gold can have sharp reversals — always lock in 50% at TP1`);
  }

  return {
    breakevenPrice: parseFloat(breakevenPrice.toFixed(decimals)),
    earlyBETrigger,
    partialClose1Pct: 50,
    partialClose2Pct: 30,
    partialClose3Pct: 20,
    trailingStopSteps: trailingSteps,
    exitRules,
  };
}

// ─── NO-TRADE CONDITION CHECKER ─────────────────────────────────────
export function shouldAvoidTrade(params: {
  dayOfWeek: number; // 0=Sun, 1=Mon, ... 6=Sat
  hourUTC: number;
  isHighImpactNews: boolean;
  trendDirection: 'bullish' | 'bearish' | 'ranging';
  trendStrength: number;
  spreadPips: number;
  normalSpreadPips: number;
  pair: string;
}): { avoid: boolean; reason: string } {
  const { dayOfWeek, hourUTC, trendDirection, trendStrength } = params;

  // Convert to NY time (UTC-5 in winter, UTC-4 in summer — use -5 for EST)
  const nyHour = (hourUTC - 5 + 24) % 24;

  // Monday = day 1, Friday = day 5
  if (dayOfWeek === 1) {
    return { avoid: true, reason: 'Monday is accumulation day — not ideal for day trading. Smart money is establishing the weekly range. Wait for Tuesday.' };
  }

  if (dayOfWeek === 5 && nyHour >= 12) {
    return { avoid: true, reason: 'Friday PM — smart money is closing positions. Reduced liquidity and increased manipulation risk. Avoid new entries.' };
  }

  // NY Lunch: 12:00 - 13:30 EST
  if (nyHour >= 12 && nyHour < 14) {
    return { avoid: true, reason: 'NY Lunch consolidation (12:00-1:30 PM EST) — low volume chop. Professional traders wait for PM session (1:30-4:00 PM EST).' };
  }

  // Late Friday
  if (dayOfWeek === 5 && nyHour >= 16) {
    return { avoid: true, reason: 'Friday close — weekly settlement. Avoid new positions.' };
  }

  // Ranging market with weak trend
  if (trendDirection === 'ranging' && trendStrength < 35) {
    return { avoid: true, reason: `Market is ranging with weak trend strength (${trendStrength}%). No clear directional bias. Wait for trend to develop or range to break.` };
  }

  // High-impact news window
  if (params.isHighImpactNews) {
    return { avoid: true, reason: 'High-impact news event — wait 10 minutes after the release before entering. FOMC first run is often a FAKE move.' };
  }

  // Wide spread
  if (params.spreadPips > params.normalSpreadPips * 2) {
    return { avoid: true, reason: `Spread is unusually wide (${params.spreadPips} pips vs normal ${params.normalSpreadPips}). This suggests low liquidity or institutional manipulation.` };
  }

  return { avoid: false, reason: 'No trade-avoiding conditions detected.' };
}

// ─── SESSION & KILL ZONE DETECTION ──────────────────────────────────
export function getCurrentSessionInfo(utcHour: number): {
  killZone: string;
  killZoneActive: boolean;
  session: string;
  sessionPhase: string; // AMD phase
  bestTradingWindow: boolean;
  nextKillZone: string;
} {
  // Convert to NY time (EST = UTC-5)
  const nyHour = (utcHour - 5 + 24) % 24;

  // Kill Zones (NY/EST Time)
  if (nyHour >= 19 || nyHour < 0) {
    return {
      killZone: 'Asian Kill Zone',
      killZoneActive: true,
      session: 'Asian',
      sessionPhase: 'Accumulation',
      bestTradingWindow: false,
      nextKillZone: 'London Kill Zone (2:00-5:00 AM EST)',
    };
  }

  if (nyHour >= 2 && nyHour < 5) {
    return {
      killZone: 'London Kill Zone',
      killZoneActive: true,
      session: 'London',
      sessionPhase: 'Manipulation',
      bestTradingWindow: false,
      nextKillZone: 'New York AM Kill Zone (7:00-10:00 AM EST)',
    };
  }

  if (nyHour >= 7 && nyHour < 11) {
    return {
      killZone: 'New York AM Kill Zone',
      killZoneActive: true,
      session: 'New York',
      sessionPhase: 'Distribution',
      bestTradingWindow: nyHour >= 8 && nyHour < 11, // 8:30-11:00 AM EST = BEST
      nextKillZone: 'London Close Kill Zone (10:00 AM-12:00 PM EST)',
    };
  }

  if (nyHour >= 10 && nyHour < 12) {
    return {
      killZone: 'London Close Kill Zone',
      killZoneActive: true,
      session: 'London Close',
      sessionPhase: 'Distribution/Reversal',
      bestTradingWindow: false,
      nextKillZone: 'New York PM Session (1:30-4:00 PM EST)',
    };
  }

  if (nyHour >= 13 && nyHour < 16) {
    return {
      killZone: 'New York PM Session',
      killZoneActive: true,
      session: 'New York PM',
      sessionPhase: 'Distribution/Continuation',
      bestTradingWindow: false,
      nextKillZone: 'Asian Kill Zone (7:00-10:00 PM EST)',
    };
  }

  return {
    killZone: 'Off-Peak',
    killZoneActive: false,
    session: 'No Active Session',
    sessionPhase: 'Neutral',
    bestTradingWindow: false,
    nextKillZone: 'London Kill Zone (2:00-5:00 AM EST)',
  };
}

// ─── PROFESSIONAL SIGNAL CONTEXT BUILDER ────────────────────────────
// This replaces the old trendContext with a much more professional version
export function buildProfessionalSignalContext(params: {
  pair: string;
  timeframe: string;
  mode: string;
  trendDirection: 'bullish' | 'bearish' | 'ranging';
  trendStrength: number;
  structure: string;
  ema20: number;
  ema50: number;
  rsi: number;
  currentPrice: number;
  dayHigh: number;
  dayLow: number;
  changePercent: number;
  swingHigh: number;
  swingLow: number;
  utcHour: number;
  dayOfWeek: number;
}): string {
  const mandatoryDirection = params.trendDirection === 'bullish' ? 'BUY' : params.trendDirection === 'bearish' ? 'SELL' : 'FOLLOW MOMENTUM';
  
  const sessionInfo = getCurrentSessionInfo(params.utcHour);
  const avoidCheck = shouldAvoidTrade({
    dayOfWeek: params.dayOfWeek,
    hourUTC: params.utcHour,
    isHighImpactNews: false,
    trendDirection: params.trendDirection,
    trendStrength: params.trendStrength,
    spreadPips: 1,
    normalSpreadPips: 1,
    pair: params.pair,
  });

  const range = params.dayHigh - params.dayLow;
  const rangePosition = range > 0 ? ((params.currentPrice - params.dayLow) / range * 100).toFixed(0) : '50';
  const isDiscount = parseFloat(rangePosition) < 50;
  const isPremium = parseFloat(rangePosition) > 50;
  const fib50 = (params.dayHigh + params.dayLow) / 2;
  const oteZoneLow = params.dayHigh - range * 0.79;
  const oteZoneHigh = params.dayHigh - range * 0.618;

  return `
═══════════════════════════════════════════════════════════════
PROFESSIONAL INSTITUTIONAL TRADING ANALYSIS — ${params.pair}
═══════════════════════════════════════════════════════════════

=== TREND ANALYSIS (FROM REAL OHLCV DATA) ===
Direction: ${params.trendDirection.toUpperCase()} | Strength: ${params.trendStrength}/100
Structure: ${params.structure}
EMA20: ${params.ema20.toFixed(params.pair === 'XAU/USD' ? 2 : params.pair.includes('JPY') ? 3 : 5)} | EMA50: ${params.ema50.toFixed(params.pair === 'XAU/USD' ? 2 : params.pair.includes('JPY') ? 3 : 5)}
EMA Alignment: ${params.ema20 > params.ema50 ? 'BULLISH (EMA20 > EMA50)' : 'BEARISH (EMA20 < EMA50)'}
RSI (14): ${params.rsi.toFixed(1)} | ${params.rsi > 70 ? 'OVERBOUGHT — caution' : params.rsi < 30 ? 'OVERSOLD — caution' : params.rsi > 50 ? 'Bullish momentum' : 'Bearish momentum'}

=== PRICE POSITION ===
Current Price: ${params.currentPrice.toFixed(params.pair === 'XAU/USD' ? 2 : params.pair.includes('JPY') ? 3 : 5)}
Day Range: ${params.dayLow.toFixed(params.pair === 'XAU/USD' ? 2 : params.pair.includes('JPY') ? 3 : 5)} — ${params.dayHigh.toFixed(params.pair === 'XAU/USD' ? 2 : params.pair.includes('JPY') ? 3 : 5)}
Range Position: ${rangePosition}% | ${isDiscount ? 'DISCOUNT ZONE (below 50% Fib) — favorable for BUYING' : isPremium ? 'PREMIUM ZONE (above 50% Fib) — favorable for SELLING' : 'EQUILIBRIUM — no clear advantage'}
Fib 50%: ${fib50.toFixed(params.pair === 'XAU/USD' ? 2 : params.pair.includes('JPY') ? 3 : 5)}
OTE Zone: ${oteZoneLow.toFixed(params.pair === 'XAU/USD' ? 2 : params.pair.includes('JPY') ? 3 : 5)} — ${oteZoneHigh.toFixed(params.pair === 'XAU/USD' ? 2 : params.pair.includes('JPY') ? 3 : 5)}
Change: ${params.changePercent >= 0 ? '+' : ''}${params.changePercent.toFixed(2)}%

=== KEY LEVELS ===
Swing High: ${params.swingHigh.toFixed(params.pair === 'XAU/USD' ? 2 : params.pair.includes('JPY') ? 3 : 5)} (BSL target)
Swing Low: ${params.swingLow.toFixed(params.pair === 'XAU/USD' ? 2 : params.pair.includes('JPY') ? 3 : 5)} (SSL target)
Draw on Liquidity: ${params.trendDirection === 'bullish' ? `BSL above ${params.swingHigh.toFixed(params.pair === 'XAU/USD' ? 2 : params.pair.includes('JPY') ? 3 : 5)} — price seeking to fill buy stops` : `SSL below ${params.swingLow.toFixed(params.pair === 'XAU/USD' ? 2 : params.pair.includes('JPY') ? 3 : 5)} — price seeking to fill sell stops`}

=== SESSION & TIMING ===
Current Session: ${sessionInfo.session} | Phase: ${sessionInfo.sessionPhase}
Kill Zone: ${sessionInfo.killZone} | Active: ${sessionInfo.killZoneActive ? 'YES' : 'NO'}
Best Trading Window: ${sessionInfo.bestTradingWindow ? 'YES (8:30-11:00 AM EST)' : 'NO'}
${avoidCheck.avoid ? `⚠️ TRADE AVOID: ${avoidCheck.reason}` : '✅ No trade-avoiding conditions detected'}

═══════════════════════════════════════════════════════════════
*** MANDATORY DIRECTION: ${mandatoryDirection} ***
═══════════════════════════════════════════════════════════════
If trend is BULLISH → type MUST be "BUY"
If trend is BEARISH → type MUST be "SELL"
If RANGING → choose direction with more confluence
NEVER use mean reversion — trade WITH the trend
The trend analysis is from REAL OHLCV data — trust it

PROFESSIONAL RULES FOR THIS SIGNAL:
1. Entry must be at FVG or Order Block level — specify which PD Array
2. SL must be at logical level (below OB/structure for BUY, above for SELL)
3. TP1 at nearest liquidity pool in trade direction
4. TP2 at extended liquidity target
5. R:R MUST be minimum 1:2 — if you can't achieve this, DO NOT generate a signal
6. Confidence must reflect confluence count (4=65%, 5=75%, 6+=85%+)
7. If ${avoidCheck.avoid ? 'conditions say AVOID TRADE' : 'conditions are acceptable'}, ${avoidCheck.avoid ? 'generate with LOW confidence and warn user' : 'proceed with normal analysis'}
`;
}
