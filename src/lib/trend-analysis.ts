// ─── SHARED TREND ANALYSIS ENGINE ────────────────────────────────────
// Used by both signal and analyze routes to ensure CONSISTENT trend detection
// FIX: Prevents signal and analyze from giving opposite predictions
//
// KEY PRINCIPLE: TREND FOLLOWING (not Mean Reversion)
// - Bullish trend → BUY signals
// - Bearish trend → SELL signals
// - Ranging → Follow momentum direction
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
// Uses 5-vote confluence system:
// Vote 1: EMA alignment (EMA20 vs EMA50)
// Vote 2: Price position relative to EMAs
// Vote 3: Market structure (HH/HL or LH/LL)
// Vote 4: Momentum (recent vs previous candles)
// Vote 5: RSI direction (trending, not overbought/oversold)
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

  // 4. Check if price is above/below EMAs
  const aboveEma20 = currentPrice > ema20;
  const aboveEma50 = currentPrice > ema50;

  // 5. Check recent momentum (last 5 candles vs previous 5)
  const recentCandles = candles.slice(-5);
  const prevCandles = candles.slice(-10, -5);
  const recentMomentum = recentCandles.reduce((sum, c) => sum + (c.close - c.open), 0);
  const prevMomentum = prevCandles.reduce((sum, c) => sum + (c.close - c.open), 0);
  const momentumBullish = recentMomentum > 0 && recentMomentum > prevMomentum * 0.5;

  // ─── TREND CONFLUENCE SCORING ─────────────────────────────────────
  let bullishVotes = 0;
  let bearishVotes = 0;

  // Vote 1: EMA alignment
  if (ema20 > ema50 && aboveEma20) bullishVotes++;
  if (ema20 < ema50 && !aboveEma20) bearishVotes++;

  // Vote 2: Price position relative to EMAs
  if (aboveEma20 && aboveEma50) bullishVotes++;
  if (!aboveEma20 && !aboveEma50) bearishVotes++;

  // Vote 3: Market structure
  if (structure === 'HH/HL') bullishVotes++;
  if (structure === 'LH/LL') bearishVotes++;

  // Vote 4: Momentum
  if (momentumBullish) bullishVotes++;
  if (!momentumBullish && recentMomentum < 0) bearishVotes++;

  // Vote 5: RSI direction (not overbought/oversold, but trending)
  if (rsi > 50 && rsi < 75) bullishVotes++;  // RSI bullish but not overbought
  if (rsi < 50 && rsi > 25) bearishVotes++;   // RSI bearish but not oversold

  let direction: 'bullish' | 'bearish' | 'ranging';
  let strength: number;
  let trendConfluence: number;

  if (bullishVotes >= 3 && bullishVotes > bearishVotes) {
    direction = 'bullish';
    strength = Math.min(95, 50 + (bullishVotes - bearishVotes) * 12);
    trendConfluence = bullishVotes;
  } else if (bearishVotes >= 3 && bearishVotes > bullishVotes) {
    direction = 'bearish';
    strength = Math.min(95, 50 + (bearishVotes - bullishVotes) * 12);
    trendConfluence = bearishVotes;
  } else {
    direction = 'ranging';
    strength = 30;
    trendConfluence = Math.max(bullishVotes, bearishVotes);
  }

  const reasoning = `EMA20 ${ema20.toFixed(2)} ${aboveEma20 ? '>' : '<'} Price | EMA50 ${ema50.toFixed(2)} ${aboveEma50 ? '>' : '<'} Price | Structure: ${structure} | RSI: ${rsi.toFixed(0)} | Momentum: ${momentumBullish ? 'Bullish' : 'Bearish'} | Votes: Bull=${bullishVotes} Bear=${bearishVotes}`;

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
export function determineSignalDirection(
  trendAnalysis: TrendAnalysis,
  changePercent: number
): boolean {
  // ═══════════════════════════════════════════════════════════════════
  // 🔴 THE OLD BUG (MEAN REVERSION):
  //   if (changePercent < -0.3) → isBuy = true   ← BUY when price falling = WRONG!
  //   if (changePercent > 0.3) → isBuy = false   ← SELL when price rising = WRONG!
  //
  // ✅ NEW LOGIC (TREND FOLLOWING — ICT COMPLIANT):
  //   Follow the trend direction. If bullish trend → BUY. If bearish → SELL.
  // ═══════════════════════════════════════════════════════════════════

  if (trendAnalysis.direction === 'bullish') {
    // Strong bullish trend → BUY (trade with the trend)
    return true;
  } else if (trendAnalysis.direction === 'bearish') {
    // Strong bearish trend → SELL (trade with the trend)
    return false;
  } else {
    // Ranging market — use changePercent as mild directional hint
    // But DON'T do mean reversion (buying just because it fell)
    // Instead: follow the momentum direction
    if (changePercent > 0.1) {
      return true;   // Momentum is up → BUY
    } else if (changePercent < -0.1) {
      return false;  // Momentum is down → SELL
    } else {
      // Truly neutral — use structure as tiebreaker
      if (trendAnalysis.structure === 'HH/HL') return true;
      if (trendAnalysis.structure === 'LH/LL') return false;
      // Last resort: slight bullish bias (market generally drifts up)
      return true;
    }
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
  const tier1 = ['EUR/USD', 'GBP/USD', 'XAU/USD', 'NAS100'];
  const tier2 = ['USD/JPY', 'GBP/JPY', 'US30', 'US500'];
  const tier3 = ['AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 'USD/CHF'];
  const tier4 = ['BTC/USD', 'ETH/USD'];

  if (tier1.includes(pair)) return 'Tier 1';
  if (tier2.includes(pair)) return 'Tier 2';
  if (tier3.includes(pair)) return 'Tier 3';
  if (tier4.includes(pair)) return 'Tier 4 (Crypto - patterns less reliable)';
  return 'Tier 3';
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
  const decimals = pair.includes('JPY') ? 3 : pair === 'XAU/USD' ? 2 : pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5;
  return price.toFixed(decimals);
}

export function getDecimals(pair: string): number {
  return pair.includes('JPY') ? 3 : pair === 'XAU/USD' ? 2 : pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5;
}

// ─── Build trend context string for AI prompts ──────────────────────
export function buildTrendContext(trendAnalysis: TrendAnalysis, pair: string): string {
  return `
=== TREND ANALYSIS (FROM REAL OHLCV DATA) ===
Current Trend: ${trendAnalysis.direction.toUpperCase()} (Strength: ${trendAnalysis.strength}/100)
Market Structure: ${trendAnalysis.structure}
EMA 20: ${formatPrice(pair, trendAnalysis.ema20)}
EMA 50: ${formatPrice(pair, trendAnalysis.ema50)}
RSI (14): ${trendAnalysis.rsi.toFixed(1)}
Last Swing High: ${formatPrice(pair, trendAnalysis.lastSwingHigh)}
Last Swing Low: ${formatPrice(pair, trendAnalysis.lastSwingLow)}
Trend Confluence Score: ${trendAnalysis.trendConfluence}/5
Analysis: ${trendAnalysis.reasoning}

*** CRITICAL RULE: You MUST generate a prediction in the direction of the trend analysis above! ***
*** If trend is BULLISH → prediction MUST be BUY. If trend is BEARISH → prediction MUST be SELL. ***
*** If trend is RANGING → choose the direction with more confluence. ***
*** DO NOT use mean reversion logic (buying because price fell or selling because price rose). ***
*** FOLLOW THE TREND — trade IN THE DIRECTION of the dominant momentum. ***
`;
}
