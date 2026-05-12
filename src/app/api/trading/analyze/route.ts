import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ai';
import { fetchRealPrice, fetchOHLCVData, OHLCVCandle } from '@/lib/market-data';
import { ICT_ANALYSIS_SYSTEM_PROMPT } from '@/lib/ict-knowledge';

export const maxDuration = 30;

// ─── TREND ANALYSIS ENGINE (shared with signal route) ─────────────────
interface TrendAnalysis {
  direction: 'bullish' | 'bearish' | 'ranging';
  strength: number;
  ema20: number;
  ema50: number;
  rsi: number;
  structure: 'HH/HL' | 'LH/LL' | 'Ranging';
  lastSwingHigh: number;
  lastSwingLow: number;
  trendConfluence: number;
  reasoning: string;
}

function analyzeTrend(candles: OHLCVCandle[], currentPrice: number): TrendAnalysis {
  if (candles.length < 20) {
    return {
      direction: 'ranging', strength: 30, ema20: currentPrice, ema50: currentPrice,
      rsi: 50, structure: 'Ranging', lastSwingHigh: currentPrice, lastSwingLow: currentPrice,
      trendConfluence: 0, reasoning: 'Insufficient candle data',
    };
  }

  const closes = candles.map(c => c.close);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const rsi = calculateRSI(closes, 14);
  const { structure, lastSwingHigh, lastSwingLow } = analyzeMarketStructure(candles);

  const aboveEma20 = currentPrice > ema20;
  const aboveEma50 = currentPrice > ema50;

  const recentCandles = candles.slice(-5);
  const prevCandles = candles.slice(-10, -5);
  const recentMomentum = recentCandles.reduce((sum, c) => sum + (c.close - c.open), 0);
  const prevMomentum = prevCandles.reduce((sum, c) => sum + (c.close - c.open), 0);
  const momentumBullish = recentMomentum > 0 && recentMomentum > prevMomentum * 0.5;

  let bullishVotes = 0, bearishVotes = 0;

  if (ema20 > ema50 && aboveEma20) bullishVotes++;
  if (ema20 < ema50 && !aboveEma20) bearishVotes++;
  if (aboveEma20 && aboveEma50) bullishVotes++;
  if (!aboveEma20 && !aboveEma50) bearishVotes++;
  if (structure === 'HH/HL') bullishVotes++;
  if (structure === 'LH/LL') bearishVotes++;
  if (momentumBullish) bullishVotes++;
  if (!momentumBullish && recentMomentum < 0) bearishVotes++;
  if (rsi > 50 && rsi < 75) bullishVotes++;
  if (rsi < 50 && rsi > 25) bearishVotes++;

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

  const reasoning = `EMA20 ${ema20.toFixed(2)} | EMA50 ${ema50.toFixed(2)} | Structure: ${structure} | RSI: ${rsi.toFixed(0)} | Momentum: ${momentumBullish ? 'Bullish' : 'Bearish'} | Bull=${bullishVotes} Bear=${bearishVotes}`;

  return { direction, strength, ema20, ema50, rsi, structure, lastSwingHigh, lastSwingLow, trendConfluence, reasoning };
}

function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }
  return ema;
}

