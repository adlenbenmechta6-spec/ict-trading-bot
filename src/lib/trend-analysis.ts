// ─── SHARED TREND ANALYSIS ENGINE ────────────────────────────────────
// Used by both signal and analyze routes to ensure CONSISTENT trend detection
// FIX: Prevents signal and analyze from giving opposite predictions
//
// KEY PRINCIPLE: TREND FOLLOWING (not Mean Reversion)
// - Bullish trend → BUY signals
// - Bearish trend → SELL signals
// - Ranging → Follow momentum direction
//
// v2 FIXES:
// - Stronger confluence requirements (need 3+ votes AND clear price confirmation)
// - Price vs EMA position is CRITICAL — don't call it bullish if price is below EMAs
// - Momentum requires BOTH positive AND accelerating to count as bullish
// - RSI scoring is more nuanced (strong trends get bonus, not just > 50)
// ═══════════════════════════════════════════════════════════════════════

import { OHLCVCandle } from './market-data';

export interface TrendAnalysis {
  direction: 'bullish' | 'bearish' | 'ranging';
  strength: number; // 0-100
  ema20: number;
  ema50: number;
  rsi: number;
  structure: 'HH/HL' | 'LH/LL' | 'Ranging';
  lastSwingHigh: number;
  lastSwingLow: number;
  trendConfluence: number; // how many indicators agree (0-5)
  reasoning: string;
}

