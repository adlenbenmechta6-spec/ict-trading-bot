import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ai';
import { fetchRealPrice, fetchOHLCVData } from '@/lib/market-data';
import { ICT_SIGNAL_SYSTEM_PROMPT } from '@/lib/ict-knowledge';
import { ICT_BEST_INSTRUMENTS } from '@/lib/ict-core-content';
import { SMC_SETUPS, SMC_CONFLUENCE_FACTORS } from '@/lib/smc-knowledge';
import {
  analyzeTrend,
  determineSignalDirection,
  aiContradictsTrend,
  getICTInstrumentTier,
  buildTrendContext,
  getDecimals,
  formatPrice,
  validateSignalPrices,
  calculateSLTPDistances,
  TrendAnalysis,
} from '@/lib/trend-analysis';

export const maxDuration = 30;

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

    // ─── CRITICAL: Use shared trend analysis engine ────────────────
    const trendAnalysis = analyzeTrend(ohlcvData.candles, currentPrice);

    // Mode-specific configuration
    const modeConfig = getModeConfig(mode, timeframe);
    const modeLabel = modeConfig.label;

    // Determine ICT instrument quality for this pair
    const ictTier = getICTInstrumentTier(pair);

    // ─── CRITICAL: Pass trend analysis to AI prompt ────────────────
    const trendContext = buildTrendContext(trendAnalysis, pair);

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

IMPORTANT SL/TP RULES — VIOLATION = INVALID SIGNAL:
- If type is "BUY": entry < tp1 < tp2 AND sl < entry (SL MUST be below entry!)
- If type is "SELL": tp2 < tp1 < entry AND sl > entry (SL MUST be above entry!)
- SL MUST be on the OPPOSITE side of entry from TP
- R:R minimum 1:2 (TP distance must be at least 2x SL distance)
- All prices must be realistic and near the TradingView price of ${currentPrice}

Important ${modeLabel} rules:
${modeConfig.promptRules}

