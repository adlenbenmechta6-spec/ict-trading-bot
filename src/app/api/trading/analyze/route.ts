import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ai';
import { fetchRealPrice, fetchOHLCVData, compensateForDelay, getRecommendedTradingStyle } from '@/lib/market-data';
import { ICT_ANALYSIS_SYSTEM_PROMPT } from '@/lib/ict-knowledge';
import { SMC_SETUPS } from '@/lib/smc-knowledge';
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
import {
  PROFESSIONAL_TRADER_MINDSET,
  buildProfessionalSignalContext,
  shouldAvoidTrade,
  getCurrentSessionInfo,
} from '@/lib/professional-trading-rules';

export const maxDuration = 30;

// ─── MAIN ANALYSIS ENDPOINT ───────────────────────────────────────────
// KEY FIX: Now uses the SAME trend analysis engine and Trend Override
// as the signal route — both endpoints will give CONSISTENT predictions
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

    // ─── KEY FIX: Use OHLCV currentPrice as primary (more reliable) ───
    const currentPrice = ohlcvData.currentPrice || marketData.price;
    const dayHigh = ohlcvData.dayHigh || marketData.high;
    const dayLow = ohlcvData.dayLow || marketData.low;
    const changePercent = ohlcvData.changePercent || marketData.changePercent;

    // ─── PRICE QUALITY ASSESSMENT ────────────────────────────────────
    const priceQuality = marketData.priceQuality || ohlcvData.priceQuality || 'delayed';
    const delayMinutes = marketData.delayMinutes ?? ohlcvData.delayMinutes ?? 15;
    const isRealtime = priceQuality === 'realtime' || priceQuality === 'near-realtime';
    const priceSource = marketData.source || ohlcvData.source || 'Unknown';
    const tradingStyleRec = getRecommendedTradingStyle(priceQuality, delayMinutes);

    // ─── CRITICAL: Use shared trend analysis engine ────────────────
    const trendAnalysis = analyzeTrend(ohlcvData.candles, currentPrice);

    // Mode-specific analysis label
    const modeLabel = mode === 'scalping' ? 'Scalping' : mode === 'daytrading' ? 'Day Trading' : 'Swing Trading';

    // ─── SCALPING WARNING ───
    const scalpingWarning = mode === 'scalping' && !isRealtime
      ? `\n\n⚠️ SCALPING WARNING: Price data is ~${delayMinutes}min delayed. For accurate scalping, you need real-time data. Recommended: ${tradingStyleRec.style} trading.`
      : '';

    // ─── CRITICAL: Use shared trend context for AI ─────────────────
    const trendContext = buildTrendContext(trendAnalysis, pair);

    // ─── CRITICAL: Determine direction using SHARED logic ──────────
    // This ensures analyze and signal ALWAYS agree on direction
    const isBuy = determineSignalDirection(trendAnalysis, changePercent);

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
7. Trading recommendation — MUST be ${isBuy ? 'BUY' : 'SELL'} based on the trend analysis above

${mode === 'scalping' ? 'Focus on micro-level patterns (Month 8-9): OSOK model, Silver Bullet windows, M5/M1 OB and FVG. Quick in-and-out trades during Kill Zones.' : mode === 'daytrading' ? 'Focus on intraday momentum (Month 8): CBDR, intraday profiles, Bread & Butter setups. All positions should be closed before end of day.' : 'Focus on major structure and multi-day moves (Month 6): HTF OB/FVG, swing conditions, million dollar setup criteria. Wider stops and targets.'}

