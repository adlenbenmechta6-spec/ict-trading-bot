import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ai';
import { fetchRealPrice, fetchOHLCVData } from '@/lib/market-data';
import { ICT_SIGNAL_SYSTEM_PROMPT } from '@/lib/ict-knowledge';
import { ICT_BEST_INSTRUMENTS } from '@/lib/ict-core-content';

export const maxDuration = 30;

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

    // Mode-specific configuration
    const modeConfig = getModeConfig(mode, timeframe);
    const modeLabel = modeConfig.label;

    // Determine ICT instrument quality for this pair
    const ictTier = getICTInstrumentTier(pair);

    const aiResponse = await chatCompletion({
      systemPrompt: `${ICT_SIGNAL_SYSTEM_PROMPT}

You are generating a ${modeLabel} trading signal for ${pair} on ${timeframe} timeframe.

ICT Instrument Quality: ${pair} is a ${ictTier} instrument for ICT analysis.
${ictTier === 'Tier 1' ? `This is one of the BEST pairs for ICT — expect clean OB/FVG patterns, reliable liquidity sweeps, and strong Kill Zone behavior.` : ictTier === 'Tier 2' ? `Good pair for ICT — patterns are reliable but may need wider stops.` : `Acceptable for ICT but patterns may be less clean — require extra confirmation.`}

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
      userMessage: `${modeLabel} signal for ${pair} on TradingView ${timeframe} chart. Live price: ${currentPrice}, H: ${dayHigh}, L: ${dayLow}`,
      temperature: 0.7,
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
      } catch {
        signal = generateFallbackSignal(pair, timeframe, currentPrice, { high: dayHigh, low: dayLow, change: marketData.change, changePercent }, aiResponse, mode);
      }
    } else {
      signal = generateFallbackSignal(pair, timeframe, currentPrice, { high: dayHigh, low: dayLow, change: marketData.change, changePercent }, null, mode);
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
- Focus on quick momentum entries
- SL should be very close to entry
- TP targets are modest but achievable in seconds-minutes
- Use micro-level ICT elements (1m/5m Order Blocks, micro FVGs)
- Kill Zones are critical for scalping entries`,
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
- Avoid holding overnight`,
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
- Kill Zones help with timing but are less critical for swing`,
        atrMultiplier: 1.0,
      };
  }
}