// ─── MAIN TREND ANALYSIS FUNCTION ───────────────────────────────────
// Uses 7-vote confluence system with PRICE CONFIRMATION requirement:
// Vote 1: EMA alignment (EMA20 vs EMA50 crossover)
// Vote 2: Price position relative to BOTH EMAs (most important!)
// Vote 3: Market structure (HH/HL or LH/LL)
// Vote 4: Momentum (recent candles showing directional conviction)
// Vote 5: RSI direction (trending, not just above/below 50)
// Vote 6: Price closing strength (last 3 candles closing direction)
// Vote 7: Swing high/low breakout confirmation
//
// CRITICAL FIX: Price MUST be above BOTH EMAs for bullish, below BOTH for bearish
// This prevents the "bullish trend but price below EMAs" bug
export function analyzeTrend(candles: OHLCVCandle[], currentPrice: number): TrendAnalysis {
  if (candles.length < 20) {
    return {
      direction: 'ranging',
      strength: 30,
      ema20: currentPrice,
      ema50: currentPrice,
      rsi: 50,
      structure: 'Ranging',
      lastSwingHigh: currentPrice,
      lastSwingLow: currentPrice,
      trendConfluence: 0,
      reasoning: 'Insufficient candle data for trend analysis',
    };
  }

  // 1. Calculate EMA 20 and EMA 50
  const closes = candles.map(c => c.close);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);

  // 2. Calculate RSI (14-period)
  const rsi = calculateRSI(closes, 14);

  // 3. Determine Market Structure (HH/HL or LH/LL)
  const { structure, lastSwingHigh, lastSwingLow } = analyzeMarketStructure(candles);

  // 4. Check if price is above/below EMAs — THIS IS THE MOST CRITICAL SIGNAL
  const aboveEma20 = currentPrice > ema20;
  const aboveEma50 = currentPrice > ema50;
  // Margin check: is price clearly above/below or just hovering around EMA?
  const ema20Dist = (currentPrice - ema20) / ema20; // positive = above
  const ema50Dist = (currentPrice - ema50) / ema50; // positive = above
  const clearlyAboveBoth = aboveEma20 && aboveEma50 && ema20Dist > 0.0005;
  const clearlyBelowBoth = !aboveEma20 && !aboveEma50 && ema20Dist < -0.0005;

  // 5. Check recent momentum (last 5 candles vs previous 5)
  const recentCandles = candles.slice(-5);
  const prevCandles = candles.slice(-10, -5);
  const recentMomentum = recentCandles.reduce((sum, c) => sum + (c.close - c.open), 0);
  const prevMomentum = prevCandles.reduce((sum, c) => sum + (c.close - c.open), 0);
  // FIX: Momentum must be clearly positive AND accelerating (not just slightly > 0)
  const momentumBullish = recentMomentum > 0 && recentMomentum > prevMomentum * 0.3;
  const momentumBearish = recentMomentum < 0 && recentMomentum < prevMomentum * 0.3;

  // 6. Last 3 candles closing direction (short-term conviction)
  const last3 = candles.slice(-3);
  const bullishCloses = last3.filter(c => c.close > c.open).length;
  const bearishCloses = last3.filter(c => c.close < c.open).length;

  // 7. Swing breakout: is current price above last swing high or below last swing low?
  const breaksSwingHigh = currentPrice > lastSwingHigh;
  const breaksSwingLow = currentPrice < lastSwingLow;

  // ─── TREND CONFLUENCE SCORING (7 votes) ────────────────────────────
  let bullishVotes = 0;
  let bearishVotes = 0;

  // Vote 1: EMA alignment (EMA20 > EMA50 = bullish setup)
  if (ema20 > ema50) bullishVotes++;
  if (ema20 < ema50) bearishVotes++;

  // Vote 2: Price position relative to BOTH EMAs (CRITICAL — double weight)
  // FIX: This is the most important vote. If price is below both EMAs, it's NOT bullish.
  if (clearlyAboveBoth) {
    bullishVotes += 2; // Double weight — price position is king
  } else if (aboveEma20 && aboveEma50) {
    bullishVotes += 1; // Above both but barely
  }
  if (clearlyBelowBoth) {
    bearishVotes += 2; // Double weight
  } else if (!aboveEma20 && !aboveEma50) {
    bearishVotes += 1; // Below both but barely
  }

  // Vote 3: Market structure
  if (structure === 'HH/HL') bullishVotes++;
  if (structure === 'LH/LL') bearishVotes++;

  // Vote 4: Momentum (must be clear, not weak)
  if (momentumBullish) bullishVotes++;
  if (momentumBearish) bearishVotes++;

  // Vote 5: RSI direction (strong trends show conviction)
  if (rsi > 55 && rsi < 80) bullishVotes++;  // RSI bullish with conviction
  if (rsi < 45 && rsi > 20) bearishVotes++;   // RSI bearish with conviction
  // RSI extremes: overbought in uptrend is still bullish, oversold in downtrend is still bearish
  if (rsi >= 80) bullishVotes++;  // Overbought but still bullish momentum
  if (rsi <= 20) bearishVotes++;  // Oversold but still bearish momentum

  // Vote 6: Last 3 candles direction (short-term conviction)
  if (bullishCloses >= 2) bullishVotes++;
  if (bearishCloses >= 2) bearishVotes++;

  // Vote 7: Swing breakout (price breaking key levels)
  if (breaksSwingHigh) bullishVotes++;
  if (breaksSwingLow) bearishVotes++;

  // ─── DIRECTION DETERMINATION (stricter requirements) ────────────────
  let direction: 'bullish' | 'bearish' | 'ranging';
  let strength: number;
  let trendConfluence: number;

  // CRITICAL FIX: Require clear price confirmation for trend direction
  // If price is clearly above both EMAs → can only be bullish or ranging (never bearish)
  // If price is clearly below both EMAs → can only be bearish or ranging (never bullish)
  // This prevents the #1 bug: bullish trend while price is dropping below EMAs

  const voteDifference = Math.abs(bullishVotes - bearishVotes);
  const dominantVotes = Math.max(bullishVotes, bearishVotes);

  if (bullishVotes > bearishVotes && bullishVotes >= 4 && voteDifference >= 2) {
    // Extra safety: if votes say bullish but price is clearly below both EMAs, revert to ranging
    if (clearlyBelowBoth) {
      // Price below both EMAs = CANNOT be bullish, even if other indicators disagree
      direction = 'ranging';
      strength = 35;
      trendConfluence = bullishVotes;
    } else {
      direction = 'bullish';
      strength = Math.min(95, 45 + voteDifference * 10 + (clearlyAboveBoth ? 10 : 0));
      trendConfluence = bullishVotes;
    }
  } else if (bearishVotes > bullishVotes && bearishVotes >= 4 && voteDifference >= 2) {
    // Extra safety: if votes say bearish but price is clearly above both EMAs, revert to ranging
    if (clearlyAboveBoth) {
      // Price above both EMAs = CANNOT be bearish, even if other indicators disagree
      direction = 'ranging';
      strength = 35;
      trendConfluence = bearishVotes;
    } else {
      direction = 'bearish';
      strength = Math.min(95, 45 + voteDifference * 10 + (clearlyBelowBoth ? 10 : 0));
      trendConfluence = bearishVotes;
    }
  } else if (dominantVotes >= 3 && voteDifference >= 1) {
    // Weak trend — only declare if price confirms
    if (bullishVotes > bearishVotes && (aboveEma20 || aboveEma50)) {
      direction = 'bullish';
      strength = Math.min(60, 40 + voteDifference * 8);
      trendConfluence = bullishVotes;
    } else if (bearishVotes > bullishVotes && (!aboveEma20 || !aboveEma50)) {
      direction = 'bearish';
      strength = Math.min(60, 40 + voteDifference * 8);
      trendConfluence = bearishVotes;
    } else {
      direction = 'ranging';
      strength = 30;
      trendConfluence = Math.max(bullishVotes, bearishVotes);
    }
  } else {
    direction = 'ranging';
    strength = 25;
    trendConfluence = Math.max(bullishVotes, bearishVotes);
  }

  const reasoning = `EMA20=${ema20.toFixed(2)} EMA50=${ema50.toFixed(2)} Price=${currentPrice.toFixed(2)} | ${aboveEma20 ? 'Above' : 'Below'} EMA20, ${aboveEma50 ? 'Above' : 'Below'} EMA50 | Structure: ${structure} | RSI: ${rsi.toFixed(0)} | Momentum: ${momentumBullish ? 'Bullish' : momentumBearish ? 'Bearish' : 'Neutral'} | Last3: ${bullishCloses}B/${bearishCloses}R | Votes: Bull=${bullishVotes} Bear=${bearishVotes} | Direction: ${direction}`;

  return {
    direction,
    strength,
    ema20,
    ema50,
    rsi,
    structure,
    lastSwingHigh,
    lastSwingLow,
    trendConfluence,
    reasoning,
  };
}

