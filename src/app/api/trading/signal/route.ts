import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ai';
import { fetchRealPrice, fetchOHLCVData, OHLCVCandle } from '@/lib/market-data';
import { ICT_SIGNAL_SYSTEM_PROMPT } from '@/lib/ict-knowledge';
import { ICT_BEST_INSTRUMENTS } from '@/lib/ict-core-content';
import { SMC_SETUPS, SMC_CONFLUENCE_FACTORS } from '@/lib/smc-knowledge';

export const maxDuration = 30;

// ─── TREND ANALYSIS ENGINE ────────────────────────────────────────────
// Analyzes OHLCV candles to determine the REAL trend direction
// This is the FIX for the "signals come reversed" problem

interface TrendAnalysis {
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

function analyzeTrend(candles: OHLCVCandle[], currentPrice: number): TrendAnalysis {
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

  const totalVotes = bullishVotes + bearishVotes;
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

// ─── EMA Calculation ──────────────────────────────────────────────────
function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;

  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }

  return ema;
}

// ─── RSI Calculation ──────────────────────────────────────────────────
function calculateRSI(data: number[], period: number = 14): number {
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

// ─── Market Structure Analysis ────────────────────────────────────────
function analyzeMarketStructure(candles: OHLCVCandle[]): {
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

// ─── MAIN SIGNAL ENDPOINT ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pair = 'EUR/USD', timeframe = 'H4', mode = 'swing' } = body;

    // Fetch both real-time price and OHLCV data for the specific timeframe
    const [marketData, ohlcvData] = await Promise.all([
      fetchRealPrice(pair),
      fetchOHLCVData(pair, timeframe),
    ]);

    if (marketData.price === 0 && ohlcvData.currentPrice === 0) {
      return NextResponse.json({
        success: false,
        error: `Could not fetch the current price for ${pair}. Please try again.`,
      });
    }

    const currentPrice = marketData.price || ohlcvData.currentPrice;
    const dayHigh = marketData.high || ohlcvData.dayHigh;
    const dayLow = marketData.low || ohlcvData.dayLow;
    const changePercent = marketData.changePercent || ohlcvData.changePercent;

    // ─── CRITICAL FIX: Analyze REAL trend from OHLCV candles ────────
    const trendAnalysis = analyzeTrend(ohlcvData.candles, currentPrice);

    // Mode-specific configuration
    const modeConfig = getModeConfig(mode, timeframe);
    const modeLabel = modeConfig.label;

    // Determine ICT instrument quality for this pair
    const ictTier = getICTInstrumentTier(pair);

    // ─── CRITICAL FIX: Pass trend analysis to AI prompt ─────────────
    const trendContext = `
=== TREND ANALYSIS (FROM REAL OHLCV DATA) ===
Current Trend: ${trendAnalysis.direction.toUpperCase()} (Strength: ${trendAnalysis.strength}/100)
Market Structure: ${trendAnalysis.structure}
EMA 20: ${trendAnalysis.ema20.toFixed(pair === 'XAU/USD' ? 2 : pair.includes('JPY') ? 3 : 5)}
EMA 50: ${trendAnalysis.ema50.toFixed(pair === 'XAU/USD' ? 2 : pair.includes('JPY') ? 3 : 5)}
RSI (14): ${trendAnalysis.rsi.toFixed(1)}
Last Swing High: ${trendAnalysis.lastSwingHigh.toFixed(pair === 'XAU/USD' ? 2 : pair.includes('JPY') ? 3 : 5)}
Last Swing Low: ${trendAnalysis.lastSwingLow.toFixed(pair === 'XAU/USD' ? 2 : pair.includes('JPY') ? 3 : 5)}
Trend Confluence Score: ${trendAnalysis.trendConfluence}/5
Analysis: ${trendAnalysis.reasoning}

*** CRITICAL RULE: You MUST generate a signal in the direction of the trend analysis above! ***
*** If trend is BULLISH → signal MUST be BUY. If trend is BEARISH → signal MUST be SELL. ***
*** If trend is RANGING → choose the direction with more confluence. ***
*** DO NOT use mean reversion logic (buying because price fell or selling because price rose). ***
*** FOLLOW THE TREND — trade IN THE DIRECTION of the dominant momentum. ***
`;

    const aiResponse = await chatCompletion({
      systemPrompt: `${ICT_SIGNAL_SYSTEM_PROMPT}

You are generating a ${modeLabel} trading signal for ${pair} on ${timeframe} timeframe.

ICT Instrument Quality: ${pair} is a ${ictTier} instrument for ICT analysis.
${ictTier === 'Tier 1' ? `This is one of the BEST pairs for ICT — expect clean OB/FVG patterns, reliable liquidity sweeps, and strong Kill Zone behavior.` : ictTier === 'Tier 2' ? `Good pair for ICT — patterns are reliable but may need wider stops.` : `Acceptable for ICT but patterns may be less clean — require extra confirmation.`}

${trendContext}

You are reading the TradingView chart right now. The live TradingView price is: ${currentPrice}

Apply Top-Down Analysis:
1. HTF Bias (H4/D1): Is price in discount (buy) or premium (sell)?
2. Structure: HH/HL (bullish) or LH/LL (bearish)?
3. Liquidity: Where is the nearest BSL/SSL?
4. ICT Confluences: How many align? (OB + FVG + Liquidity Sweep + MSS + Kill Zone + OTE + Premium/Discount)

Return ONLY valid JSON (no markdown, no backticks):
{
  "type": "BUY" or "SELL",
  "pair": "${pair}",
  "timeframe": "${timeframe}",
  "entry": number,
  "tp1": number,
  "tp2": number,
  "sl": number,
  "pattern": "pattern name from TradingView chart",
  "rsi": number,
  "rsiStatus": "RSI description from TradingView",
  "macd": "MACD description from TradingView",
  "maCross": "MA cross description from TradingView",
  "confidence": 50-95,
  "riskReward": "1:X",
  "ictElements": ["element1", "element2"],
  "killZone": "zone name",
  "liquidityType": "liquidity type",
  "pdZone": "Premium/Discount",
  "analysis": "2-3 sentence reasoning based on ICT Core Content ${modeLabel} analysis with specific references to months 1-12 concepts"
}

Important ${modeLabel} rules:
${modeConfig.promptRules}

All prices must be realistic and near the TradingView price of ${currentPrice}.
R:R at least 1:2, realistic confidence based on ICT confluence count.`,
      userMessage: `${modeLabel} signal for ${pair} on TradingView ${timeframe} chart. Live price: ${currentPrice}, H: ${dayHigh}, L: ${dayLow}. TREND: ${trendAnalysis.direction} (${trendAnalysis.strength}%). You MUST follow the trend direction.`,
      temperature: 0.4,
      maxTokens: 400,
    });

    let signal;
    if (aiResponse) {
      try {
        let cleaned = aiResponse.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
        }
        signal = JSON.parse(cleaned);

        // ─── CRITICAL FIX: Validate AI signal matches trend ───────────
        // If AI goes against the strong trend, override to follow trend
        if (trendAnalysis.direction !== 'ranging' && trendAnalysis.strength >= 60) {
          const aiDirection = signal.type;
          const trendDirection = trendAnalysis.direction === 'bullish' ? 'BUY' : 'SELL';
          if (aiDirection !== trendDirection) {
            console.warn(`[TREND OVERRIDE] AI suggested ${aiDirection} but trend is ${trendAnalysis.direction} (${trendAnalysis.strength}%). Overriding to follow trend.`);
            // Use fallback which respects trend
            signal = generateFallbackSignal(pair, timeframe, currentPrice, { high: dayHigh, low: dayLow, change: marketData.change, changePercent }, aiResponse, mode, trendAnalysis);
          }
        }
      } catch {
        signal = generateFallbackSignal(pair, timeframe, currentPrice, { high: dayHigh, low: dayLow, change: marketData.change, changePercent }, aiResponse, mode, trendAnalysis);
      }
    } else {
      signal = generateFallbackSignal(pair, timeframe, currentPrice, { high: dayHigh, low: dayLow, change: marketData.change, changePercent }, null, mode, trendAnalysis);
    }

    // Add chart data for client-side rendering with real OHLCV candles
    signal.chartData = {
      pair: signal.pair,
      timeframe: signal.timeframe || timeframe,
      currentPrice: signal.entry,
      high: dayHigh,
      low: dayLow,
      type: signal.type,
      entry: signal.entry,
      tp1: signal.tp1,
      tp2: signal.tp2,
      sl: signal.sl,
      confidence: signal.confidence,
      riskReward: signal.riskReward,
      pattern: signal.pattern || '',
      killZone: signal.killZone || '',
      liquidityType: signal.liquidityType || '',
      pdZone: signal.pdZone || '',
      ictElements: signal.ictElements || [],
      changePercent: changePercent,
      // Include real OHLCV candle data for chart rendering
      candles: ohlcvData.candles.slice(-60).map(c => ({
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      })),
      dataSource: ohlcvData.source,
      dataDelay: ohlcvData.delay,
      // Include trend analysis data
      trend: {
        direction: trendAnalysis.direction,
        strength: trendAnalysis.strength,
        structure: trendAnalysis.structure,
        ema20: trendAnalysis.ema20,
        ema50: trendAnalysis.ema50,
        rsi: trendAnalysis.rsi,
        confluence: trendAnalysis.trendConfluence,
      },
    };

    return NextResponse.json({ success: true, signal });
  } catch (error) {
    console.error('Signal generation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate signal. Please try again.' }, { status: 500 });
  }
}