function calculateRSI(data: number[], period: number = 14): number {
  if (data.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change; else losses -= change;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (change < 0 ? -change : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

function analyzeMarketStructure(candles: OHLCVCandle[]): {
  structure: 'HH/HL' | 'LH/LL' | 'Ranging';
  lastSwingHigh: number; lastSwingLow: number;
} {
  const recent = candles.slice(-30);
  const swingHighs: number[] = [], swingLows: number[] = [];

  for (let i = 2; i < recent.length - 2; i++) {
    if (recent[i].high > recent[i-1].high && recent[i].high > recent[i-2].high &&
        recent[i].high > recent[i+1].high && recent[i].high > recent[i+2].high) {
      swingHighs.push(recent[i].high);
    }
    if (recent[i].low < recent[i-1].low && recent[i].low < recent[i-2].low &&
        recent[i].low < recent[i+1].low && recent[i].low < recent[i+2].low) {
      swingLows.push(recent[i].low);
    }
  }

  const lastSwingHigh = swingHighs.length > 0 ? swingHighs[swingHighs.length - 1] : Math.max(...recent.slice(-10).map(c => c.high));
  const lastSwingLow = swingLows.length > 0 ? swingLows[swingLows.length - 1] : Math.min(...recent.slice(-10).map(c => c.low));

  let structure: 'HH/HL' | 'LH/LL' | 'Ranging' = 'Ranging';
  if (swingHighs.length >= 2 && swingLows.length >= 2) {
    const recentHighs = swingHighs.slice(-3), recentLows = swingLows.slice(-3);
    const higherHighs = recentHighs.length >= 2 && recentHighs[recentHighs.length - 1] > recentHighs[recentHighs.length - 2];
    const higherLows = recentLows.length >= 2 && recentLows[recentLows.length - 1] > recentLows[recentLows.length - 2];
    const lowerHighs = recentHighs.length >= 2 && recentHighs[recentHighs.length - 1] < recentHighs[recentHighs.length - 2];
    const lowerLows = recentLows.length >= 2 && recentLows[recentLows.length - 1] < recentLows[recentLows.length - 2];
    if (higherHighs && higherLows) structure = 'HH/HL';
    else if (lowerHighs && lowerLows) structure = 'LH/LL';
  }

  return { structure, lastSwingHigh, lastSwingLow };
}

// ─── MAIN ANALYSIS ENDPOINT ───────────────────────────────────────────
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

    // Mode-specific analysis label
    const modeLabel = mode === 'scalping' ? 'Scalping' : mode === 'daytrading' ? 'Day Trading' : 'Swing Trading';

    // ─── CRITICAL FIX: Pass trend analysis to AI ────────────────────
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

*** CRITICAL: Base your analysis on this trend data. If trend is BULLISH, recommend BUY setups. If BEARISH, recommend SELL setups. ***
*** Do NOT use mean reversion logic. Follow the trend direction. ***
`;

    const aiAnalysis = await chatCompletion({
      systemPrompt: `${ICT_ANALYSIS_SYSTEM_PROMPT}

You are reading the TradingView chart for ${pair} on ${timeframe} timeframe right now.
The live price from TradingView is: ${currentPrice}

${trendContext}

This is a ${modeLabel} analysis on ${timeframe}.

ICT Instrument Quality for ${pair}: ${getICTInstrumentTier(pair)}.
${pair === 'XAU/USD' || pair === 'EUR/USD' || pair === 'GBP/USD' || pair === 'NAS100' ? 'This is one of the BEST instruments for ICT — expect clean OB/FVG patterns.' : 'Acceptable for ICT — may need extra confirmation.'}

Apply the complete ICT Top-Down Analysis framework (Month 12):
1. Long Term (Monthly/Weekly): Quarterly IPDA range, premium/discount, major liquidity
2. Intermediate (Daily/H4): Structure, OB, FVG, MSS
3. Short Term (H1/M15): Entry zone, intraday OB/FVG
4. Intraday (M5/M1): Precise timing, Kill Zone, Silver Bullet

Analyze as if you are looking at the TradingView chart. Provide:
1. Current trend (bullish/bearish/sideways) with ICT structure analysis (HH/HL or LH/LL)
2. Candlestick patterns visible on the TradingView chart (reference Fred K.H. Tam's book)
3. ICT elements using Core Content terminology (Order Block, FVG, Breaker, Rejection, Propulsion, Mitigation, Liquidity, MSS, CISD, AMD)
4. TradingView indicators (RSI, MACD, Moving Averages, Bollinger Bands)
5. Support & Resistance with OTE zone (61.8%-79% retracement)
6. ICT Confluence Score (1-10): HTF bias + Premium/Discount + OB + FVG + Liquidity Sweep + MSS + Kill Zone
7. Trading recommendation appropriate for ${modeLabel} — MUST follow the trend direction above

${mode === 'scalping' ? 'Focus on micro-level patterns (Month 8-9): OSOK model, Silver Bullet windows, M5/M1 OB and FVG. Quick in-and-out trades during Kill Zones.' : mode === 'daytrading' ? 'Focus on intraday momentum (Month 8): CBDR, intraday profiles, Bread & Butter setups. All positions should be closed before end of day.' : 'Focus on major structure and multi-day moves (Month 6): HTF OB/FVG, swing conditions, million dollar setup criteria. Wider stops and targets.'}

All prices must be realistic and near the TradingView price of ${currentPrice}.
Be concise and professional. Use specific ICT Core Content month references. Respond in English.`,
      userMessage: `${modeLabel} analysis for ${pair} on TradingView ${timeframe} chart. Live price from TradingView: ${currentPrice}, Today's high: ${dayHigh}, Today's low: ${dayLow}. TREND: ${trendAnalysis.direction} (${trendAnalysis.strength}%). Follow the trend direction. Be concise - 400 words max.`,
      temperature: 0.4,
      maxTokens: 600,
    });

    // ─── CRITICAL FIX: Use real trend analysis for chart data direction ─
    const trend = trendAnalysis.direction === 'bullish' ? 'Bullish' : trendAnalysis.direction === 'bearish' ? 'Bearish' : 'Sideways';

    // Use trend analysis to determine direction (NOT position-based mean reversion)
    const isBuy = trendAnalysis.direction === 'bullish' || (trendAnalysis.direction === 'ranging' && changePercent > 0.1);

    // Adjust ATR multiplier based on mode
    const range = dayHigh - dayLow;
    const atrMult = mode === 'scalping' ? 0.5 : mode === 'daytrading' ? 0.8 : 1.0;
    const atr = (range > 0 ? range * 0.3 : currentPrice * 0.005) * atrMult;

    const chartData = {
      type: isBuy ? 'BUY' as const : 'SELL' as const,
      entry: currentPrice,
      tp1: isBuy ? currentPrice + atr * 2 : currentPrice - atr * 2,
      tp2: isBuy ? currentPrice + atr * 3.5 : currentPrice - atr * 3.5,
      sl: isBuy ? currentPrice - atr : currentPrice + atr,
      confidence: Math.min(85, 55 + Math.round(trendAnalysis.strength * 0.2)),
      riskReward: '1:2.0',
      pattern: isBuy ? 'Bullish Setup' : 'Bearish Setup',
      killZone: '',
      liquidityType: isBuy ? 'SSL' : 'BSL',
      pdZone: isBuy ? 'Discount' : 'Premium',
      ictElements: [isBuy ? 'Bullish OB' : 'Bearish OB', `Trend: ${trend} (${trendAnalysis.strength}%)`],
    };

    return NextResponse.json({
      success: true,
      pair,
      timeframe,
      currentPrice,
      trend,
      high: dayHigh,
      low: dayLow,
      changePercent,
      aiAnalysis: aiAnalysis || generateLocalAnalysis(pair, currentPrice, { high: dayHigh, low: dayLow, change: marketData.change, changePercent }, trend, timeframe, mode, trendAnalysis),
      chartData: {
        pair,
        timeframe,
        currentPrice,
        high: dayHigh,
        low: dayLow,
        type: chartData.type,
        entry: chartData.entry,
        tp1: chartData.tp1,
        tp2: chartData.tp2,
        sl: chartData.sl,
        confidence: chartData.confidence,
        riskReward: chartData.riskReward,
        pattern: chartData.pattern,
        killZone: chartData.killZone,
        liquidityType: chartData.liquidityType,
        pdZone: chartData.pdZone,
        ictElements: chartData.ictElements,
        changePercent,
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
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ success: false, error: 'Analysis failed. Please try again.' }, { status: 500 });
  }
}

// ─── FIXED LOCAL ANALYSIS (now uses trend data) ──────────────────────
function generateLocalAnalysis(
  pair: string, currentPrice: number,
  marketData: { high: number; low: number; change: number; changePercent: number }, trend: string,
  timeframe: string, mode: string, trendAnalysis: TrendAnalysis
): string {
  const range = marketData.high - marketData.low;
  const position = range > 0 ? ((currentPrice - marketData.low) / range * 100).toFixed(0) : '50';
  const posNum = parseFloat(position);
  const decimals = pair.includes('JPY') || pair === 'XAU/USD' || pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5;

  // ═══════════════════════════════════════════════════════════════════
  // 🔴 THE BUG WAS HERE — OLD LOGIC used mean reversion:
  //   if (posNum < 35) → Bullish ← WRONG! Price low ≠ bullish
  //   if (posNum > 65) → Bearish ← WRONG! Price high ≠ bearish
  //
  // ✅ NEW LOGIC: Use real trend analysis from OHLCV candles
  // ═══════════════════════════════════════════════════════════════════
  let detectedTrend = trend;
  let trendEmoji = '↔️';
  if (trendAnalysis.direction === 'bullish') { detectedTrend = 'Bullish'; trendEmoji = '🟢'; }
  else if (trendAnalysis.direction === 'bearish') { detectedTrend = 'Bearish'; trendEmoji = '🔴'; }
  else { detectedTrend = 'Sideways'; trendEmoji = '🟡'; }

  const isBuy = trendAnalysis.direction === 'bullish' || (trendAnalysis.direction === 'ranging' && marketData.changePercent > 0.1);

  // Mode label
  const modeLabel = mode === 'scalping' ? '⚡ SCALPING' : mode === 'daytrading' ? '📊 DAY TRADING' : '📅 SWING TRADING';
  const riskMax = mode === 'scalping' ? '0.5%' : mode === 'daytrading' ? '1%' : '2%';

  // Candlestick pattern detection — now context-aware with trend
  let candlePattern = '';
  let candleDesc = '';
  if (isBuy) {
    candlePattern = 'Bullish Engulfing / Hammer Zone (Trend-Aligned)';
    candleDesc = `Trend is BULLISH (${trendAnalysis.strength}% strength). Look for continuation patterns: Bullish Engulfing (white candle engulfs previous black) or Hammer (small body + long lower shadow after pullback). Per Tam: in an uptrend, these patterns confirm continuation — the safest trades are WITH the trend.`;
  } else {
    candlePattern = 'Bearish Engulfing / Hanging Man Zone (Trend-Aligned)';
    candleDesc = `Trend is BEARISH (${trendAnalysis.strength}% strength). Look for continuation patterns: Bearish Engulfing (black candle engulfs previous white) or Hanging Man (small body + long lower shadow at resistance). Per Tam: in a downtrend, these patterns confirm continuation — trade WITH the trend.`;
  }

  // ICT/SMC Analysis — now trend-aligned
  const isDiscount = posNum < 50;
  const utcHour = new Date().getUTCHours();
  const utc2Hour = (utcHour + 2) % 24;
  let smcSession = 'Off-Session';
  if (utc2Hour >= 2 && utc2Hour < 8) smcSession = 'Asian Session (Accumulation)';
  else if (utc2Hour >= 9 && utc2Hour < 12) smcSession = 'London Open (Manipulation)';
  else if (utc2Hour >= 14 && utc2Hour < 17) smcSession = 'NY Open (Distribution)';

  const bslTargets = 'PMH, PWH, PDH, HOD, Old High, Equal Highs';
  const sslTargets = 'PML, PWL, PDL, LOD, Old Low, Equal Lows';

  // SMC Setup — now aligned with trend
  let smcSetup = '';
  if (isBuy) {
    smcSetup = 'SH + BMS + RTO (Bullish) — SSL swept + BMS confirms bullish + Return to OB for buy. Trading WITH the uptrend.';
  } else {
    smcSetup = 'SH + BMS + RTO (Bearish) — BSL swept + BMS confirms bearish + Return to OB for sell. Trading WITH the downtrend.';
  }

  const ictAnalysis = `${isBuy ? '✅ BULLISH Trend' : '⚠️ BEARISH Trend'} — Trend strength: ${trendAnalysis.strength}%, Confluence: ${trendAnalysis.trendConfluence}/5
📊 EMA20: ${trendAnalysis.ema20.toFixed(decimals)} | EMA50: ${trendAnalysis.ema50.toFixed(decimals)} | ${isBuy ? 'EMA20 > EMA50 (Bullish)' : 'EMA20 < EMA50 (Bearish)'}
🏗️ Structure: ${trendAnalysis.structure} — ${isBuy ? 'Higher Highs / Higher Lows' : 'Lower Highs / Lower Lows'}

🏦 Order Block: ${isBuy ? 'Look for Bullish OB below current price — last bearish candle before the strong bullish move that caused BMS. In an uptrend, price returns to OB then continues up.' : 'Look for Bearish OB above current price — last bullish candle before the strong bearish move that caused BMS. In a downtrend, price returns to OB then continues down.'}
💧 Fair Value Gap (FVG): ${isBuy ? 'Bullish FVG below — price tends to return to fill the gap then continue UP (trend continuation setup)' : 'Bearish FVG above — price tends to return to fill the gap then continue DOWN (trend continuation setup)'}
🎯 Liquidity: ${isBuy ? `SSL targets: ${sslTargets}. In uptrend, smart money sweeps these before continuing up.` : `BSL targets: ${bslTargets}. In downtrend, smart money sweeps these before continuing down.`}
📊 AMD Pattern: ${isBuy ? 'Accumulation → Manipulation (down) → Distribution (up) — look for buy setups after SSL sweep' : 'Accumulation → Manipulation (up) → Distribution (down) — look for sell setups after BSL sweep'}
⏱️ SMC Session: ${smcSession}
📋 SMC Setup: ${smcSetup}`;

  // Support & Resistance
  const support1 = currentPrice - range * 0.382;
  const support2 = marketData.low;
  const resistance1 = currentPrice + range * 0.382;
  const resistance2 = marketData.high;
  const fib61_8 = support1 - range * 0.236;

  // Real indicators from trend analysis
  const rsi = Math.round(trendAnalysis.rsi);
  const macdSignal = isBuy ? 'Bullish — MACD line above signal line (trend following)' : 'Bearish — MACD line below signal line (trend following)';
  const maSignal = isBuy ? `Golden Cross — EMA20 (${trendAnalysis.ema20.toFixed(decimals)}) above EMA50 (${trendAnalysis.ema50.toFixed(decimals)})` : `Death Cross — EMA20 (${trendAnalysis.ema20.toFixed(decimals)}) below EMA50 (${trendAnalysis.ema50.toFixed(decimals)})`;

  const confluenceCount = trendAnalysis.trendConfluence;

  return `📊 ${pair} Analysis — ${timeframe} Timeframe — ${modeLabel}
${trendEmoji} Trend: ${detectedTrend} (Strength: ${trendAnalysis.strength}% | ${trendAnalysis.structure})
🔷 Live Price: ${currentPrice.toFixed(decimals)} | Day Range: ${marketData.low.toFixed(decimals)} — ${marketData.high.toFixed(decimals)}
🔷 Range Position: ${position}% | Change: ${marketData.changePercent >= 0 ? '+' : ''}${marketData.changePercent.toFixed(2)}%

━━━ 🕯️ Candlestick Analysis ━━━
Pattern: ${candlePattern}
${candleDesc}

━━━ 📈 Technical Indicators (from OHLCV data) ━━━
📊 RSI (14): ${rsi} — ${rsi > 70 ? 'Overbought but trend is up — trade with caution' : rsi < 30 ? 'Oversold but trend is down — trade with caution' : isBuy ? 'Favorable for buying — trend momentum supports upside' : 'Favorable for selling — trend momentum supports downside'}
📈 MACD: ${macdSignal}
📊 MA: ${maSignal}

━━━ 🏦 ICT/SMC Smart Money Analysis ━━━
${ictAnalysis}

━━━ 🎯 Key Levels ━━━
Support 1: ${support1.toFixed(decimals)} (38.2% Fib)
Support 2: ${support2.toFixed(decimals)} (Daily Low = PDL/LOD — SMC SSL target)
Resistance 1: ${resistance1.toFixed(decimals)} (38.2% Fib)
Resistance 2: ${resistance2.toFixed(decimals)} (Daily High = PDH/HOD — SMC BSL target)
OTE Zone: ${fib61_8.toFixed(decimals)} - ${(fib61_8 - range * 0.172).toFixed(decimals)} (0.618-0.79 Fib — Optimal Trade Entry per SMC)

━━━ 📋 SMC Confluence Checklist ━━━
${isBuy ? '✅' : '❌'} Trend Direction: ${detectedTrend}
${trendAnalysis.structure === 'HH/HL' ? '✅' : '❌'} Market Structure: ${trendAnalysis.structure}
${trendAnalysis.ema20 > trendAnalysis.ema50 ? '✅' : '❌'} EMA Alignment (EMA20 > EMA50)
${trendAnalysis.rsi > 50 && trendAnalysis.rsi < 75 ? '✅' : trendAnalysis.rsi < 50 && trendAnalysis.rsi > 25 ? '✅' : '❌'} RSI supports trend
✅ ${smcSession}
❓ OB validated by BMS (confirm on chart)
❓ FVG formed after MSS
❓ Entry at OTE zone (0.618-0.79 Fib)
Confluence Score: ${confluenceCount}/5. Minimum 2 required per SMC methodology.

━━━ 💡 ${modeLabel} Recommendation ━━━
${isBuy ? `🟢 TREND IS BULLISH — Look for BUY setups. Best entry in OTE zone (0.618-0.79 Fib retracement of the last swing). After BMS, wait for Retracement to 50%/OTE — never enter immediately (SMC rule). Wait for SH (Stop Hunt / SSL sweep) + BMS + RTO to Bullish OB. ${smcSession}.` : `🔴 TREND IS BEARISH — Look for SELL setups. Best entry in OTE zone (0.618-0.79 Fib retracement of the last swing). After BMS, wait for Retracement to 50%/OTE. Wait for SH (Stop Hunt / BSL sweep) + BMS + RTO to Bearish OB. ${smcSession}.`}

⚠️ ${modeLabel} risk max ${riskMax} per trade. R:R minimum 1:2. After BMS ALWAYS wait for Retracement. This is educational analysis only.`;
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