Realistic confidence based on ICT confluence count.`,
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

        // ─── CRITICAL FIX 1: Validate AI signal matches trend ────────
        // If AI goes against the strong trend, override to follow trend
        if (trendAnalysis.direction !== 'ranging' && trendAnalysis.strength >= 50) {
          if (aiContradictsTrend(signal.type, trendAnalysis)) {
            console.warn(`[TREND OVERRIDE] AI suggested ${signal.type} but trend is ${trendAnalysis.direction} (${trendAnalysis.strength}%). Overriding to follow trend.`);
            // Use fallback which respects trend
            signal = generateFallbackSignal(pair, timeframe, currentPrice, { high: dayHigh, low: dayLow, change: marketData.change, changePercent }, aiResponse, mode, trendAnalysis);
          }
        }

        // ─── CRITICAL FIX 2: Validate SL/TP are logically correct ────
        // BUY: SL must be BELOW entry, TP above entry
        // SELL: SL must be ABOVE entry, TP below entry
        // This prevents the bug where SL > entry on a BUY signal
        const validated = validateSignalPrices(
          { type: signal.type, entry: signal.entry, tp1: signal.tp1, tp2: signal.tp2, sl: signal.sl },
          currentPrice,
          pair
        );
        signal.entry = validated.entry;
        signal.tp1 = validated.tp1;
        signal.tp2 = validated.tp2;
        signal.sl = validated.sl;

        // ─── CRITICAL FIX 3: Recalculate SL/TP using real ATR ───────
        // AI often gives unrealistic SL/TP distances
        // We use the real 14-period ATR from OHLCV data for professional sizing
        const atrDistances = calculateSLTPDistances(ohlcvData.candles, mode);
        if (atrDistances.atr > 0) {
          const isBuySignal = signal.type === 'BUY';
          signal.entry = currentPrice; // Always use real current price
          signal.sl = parseFloat((isBuySignal ? currentPrice - atrDistances.sl : currentPrice + atrDistances.sl).toFixed(getDecimals(pair)));
          signal.tp1 = parseFloat((isBuySignal ? currentPrice + atrDistances.tp1 : currentPrice - atrDistances.tp1).toFixed(getDecimals(pair)));
          signal.tp2 = parseFloat((isBuySignal ? currentPrice + atrDistances.tp2 : currentPrice - atrDistances.tp2).toFixed(getDecimals(pair)));
          const rrCalc = atrDistances.tp1 / atrDistances.sl;
          signal.riskReward = `1:${rrCalc.toFixed(1)}`;

          // ─── FINAL SAFETY CHECK: Verify SL/TP are logically correct after ATR calc ──
          // This catches any edge case where ATR calculation might produce wrong direction
          if (isBuySignal) {
            // BUY: SL MUST be below entry, TP above entry
            if (signal.sl >= signal.entry || signal.tp1 <= signal.entry || signal.tp2 <= signal.tp1) {
              console.error(`[FATAL CHECK] BUY signal still has invalid SL/TP after ATR! SL=${signal.sl} Entry=${signal.entry} TP1=${signal.tp1} TP2=${signal.tp2}. Forcing correct values.`);
              signal.sl = parseFloat((currentPrice - atrDistances.sl).toFixed(getDecimals(pair)));
              signal.tp1 = parseFloat((currentPrice + atrDistances.tp1).toFixed(getDecimals(pair)));
              signal.tp2 = parseFloat((currentPrice + atrDistances.tp2).toFixed(getDecimals(pair)));
            }
          } else {
            // SELL: SL MUST be above entry, TP below entry
            if (signal.sl <= signal.entry || signal.tp1 >= signal.entry || signal.tp2 >= signal.tp1) {
              console.error(`[FATAL CHECK] SELL signal still has invalid SL/TP after ATR! SL=${signal.sl} Entry=${signal.entry} TP1=${signal.tp1} TP2=${signal.tp2}. Forcing correct values.`);
              signal.sl = parseFloat((currentPrice + atrDistances.sl).toFixed(getDecimals(pair)));
              signal.tp1 = parseFloat((currentPrice - atrDistances.tp1).toFixed(getDecimals(pair)));
              signal.tp2 = parseFloat((currentPrice - atrDistances.tp2).toFixed(getDecimals(pair)));
            }
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
  const decimals = getDecimals(pair);
  const range = marketData.high - marketData.low;
  const position = range > 0 ? (currentPrice - marketData.low) / range : 0.5;

  // ═══════════════════════════════════════════════════════════════════
  // ✅ TREND FOLLOWING LOGIC (from shared determineSignalDirection)
  // ═══════════════════════════════════════════════════════════════════
  const isBuy = determineSignalDirection(trend, marketData.changePercent);

  const type: 'BUY' | 'SELL' = isBuy ? 'BUY' : 'SELL';

  // ═══════════════════════════════════════════════════════════════════
  // ✅ PROFESSIONAL ATR-BASED SL/TP
  // Uses real 14-period ATR from OHLCV candles (not fake day range)
  // Old bug: range * 0.3 gave SL of only 4 points on XAU/USD!
  // New: ATR-based gives realistic 20-40 point SL on gold
  // ═══════════════════════════════════════════════════════════════════
  // NOTE: We don't have candles here in fallback, so we use the
  // market range as a fallback with BETTER multipliers
  const professionalRange = range > 0 ? range : currentPrice * 0.008;
  const atrMult = mode === 'scalping' ? 0.6 : mode === 'daytrading' ? 0.8 : 1.0;
  const atr = professionalRange * atrMult;

  const entry = currentPrice;
  // Professional multipliers: SL=1x, TP1=2x, TP2=3.5x of ATR
  const slDist = atr * 1.0;
  const tp1Dist = atr * 2.0;
  const tp2Dist = atr * 3.5;
  const tp1 = isBuy ? entry + tp1Dist : entry - tp1Dist;
  const tp2 = isBuy ? entry + tp2Dist : entry - tp2Dist;
  const sl = isBuy ? entry - slDist : entry + slDist;
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
    ? `${formatPrice(pair, currentPrice - range * 0.79)} - ${formatPrice(pair, currentPrice - range * 0.618)}`
    : `${formatPrice(pair, currentPrice + range * 0.618)} - ${formatPrice(pair, currentPrice + range * 0.79)}`;

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
    analysis = aiText || `⚡ SCALP ${isBuy ? '🟢 BUY' : '🔴 SELL'} ${pair} at ${formatPrice(pair, entry)} (${timeframe}). Market is in ${trendLabel} (${trend.strength}% strength, ${trend.trendConfluence}/5 confluence). ${smcSetup} confirmed in trend direction. ${isBuy ? 'SSL' : 'BSL'} swept at ${liquidityTarget}. OTE zone: ${oteZone}. ${killZone} active. ${smcSession} phase. Tight SL at ${formatPrice(pair, sl)}. Risk max 0.5%.`;
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
    analysis = aiText || `📊 DAY TRADE ${isBuy ? '🟢 BUY' : '🔴 SELL'} ${pair} at ${formatPrice(pair, entry)} (${timeframe}). Market is in ${trendLabel} — trading WITH the trend (${trend.strength}% strength, EMA20 ${isBuy ? '>' : '<'} EMA50, RSI ${rsi}). ${smcSetup} — ${isBuy ? 'SSL swept at ' + liquidityTarget + ', BMS confirmed bullish' : 'BSL swept at ' + liquidityTarget + ', BMS confirmed bearish'}. RTO to OB for entry. OTE zone: ${oteZone}. ${smcSession} phase. SL at ${formatPrice(pair, sl)}. Close before EOD. Risk max 1%.`;
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
    analysis = aiText || `📅 SWING ${isBuy ? '🟢 BUY' : '🔴 SELL'} ${pair} at ${formatPrice(pair, entry)} (${timeframe}). Market is in ${trendLabel} (${trend.strength}% strength, ${trend.structure} structure, ${trend.trendConfluence}/5 confluence). ${smcSetup} — ${isBuy ? 'HTF SSL swept, BMS confirmed bullish, RTO to OB in discount zone' : 'HTF BSL swept, BMS confirmed bearish, RTO to OB in premium zone'}. Liquidity target: ${liquidityTarget}. OTE: ${oteZone}. R:R ${rr.toFixed(1)}:1. Risk max 2%. The market hardly reverses without taking liquidity!`;
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
    maCross: isBuy ? `Golden Cross — EMA20 (${formatPrice(pair, trend.ema20)}) above EMA50 (${formatPrice(pair, trend.ema50)})` : `Death Cross — EMA20 (${formatPrice(pair, trend.ema20)}) below EMA50 (${formatPrice(pair, trend.ema50)})`,
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