All prices must be realistic and near the TradingView price of ${currentPrice}.
Be concise and professional. Use specific ICT Core Content month references. Respond in English.`,
      userMessage: `${modeLabel} analysis for ${pair} on TradingView ${timeframe} chart. Live price from TradingView: ${currentPrice}, Today's high: ${dayHigh}, Today's low: ${dayLow}. TREND: ${trendAnalysis.direction} (${trendAnalysis.strength}%). Direction: ${isBuy ? 'BULLISH — recommend BUY setups' : 'BEARISH — recommend SELL setups'}. Follow the trend direction. Be concise - 400 words max.`,
      temperature: 0.4,
      maxTokens: 600,
    });

    // ─── CRITICAL FIX: Validate AI analysis matches trend direction ────
    // If the AI analysis contradicts the trend, override it with trend-aligned analysis
    let finalAnalysis = aiAnalysis;

    if (trendAnalysis.direction !== 'ranging' && trendAnalysis.strength >= 50) {
      // Check if AI text contains contradictory direction keywords
      const analysisLower = (aiAnalysis || '').toLowerCase();
      const trendIsBullish = trendAnalysis.direction === 'bullish';

      // Detect if AI is recommending the wrong direction
      const aiRecommendsBuy = analysisLower.includes('buy') || analysisLower.includes('bullish') || analysisLower.includes('long') || analysisLower.includes('uptrend');
      const aiRecommendsSell = analysisLower.includes('sell') || analysisLower.includes('bearish') || analysisLower.includes('short') || analysisLower.includes('downtrend');

      const contradictsTrend = (trendIsBullish && aiRecommendsSell && !aiRecommendsBuy) ||
                               (!trendIsBullish && aiRecommendsBuy && !aiRecommendsSell);

      if (contradictsTrend) {
        console.warn(`[ANALYZE TREND OVERRIDE] AI analysis contradicted ${trendAnalysis.direction} trend (${trendAnalysis.strength}%). Overriding with trend-aligned analysis.`);
        finalAnalysis = null; // Will use generateLocalAnalysis which follows trend
      }
    }

    // ─── Use trend analysis for chart data direction ────────────────
    const trend = trendAnalysis.direction === 'bullish' ? 'Bullish' : trendAnalysis.direction === 'bearish' ? 'Bearish' : 'Sideways';

    // ─── PROFESSIONAL: Use real ATR from OHLCV for SL/TP ─────────
    const atrDistances = calculateSLTPDistances(ohlcvData.candles, mode);
    const professionalATR = atrDistances.atr > 0;
    const slDist = professionalATR ? atrDistances.sl : currentPrice * 0.005;
    const tp1Dist = professionalATR ? atrDistances.tp1 : currentPrice * 0.01;
    const tp2Dist = professionalATR ? atrDistances.tp2 : currentPrice * 0.015;

    const chartData = {
      type: isBuy ? 'BUY' as const : 'SELL' as const,
      entry: currentPrice,
      tp1: isBuy ? currentPrice + tp1Dist : currentPrice - tp1Dist,
      tp2: isBuy ? currentPrice + tp2Dist : currentPrice - tp2Dist,
      sl: isBuy ? currentPrice - slDist : currentPrice + slDist,
      confidence: Math.min(85, 55 + Math.round(trendAnalysis.strength * 0.2)),
      riskReward: professionalATR ? `1:${(atrDistances.tp1 / atrDistances.sl).toFixed(1)}` : '1:2.0',
      pattern: isBuy ? 'Bullish Setup' : 'Bearish Setup',
      killZone: '',
      liquidityType: isBuy ? 'SSL' : 'BSL',
      pdZone: isBuy ? 'Discount' : 'Premium',
      ictElements: [isBuy ? 'Bullish OB' : 'Bearish OB', `Trend: ${trend} (${trendAnalysis.strength}%)`],
    };

    // ─── CRITICAL: Validate SL/TP are logically correct ────────────
    const validatedChart = validateSignalPrices(
      { type: chartData.type, entry: chartData.entry, tp1: chartData.tp1, tp2: chartData.tp2, sl: chartData.sl },
      currentPrice,
      pair
    );

    // ─── FINAL SAFETY CHECK: Verify SL/TP direction after validation ──
    if (chartData.type === 'BUY') {
      if (validatedChart.sl >= validatedChart.entry) {
        console.error(`[ANALYZE FATAL] BUY SL (${validatedChart.sl}) >= entry (${validatedChart.entry}). Force fixing.`);
        validatedChart.sl = currentPrice - slDist;
      }
      if (validatedChart.tp1 <= validatedChart.entry) {
        console.error(`[ANALYZE FATAL] BUY TP1 (${validatedChart.tp1}) <= entry (${validatedChart.entry}). Force fixing.`);
        validatedChart.tp1 = currentPrice + tp1Dist;
      }
    } else {
      if (validatedChart.sl <= validatedChart.entry) {
        console.error(`[ANALYZE FATAL] SELL SL (${validatedChart.sl}) <= entry (${validatedChart.entry}). Force fixing.`);
        validatedChart.sl = currentPrice + slDist;
      }
      if (validatedChart.tp1 >= validatedChart.entry) {
        console.error(`[ANALYZE FATAL] SELL TP1 (${validatedChart.tp1}) >= entry (${validatedChart.entry}). Force fixing.`);
        validatedChart.tp1 = currentPrice - tp1Dist;
      }
    }

    return NextResponse.json({
      success: true,
      pair,
      timeframe,
      currentPrice,
      trend,
      high: dayHigh,
      low: dayLow,
      changePercent,
      aiAnalysis: finalAnalysis || generateLocalAnalysis(pair, currentPrice, { high: dayHigh, low: dayLow, change: marketData.change, changePercent }, trend, timeframe, mode, trendAnalysis),
      chartData: {
        pair,
        timeframe,
        currentPrice,
        high: dayHigh,
        low: dayLow,
        type: validatedChart.type,
        entry: validatedChart.entry,
        tp1: validatedChart.tp1,
        tp2: validatedChart.tp2,
        sl: validatedChart.sl,
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
        // Price quality and delay information
        priceQuality: priceQuality,
        delayMinutes: delayMinutes,
        isRealtime: isRealtime,
        priceSource: priceSource,
        recommendedStyle: tradingStyleRec,
        scalpingWarning: scalpingWarning || null,
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

// ─── FIXED LOCAL ANALYSIS (now uses shared trend logic) ─────────────
function generateLocalAnalysis(
  pair: string, currentPrice: number,
  marketData: { high: number; low: number; change: number; changePercent: number }, trend: string,
  timeframe: string, mode: string, trendAnalysis: TrendAnalysis
): string {
  const decimals = getDecimals(pair);
  const range = marketData.high - marketData.low;
  const position = range > 0 ? ((currentPrice - marketData.low) / range * 100).toFixed(0) : '50';
  const posNum = parseFloat(position);

  // ═══════════════════════════════════════════════════════════════════
  // ✅ TREND FOLLOWING LOGIC (from shared determineSignalDirection)
  // ═══════════════════════════════════════════════════════════════════
  const isBuy = determineSignalDirection(trendAnalysis, marketData.changePercent);

  let detectedTrend = trend;
  let trendEmoji = '↔️';
  if (trendAnalysis.direction === 'bullish') { detectedTrend = 'Bullish'; trendEmoji = '🟢'; }
  else if (trendAnalysis.direction === 'bearish') { detectedTrend = 'Bearish'; trendEmoji = '🔴'; }
  else { detectedTrend = 'Sideways'; trendEmoji = '🟡'; }

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
📊 EMA20: ${formatPrice(pair, trendAnalysis.ema20)} | EMA50: ${formatPrice(pair, trendAnalysis.ema50)} | ${isBuy ? 'EMA20 > EMA50 (Bullish)' : 'EMA20 < EMA50 (Bearish)'}
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
  const maSignal = isBuy ? `Golden Cross — EMA20 (${formatPrice(pair, trendAnalysis.ema20)}) above EMA50 (${formatPrice(pair, trendAnalysis.ema50)})` : `Death Cross — EMA20 (${formatPrice(pair, trendAnalysis.ema20)}) below EMA50 (${formatPrice(pair, trendAnalysis.ema50)})`;

  const confluenceCount = trendAnalysis.trendConfluence;

  return `📊 ${pair} Analysis — ${timeframe} Timeframe — ${modeLabel}
${trendEmoji} Trend: ${detectedTrend} (Strength: ${trendAnalysis.strength}% | ${trendAnalysis.structure})
🔷 Live Price: ${formatPrice(pair, currentPrice)} | Day Range: ${formatPrice(pair, marketData.low)} — ${formatPrice(pair, marketData.high)}
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
Support 1: ${formatPrice(pair, support1)} (38.2% Fib)
Support 2: ${formatPrice(pair, support2)} (Daily Low = PDL/LOD — SMC SSL target)
Resistance 1: ${formatPrice(pair, resistance1)} (38.2% Fib)
Resistance 2: ${formatPrice(pair, resistance2)} (Daily High = PDH/HOD — SMC BSL target)
OTE Zone: ${formatPrice(pair, fib61_8)} - ${formatPrice(pair, fib61_8 - range * 0.172)} (0.618-0.79 Fib — Optimal Trade Entry per SMC)

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