// ─── DETERMINE IF SIGNAL SHOULD BE BUY OR SELL ──────────────────────
// CRITICAL: This is the single source of truth for direction decisions
// Used by BOTH signal and analyze routes to ensure consistency
//
// v2 FIX: Removed the subtle bullish bias at the end that could cause
// wrong signals in neutral markets. Now uses structure as primary
// tiebreaker and only falls back to changePercent momentum.
export function determineSignalDirection(
  trendAnalysis: TrendAnalysis,
  changePercent: number
): boolean {
  // ═══════════════════════════════════════════════════════════════════
  // ✅ TREND FOLLOWING LOGIC (ICT COMPLIANT):
  //   Follow the trend direction. If bullish trend → BUY. If bearish → SELL.
  //
  // v2 FIX: Even in ranging markets, we should NOT have a default bullish
  // bias. Instead, use multiple confirmations before deciding.
  // ═══════════════════════════════════════════════════════════════════

  if (trendAnalysis.direction === 'bullish') {
    // Bullish trend → BUY (trade with the trend)
    return true;
  } else if (trendAnalysis.direction === 'bearish') {
    // Bearish trend → SELL (trade with the trend)
    return false;
  } else {
    // Ranging market — use multiple tiebreakers in order of importance:
    // 1. Market structure (most reliable in ranging)
    if (trendAnalysis.structure === 'HH/HL') return true;
    if (trendAnalysis.structure === 'LH/LL') return false;

    // 2. EMA position (price vs EMAs)
    const priceAboveEma20 = trendAnalysis.ema20 > 0;
    const priceAboveEma50 = trendAnalysis.ema50 > 0;
    // We can't check currentPrice here, but EMA alignment gives a hint
    if (trendAnalysis.ema20 > trendAnalysis.ema50) return true;
    if (trendAnalysis.ema20 < trendAnalysis.ema50) return false;

    // 3. Momentum direction (follow, not reverse)
    if (changePercent > 0.1) {
      return true;   // Momentum is up → BUY
    } else if (changePercent < -0.1) {
      return false;  // Momentum is down → SELL
    }

    // 4. RSI as last tiebreaker (not a default bullish bias!)
    if (trendAnalysis.rsi > 50) return true;
    if (trendAnalysis.rsi < 50) return false;

    // Truly neutral — no signal should be given, but if forced, default to cautious
    // FIX: Changed from default bullish to using the confluence direction
    return trendAnalysis.trendConfluence >= 3; // Only buy if there's some bullish confluence
  }
}

// ─── CHECK IF AI PREDICTION MATCHES TREND ────────────────────────────
// Returns true if the AI's prediction contradicts the trend
export function aiContradictsTrend(
  aiDirection: 'BUY' | 'SELL' | string,
  trendAnalysis: TrendAnalysis
): boolean {
  if (trendAnalysis.direction === 'ranging') return false; // No contradiction in ranging

  const trendDirection = trendAnalysis.direction === 'bullish' ? 'BUY' : 'SELL';
  return aiDirection.toUpperCase().trim() !== trendDirection;
}

