import { NextRequest, NextResponse } from 'next/server';
import { fetchRealPrice, fetchOHLCVData, fetchMultiplePrices, OHLCVCandle } from '@/lib/market-data';
import { calculateATR, analyzeTrend, getDecimals, formatPrice, validateSignalPrices, calculateSLTPDistances, determineSignalDirection } from '@/lib/trend-analysis';
import { calculateConfluenceScore, calculateProfessionalSLTP, calculateExitManagement, PROFESSIONAL_TRADER_MINDSET, getCurrentSessionInfo } from '@/lib/professional-trading-rules';
import { chatCompletion } from '@/lib/ai';
import { ICT_SIGNAL_SYSTEM_PROMPT } from '@/lib/ict-knowledge';
import { detectAllICTPatterns, calculatePDZones, getCurrentKillZone } from '@/lib/ict-patterns';
import { calculateRSI, detectAllPatterns } from '@/lib/trading-patterns';
import { PAIRS } from '@/lib/trading-knowledge';

export const maxDuration = 60;

// ─── Algeria Timezone Helper ─────────────────────────────────────────
function getAlgeriaTime(): { now: Date; hour: number; dayOfWeek: number; dayName: string; timeStr: string } {
  const now = new Date();
  const algeriaStr = now.toLocaleString('en-US', { timeZone: 'Africa/Algiers' });
  const algeriaDate = new Date(algeriaStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return {
    now: algeriaDate,
    hour: algeriaDate.getHours(),
    dayOfWeek: algeriaDate.getDay(),
    dayName: days[algeriaDate.getDay()],
    timeStr: now.toLocaleString('en-US', { timeZone: 'Africa/Algiers', hour: '2-digit', minute: '2-digit', hour12: true }),
  };
}

// ─── Day-of-Week Scoring (Algeria Time) ──────────────────────────────
function getDayScore(dayOfWeek: number): { score: number; rank: string; color: string } {
  // dayOfWeek: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  switch (dayOfWeek) {
    case 2: return { score: 15, rank: 'A+ يوم ممتاز', color: 'emerald' };    // Tuesday - BEST
    case 3: return { score: 15, rank: 'A+ يوم ممتاز', color: 'emerald' };    // Wednesday - BEST
    case 4: return { score: 10, rank: 'A يوم جيد', color: 'blue' };          // Thursday - GOOD
    case 1: return { score: 5, rank: 'B يوم تراكمي', color: 'yellow' };      // Monday - ACCUMULATION
    case 5: return { score: -5, rank: 'C يوم حذر', color: 'orange' };        // Friday - CAREFUL
    case 0: case 6: return { score: -20, rank: '❌ لا تداول', color: 'red' }; // Weekend - NO TRADING
    default: return { score: 0, rank: 'Unknown', color: 'gray' };
  }
}

// ─── Kill Zone Scoring (Algeria Time UTC+1) ──────────────────────────
function getKillZoneScore(algeriaHour: number): { score: number; name: string; nameAr: string; active: boolean } {
  // London Kill Zone: 07:00-10:00 Algeria
  if (algeriaHour >= 7 && algeriaHour < 10) {
    return { score: 15, name: 'London Kill Zone', nameAr: 'كيل زون لندن 🔥', active: true };
  }
  // NY Kill Zone: 12:00-15:00 Algeria
  if (algeriaHour >= 12 && algeriaHour < 15) {
    return { score: 15, name: 'New York Kill Zone', nameAr: 'كيل زون نيويورك 🔥', active: true };
  }
  // London Close: 16:00-18:00 Algeria
  if (algeriaHour >= 16 && algeriaHour < 18) {
    return { score: 5, name: 'London Close', nameAr: 'إغلاق لندن', active: false };
  }
  // Asian: 01:00-04:00 Algeria
  if (algeriaHour >= 1 && algeriaHour < 4) {
    return { score: 3, name: 'Asian Session', nameAr: 'جلسة آسيا', active: false };
  }
  return { score: -5, name: 'Off-Peak', nameAr: 'خارج أوقات الذروة', active: false };
}

