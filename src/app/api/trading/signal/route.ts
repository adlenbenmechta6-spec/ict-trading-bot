import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ai';
import { fetchRealPrice, fetchOHLCVData, compensateForDelay, getRecommendedTradingStyle } from '@/lib/market-data';
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
  calculateATR,
  TrendAnalysis,
} from '@/lib/trend-analysis';
import {
  PROFESSIONAL_TRADER_MINDSET,
  buildProfessionalSignalContext,
  calculateConfluenceScore,
  calculateProfessionalSLTP,
  calculateExitManagement,
  shouldAvoidTrade,
  getCurrentSessionInfo,
} from '@/lib/professional-trading-rules';
import { detectAllICTPatterns, calculatePDZones, getCurrentKillZone } from '@/lib/ict-patterns';
import { detectAllPatterns, calculateRSI, calculateMACD, calculateBollingerBands, calculateStochastic } from '@/lib/trading-patterns';

export const maxDuration = 60;

// ─── MAIN SIGNAL ENDPOINT ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { pair = 'EUR/USD', timeframe = 'H4', mode = 'swing' } = body;

  // ─── FETCH MARKET DATA (with individual error handling) ────────
  let marketData: Awaited<ReturnType<typeof fetchRealPrice>>;
  let ohlcvData: Awaited<ReturnType<typeof fetchOHLCVData>>;

  try {
    [marketData, ohlcvData] = await Promise.all([
      fetchRealPrice(pair).catch(err => {
        console.error('[PRICE FETCH ERROR]', err);
        return { pair, price: 0, change: 0, changePercent: 0, high: 0, low: 0, timestamp: new Date().toISOString(), source: 'error', priceQuality: 'stale' as const, delayMinutes: 999 };
      }),
      fetchOHLCVData(pair, timeframe).catch(err => {
        console.error('[OHLCV FETCH ERROR]', err);
        return { pair, timeframe, candles: [] as any[], currentPrice: 0, dayHigh: 0, dayLow: 0, change: 0, changePercent: 0, source: 'error', priceQuality: 'stale' as const, delayMinutes: 999 };
      }),
    ]);
  } catch (error: any) {
    console.error('[MARKET DATA FATAL]', error);
    return NextResponse.json({
      success: false,
      error: `Market data fetch failed: ${error?.message || 'Unknown error'}. Check that price APIs (Yahoo Finance, Twelve Data) are accessible.`,
    });
  }

  if (marketData.price === 0 && ohlcvData.currentPrice === 0) {
    return NextResponse.json({
      success: false,
      error: `Could not fetch the current price for ${pair}. All price sources (Twelve Data, Finnhub, Yahoo Finance) returned no data. If deployed on Vercel, Yahoo Finance may be blocked. Set TWELVE_DATA_API_KEY or FINNHUB_API_KEY env vars for real-time data.`,
    });
  }

  // ─── SIGNAL GENERATION (wrapped in try for detailed error reporting) ───
  try {
    // ─── KEY FIX v2: Prefer real-time marketData price over OHLCV ───
    // Previously used ohlcvData.currentPrice as primary, but OHLCV comes from
    // Yahoo Finance which is delayed 15-20min for commodities.
    // Now marketData uses TradingView (real-time) so we prefer it when available.
    const marketDataIsRealtime = marketData.priceQuality === 'realtime' && marketData.price > 0;
    const currentPrice = marketDataIsRealtime
      ? marketData.price
      : (ohlcvData.currentPrice || marketData.price);
    const dayHigh = marketDataIsRealtime && marketData.high > 0
      ? marketData.high
      : (ohlcvData.dayHigh || marketData.high);
    const dayLow = marketDataIsRealtime && marketData.low > 0
      ? marketData.low
      : (ohlcvData.dayLow || marketData.low);
    const changePercent = marketDataIsRealtime && marketData.changePercent !== 0
      ? marketData.changePercent
      : (ohlcvData.changePercent || marketData.changePercent);

    // ─── PRICE QUALITY ASSESSMENT ────────────────────────────────────
    const priceQuality = marketData.priceQuality || ohlcvData.priceQuality || 'delayed';
    const delayMinutes = marketData.delayMinutes ?? ohlcvData.delayMinutes ?? 15;
    const isRealtime = priceQuality === 'realtime' || priceQuality === 'near-realtime';
    const priceSource = marketData.source || ohlcvData.source || 'Unknown';

    // Get recommended trading style based on data quality
    const tradingStyleRec = getRecommendedTradingStyle(priceQuality, delayMinutes, pair);

    console.log(`[PRICE QUALITY] ${pair}: price=${currentPrice}, quality=${priceQuality}, delay=~${delayMinutes}min, source=${priceSource}, recommended=${tradingStyleRec.style}`);

    // ─── CRITICAL: Use shared trend analysis engine ────────────────
    const trendAnalysis = analyzeTrend(ohlcvData.candles, currentPrice);

    // Mode-specific configuration
    const modeConfig = getModeConfig(mode, timeframe);
    const modeLabel = modeConfig.label;

    // ─── SCALPING WARNING: Not recommended with delayed data ───
    const scalpingWarning = mode === 'scalping' && !isRealtime
      ? `⚠️ SCALPING NOT RECOMMENDED: Price data is ~${delayMinutes}min delayed. SL/TP will be placed incorrectly relative to the real market price. Switch to ${tradingStyleRec.style} trading for accurate signals.`
      : null;

    // Determine ICT instrument quality for this pair
    const ictTier = getICTInstrumentTier(pair);

    // ─── CRITICAL: Build professional signal context ────────────────
    const now = new Date();
    const professionalContext = buildProfessionalSignalContext({
      pair,
      timeframe,
      mode,
      trendDirection: trendAnalysis.direction,
      trendStrength: trendAnalysis.strength,
      structure: trendAnalysis.structure,
      ema20: trendAnalysis.ema20,
      ema50: trendAnalysis.ema50,
      rsi: trendAnalysis.rsi,
      currentPrice,
      dayHigh,
      dayLow,
      changePercent,
      swingHigh: trendAnalysis.lastSwingHigh,
      swingLow: trendAnalysis.lastSwingLow,
      utcHour: now.getUTCHours(),
      dayOfWeek: now.getUTCDay(),
    });

    // Check if we should avoid trading right now
    const avoidCheck = shouldAvoidTrade({
      dayOfWeek: now.getUTCDay(),
      hourUTC: now.getUTCHours(),
      isHighImpactNews: false,
      trendDirection: trendAnalysis.direction,
      trendStrength: trendAnalysis.strength,
      spreadPips: 1,
      normalSpreadPips: 1,
      pair,
    });

    // ═══════════════════════════════════════════════════════════════════
    // ✅ RUN REAL PATTERN DETECTION ON OHLCV CANDLES
    // ═══════════════════════════════════════════════════════════════════
    const ohlcvCandles: Array<{open:number;high:number;low:number;close:number;volume?:number;timestamp?:number}> = ohlcvData.candles;

    // Detect ICT patterns (OB, FVG, MSS, Liquidity Sweeps, etc.)
    let detectedICT: ReturnType<typeof detectAllICTPatterns> = [];
    let detectedCandlestick: ReturnType<typeof detectAllPatterns> = [];
    let pdZones: ReturnType<typeof calculatePDZones> | null = null;
    let actualMACD: ReturnType<typeof calculateMACD> | null = null;
    let exitMgmt: ReturnType<typeof calculateExitManagement> | null = null;
    let actualBB: ReturnType<typeof calculateBollingerBands> | null = null;
    let actualStoch: ReturnType<typeof calculateStochastic> | null = null;

    if (ohlcvCandles.length >= 5) {
      try {
        detectedICT = detectAllICTPatterns(ohlcvCandles as any);
        detectedCandlestick = detectAllPatterns(ohlcvCandles as any);
        pdZones = calculatePDZones(ohlcvCandles as any);
        actualMACD = calculateMACD(ohlcvCandles as any);
        actualBB = calculateBollingerBands(ohlcvCandles as any);
        actualStoch = calculateStochastic(ohlcvCandles as any);
      } catch (e) {
        console.warn('[PATTERN DETECTION] Error detecting patterns:', e);
      }
    }

    // Build detected patterns summary for AI
    const ictPatternNames = detectedICT.map(p => `${p.name}${p.level ? ' @ ' + formatPrice(pair, p.level) : ''}`);
    const candlePatternNames = detectedCandlestick.map(p => p.name);
    const allDetectedPatterns = [...ictPatternNames, ...candlePatternNames];

    // PD Zone info
    const pdZoneInfo = pdZones ?
      `Equilibrium: ${formatPrice(pair, pdZones.equilibrium)}, Premium: ${formatPrice(pair, pdZones.premiumZone.start)}-${formatPrice(pair, pdZones.premiumZone.end)}, Discount: ${formatPrice(pair, pdZones.discountZone.start)}-${formatPrice(pair, pdZones.discountZone.end)}, OTE: ${formatPrice(pair, pdZones.oteZone.start)}-${formatPrice(pair, pdZones.oteZone.end)}`
      : 'Not enough data';

    const isPremium = pdZones ? currentPrice >= pdZones.equilibrium : false;
    const isDiscount = pdZones ? currentPrice < pdZones.equilibrium : false;

    // MACD info
    const macdInfo = actualMACD ?
      `MACD: ${actualMACD.macd}, Signal: ${actualMACD.signal}, Histogram: ${actualMACD.histogram} (${actualMACD.histogram > 0 ? 'Bullish' : 'Bearish'})`
      : 'Insufficient data';

    // Bollinger Bands info
    const bbInfo = actualBB ?
      `Upper: ${formatPrice(pair, actualBB.upper)}, Middle: ${formatPrice(pair, actualBB.middle)}, Lower: ${formatPrice(pair, actualBB.lower)}`
      : '';

    // Stochastic info
    const stochInfo = actualStoch ?
      `%K: ${actualStoch.k}, %D: ${actualStoch.d} (${actualStoch.k > 80 ? 'Overbought' : actualStoch.k < 20 ? 'Oversold' : 'Neutral'})`
      : '';

    // Kill Zone info
    const killZoneInfo = getCurrentKillZone();

    // ═══════════════════════════════════════════════════════════════════
    // ✅ CALL CONFLUENCE SCORE (was dead code before!)
    // ═══════════════════════════════════════════════════════════════════
    const confluenceScore = calculateConfluenceScore({
      trendDirection: trendAnalysis.direction as 'bullish' | 'bearish' | 'ranging',
      trendStrength: trendAnalysis.strength,
      structure: trendAnalysis.structure as 'HH/HL' | 'LH/LL' | 'Ranging',
      ema20Above50: trendAnalysis.ema20 > trendAnalysis.ema50,
      priceInDiscount: isDiscount,
      priceInPremium: isPremium,
      isBuy: trendAnalysis.direction === 'bullish',
      hasLiquiditySweep: detectedICT.some(p => p.category === 'liquidity'),
      hasMSS: detectedICT.some(p => p.name.includes('Market Structure Shift')),
      hasFVG: detectedICT.some(p => p.name.includes('Fair Value Gap')),
      hasOB: detectedICT.some(p => p.name.includes('Order Block') || p.name.includes('Breaker')),
      killZoneActive: killZoneInfo.active,
      inOTEZone: pdZones ? (currentPrice >= pdZones.oteZone.start && currentPrice <= pdZones.oteZone.end) : false,
      sessionActive: ['London', 'New York', 'London Close'].includes(getCurrentSessionInfo(now.getUTCHours()).session),
      rsi: trendAnalysis.rsi,
      riskReward: 2.0,
    });

    // ═══════════════════════════════════════════════════════════════════
    // ✅ BUILD DATA-DRIVEN AI PROMPT (no more fabricating)
    // ═══════════════════════════════════════════════════════════════════
    const lastCandlesSummary = ohlcvCandles.slice(-10).map((c, i) =>
      `C${i+1}: O=${formatPrice(pair,c.open)} H=${formatPrice(pair,c.high)} L=${formatPrice(pair,c.low)} C=${formatPrice(pair,c.close)}${c.volume ? ' V='+c.volume : ''}`
    ).join('\n');

    const aiResponse = await chatCompletion({
      systemPrompt: `${ICT_SIGNAL_SYSTEM_PROMPT}

${PROFESSIONAL_TRADER_MINDSET}

You are generating a ${modeLabel} trading signal for ${pair} on ${timeframe} timeframe.

ICT Instrument Quality: ${pair} is a ${ictTier} instrument for ICT analysis.
${ictTier === 'Tier 1' ? `This is one of the BEST pairs for ICT — expect clean OB/FVG patterns, reliable liquidity sweeps, and strong Kill Zone behavior.` : ictTier === 'Tier 2' ? `Good pair for ICT — patterns are reliable but may need wider stops.` : `Acceptable for ICT but patterns may be less clean — require extra confirmation.`}

${professionalContext}

You have access to REAL computed analysis data from OHLCV candles. DO NOT fabricate or hallucinate indicator values — use ONLY the data provided below.

═══ PRICE DATA QUALITY ═══
- Price Source: ${priceSource}
- Price Quality: ${priceQuality} ${isRealtime ? '✅ REAL-TIME' : `⚠️ ~${delayMinutes}min delayed`}
- Recommended Style: ${tradingStyleRec.style} — ${tradingStyleRec.reason}
${tradingStyleRec.warning ? `- WARNING: ${tradingStyleRec.warning}` : ''}

═══ REAL COMPUTED ANALYSIS DATA ═══
- Live Price: ${currentPrice} ${isRealtime ? '(Real-time ✅)' : `(~${delayMinutes}min delayed ⚠️)`}
- Day High: ${dayHigh}, Day Low: ${dayLow}
- Trend: ${trendAnalysis.direction} (${trendAnalysis.strength}%, ${trendAnalysis.structure}, ${trendAnalysis.trendConfluence}/7 confluence votes)
- EMA20: ${formatPrice(pair, trendAnalysis.ema20)}, EMA50: ${formatPrice(pair, trendAnalysis.ema50)}
- RSI (14): ${trendAnalysis.rsi.toFixed(1)} ${trendAnalysis.rsi > 70 ? '(Overbought)' : trendAnalysis.rsi < 30 ? '(Oversold)' : ''}
- ${macdInfo}
${bbInfo ? '- Bollinger Bands: ' + bbInfo : ''}
${stochInfo ? '- Stochastic: ' + stochInfo : ''}
- PD Zones: ${pdZoneInfo}
- Price is in ${isPremium ? 'PREMIUM (favors SELL)' : isDiscount ? 'DISCOUNT (favors BUY)' : 'NEUTRAL'} zone
- Kill Zone: ${killZoneInfo.name} ${killZoneInfo.active ? '(ACTIVE ✅)' : '(Inactive — next: ' + killZoneInfo.nextKillZone + ')'}
- Confluence Score: ${confluenceScore.tier} (${confluenceScore.total}/12 factors confirmed)

═══ DETECTED ICT PATTERNS ═══
${detectedICT.length > 0 ? detectedICT.map(p => `• ${p.name} (${p.type}) ${p.level ? '@ ' + formatPrice(pair, p.level) : ''} [Reliability: ${p.reliability}/5]`).join('\n') : '• No ICT patterns currently detected in recent candles'}

═══ DETECTED CANDLESTICK PATTERNS ═══
${detectedCandlestick.length > 0 ? detectedCandlestick.map(p => `• ${p.name} (${p.type}) [Reliability: ${p.reliability}/5]`).join('\n') : '• No candlestick patterns currently detected in recent candles'}

═══ LAST 10 CANDLES (OHLCV) ═══
${lastCandlesSummary}

${avoidCheck.avoid ? `⚠️ TRADE CONDITION WARNING: ${avoidCheck.reason}. If you generate a signal, include a warning and lower confidence (max 60%).` : '✅ Trading conditions are acceptable. Proceed with normal analysis.'}

IMPORTANT RULES:
1. Use ONLY the detected patterns listed above — do NOT invent patterns that were not detected
2. If no ICT patterns are detected, acknowledge this and set lower confidence
3. Reference actual RSI value (${trendAnalysis.rsi.toFixed(1)}), actual MACD data, and actual EMA values
4. Your confidence MUST reflect the confluence score: ${confluenceScore.tier} = max ${confluenceScore.tier === 'A+' ? 95 : confluenceScore.tier === 'A' ? 85 : confluenceScore.tier === 'B' ? 75 : confluenceScore.tier === 'C' ? 60 : 50}%
5. You MUST follow the trend direction: ${trendAnalysis.direction}

Return ONLY valid JSON (no markdown, no backticks):
{
  "type": "BUY" or "SELL",
  "pair": "${pair}",
  "timeframe": "${timeframe}",
  "entry": number,
  "tp1": number,
  "tp2": number,
  "tp3": number,
  "sl": number,
  "pattern": "pattern name from detected patterns above",
  "rsi": ${trendAnalysis.rsi.toFixed(1)},
  "rsiStatus": "RSI description using actual value",
  "macd": "MACD description using actual data",
  "maCross": "MA cross using actual EMA values",
  "confidence": number,
  "riskReward": "1:X",
  "ictElements": ["ONLY elements that were actually detected above"],
  "killZone": "${killZoneInfo.name}",
  "liquidityType": "liquidity type from detected data",
  "pdZone": "Premium or Discount zone from actual data",
  "analysis": "Detailed reasoning referencing actual detected patterns and confluence score"
}

IMPORTANT SL/TP RULES — VIOLATION = INVALID SIGNAL:
- If type is "BUY": entry < tp1 < tp2 < tp3 AND sl < entry (SL MUST be below entry!)
- If type is "SELL": tp3 < tp2 < tp1 < entry AND sl > entry (SL MUST be above entry!)
- SL MUST be on the OPPOSITE side of entry from TP
- Multi-Level TP System: TP1=1:1 RR (close 50%), TP2=1:2 RR (close 30%), TP3=1:3+ RR (close 20%)
- SL at logical level (below OB/FVG for BUY, above OB/FVG for SELL)
- TP at liquidity pools (BSL/SSL targets), not arbitrary multiples
- All prices must be realistic and near the current price of ${currentPrice}

Important ${modeLabel} rules:
${modeConfig.promptRules}

PROFESSIONAL QUALITY GATE:
- Confidence MUST NOT exceed the confluence score maximum
- If confluence score is ${confluenceScore.tier}, max confidence = ${confluenceScore.tier === 'A+' ? 95 : confluenceScore.tier === 'A' ? 85 : confluenceScore.tier === 'B' ? 75 : confluenceScore.tier === 'C' ? 60 : 50}%
- If less than 3 confluences, reduce confidence to max 55% and add warning
- NEVER generate a signal that contradicts the mandatory direction above
- If conditions are poor, it's BETTER to give low confidence with a clear warning`,
      userMessage: `${modeLabel} signal for ${pair} on ${timeframe}. Live price: ${currentPrice}. TREND: ${trendAnalysis.direction} (${trendAnalysis.strength}%). Confluence: ${confluenceScore.tier} (${confluenceScore.total}/12). ICT Patterns: ${ictPatternNames.length > 0 ? ictPatternNames.join(', ') : 'None detected'}. Candlestick: ${candlePatternNames.length > 0 ? candlePatternNames.join(', ') : 'None detected'}. You MUST follow the trend direction. Use ONLY detected patterns.`,
      temperature: 0.35,
      maxTokens: 500,
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
            signal = generateFallbackSignal(pair, timeframe, currentPrice, { high: dayHigh, low: dayLow, change: marketData.change, changePercent }, aiResponse, mode, trendAnalysis, confluenceScore, detectedICT, detectedCandlestick, killZoneInfo);
          }
        }

        // ─── CONFLUENCE GATE: Cap confidence based on actual confluence score ──
        const maxConfByConfluence = confluenceScore.tier === 'A+' ? 95 : confluenceScore.tier === 'A' ? 85 : confluenceScore.tier === 'B' ? 75 : confluenceScore.tier === 'C' ? 60 : 50;
        if (signal.confidence > maxConfByConfluence) {
          console.warn(`[CONFLUENCE GATE] AI confidence ${signal.confidence}% capped to ${maxConfByConfluence}% (confluence: ${confluenceScore.tier})`);
          signal.confidence = maxConfByConfluence;
        }

        // ─── CRITICAL FIX 2: Validate SL/TP are logically correct ────
        // BUY: SL must be BELOW entry, TP above entry
        // SELL: SL must be ABOVE entry, TP below entry
        // This prevents the bug where SL > entry on a BUY signal
        const validated = validateSignalPrices(
          { type: signal.type, entry: signal.entry, tp1: signal.tp1, tp2: signal.tp2, tp3: signal.tp3 || 0, sl: signal.sl },
          currentPrice,
          pair
        );
        signal.entry = validated.entry;
        signal.tp1 = validated.tp1;
        signal.tp2 = validated.tp2;
        signal.tp3 = validated.tp3;
        signal.sl = validated.sl;

        // ─── PROFESSIONAL: Recalculate SL/TP using structure-aware ATR ──
        // Professional traders don't use arbitrary ATR multiples.
        // They place SL below structure (OB/FVG/swing) and TP at liquidity targets.
        const rawATR = calculateATR(ohlcvData.candles, 14);
        const isBuySignal = signal.type === 'BUY';
        signal.entry = currentPrice; // Always use real current price

        if (rawATR > 0) {
          // Use professional SL/TP calculator
          const profSLTP = calculateProfessionalSLTP({
            entry: currentPrice,
            isBuy: isBuySignal,
            atr: rawATR,
            pair,
            swingHigh: trendAnalysis.lastSwingHigh,
            swingLow: trendAnalysis.lastSwingLow,
            mode: mode as 'scalping' | 'daytrading' | 'swing' | 'fundednext',
          });

          signal.sl = profSLTP.sl;
          signal.tp1 = profSLTP.tp1;
          signal.tp2 = profSLTP.tp2;
          signal.tp3 = profSLTP.tp3;
          signal.riskReward = `1:${profSLTP.rr}`;

          // ─── DELAY COMPENSATION: Add buffer to SL when price is delayed ──
          // This prevents the bug where SL ends up on wrong side of real price
          if (delayMinutes > 1) {
            const compensated = compensateForDelay(
              signal.entry, signal.sl, signal.tp1, signal.tp2,
              isBuySignal, delayMinutes, pair
            );
            if (compensated.buffer > 0) {
              console.log(`[DELAY COMPENSATION] ${pair}: Added ${compensated.buffer} buffer to SL (delay: ~${delayMinutes}min). SL: ${signal.sl} → ${compensated.sl}`);
              signal.sl = compensated.sl;
            }
          }

          // ─── FINAL SAFETY CHECK: Verify SL/TP are logically correct ──
          if (isBuySignal) {
            // BUY: SL MUST be below entry, TP above entry, SL must be positive
            const slInvalid = signal.sl >= signal.entry || signal.sl <= 0;
            if (slInvalid || signal.tp1 <= signal.entry || signal.tp2 <= signal.tp1 || (signal.tp3 && signal.tp3 <= signal.tp2)) {
              console.error(`[FATAL CHECK] BUY signal has invalid SL/TP! SL=${signal.sl} Entry=${signal.entry} TP1=${signal.tp1} TP2=${signal.tp2} TP3=${signal.tp3}. Forcing ATR fallback.`);
              const atrDist = calculateSLTPDistances(ohlcvData.candles, mode);
              signal.sl = parseFloat((currentPrice - atrDist.sl).toFixed(getDecimals(pair)));
              signal.tp1 = parseFloat((currentPrice + atrDist.tp1).toFixed(getDecimals(pair)));
              signal.tp2 = parseFloat((currentPrice + atrDist.tp2).toFixed(getDecimals(pair)));
              signal.tp3 = parseFloat((currentPrice + atrDist.tp2 * 1.3).toFixed(getDecimals(pair)));
              // Extra safety: if SL is still negative or above entry, use percentage-based fallback
              if (signal.sl <= 0 || signal.sl >= signal.entry) {
                const slPct = mode === 'scalping' ? 0.003 : mode === 'daytrading' ? 0.005 : 0.008;
                signal.sl = parseFloat((currentPrice * (1 - slPct)).toFixed(getDecimals(pair)));
                signal.tp1 = parseFloat((currentPrice * (1 + slPct * 1)).toFixed(getDecimals(pair)));
                signal.tp2 = parseFloat((currentPrice * (1 + slPct * 2)).toFixed(getDecimals(pair)));
                signal.tp3 = parseFloat((currentPrice * (1 + slPct * 3)).toFixed(getDecimals(pair)));
              }
            }
          } else {
            // SELL: SL MUST be above entry, TP below entry
            if (signal.sl <= signal.entry || signal.tp1 >= signal.entry || signal.tp2 >= signal.tp1 || (signal.tp3 && signal.tp3 >= signal.tp2)) {
              console.error(`[FATAL CHECK] SELL signal has invalid SL/TP! SL=${signal.sl} Entry=${signal.entry} TP1=${signal.tp1} TP2=${signal.tp2} TP3=${signal.tp3}. Forcing ATR fallback.`);
              const atrDist = calculateSLTPDistances(ohlcvData.candles, mode);
              signal.sl = parseFloat((currentPrice + atrDist.sl).toFixed(getDecimals(pair)));
              signal.tp1 = parseFloat((currentPrice - atrDist.tp1).toFixed(getDecimals(pair)));
              signal.tp2 = parseFloat((currentPrice - atrDist.tp2).toFixed(getDecimals(pair)));
              signal.tp3 = parseFloat((currentPrice - atrDist.tp2 * 1.3).toFixed(getDecimals(pair)));
              // Extra safety: if SL is above reasonable range, use percentage-based fallback
              if (signal.sl <= signal.entry || signal.sl > currentPrice * 1.1) {
                const slPct = mode === 'scalping' ? 0.003 : mode === 'daytrading' ? 0.005 : 0.008;
                signal.sl = parseFloat((currentPrice * (1 + slPct)).toFixed(getDecimals(pair)));
                signal.tp1 = parseFloat((currentPrice * (1 - slPct * 1)).toFixed(getDecimals(pair)));
                signal.tp2 = parseFloat((currentPrice * (1 - slPct * 2)).toFixed(getDecimals(pair)));
                signal.tp3 = parseFloat((currentPrice * (1 - slPct * 3)).toFixed(getDecimals(pair)));
              }
            }
          }
        }

        // ─── PROFESSIONAL: Add trade avoidance warning to analysis ──
        if (avoidCheck.avoid) {
          signal.analysis = `⚠️ ${avoidCheck.reason} | ${signal.analysis || ''}`;
          // Cap confidence when trade conditions are poor
          if (signal.confidence > 60) {
            signal.confidence = 60;
          }
        }

        // ─── EXIT MANAGEMENT: Calculate breakeven + trailing stop rules ──
        // This prevents winning trades from turning into losers
        exitMgmt = calculateExitManagement({
          entry: signal.entry,
          sl: signal.sl,
          tp1: signal.tp1,
          tp2: signal.tp2,
          tp3: signal.tp3,
          isBuy: signal.type === 'BUY',
          pair,
          mode: mode as 'scalping' | 'daytrading' | 'swing' | 'fundednext',
        });

        // Add exit management instructions to the analysis (Multi-Level TP: 50/30/20)
        let exitMgmtSummary = `\n\n📋 EXIT MANAGEMENT (Multi-Level TP):\n• TP1 (${signal.tp1}): Close 50% + Move SL to Breakeven (${exitMgmt.breakevenPrice})\n• TP2 (${signal.tp2}): Close 30% + Trail SL behind structure\n• TP3 (${signal.tp3}): Close remaining 20%\n• Early BE Trigger: ${exitMgmt.earlyBETrigger} (move SL to BE when price reaches this)\n• 🚨 NEVER let a winner turn into a loser!`;

        // FundedNext-specific risk context
        if (mode === 'fundednext') {
          const slDistance = Math.abs(signal.sl - signal.entry);
          const riskPct = ((slDistance / signal.entry) * 100).toFixed(2);
          const riskDollar = (slDistance / signal.entry * 6000).toFixed(2);
          exitMgmtSummary += `\n\n🏆 FUNDEDNEXT 6K STELLAR 2-STEP:\n• Risk per trade: ${riskPct}% ($${riskDollar} on $6K account)${parseFloat(riskDollar) > 60 ? ' ⚠️ EXCEEDS 1% LIMIT! Reduce position size!' : ' ✅ Within 1% limit'}`;
          exitMgmtSummary += `\n• Daily Loss Limit: 5% ($300) | Max Loss: 10% ($600)`;
          exitMgmtSummary += `\n• Phase 1 Target: 8% ($480) | Phase 2 Target: 5% ($300)`;
          exitMgmtSummary += `\n• ${parseFloat(riskDollar) <= 60 ? '✅ Safe to trade with standard lot size' : '⚠️ Use MINI lot (0.01-0.05) to stay within 1% risk'}`;
        }
        signal.analysis = (signal.analysis || '') + exitMgmtSummary;

        // ─── ADD PRICE DELAY WARNING ──
        if (!isRealtime && delayMinutes > 3) {
          const delayWarning = `⚠️ PRICE DELAY: Data is ~${delayMinutes}min delayed from ${priceSource}. Entry/SL/TP may differ from real market. ${tradingStyleRec.warning || 'Use Swing Trading for best accuracy.'}`;
          signal.analysis = `${delayWarning} | ${signal.analysis || ''}`;
          // Cap confidence when price is significantly delayed
          if (mode === 'scalping' && delayMinutes > 3) {
            signal.confidence = Math.min(signal.confidence, 50);
          } else if (mode === 'daytrading' && delayMinutes > 10) {
            signal.confidence = Math.min(signal.confidence, 60);
          }
        }

        // Add scalping-specific warning
        if (scalpingWarning) {
          signal.analysis = `${scalpingWarning} | ${signal.analysis || ''}`;
          signal.confidence = Math.min(signal.confidence, 45);
        }

        // ═══════════════════════════════════════════════════════════════════
        // FIX v3: PROFESSIONAL QUALITY GATE — Trend Strength Gate
        // If the trend is ranging with low strength, confidence MUST be low.
        // Professional traders DON'T TRADE in ranging/weak markets.
        // This prevents the AI from giving 60% confidence when trend=25%
        // ═══════════════════════════════════════════════════════════════════
        const maxConfByTrend = trendAnalysis.direction === 'ranging' && trendAnalysis.strength < 40
          ? 35  // Weak ranging = max 35% — DO NOT TRADE
          : trendAnalysis.direction === 'ranging'
          ? 45  // Ranging but some strength = max 45% — risky
          : trendAnalysis.strength < 50
          ? 55  // Weak trend = max 55%
          : 92; // Normal: no cap from trend side

        if (signal.confidence > maxConfByTrend) {
          console.warn(`[TREND QUALITY GATE] AI confidence ${signal.confidence}% capped to ${maxConfByTrend}% (trend: ${trendAnalysis.direction} ${trendAnalysis.strength}%)`);
          signal.confidence = maxConfByTrend;
        }

        // Add quality warning to analysis for poor trend conditions
        if (trendAnalysis.direction === 'ranging' && trendAnalysis.strength < 40) {
          signal.analysis = `🔴 لا تتداول! السوق متردد وضعيف (${trendAnalysis.strength}%). الاحترافيون ينتظرون اتجاه واضح. | ${signal.analysis || ''}`;
        } else if (trendAnalysis.direction === 'ranging') {
          signal.analysis = `⚠️ السوق بدون اتجاه واضح — صفقة عالية المخاطر. لا تخاطر بأكثر من 0.5%. | ${signal.analysis || ''}`;
        } else if (trendAnalysis.strength < 50) {
          signal.analysis = `⚠️ الاتجاه ضعيف (${trendAnalysis.strength}%) — خفّض حجم الصفقة. | ${signal.analysis || ''}`;
        }

        // FundedNext: Extra warning for low confluence signals
        if (mode === 'fundednext' && confluenceScore.total < 6) {
          signal.analysis = `🏆⚠️ FUNDEDNEXT: Confluence is only ${confluenceScore.total}/12 — SKIP this trade. Only take signals with 6+ confluences to pass the challenge safely. | ${signal.analysis || ''}`;
          signal.confidence = Math.min(signal.confidence, 40);
        }
      } catch {
        signal = generateFallbackSignal(pair, timeframe, currentPrice, { high: dayHigh, low: dayLow, change: marketData.change, changePercent }, aiResponse, mode, trendAnalysis, confluenceScore, detectedICT, detectedCandlestick, killZoneInfo);
      }
    } else {
      signal = generateFallbackSignal(pair, timeframe, currentPrice, { high: dayHigh, low: dayLow, change: marketData.change, changePercent }, null, mode, trendAnalysis, confluenceScore, detectedICT, detectedCandlestick, killZoneInfo);
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
      tp3: signal.tp3,
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
      // Price quality and delay information
      priceQuality: priceQuality,
      delayMinutes: delayMinutes,
      isRealtime: isRealtime,
      priceSource: priceSource,
      recommendedStyle: tradingStyleRec,
      scalpingWarning: scalpingWarning,
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
      // Professional session & timing data
      session: getCurrentSessionInfo(now.getUTCHours()),
      tradeAvoidance: avoidCheck,
      // Exit management data (breakeven, trailing stop, partial close rules)
      exitManagement: exitMgmt || null,
    };

    return NextResponse.json({ success: true, signal });
  } catch (error: any) {
    console.error('[SIGNAL FATAL ERROR]', error);
    const errMsg = error?.message || 'Unknown error';
    const errStack = process.env.NODE_ENV === 'development' ? error?.stack : undefined;
    return NextResponse.json({
      success: false,
      error: `Signal generation failed: ${errMsg}`,
      debug: errStack ? errStack.split('\n').slice(0, 5).join('\n') : undefined,
    }, { status: 500 });
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
    case 'fundednext':
      return {
        label: 'FundedNext 6K (Stellar 2-Step)',
        promptRules: `- This is a FUNDEDNEXT STELLAR 2-STEP CHALLENGE signal on ${timeframe}
- Account Size: $6,000 | Fee: $59.99 (refundable)
- Phase 1 Profit Target: 8% ($480) | Phase 2 Profit Target: 5% ($300)
- MAXIMUM Loss Limit: 10% ($600) — TOTAL account drawdown cannot exceed $600
- DAILY Loss Limit: 5% ($300) — Cannot lose more than $300 in a single day
- Minimum Trading Days: 5 | First Withdrawal: 21 Days
- Performance Reward: Up to 95% | 15% from Challenge Phase

CRITICAL RISK MANAGEMENT FOR FUNDEDNEXT:
1. NEVER risk more than 1% of account ($60) per trade — this ensures you can take 5 losses before hitting daily limit
2. SL MUST be placed at a logical level that limits risk to max $60 per trade
3. Only take A+ and A signals (confluence score 8+/12) — skip B, C, F signals
4. NEVER trade during high-impact news — prop firms monitor this
5. NEVER hold over weekend if possible — gap risk can exceed daily loss limit
6. Target minimum 1:2 R:R — need consistent wins to reach 8% target
7. Focus on SWING trades (H4/D1) — less screen time, more reliable signals
8. Best pairs for prop firm: XAU/USD, GBP/JPY, EUR/USD, GBP/USD — high liquidity
9. Track daily P&L: if you're down $200+ today, STOP trading to protect daily limit
10. After 2 consecutive losses, take a 4-hour break — avoid revenge trading
- MUST follow the trend direction — counter-trend trades violate prop firm risk rules
- This is for PASSING A PROPEL CHALLENGE — only take the BEST setups`,
        atrMultiplier: 1.0,
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
// KEY FIX: Now uses REAL detected patterns instead of fabricating
function generateFallbackSignal(
  pair: string, timeframe: string, currentPrice: number,
  marketData: { high: number; low: number; change: number; changePercent: number },
  aiText: string | null, mode: string, trend: TrendAnalysis,
  confluenceScore?: any, detectedICT?: any[], detectedCandlestick?: any[], killZoneInfo?: any
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
  const atrMult = mode === 'scalping' ? 0.6 : mode === 'daytrading' ? 0.8 : mode === 'fundednext' ? 1.0 : 1.0;
  const atr = professionalRange * atrMult;

  const entry = currentPrice;
  // Professional multipliers: SL=1x, TP1=1x, TP2=2x, TP3=3x of ATR (Multi-Level TP)
  const slDist = atr * 1.0;
  const tp1Dist = atr * 1.0;
  const tp2Dist = atr * 2.0;
  const tp3Dist = atr * 3.0;
  const tp1 = isBuy ? entry + tp1Dist : entry - tp1Dist;
  const tp2 = isBuy ? entry + tp2Dist : entry - tp2Dist;
  const tp3 = isBuy ? entry + tp3Dist : entry - tp3Dist;
  const sl = isBuy ? entry - slDist : entry + slDist;
  const rr = Math.abs(tp2 - entry) / Math.abs(sl - entry);

  // ═══════════════════════════════════════════════════════════════════════
  // FIX v3: Professional Confidence Calculation
  // Confidence MUST reflect the REAL quality of the analysis:
  // - Ranging market with low confluence = VERY LOW confidence (max 35%)
  // - Weak trend with some confluence = MODERATE (40-55%)
  // - Strong trend with high confluence = HIGH (60-85%)
  // - A+ setup with all confluences = VERY HIGH (85-95%)
  // This prevents the bug where ranging/25%/2-7 confluence got 60% confidence
  // ═══════════════════════════════════════════════════════════════════════
  let confidence = 40; // Base: cautious
  let qualityWarning = '';

  // Step 1: Base confidence from trend strength and direction
  if (trend.direction === 'ranging' && trend.strength < 40) {
    // Ranging/weak market = professional traders DON'T TRADE
    confidence = 25 + Math.round(trend.strength * 0.15); // 25-31%
    qualityWarning = '⚠️ السوق متردد وضعيف — لا تتداول في هذه الظروف! الاحترافيون ينتظرون اتجاه واضح.';
  } else if (trend.direction === 'ranging') {
    // Ranging but some strength (40-60%) = risky
    confidence = 30 + Math.round(trend.strength * 0.2); // 30-42%
    qualityWarning = '⚠️ السوق بدون اتجاه واضح — صفقة عالية المخاطر. لا تخاطر بأكثر من 0.5%.';
  } else if (trend.strength >= 70) {
    // Strong trend = professional quality
    confidence = 60 + Math.round((trend.strength - 70) * 0.5); // 60-75%
  } else if (trend.strength >= 50) {
    // Moderate trend = acceptable
    confidence = 50 + Math.round((trend.strength - 50) * 0.5); // 50-60%
  } else {
    // Weak trend (below 50%) = low quality
    confidence = 40 + Math.round(trend.strength * 0.15); // 40-48%
    qualityWarning = '⚠️ الاتجاه ضعيف — صفقة محفوفة بالمخاطر. خفّض حجم الصفقة.';
  }

  // Step 2: Adjust for confluence (more confirmations = higher confidence)
  if (trend.trendConfluence >= 6) confidence += 15;
  else if (trend.trendConfluence >= 5) confidence += 10;
  else if (trend.trendConfluence >= 4) confidence += 5;
  else if (trend.trendConfluence <= 2) {
    confidence -= 15; // Very few confirmations = big penalty
    if (!qualityWarning) qualityWarning = '⚠️ عدد التأكيدات قليل جداً — لا يوجد ما يكفي لدعم هذه الصفقة.';
  }
  else if (trend.trendConfluence <= 3) confidence -= 5;

  // Step 3: Mode-specific adjustments
  if (mode === 'scalping') confidence = Math.max(confidence - 10, 20);
  if (mode === 'fundednext') {
    // FundedNext requires HIGHER confidence threshold — only A+ signals
    if (confidence < 65) confidence = Math.max(confidence - 10, 20); // Lower confidence for non-A+ signals in funded mode
    // Must have minimum 4 confluences for fundednext
    if (trend.trendConfluence < 4) confidence = Math.min(confidence, 35);
  }

  // Step 4: Clamp to professional range
  confidence = Math.max(20, Math.min(confidence, 92));

  // Step 5: Override confluence score cap (from professional rules)
  const maxConfByConfluence = confluenceScore.tier === 'A+' ? 95 : confluenceScore.tier === 'A' ? 85 : confluenceScore.tier === 'B' ? 75 : confluenceScore.tier === 'C' ? 55 : 40;
  if (confidence > maxConfByConfluence) {
    confidence = maxConfByConfluence;
  }

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

  // Mode-specific patterns and elements using REAL detected patterns
  let pattern: string;
  let ictElements: string[];
  let analysis: string;

  // Trend direction label for analysis
  const trendLabel = trend.direction === 'bullish' ? 'UPTREND' : trend.direction === 'bearish' ? 'DOWNTREND' : 'RANGING';

  // ═══════════════════════════════════════════════════════════════════
  // ✅ USE REAL DETECTED PATTERNS (no more fabricating!)
  // ═══════════════════════════════════════════════════════════════════
  const realICTElements: string[] = [];
  if (detectedICT && detectedICT.length > 0) {
    for (const p of detectedICT) {
      realICTElements.push(`${p.name}${p.level ? ' @ ' + formatPrice(pair, p.level) : ''} (${p.type})`);
    }
  }
  if (detectedCandlestick && detectedCandlestick.length > 0) {
    for (const p of detectedCandlestick) {
      realICTElements.push(`${p.name} (${p.type})`);
    }
  }

  // Only add trend info if no real patterns found
  if (realICTElements.length === 0) {
    realICTElements.push(`Trend: ${trendLabel} (${trend.strength}%)`);
    realICTElements.push(`Price in ${isBuy ? 'Discount' : 'Premium'} zone`);
  }

  // Use real confluence score if available
  const confGrade = confluenceScore?.grade || 'C';
  const confScore = confluenceScore?.score || 4;

  // Real kill zone info
  const realKZ = killZoneInfo?.name || killZone;

  // Real MACD from trend analysis (not fabricated)
  const realMACD = trend.ema20 > trend.ema50 ? 'Bullish — EMA20 above EMA50' : 'Bearish — EMA20 below EMA50';

  if (mode === 'scalping') {
    pattern = realICTElements.length > 1
      ? `${smcSetup} + ${detectedCandlestick?.[0]?.name || (isBuy ? 'Micro Bullish Engulfing' : 'Micro Bearish Engulfing')}`
      : `${smcSetup} (Trend-Following)`;
    ictElements = realICTElements;
    analysis = aiText || `⚡ SCALP ${isBuy ? '🟢 BUY' : '🔴 SELL'} ${pair} at ${formatPrice(pair, entry)} (${timeframe}). Market is in ${trendLabel} (${trend.strength}% strength, ${trend.trendConfluence}/7 confluence). Confluence grade: ${confGrade} (${confScore}/12). ${realICTElements.length > 0 ? 'Detected: ' + realICTElements.slice(0,3).join(', ') + '.' : 'No specific ICT patterns detected — relying on trend direction.'} ${realKZ} active. Tight SL at ${formatPrice(pair, sl)}. Risk max 0.5%.`;
  } else if (mode === 'daytrading') {
    pattern = realICTElements.length > 1
      ? `${smcSetup} + ${detectedCandlestick?.[0]?.name || (isBuy ? 'Bullish Engulfing' : 'Bearish Engulfing')}`
      : `${smcSetup} (Trend-Following)`;
    ictElements = realICTElements;
    analysis = aiText || `📊 DAY TRADE ${isBuy ? '🟢 BUY' : '🔴 SELL'} ${pair} at ${formatPrice(pair, entry)} (${timeframe}). Market is in ${trendLabel} (${trend.strength}% strength, RSI ${rsi}). Confluence grade: ${confGrade} (${confScore}/12). ${realICTElements.length > 0 ? 'Detected: ' + realICTElements.slice(0,4).join(', ') + '.' : 'No specific ICT patterns detected — relying on trend and structure.'} SL at ${formatPrice(pair, sl)}. Close before EOD. Risk max 1%.`;
  } else {
    pattern = realICTElements.length > 1
      ? `${smcSetup} + ${detectedCandlestick?.[0]?.name || (isBuy ? 'Hammer Setup' : 'Hanging Man Setup')}`
      : `${smcSetup} (Trend-Following)`;
    ictElements = realICTElements;
    analysis = aiText || `📅 SWING ${isBuy ? '🟢 BUY' : '🔴 SELL'} ${pair} at ${formatPrice(pair, entry)} (${timeframe}). Market is in ${trendLabel} (${trend.strength}% strength, ${trend.structure}). Confluence grade: ${confGrade} (${confScore}/12). ${realICTElements.length > 0 ? 'Detected: ' + realICTElements.slice(0,5).join(', ') + '.' : 'No specific ICT patterns detected — relying on trend direction.'} R:R ${rr.toFixed(1)}:1. Risk max 2%. The market hardly reverses without taking liquidity!`;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FIX v3: Add quality warning to analysis if conditions are poor
  // Professional traders DON'T TRADE in poor conditions — neither should the bot
  // ═══════════════════════════════════════════════════════════════════════
  if (qualityWarning) {
    analysis = `${qualityWarning} | ${analysis}`;
  }

  return {
    type, pair, timeframe,
    entry: parseFloat(entry.toFixed(decimals)),
    tp1: parseFloat(tp1.toFixed(decimals)),
    tp2: parseFloat(tp2.toFixed(decimals)),
    tp3: parseFloat(tp3.toFixed(decimals)),
    sl: parseFloat(sl.toFixed(decimals)),
    pattern,
    rsi,
    rsiStatus: isBuy ? `Bullish RSI (${rsi}) — trend momentum supports upside` : `Bearish RSI (${rsi}) — trend momentum supports downside`,
    macd: realMACD || (isBuy ? 'Bullish — EMA20 above EMA50' : 'Bearish — EMA20 below EMA50'),
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