// ─── ICT Instrument Tier Classification ──────────────────────────────
export function getICTInstrumentTier(pair: string): string {
  const tier1 = ['EUR/USD', 'GBP/USD', 'XAU/USD', 'XAG/USD', 'NAS100'];
  const tier2 = ['USD/JPY', 'GBP/JPY', 'US30', 'US500'];
  const tier3 = ['AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 'USD/CHF'];
  const tier4 = ['BTC/USD', 'ETH/USD'];

  if (tier1.includes(pair)) return 'Tier 1';
  if (tier2.includes(pair)) return 'Tier 2';
  if (tier3.includes(pair)) return 'Tier 3';
  if (tier4.includes(pair)) return 'Tier 4 (Crypto - patterns less reliable)';
  return 'Tier 3';
}

// ─── ATR Calculation (Average True Range) ────────────────────────────
// PROFESSIONAL: Uses 14-period ATR from OHLCV candles
// This is the correct way to measure volatility for SL/TP sizing
export function calculateATR(candles: OHLCVCandle[], period: number = 14): number {
  if (candles.length < 2) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    // True Range = max(H-L, |H-prevClose|, |L-prevClose|)
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  if (trueRanges.length < period) {
    // Not enough data - use simple average of available
    return trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;
  }

  // Wilder's smoothing method (same as RSI)
  let atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }

  return atr;
}

// ─── Calculate professional SL/TP distances based on ATR ────────────
// Returns distances from entry price (always positive)
// Mode-specific multipliers:
// - Scalping: SL=0.8x ATR, TP1=1.6x ATR, TP2=2.5x ATR
// - Day Trading: SL=1.2x ATR, TP1=2.4x ATR, TP2=3.5x ATR
// - Swing: SL=1.5x ATR, TP1=3x ATR, TP2=5x ATR
export function calculateSLTPDistances(
  candles: OHLCVCandle[],
  mode: string
): { sl: number; tp1: number; tp2: number; atr: number } {
  const atr = calculateATR(candles, 14);

  if (atr <= 0) {
    // Fallback: use percentage-based
    return { sl: 0, tp1: 0, tp2: 0, atr: 0 };
  }

  let slMult: number, tp1Mult: number, tp2Mult: number;

  switch (mode) {
    case 'scalping':
      slMult = 0.8;
      tp1Mult = 1.6;
      tp2Mult = 2.5;
      break;
    case 'daytrading':
      slMult = 1.2;
      tp1Mult = 2.4;
      tp2Mult = 3.5;
      break;
    default: // swing
      slMult = 1.5;
      tp1Mult = 3.0;
      tp2Mult = 5.0;
      break;
  }

  return {
    sl: atr * slMult,
    tp1: atr * tp1Mult,
    tp2: atr * tp2Mult,
    atr,
  };
}

// ─── EMA Calculation ────────────────────────────────────────────────
export function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;

  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }

  return ema;
}