// ─── Quick RSI for scanning ──────────────────────────────────────────
function quickRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change; else losses += Math.abs(change);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return parseFloat((100 - (100 / (1 + avgGain / avgLoss))).toFixed(1));
}

// ─── Quick EMA ───────────────────────────────────────────────────────
function quickEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }
  return ema;
}

// ─── Pair Analysis for Daily Scan ────────────────────────────────────
interface PairAnalysis {
  pair: string;
  currentPrice: number;
  changePercent: number;
  trend: 'bullish' | 'bearish' | 'ranging';
  trendStrength: number;
  structure: string;
  rsi: number;
  atr: number;
  ema20: number;
  ema50: number;
  killZone: string;
  killZoneAr: string;
  killZoneActive: boolean;
  dayRank: string;
  dayScore: number;
  killZoneScore: number;
  opportunityScore: number;
  opportunity: string;
  ictPatterns: string[];
  isPremium: boolean;
  isDiscount: boolean;
  swingHigh: number;
  swingLow: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'swing';

    // ─── Get Algeria time ────────────────────────────────────────────
    const algeria = getAlgeriaTime();
    const dayInfo = getDayScore(algeria.dayOfWeek);
    const kzInfo = getKillZoneScore(algeria.hour);

    const allPairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'XAG/USD', 'BTC/USD', 'ETH/USD', 'US30', 'NAS100', 'GBP/JPY', 'AUD/USD'];

    // ─── Step 1: Fetch all prices in parallel ────────────────────────
    console.log(`[DAILY SCAN] Starting deep scan for ${allPairs.length} pairs...`);
    const priceResults = await fetchMultiplePrices(allPairs);

    // ─── Step 2: Fetch OHLCV for all pairs in parallel ──────────────
    const ohlcvPromises = allPairs.map(async (pair): Promise<{ pair: string; ohlcv: Awaited<ReturnType<typeof fetchOHLCVData>> | null }> => {
      try {
        const ohlcv = await fetchOHLCVData(pair, 'H4');
        return { pair, ohlcv };
      } catch (err) {
        console.warn(`[DAILY SCAN] OHLCV fetch failed for ${pair}:`, err);
        return { pair, ohlcv: null };
      }
    });
    const ohlcvResults = await Promise.allSettled(ohlcvPromises);
    const ohlcvMap: Record<string, Awaited<ReturnType<typeof fetchOHLCVData>> | null> = {};
    for (const result of ohlcvResults) {
      if (result.status === 'fulfilled' && result.value) {
        ohlcvMap[result.value.pair] = result.value.ohlcv;
      }
    }

    // ─── Step 3: Analyze each pair deeply ────────────────────────────
    const pairAnalyses: PairAnalysis[] = [];

    for (const pair of allPairs) {
      const priceData = priceResults[pair];
      const currentPrice = priceData?.price || ohlcvMap[pair]?.currentPrice || 0;
      const changePercent = priceData?.changePercent || ohlcvMap[pair]?.changePercent || 0;

      if (currentPrice === 0) continue;

      const ohlcv = ohlcvMap[pair];
      let trend: 'bullish' | 'bearish' | 'ranging' = 'ranging';
      let trendStrength = 30;
      let structure = 'Ranging';
      let rsi = 50;
      let atr = 0;
      let ema20 = currentPrice;
      let ema50 = currentPrice;
      let ictPatterns: string[] = [];
      let isPremium = false;
      let isDiscount = false;
      let swingHigh = currentPrice;
      let swingLow = currentPrice;

      if (ohlcv && ohlcv.candles.length >= 20) {
        // Use the full professional trend analysis
        const trendAnalysis = analyzeTrend(ohlcv.candles, currentPrice);
        trend = trendAnalysis.direction;
        trendStrength = trendAnalysis.strength;
        structure = trendAnalysis.structure;
        rsi = trendAnalysis.rsi;
        ema20 = trendAnalysis.ema20;
        ema50 = trendAnalysis.ema50;
        swingHigh = trendAnalysis.lastSwingHigh;
        swingLow = trendAnalysis.lastSwingLow;

        // ATR
        atr = calculateATR(ohlcv.candles, 14);

        // ICT Patterns
        try {
          const detectedICT = detectAllICTPatterns(ohlcv.candles as any);
          ictPatterns = detectedICT.map(p => p.name);
        } catch (e) {
          // Ignore pattern detection errors
        }

        // PD Zones
        try {
          const pdZones = calculatePDZones(ohlcv.candles as any);
          isPremium = currentPrice >= pdZones.equilibrium;
          isDiscount = currentPrice < pdZones.equilibrium;
        } catch (e) {
          // Ignore
        }
      } else {
        // Fallback: quick analysis from price data
        const closes = ohlcv?.candles?.map(c => c.close) || [currentPrice];
        rsi = quickRSI(closes);
        ema20 = quickEMA(closes, 20);
        ema50 = quickEMA(closes, 50);
        if (currentPrice > ema20 && currentPrice > ema50) trend = 'bullish';
        else if (currentPrice < ema20 && currentPrice < ema50) trend = 'bearish';
      }

      // ─── Calculate Opportunity Score (0-100) ──────────────────────
      let oppScore = 30; // Base score

      // Trend component (0-25)
      if (trend !== 'ranging') {
        oppScore += Math.min(25, trendStrength * 0.25);
      } else {
        oppScore += 5; // Ranging markets get minimal points
      }

      // RSI component (0-10)
      if ((trend === 'bullish' && rsi > 45 && rsi < 75) || (trend === 'bearish' && rsi < 55 && rsi > 25)) {
        oppScore += 10; // RSI supports trend
      } else if (rsi > 70 || rsi < 30) {
        oppScore += 5; // Extreme RSI = potential
      }

      // ATR/Volatility component (0-10)
      if (atr > 0) {
        const atrPct = (atr / currentPrice) * 100;
        if (atrPct > 0.5 && atrPct < 3) oppScore += 10; // Good volatility
        else if (atrPct >= 3) oppScore += 5; // Too volatile
        else oppScore += 3; // Low volatility
      }

      // ICT Pattern bonus (0-10)
      oppScore += Math.min(10, ictPatterns.length * 3);

      // PD Zone bonus (0-5)
      if ((trend === 'bullish' && isDiscount) || (trend === 'bearish' && isPremium)) {
        oppScore += 5; // Price in favorable zone
      }

      // Kill Zone bonus
      oppScore += Math.max(0, kzInfo.score);

      // Day bonus
      oppScore += Math.max(0, dayInfo.score);

      // Structure bonus (0-5)
      if (structure === 'HH/HL' && trend === 'bullish') oppScore += 5;
      if (structure === 'LH/LL' && trend === 'bearish') oppScore += 5;

      oppScore = Math.min(100, Math.max(0, Math.round(oppScore)));

      // Opportunity level
      let opportunity = 'C — Skip';
      if (oppScore >= 80) opportunity = 'A+ — Must Trade';
      else if (oppScore >= 70) opportunity = 'A — High Confidence';
      else if (oppScore >= 55) opportunity = 'B — Take with Caution';
      else if (oppScore >= 40) opportunity = 'C — Skip';
      else opportunity = 'D — No Trade';

      pairAnalyses.push({
        pair,
        currentPrice,
        changePercent,
        trend,
        trendStrength,
        structure,
        rsi,
        atr,
        ema20,
        ema50,
        killZone: kzInfo.name,
        killZoneAr: kzInfo.nameAr,
        killZoneActive: kzInfo.active,
        dayRank: dayInfo.rank,
        dayScore: dayInfo.score,
        killZoneScore: kzInfo.score,
        opportunityScore: oppScore,
        opportunity,
        ictPatterns,
        isPremium,
        isDiscount,
        swingHigh,
        swingLow,
      });
    }

    // Sort by opportunity score descending
    pairAnalyses.sort((a, b) => b.opportunityScore - a.opportunityScore);

    // ─── Step 4: Generate signals for TOP pairs ─────────────────────
    // Only generate signals for pairs with score >= 55 (B tier and above)
    const topPairs = pairAnalyses.filter(p => p.opportunityScore >= 55).slice(0, 5);
    const signals: any[] = [];

    for (const pairInfo of topPairs) {
      try {
        const ohlcv = ohlcvMap[pairInfo.pair];
        if (!ohlcv || ohlcv.candles.length < 20) continue;

        const currentPrice = pairInfo.currentPrice;
        const isBuy = pairInfo.trend === 'bullish' || (pairInfo.trend === 'ranging' && pairInfo.ema20 > pairInfo.ema50);

        // Calculate ATR
        const rawATR = calculateATR(ohlcv.candles, 14);
        if (rawATR <= 0) continue;

        // Use professional SL/TP calculator
        const profSLTP = calculateProfessionalSLTP({
          entry: currentPrice,
          isBuy,
          atr: rawATR,
          pair: pairInfo.pair,
          swingHigh: pairInfo.swingHigh,
          swingLow: pairInfo.swingLow,
          mode: mode as 'swing',
        });

        // Validate prices
        const decimals = getDecimals(pairInfo.pair);
        const validated = validateSignalPrices(
          {
            type: isBuy ? 'BUY' : 'SELL',
            entry: currentPrice,
            tp1: profSLTP.tp1,
            tp2: profSLTP.tp2,
            tp3: profSLTP.tp3,
            sl: profSLTP.sl,
          },
          currentPrice,
          pairInfo.pair
        );

        // Calculate confluence score
        const confluenceScore = calculateConfluenceScore({
          trendDirection: pairInfo.trend,
          trendStrength: pairInfo.trendStrength,
          structure: pairInfo.structure as any,
          ema20Above50: pairInfo.ema20 > pairInfo.ema50,
          priceInDiscount: pairInfo.isDiscount,
          priceInPremium: pairInfo.isPremium,
          isBuy,
          hasLiquiditySweep: pairInfo.ictPatterns.some(p => p.includes('Liquidity') || p.includes('Turtle')),
          hasMSS: pairInfo.ictPatterns.some(p => p.includes('Market Structure Shift')),
          hasFVG: pairInfo.ictPatterns.some(p => p.includes('Fair Value Gap')),
          hasOB: pairInfo.ictPatterns.some(p => p.includes('Order Block') || p.includes('Breaker')),
          killZoneActive: kzInfo.active,
          inOTEZone: false,
          sessionActive: kzInfo.active,
          rsi: pairInfo.rsi,
          riskReward: profSLTP.rr,
        });

        // Cap confidence based on confluence
        const maxConfByConfluence = confluenceScore.tier === 'A+' ? 95 : confluenceScore.tier === 'A' ? 85 : confluenceScore.tier === 'B' ? 75 : confluenceScore.tier === 'C' ? 60 : 50;
        const maxConfByTrend = pairInfo.trend === 'ranging' ? 45 : pairInfo.trendStrength < 50 ? 55 : 92;
        const confidence = Math.min(maxConfByConfluence, maxConfByTrend, Math.round(pairInfo.opportunityScore * 0.85));

        // Calculate exit management
        const exitMgmt = calculateExitManagement({
          entry: currentPrice,
          sl: validated.sl,
          tp1: validated.tp1,
          tp2: validated.tp2,
          tp3: validated.tp3,
          isBuy,
          pair: pairInfo.pair,
          mode: mode as 'swing',
        });

        const signal = {
          type: isBuy ? 'BUY' : 'SELL',
          pair: pairInfo.pair,
          timeframe: 'H4',
          entry: validated.entry,
          tp1: validated.tp1,
          tp2: validated.tp2,
          sl: validated.sl,
          pattern: pairInfo.ictPatterns.length > 0 ? pairInfo.ictPatterns[0] : `${pairInfo.trend === 'bullish' ? 'Bullish' : 'Bearish'} Trend Continuation`,
          rsi: pairInfo.rsi,
          rsiStatus: pairInfo.rsi > 70 ? 'Overbought' : pairInfo.rsi < 30 ? 'Oversold' : pairInfo.rsi > 50 ? 'Bullish Momentum' : 'Bearish Momentum',
          macd: pairInfo.ema20 > pairInfo.ema50 ? 'Bullish Crossover' : 'Bearish Crossover',
          maCross: `EMA20 ${pairInfo.ema20 > pairInfo.ema50 ? '>' : '<'} EMA50`,
          confidence,
          riskReward: `1:${profSLTP.rr}`,
          ictElements: pairInfo.ictPatterns.slice(0, 4),
          killZone: kzInfo.name,
          liquidityType: pairInfo.ictPatterns.some(p => p.includes('Buy Side')) ? 'BSL Sweep' : pairInfo.ictPatterns.some(p => p.includes('Sell Side')) ? 'SSL Sweep' : (isBuy ? 'SSL Target' : 'BSL Target'),
          pdZone: pairInfo.isDiscount ? 'Discount Zone — Favorable for BUY' : pairInfo.isPremium ? 'Premium Zone — Favorable for SELL' : 'Equilibrium',
          analysis: `🎯 Daily Pro Scanner Signal | Confluence: ${confluenceScore.tier} (${confluenceScore.total}/12) | Trend: ${pairInfo.trend} (${pairInfo.trendStrength}%) | Structure: ${pairInfo.structure} | RSI: ${pairInfo.rsi} | ATR: ${rawATR.toFixed(getDecimals(pairInfo.pair))}\n\n📋 EXIT MANAGEMENT:\n• TP1 (${validated.tp1}): Close 50% + Move SL to BE (${exitMgmt.breakevenPrice})\n• TP2 (${validated.tp2}): Close 30% + Trail SL\n• TP3 (${validated.tp3}): Close 20%\n• Early BE Trigger: ${exitMgmt.earlyBETrigger}\n🚨 NEVER let a winner turn into a loser!`,
          chartData: {
            pair: pairInfo.pair,
            timeframe: 'H4',
            currentPrice,
            high: ohlcv.dayHigh,
            low: ohlcv.dayLow,
            type: isBuy ? 'BUY' : 'SELL',
            entry: validated.entry,
            tp1: validated.tp1,
            tp2: validated.tp2,
            sl: validated.sl,
            confidence,
            riskReward: `1:${profSLTP.rr}`,
            pattern: pairInfo.ictPatterns[0] || 'Trend',
            killZone: kzInfo.name,
            liquidityType: isBuy ? 'SSL Target' : 'BSL Target',
            pdZone: pairInfo.isDiscount ? 'Discount' : 'Premium',
            ictElements: pairInfo.ictPatterns.slice(0, 4),
            changePercent: pairInfo.changePercent,
            candles: ohlcv.candles.slice(-60).map(c => ({
              timestamp: c.timestamp,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume,
            })),
            dataSource: ohlcv.source,
            priceQuality: ohlcv.priceQuality,
            delayMinutes: ohlcv.delayMinutes,
            isRealtime: ohlcv.priceQuality === 'realtime',
            priceSource: ohlcv.source,
            exitManagement: {
              breakevenPrice: exitMgmt.breakevenPrice,
              earlyBETrigger: exitMgmt.earlyBETrigger,
              partialClose1Pct: exitMgmt.partialClose1Pct,
              partialClose2Pct: exitMgmt.partialClose2Pct,
              trailingStopSteps: exitMgmt.trailingStopSteps,
              exitRules: exitMgmt.exitRules,
            },
          },
        };

        signals.push(signal);
      } catch (err) {
        console.warn(`[DAILY SCAN] Signal generation failed for ${pairInfo.pair}:`, err);
      }
    }

    // ─── Step 5: Generate AI Summary ────────────────────────────────
    const topPairsSummary = pairAnalyses.slice(0, 7).map((p, i) => {
      const trendEmoji = p.trend === 'bullish' ? '🟢' : p.trend === 'bearish' ? '🔴' : '🟡';
      return `${i + 1}. ${p.pair} @ ${p.currentPrice} ${trendEmoji} ${p.trend.toUpperCase()} (${p.trendStrength}%) | RSI: ${p.rsi} | Score: ${p.opportunityScore}/100 | ${p.opportunity}`;
    }).join('\n');

    const sessionLabel = kzInfo.active ? `🔥 ${kzInfo.name} ACTIVE` : `⏸️ ${kzInfo.name}`;
    const dayLabel = dayInfo.score >= 10 ? `✅ ${algeria.dayName}` : dayInfo.score >= 0 ? `⚠️ ${algeria.dayName}` : `❌ ${algeria.dayName}`;

    const aiSummary = await chatCompletion({
      systemPrompt: `You are a professional ICT/Smart Money daily market analyst. You write concise, actionable daily scan reports.

IMPORTANT RULES:
- Write in a mix of English and Arabic (the user is from Algeria)
- Be direct and professional
- Only mention A+ and A quality setups
- Use ICT terminology (Kill Zone, OB, FVG, MSS, Liquidity)
- Keep it under 200 words
- Mention the current session and day quality`,
      userMessage: `DAILY PRO SCAN — ${algeria.dayName} ${algeria.timeStr} (Algeria Time)
Session: ${sessionLabel}
Day Quality: ${dayLabel} (Score: ${dayInfo.score})

TOP PAIRS:
${topPairsSummary}

SIGNALS GENERATED: ${signals.length} (only A+/A/B quality)
${signals.length > 0 ? signals.map(s => `• ${s.type} ${s.pair} @ ${s.entry} | SL: ${s.sl} | TP1: ${s.tp1} | TP2: ${s.tp2} | Confidence: ${s.confidence}% | R:R ${s.riskReward}`).join('\n') : 'No high-quality signals today — wait for better conditions.'}

Write a professional daily scan summary. Mention which pairs have the best opportunities and why. Include ICT context (kill zone, day quality). Use some Arabic terms.`,
      maxTokens: 400,
      temperature: 0.4,
    });

    // ─── Build response ─────────────────────────────────────────────
    const topPairsList = pairAnalyses.map(p => ({
      pair: p.pair,
      score: p.opportunityScore,
      trend: p.trend,
      trendStrength: p.trendStrength,
      structure: p.structure,
      rsi: p.rsi,
      killZone: p.killZone,
      killZoneAr: p.killZoneAr,
      dayRank: p.dayRank,
      opportunity: p.opportunity,
      currentPrice: p.currentPrice,
      changePercent: p.changePercent,
      ictPatterns: p.ictPatterns,
      isPremium: p.isPremium,
      isDiscount: p.isDiscount,
    }));

    const sessionInfo = {
      currentSession: kzInfo.name,
      killZone: kzInfo.active ? `${kzInfo.nameAr} ✅` : kzInfo.nameAr,
      killZoneActive: kzInfo.active,
      dayOfWeek: algeria.dayName,
      algeriaTime: algeria.timeStr,
      dayQuality: dayInfo.rank,
      dayScore: dayInfo.score,
      bestWindow: kzInfo.active ? 'NOW — Kill Zone Active!' : kzInfo.name === 'London Kill Zone'
        ? 'Next: NY Kill Zone (12:00-15:00)'
        : 'Next: London Kill Zone (07:00-10:00)',
    };

    console.log(`[DAILY SCAN] Complete! ${pairAnalyses.length} pairs analyzed, ${signals.length} signals generated. Top: ${pairAnalyses[0]?.pair} (${pairAnalyses[0]?.opportunityScore}/100)`);

    return NextResponse.json({
      success: true,
      topPairs: topPairsList,
      signals,
      summary: aiSummary || `🎯 Daily Pro Scan — ${algeria.dayName} ${algeria.timeStr}\n\n${sessionLabel} | ${dayLabel}\n\n${topPairsSummary}\n\n${signals.length > 0 ? `${signals.length} high-quality signals generated!` : 'No A+/A signals today — wait for better Kill Zone alignment.'}`,
      sessionInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[DAILY SCAN FATAL ERROR]', error);
    return NextResponse.json({
      success: false,
      error: `Daily scan failed: ${error?.message || 'Unknown error'}`,
    }, { status: 500 });
  }
}