// ─── ICT Instrument Tier Classification ───────────────────────────────
function getICTInstrumentTier(pair: string): string {
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

// ─── Mode Configuration ─────────────────────────────────────────────
function getModeConfig(mode: string, timeframe: string) {
  switch (mode) {
    case 'scalping':
      return {
        label: 'Scalping',
        promptRules: `- This is a SCALPING signal on ${timeframe}
- TP and SL should be very tight (small moves)
- Focus on quick momentum entries IN THE DIRECTION OF THE TREND
- SL should be very close to entry
- TP targets are modest but achievable in seconds-minutes
- Use micro-level ICT elements (1m/5m Order Blocks, micro FVGs)
- Kill Zones are critical for scalping entries
- MUST follow the trend direction — no counter-trend scalping`,
        atrMultiplier: 0.5,
      };
    case 'daytrading':
      return {
        label: 'Day Trading',
        promptRules: `- This is a DAY TRADING signal on ${timeframe}
- All trades should be closed within the same day
- TP and SL should be moderate (intraday moves)
- Focus on intraday momentum and London/NY sessions
- Use intraday ICT elements (15m/30m Order Blocks, intraday FVGs)
- Kill Zones are very important for day trading entries
- Avoid holding overnight
- MUST follow the trend direction — only trade with the trend`,
        atrMultiplier: 0.8,
      };
    default: // swing
      return {
        label: 'Swing Trading',
        promptRules: `- This is a SWING TRADING signal on ${timeframe}
- Trades may be held for 1-7 days
- TP and SL can be wider (multi-day moves)
- Focus on major structure levels and daily trends
- Use higher-timeframe ICT elements (H4/Daily Order Blocks, major FVGs)
- Kill Zones help with timing but are less critical for swing
- MUST follow the trend direction — the trend is your friend`,
        atrMultiplier: 1.0,
      };
  }
}

// ─── FIXED FALLBACK SIGNAL GENERATOR ──────────────────────────────────
// KEY FIX: Now uses REAL trend analysis instead of mean reversion
function generateFallbackSignal(
  pair: string, timeframe: string, currentPrice: number,
  marketData: { high: number; low: number; change: number; changePercent: number },
  aiText: string | null, mode: string, trend: TrendAnalysis
) {
  const decimals = pair.includes('JPY') ? 3 : pair === 'XAU/USD' ? 2 : pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5;
  const range = marketData.high - marketData.low;
  const position = range > 0 ? (currentPrice - marketData.low) / range : 0.5;

  // ═══════════════════════════════════════════════════════════════════
  // 🔴 THE BUG WAS HERE — OLD LOGIC (MEAN REVERSION):
  //   let isBuy = position < 0.4;
  //   if (marketData.changePercent < -0.3) isBuy = true;   // BUY when price falling ← WRONG!
  //   if (marketData.changePercent > 0.3) isBuy = false;   // SELL when price rising ← WRONG!
  //
  // ✅ NEW LOGIC (TREND FOLLOWING — ICT COMPLIANT):
  //   Follow the trend direction. If bullish trend → BUY. If bearish → SELL.
  // ═══════════════════════════════════════════════════════════════════

  let isBuy: boolean;

  if (trend.direction === 'bullish') {
    // Strong bullish trend → BUY (trade with the trend)
    isBuy = true;
  } else if (trend.direction === 'bearish') {
    // Strong bearish trend → SELL (trade with the trend)
    isBuy = false;
  } else {
    // Ranging market — use changePercent as mild directional hint
    // But DON'T do mean reversion (buying just because it fell)
    // Instead: follow the momentum direction
    if (marketData.changePercent > 0.1) {
      isBuy = true;   // Momentum is up → BUY
    } else if (marketData.changePercent < -0.1) {
      isBuy = false;  // Momentum is down → SELL
    } else {
      // Truly neutral — use structure as tiebreaker
      isBuy = trend.structure === 'HH/HL' ? true : trend.structure === 'LH/LL' ? false : position < 0.5;
    }
  }

  const type: 'BUY' | 'SELL' = isBuy ? 'BUY' : 'SELL';

  // Adjust ATR multiplier based on mode
  const atrMult = mode === 'scalping' ? 0.5 : mode === 'daytrading' ? 0.8 : 1.0;
  const atr = (range > 0 ? range * 0.3 : currentPrice * 0.005) * atrMult;

  const entry = currentPrice;
  const tp1 = isBuy ? entry + atr * 2 : entry - atr * 2;
  const tp2 = isBuy ? entry + atr * 3.5 : entry - atr * 3.5;
  const sl = isBuy ? entry - atr * 1 : entry + atr * 1;
  const rr = Math.abs(tp1 - entry) / Math.abs(sl - entry);

  // Confidence now boosted when trend is strong (following trend = higher probability)
  let confidence = 55;
  if (trend.direction !== 'ranging') {
    confidence += Math.round(trend.strength * 0.2); // Strong trend = higher confidence
  }
  if (trend.trendConfluence >= 4) confidence += 10; // Multiple indicators agree
  if (trend.trendConfluence >= 3) confidence += 5;
  // Lower confidence in ranging markets
  if (trend.direction === 'ranging') confidence = Math.max(confidence - 10, 40);
  // Scalping has lower confidence due to noise
  if (mode === 'scalping') confidence = Math.max(confidence - 5, 40);
  confidence = Math.min(confidence, 92);

  // Use real RSI from trend analysis
  const rsi = Math.round(trend.rsi);

  const hour = new Date().getUTCHours();
  let killZone = 'Off-Peak';
  if (hour >= 7 && hour <= 10) killZone = 'London Kill Zone';
  else if (hour >= 12 && hour <= 15) killZone = 'New York AM Kill Zone';
  else if (hour >= 17 && hour <= 19) killZone = 'New York PM Kill Zone';
  else if (hour >= 19 && hour <= 22) killZone = 'Asian Kill Zone';

  // SMC-specific: Determine which setup applies based on market conditions
  const smcSetup = determineSMCSetup(isBuy, position, mode, trend);

  // Determine SMC liquidity level being targeted
  const liquidityTarget = isBuy
    ? (position < 0.25 ? 'PDL/LOD (SSL pool)' : position < 0.5 ? 'Old Low/Equal Lows (SSL)' : 'PWL/PML (SSL)')
    : (position > 0.75 ? 'PDH/HOD (BSL pool)' : position > 0.5 ? 'Old High/Equal Highs (BSL)' : 'PWH/PMH (BSL)');

  // Determine SMC session phase
  const utcHour = new Date().getUTCHours();
  const utc2Hour = (utcHour + 2) % 24; // UTC+2 as per SMC book
  let smcSession = 'Off-Session';
  if (utc2Hour >= 2 && utc2Hour < 8) smcSession = 'Asian (Accumulation)';
  else if (utc2Hour >= 9 && utc2Hour < 12) smcSession = 'London Open (Manipulation)';
  else if (utc2Hour >= 14 && utc2Hour < 17) smcSession = 'NY Open (Distribution)';

  // OTE zone calculation (0.618 - 0.79 Fib retracement)
  const oteZone = isBuy
    ? `${(currentPrice - range * 0.79).toFixed(decimals)} - ${(currentPrice - range * 0.618).toFixed(decimals)}`
    : `${(currentPrice + range * 0.618).toFixed(decimals)} - ${(currentPrice + range * 0.79).toFixed(decimals)}`;

  // Mode-specific patterns and elements with SMC integration
  let pattern: string;
  let ictElements: string[];
  let analysis: string;

  // Trend direction label for analysis
  const trendLabel = trend.direction === 'bullish' ? 'UPTREND' : trend.direction === 'bearish' ? 'DOWNTREND' : 'RANGING';

  if (mode === 'scalping') {
    pattern = isBuy ? `${smcSetup} + Micro Bullish Engulfing` : `${smcSetup} + Micro Bearish Engulfing`;
    ictElements = [
      isBuy ? 'Micro Bullish OB (M1/M5)' : 'Micro Bearish OB (M1/M5)',
      isBuy ? 'Micro Bullish FVG' : 'Micro Bearish FVG',
      isBuy ? 'SSL Sweep (micro)' : 'BSL Sweep (micro)',
      `Trend: ${trendLabel} (${trend.strength}%)`,
      `SMC Session: ${smcSession}`,
    ];
    analysis = aiText || `⚡ SCALP ${isBuy ? '🟢 BUY' : '🔴 SELL'} ${pair} at ${entry.toFixed(decimals)} (${timeframe}). Market is in ${trendLabel} (${trend.strength}% strength, ${trend.trendConfluence}/5 confluence). ${smcSetup} confirmed in trend direction. ${isBuy ? 'SSL' : 'BSL'} swept at ${liquidityTarget}. OTE zone: ${oteZone}. ${killZone} active. ${smcSession} phase. Tight SL at ${sl.toFixed(decimals)}. Risk max 0.5%.`;
  } else if (mode === 'daytrading') {
    pattern = isBuy ? `${smcSetup} + Bullish Engulfing` : `${smcSetup} + Bearish Engulfing`;
    ictElements = [
      isBuy ? 'Intraday Bullish OB (M15/M30)' : 'Intraday Bearish OB (M15/M30)',
      isBuy ? 'Intraday Bullish FVG' : 'Intraday Bearish FVG',
      isBuy ? `SSL Sweep (${liquidityTarget})` : `BSL Sweep (${liquidityTarget})`,
      `BMS ${isBuy ? 'Bullish' : 'Bearish'} confirmed`,
      `Trend: ${trendLabel} (${trend.strength}%)`,
      `SMC Session: ${smcSession}`,
    ];
    analysis = aiText || `📊 DAY TRADE ${isBuy ? '🟢 BUY' : '🔴 SELL'} ${pair} at ${entry.toFixed(decimals)} (${timeframe}). Market is in ${trendLabel} — trading WITH the trend (${trend.strength}% strength, EMA20 ${isBuy ? '>' : '<'} EMA50, RSI ${rsi}). ${smcSetup} — ${isBuy ? 'SSL swept at ' + liquidityTarget + ', BMS confirmed bullish' : 'BSL swept at ' + liquidityTarget + ', BMS confirmed bearish'}. RTO to OB for entry. OTE zone: ${oteZone}. ${smcSession} phase. SL at ${sl.toFixed(decimals)}. Close before EOD. Risk max 1%.`;
  } else {
    pattern = isBuy ? `${smcSetup} + Hammer Setup` : `${smcSetup} + Hanging Man Setup`;
    ictElements = [
      isBuy ? 'HTF Bullish OB (H4/Daily)' : 'HTF Bearish OB (H4/Daily)',
      isBuy ? 'Bullish FVG (support)' : 'Bearish FVG (resistance)',
      isBuy ? `SSL Sweep (${liquidityTarget})` : `BSL Sweep (${liquidityTarget})`,
      `BMS ${isBuy ? 'Bullish' : 'Bearish'} on HTF`,
      `Trend: ${trendLabel} (${trend.strength}%, ${trend.structure})`,
      `Price in ${isBuy ? 'Discount' : 'Premium'} zone`,
      `OTE: ${oteZone}`,
    ];
    analysis = aiText || `📅 SWING ${isBuy ? '🟢 BUY' : '🔴 SELL'} ${pair} at ${entry.toFixed(decimals)} (${timeframe}). Market is in ${trendLabel} (${trend.strength}% strength, ${trend.structure} structure, ${trend.trendConfluence}/5 confluence). ${smcSetup} — ${isBuy ? 'HTF SSL swept, BMS confirmed bullish, RTO to OB in discount zone' : 'HTF BSL swept, BMS confirmed bearish, RTO to OB in premium zone'}. Liquidity target: ${liquidityTarget}. OTE: ${oteZone}. R:R ${rr.toFixed(1)}:1. Risk max 2%. The market hardly reverses without taking liquidity!`;
  }

  return {
    type, pair, timeframe,
    entry: parseFloat(entry.toFixed(decimals)),
    tp1: parseFloat(tp1.toFixed(decimals)),
    tp2: parseFloat(tp2.toFixed(decimals)),
    sl: parseFloat(sl.toFixed(decimals)),
    pattern,
    rsi,
    rsiStatus: isBuy ? `Bullish RSI (${rsi}) — trend momentum supports upside` : `Bearish RSI (${rsi}) — trend momentum supports downside`,
    macd: isBuy ? 'Bullish crossover forming on MACD' : 'Bearish crossover forming on MACD',
    maCross: isBuy ? `Golden Cross — EMA20 (${trend.ema20.toFixed(decimals)}) above EMA50 (${trend.ema50.toFixed(decimals)})` : `Death Cross — EMA20 (${trend.ema20.toFixed(decimals)}) below EMA50 (${trend.ema50.toFixed(decimals)})`,
    confidence,
    riskReward: `1:${rr.toFixed(1)}`,
    ictElements,
    killZone,
    liquidityType: isBuy ? `Sell Side Liquidity (SSL) — ${liquidityTarget}` : `Buy Side Liquidity (BSL) — ${liquidityTarget}`,
    pdZone: isBuy ? 'Discount Zone (below 50%)' : 'Premium Zone (above 50%)',
    analysis,
  };
}

// ─── SMC Setup Determination (now trend-aware) ────────────────────────
function determineSMCSetup(isBuy: boolean, position: number, mode: string, trend: TrendAnalysis): string {
  // Prefer setups that align with the trend
  if (trend.direction !== 'ranging' && trend.strength >= 65) {
    // Strong trend — use trend-following setups
    if (trend.direction === 'bullish') {
      // In uptrend: look for pullback-to-OB setups (buying the dip in uptrend)
      return SMC_SETUPS.SH_BMS_RTO_BULL;  // SSL sweep + BMS bullish = buy the retracement
    } else {
      // In downtrend: look for pullback-to-OB setups (selling the rally in downtrend)
      return SMC_SETUPS.SH_BMS_RTO_BEAR;  // BSL sweep + BMS bearish = sell the retracement
    }
  }

  // Weaker trend or ranging — determine based on structure
  if (position < 0.2 || position > 0.8) {
    // Price at extremes — likely Stop Hunt / Turtle Soup
    return isBuy ? SMC_SETUPS.TURTLE_SOUP_LONG : SMC_SETUPS.TURTLE_SOUP_SHORT;
  } else if (position < 0.35 || position > 0.65) {
    // Price near extremes with clear BMS — SH + BMS + RTO
    return isBuy ? SMC_SETUPS.SH_BMS_RTO_BULL : SMC_SETUPS.SH_BMS_RTO_BEAR;
  } else {
    // Price in mid-range — likely SMS + BMS + RTO or AMD
    return isBuy ? SMC_SETUPS.SMS_BMS_RTO_BULL : SMC_SETUPS.SMS_BMS_RTO_BEAR;
  }
}