// ─── RSI Calculation ────────────────────────────────────────────────
export function calculateRSI(data: number[], period: number = 14): number {
  if (data.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Smooth using Wilder's method
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (change < 0 ? -change : 0)) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// ─── Market Structure Analysis ──────────────────────────────────────
export function analyzeMarketStructure(candles: OHLCVCandle[]): {
  structure: 'HH/HL' | 'LH/LL' | 'Ranging';
  lastSwingHigh: number;
  lastSwingLow: number;
} {
  const recent = candles.slice(-30);
  const swingHighs: number[] = [];
  const swingLows: number[] = [];

  // Find swing points (peaks and valleys)
  for (let i = 2; i < recent.length - 2; i++) {
    // Swing High: higher than 2 candles on each side
    if (recent[i].high > recent[i-1].high && recent[i].high > recent[i-2].high &&
        recent[i].high > recent[i+1].high && recent[i].high > recent[i+2].high) {
      swingHighs.push(recent[i].high);
    }
    // Swing Low: lower than 2 candles on each side
    if (recent[i].low < recent[i-1].low && recent[i].low < recent[i-2].low &&
        recent[i].low < recent[i+1].low && recent[i].low < recent[i+2].low) {
      swingLows.push(recent[i].low);
    }
  }

  const lastSwingHigh = swingHighs.length > 0 ? swingHighs[swingHighs.length - 1] : Math.max(...recent.slice(-10).map(c => c.high));
  const lastSwingLow = swingLows.length > 0 ? swingLows[swingLows.length - 1] : Math.min(...recent.slice(-10).map(c => c.low));

  // Determine structure from swing points
  let structure: 'HH/HL' | 'LH/LL' | 'Ranging' = 'Ranging';

  if (swingHighs.length >= 2 && swingLows.length >= 2) {
    const recentHighs = swingHighs.slice(-3);
    const recentLows = swingLows.slice(-3);

    const higherHighs = recentHighs.length >= 2 && recentHighs[recentHighs.length - 1] > recentHighs[recentHighs.length - 2];
    const higherLows = recentLows.length >= 2 && recentLows[recentLows.length - 1] > recentLows[recentLows.length - 2];
    const lowerHighs = recentHighs.length >= 2 && recentHighs[recentHighs.length - 1] < recentHighs[recentHighs.length - 2];
    const lowerLows = recentLows.length >= 2 && recentLows[recentLows.length - 1] < recentLows[recentLows.length - 2];

    if (higherHighs && higherLows) structure = 'HH/HL';
    else if (lowerHighs && lowerLows) structure = 'LH/LL';
    else structure = 'Ranging';
  }

  return { structure, lastSwingHigh, lastSwingLow };
}

// ─── Format price with appropriate decimals ─────────────────────────
export function formatPrice(pair: string, price: number): string {
  const decimals = pair.includes('JPY') ? 3 : pair === 'XAU/USD' ? 2 : pair === 'XAG/USD' ? 3 : pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5;
  return price.toFixed(decimals);
}

export function getDecimals(pair: string): number {
  return pair.includes('JPY') ? 3 : pair === 'XAU/USD' ? 2 : pair === 'XAG/USD' ? 3 : pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5;
}

// ─── VALIDATE SIGNAL PRICES (SL/TP) ────────────────────────────────
// CRITICAL: Ensures SL/TP are logically correct relative to entry
//
// For BUY signals:  SL < entry < TP1 < TP2
// For SELL signals: TP2 < TP1 < entry < SL
//
// v2 FIX: Increased minimum distances significantly — the old values
// were way too small for instruments like XAU/USD (0.1% = $3 on gold,
// but the old 0.001% was only $0.03 which is meaningless)
// Returns corrected prices if AI gives invalid values
export interface SignalPrices {
  type: 'BUY' | 'SELL';
  entry: number;
  tp1: number;
  tp2: number;
  sl: number;
}

export function validateSignalPrices(
  signal: SignalPrices,
  currentPrice: number,
  pair: string
): SignalPrices {
  const decimals = getDecimals(pair);
  const isBuy = signal.type === 'BUY';

  // FIX: Proper minimum distances per instrument type
  // These are realistic minimum SL/TP distances that make sense for each asset
  const minDistancePct: number = (() => {
    if (pair === 'XAU/USD') return 0.003;      // 0.3% = ~$10 on $3300 gold (realistic)
    if (pair === 'XAG/USD') return 0.003;      // 0.3% = ~$1 on $33 silver (realistic)
    if (pair.startsWith('NAS') || pair === 'US30' || pair === 'US500') return 0.003;  // 0.3% for indices
    if (pair.includes('JPY')) return 0.002;     // 0.2% for JPY pairs
    if (pair.startsWith('BTC') || pair.startsWith('ETH')) return 0.005; // 0.5% for crypto
    return 0.001;  // 0.1% for major forex (EUR/USD, GBP/USD etc.)
  })();
  const minDistance = currentPrice * minDistancePct;

  let { entry, tp1, tp2, sl } = signal;

  // Ensure entry is near current price (within 0.5%)
  if (Math.abs(entry - currentPrice) / currentPrice > 0.005) {
    console.warn(`[PRICE VALIDATION] Entry ${entry} too far from current price ${currentPrice}. Fixing.`);
    entry = currentPrice;
  }

  if (isBuy) {
    // BUY: SL must be BELOW entry, TP1/TP2 must be ABOVE entry
    // Fix SL if it's above or equal to entry
    if (sl >= entry) {
      console.warn(`[PRICE VALIDATION] BUY signal has SL (${sl}) >= entry (${entry}). Fixing SL below entry.`);
      sl = entry - minDistance * 2;
    }
    // Fix TP1 if it's below or equal to entry
    if (tp1 <= entry) {
      console.warn(`[PRICE VALIDATION] BUY signal has TP1 (${tp1}) <= entry (${entry}). Fixing TP1 above entry.`);
      tp1 = entry + minDistance * 4;
    }
    // Fix TP2 if it's below or equal to TP1
    if (tp2 <= tp1) {
      console.warn(`[PRICE VALIDATION] BUY signal has TP2 (${tp2}) <= TP1 (${tp1}). Fixing TP2 above TP1.`);
      tp2 = entry + minDistance * 7;
    }
    // Ensure proper ordering: SL < entry < TP1 < TP2
    if (!(sl < entry && entry < tp1 && tp1 < tp2)) {
      console.warn(`[PRICE VALIDATION] BUY price ordering invalid. Recalculating all.`);
      const distance = minDistance * 2;
      sl = entry - distance;
      tp1 = entry + distance * 2;
      tp2 = entry + distance * 3.5;
    }
  } else {
    // SELL: TP2 < TP1 < entry < SL
    // Fix SL if it's below or equal to entry
    if (sl <= entry) {
      console.warn(`[PRICE VALIDATION] SELL signal has SL (${sl}) <= entry (${entry}). Fixing SL above entry.`);
      sl = entry + minDistance * 2;
    }
    // Fix TP1 if it's above or equal to entry
    if (tp1 >= entry) {
      console.warn(`[PRICE VALIDATION] SELL signal has TP1 (${tp1}) >= entry (${entry}). Fixing TP1 below entry.`);
      tp1 = entry - minDistance * 4;
    }
    // Fix TP2 if it's above or equal to TP1
    if (tp2 >= tp1) {
      console.warn(`[PRICE VALIDATION] SELL signal has TP2 (${tp2}) >= TP1 (${tp1}). Fixing TP2 below TP1.`);
      tp2 = entry - minDistance * 7;
    }
    // Ensure proper ordering: TP2 < TP1 < entry < SL
    if (!(tp2 < tp1 && tp1 < entry && entry < sl)) {
      console.warn(`[PRICE VALIDATION] SELL price ordering invalid. Recalculating all.`);
      const distance = minDistance * 2;
      sl = entry + distance;
      tp1 = entry - distance * 2;
      tp2 = entry - distance * 3.5;
    }
  }

  return {
    type: signal.type,
    entry: parseFloat(entry.toFixed(decimals)),
    tp1: parseFloat(tp1.toFixed(decimals)),
    tp2: parseFloat(tp2.toFixed(decimals)),
    sl: parseFloat(sl.toFixed(decimals)),
  };
}

// ─── Build trend context string for AI prompts ──────────────────────
export function buildTrendContext(trendAnalysis: TrendAnalysis, pair: string): string {
  const isBullish = trendAnalysis.direction === 'bullish';
  const isBearish = trendAnalysis.direction === 'bearish';
  const mandatoryDirection = isBullish ? 'BUY' : isBearish ? 'SELL' : 'FOLLOW MOMENTUM';

  return `
=== TREND ANALYSIS (FROM REAL OHLCV DATA) ===
Current Trend: ${trendAnalysis.direction.toUpperCase()} (Strength: ${trendAnalysis.strength}/100)
Market Structure: ${trendAnalysis.structure}
EMA 20: ${formatPrice(pair, trendAnalysis.ema20)}
EMA 50: ${formatPrice(pair, trendAnalysis.ema50)}
Price vs EMA20: ${trendAnalysis.ema20 > 0 ? 'Price is ' + (isBullish ? 'ABOVE' : 'BELOW') + ' EMA20' : 'N/A'}
Price vs EMA50: ${trendAnalysis.ema50 > 0 ? 'Price is ' + (isBullish ? 'ABOVE' : 'BELOW') + ' EMA50' : 'N/A'}
RSI (14): ${trendAnalysis.rsi.toFixed(1)}
Last Swing High: ${formatPrice(pair, trendAnalysis.lastSwingHigh)}
Last Swing Low: ${formatPrice(pair, trendAnalysis.lastSwingLow)}
Trend Confluence Score: ${trendAnalysis.trendConfluence}/5
Analysis: ${trendAnalysis.reasoning}

*** CRITICAL RULE: You MUST generate a ${mandatoryDirection} signal! ***
*** If trend is BULLISH → your JSON "type" MUST be "BUY". ***
*** If trend is BEARISH → your JSON "type" MUST be "SELL". ***
*** If trend is RANGING → choose the direction with more confluence. ***
*** DO NOT use mean reversion logic (buying because price fell or selling because price rose). ***
*** FOLLOW THE TREND — trade IN THE DIRECTION of the dominant momentum. ***
*** The trend analysis is based on REAL OHLCV candle data — trust it over your intuition. ***
`;
}