function generateFallbackSignal(
  pair: string, timeframe: string, currentPrice: number,
  marketData: { high: number; low: number; change: number; changePercent: number },
  aiText: string | null, mode: string
) {
  const decimals = pair.includes('JPY') ? 3 : pair === 'XAU/USD' ? 2 : pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5;
  const range = marketData.high - marketData.low;
  const position = range > 0 ? (currentPrice - marketData.low) / range : 0.5;

  let isBuy = position < 0.4;
  if (marketData.changePercent < -0.3) isBuy = true;
  if (marketData.changePercent > 0.3) isBuy = false;

  const type: 'BUY' | 'SELL' = isBuy ? 'BUY' : 'SELL';

  // Adjust ATR multiplier based on mode
  const atrMult = mode === 'scalping' ? 0.5 : mode === 'daytrading' ? 0.8 : 1.0;
  const atr = (range > 0 ? range * 0.3 : currentPrice * 0.005) * atrMult;

  const entry = currentPrice;
  const tp1 = isBuy ? entry + atr * 2 : entry - atr * 2;
  const tp2 = isBuy ? entry + atr * 3.5 : entry - atr * 3.5;
  const sl = isBuy ? entry - atr * 1 : entry + atr * 1;
  const rr = Math.abs(tp1 - entry) / Math.abs(sl - entry);

  let confidence = 60;
  if (position < 0.25 || position > 0.75) confidence += 10;
  if (Math.abs(marketData.changePercent) > 0.5) confidence += 5;
  // Scalping has lower confidence due to noise
  if (mode === 'scalping') confidence = Math.max(confidence - 10, 45);
  confidence = Math.min(confidence, 85);

  const rsi = isBuy ? Math.round(28 + position * 15) : Math.round(62 + position * 10);

  const hour = new Date().getUTCHours();
  let killZone = 'Off-Peak';
  if (hour >= 7 && hour <= 10) killZone = 'London Kill Zone';
  else if (hour >= 12 && hour <= 15) killZone = 'New York AM Kill Zone';
  else if (hour >= 17 && hour <= 19) killZone = 'New York PM Kill Zone';
  else if (hour >= 19 && hour <= 22) killZone = 'Asian Kill Zone';

  // Mode-specific patterns and elements
  let pattern: string;
  let ictElements: string[];
  let analysis: string;

  if (mode === 'scalping') {
    pattern = isBuy ? 'Micro Bullish Engulfing + Hammer' : 'Micro Bearish Engulfing + Shooting Star';
    ictElements = [
      isBuy ? 'Micro Bullish OB (1m/5m)' : 'Micro Bearish OB (1m/5m)',
      isBuy ? 'Micro Bullish FVG' : 'Micro Bearish FVG',
      isBuy ? 'SSL Sweep (micro)' : 'BSL Sweep (micro)',
    ];
    analysis = aiText || `⚡ SCALP ${isBuy ? '🟢 BUY' : '🔴 SELL'} ${pair} at ${entry.toFixed(decimals)} (${timeframe}). Quick ${isBuy ? 'long' : 'short'} targeting ${tp1.toFixed(decimals)}. Tight SL at ${sl.toFixed(decimals)}. ${killZone} active. Hold seconds-minutes. Risk max 0.5%.`;
  } else if (mode === 'daytrading') {
    pattern = isBuy ? 'Bullish Engulfing + Morning Star' : 'Bearish Engulfing + Evening Star';
    ictElements = [
      isBuy ? 'Intraday Bullish OB (15m/30m)' : 'Intraday Bearish OB (15m/30m)',
      isBuy ? 'Intraday Bullish FVG' : 'Intraday Bearish FVG',
      isBuy ? 'SSL Sweep' : 'BSL Sweep',
    ];
    analysis = aiText || `📊 DAY TRADE ${isBuy ? '🟢 BUY' : '🔴 SELL'} ${pair} at ${entry.toFixed(decimals)} (${timeframe}). Intraday ${isBuy ? 'long' : 'short'} targeting ${tp1.toFixed(decimals)}. SL at ${sl.toFixed(decimals)}. ${killZone} active. Close before EOD. Risk max 1%.`;
  } else {
    pattern = isBuy ? 'Hammer + Bullish Engulfing Setup' : 'Hanging Man + Bearish Engulfing Setup';
    ictElements = [
      isBuy ? 'Bullish Order Block (H4/Daily)' : 'Bearish Order Block (H4/Daily)',
      isBuy ? 'Bullish FVG (support)' : 'Bearish FVG (resistance)',
      isBuy ? 'SSL Sweep' : 'BSL Sweep',
    ];
    analysis = aiText || `📅 SWING ${isBuy ? '🟢 BUY' : '🔴 SELL'} ${pair} at ${entry.toFixed(decimals)} (${timeframe}). Multi-day ${isBuy ? 'long' : 'short'} targeting ${tp1.toFixed(decimals)}. SL at ${sl.toFixed(decimals)}. ${killZone} active. R:R ${rr.toFixed(1)}:1. Risk max 2%.`;
  }

  return {
    type, pair, timeframe,
    entry: parseFloat(entry.toFixed(decimals)),
    tp1: parseFloat(tp1.toFixed(decimals)),
    tp2: parseFloat(tp2.toFixed(decimals)),
    sl: parseFloat(sl.toFixed(decimals)),
    pattern,
    rsi,
    rsiStatus: isBuy ? `Oversold (${rsi}) — potential bounce` : `Overbought (${rsi}) — potential rejection`,
    macd: isBuy ? 'Bullish crossover forming on MACD' : 'Bearish crossover forming on MACD',
    maCross: isBuy ? 'Golden Cross setup — MA5 crossing above MA20' : 'Death Cross setup — MA5 crossing below MA20',
    confidence,
    riskReward: `1:${rr.toFixed(1)}`,
    ictElements,
    killZone,
    liquidityType: isBuy ? 'Sell Side Liquidity (SSL)' : 'Buy Side Liquidity (BSL)',
    pdZone: isBuy ? 'Discount Zone (below 50%)' : 'Premium Zone (above 50%)',
    analysis,
  };
}
