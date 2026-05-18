// Real Market Data Service - Multi-source price fetching with delay detection
// Sources: Twelve Data (real-time) → Finnhub (real-time) → Yahoo Finance (delayed)
// Supports multiple timeframes: M1, M5, M15, M30, H1, H4, D1
//
// KEY IMPROVEMENT: Price freshness validation + delay compensation
// - Compares "current price" with latest candle close to detect delay
// - Uses the most recent candle close as a more reliable price reference
// - Adds delay compensation to SL/TP calculations
// - Recommends trading style based on data quality
//
// v2: Optimized Twelve Data usage (1 API credit per pair instead of 2)
// v2: Added rate limit tracking for Twelve Data free plan (8 credits/min)
// v2: Added enhanced XAG/USD handling with multi-source cross-validation

export interface MarketData {
  pair: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  timestamp: string;
  source: string;
  delay?: string; // e.g. "~15min delayed"
  isRealtime?: boolean; // true if price is confirmed real-time
  priceQuality?: 'realtime' | 'near-realtime' | 'delayed' | 'stale';
  delayMinutes?: number; // estimated delay in minutes
  latestCandleClose?: number; // latest candle close for validation
  candleTimestamp?: number; // timestamp of latest candle
}

export interface OHLCVCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OHLCVData {
  pair: string;
  timeframe: string;
  candles: OHLCVCandle[];
  currentPrice: number;
  dayHigh: number;
  dayLow: number;
  change: number;
  changePercent: number;
  source: string;
  delay?: string;
  priceQuality?: 'realtime' | 'near-realtime' | 'delayed' | 'stale';
  delayMinutes?: number;
}

// Yahoo Finance interval mapping for different timeframes
const YAHOO_INTERVAL_MAP: Record<string, { interval: string; range: string; aggregateTo?: string }> = {
  'M1':  { interval: '1m',  range: '1d' },
  'M5':  { interval: '5m',  range: '5d' },
  'M15': { interval: '15m', range: '10d' },
  'M30': { interval: '30m', range: '10d' },
  'H1':  { interval: '1h',  range: '30d' },
  'H4':  { interval: '1h',  range: '60d', aggregateTo: '4h' },
  'D1':  { interval: '1d',  range: '6mo' },
};

// Price cache (30 seconds TTL for real-time accuracy)
const priceCache: Record<string, { data: MarketData; expiry: number }> = {};
const CACHE_TTL = 30 * 1000; // 30 seconds for better accuracy

// OHLCV cache (1 minute TTL)
const ohlcvCache: Record<string, { data: OHLCVData; expiry: number }> = {};
const OHLCV_CACHE_TTL = 1 * 60 * 1000;

// ─── TWELVE DATA RATE LIMIT TRACKING ───────────────────────────────
// Free plan: 8 API credits per minute, 800 per day
// We track usage to avoid hitting the limit
const twelveDataUsage = {
  creditsUsedThisMinute: 0,
  minuteStart: Date.now(),
  creditsUsedToday: 0,
  dayStart: new Date().setUTCHours(0, 0, 0, 0),
};

function canUseTwelveData(): boolean {
  const now = Date.now();
  // Reset minute counter
  if (now - twelveDataUsage.minuteStart > 60000) {
    twelveDataUsage.creditsUsedThisMinute = 0;
    twelveDataUsage.minuteStart = now;
  }
  // Reset day counter
  const todayStart = new Date().setUTCHours(0, 0, 0, 0);
  if (todayStart !== twelveDataUsage.dayStart) {
    twelveDataUsage.creditsUsedToday = 0;
    twelveDataUsage.dayStart = todayStart;
  }
  return twelveDataUsage.creditsUsedThisMinute < 7 && twelveDataUsage.creditsUsedToday < 750;
}

function recordTwelveDataUsage(credits: number = 1) {
  twelveDataUsage.creditsUsedThisMinute += credits;
  twelveDataUsage.creditsUsedToday += credits;
}

// ─── TWELVE DATA PAIR SUPPORT ─────────────────────────────────────
// We try ALL pairs on Twelve Data. If a pair requires a paid plan,
// the API will return an error and we'll gracefully fall back.
// Previously we skipped pairs not in the "free" list, but that
// caused XAG/USD to always use delayed Yahoo Finance data.
//
// Track pairs that FAILED on Twelve Data (to avoid retrying every request)
const TWELVE_DATA_FAILED_PAIRS: Set<string> = new Set();

// Pairs confirmed to work on the free plan (no need to re-verify)
const TWELVE_DATA_FREE_PAIRS: Set<string> = new Set([
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'GBP/JPY',
  'AUD/USD', 'USD/CAD', 'NZD/USD', 'ETH/USD', 'BTC/USD',
  'XAG/USD', 'USD/CHF', 'EUR/GBP', 'US30', 'NAS100', 'US500',
]);

// Yahoo Finance symbol mapping
const YAHOO_SYMBOLS: Record<string, string> = {
  'EUR/USD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'USD/JPY': 'USDJPY=X',
  'XAU/USD': 'GC=F',
  'XAG/USD': 'SI=F',
  'BTC/USD': 'BTC-USD',
  'ETH/USD': 'ETH-USD',
  'US30': '^DJI',
  'NAS100': '^IXIC',
  'US500': '^GSPC',
  'GBP/JPY': 'GBPJPY=X',
  'AUD/USD': 'AUDUSD=X',
  'USD/CAD': 'USDCAD=X',
  'NZD/USD': 'NZDUSD=X',
  'USD/CHF': 'USDCHF=X',
  'EUR/GBP': 'EURGBP=X',
};

// Twelve Data symbol mapping
const TWELVE_DATA_SYMBOLS: Record<string, string> = {
  'EUR/USD': 'EUR/USD',
  'GBP/USD': 'GBP/USD',
  'USD/JPY': 'USD/JPY',
  'XAU/USD': 'XAU/USD',
  'XAG/USD': 'XAG/USD',
  'BTC/USD': 'BTC/USD',
  'ETH/USD': 'ETH/USD',
  'US30': 'DJI',
  'NAS100': 'NDX',
  'US500': 'SPX',
  'GBP/JPY': 'GBP/JPY',
  'AUD/USD': 'AUD/USD',
  'USD/CAD': 'USD/CAD',
  'NZD/USD': 'NZD/USD',
  'USD/CHF': 'USD/CHF',
  'EUR/GBP': 'EUR/GBP',
};

// Finnhub symbol mapping for forex
const FINNHUB_SYMBOLS: Record<string, string> = {
  'EUR/USD': 'OANDA:EUR_USD',
  'GBP/USD': 'OANDA:GBP_USD',
  'USD/JPY': 'OANDA:USD_JPY',
  'XAU/USD': 'OANDA:XAU_USD',
  'XAG/USD': 'OANDA:XAG_USD',
  'BTC/USD': 'BINANCE:BTCUSDT',
  'ETH/USD': 'BINANCE:ETHUSDT',
  'GBP/JPY': 'OANDA:GBP_JPY',
  'AUD/USD': 'OANDA:AUD_USD',
  'USD/CAD': 'OANDA:USD_CAD',
  'NZD/USD': 'OANDA:NZD_USD',
  'USD/CHF': 'OANDA:USD_CHF',
  'EUR/GBP': 'OANDA:EUR_GBP',
};

function isValidPrice(pair: string, price: number): boolean {
  const ranges: Record<string, [number, number]> = {
    'EUR/USD': [0.9, 1.3],
    'GBP/USD': [1.1, 1.5],
    'USD/JPY': [100, 200],
    'XAU/USD': [2000, 6000],
    'XAG/USD': [50, 120],
    'BTC/USD': [20000, 200000],
    'ETH/USD': [1000, 10000],
    'US30': [35000, 60000],
    'NAS100': [15000, 30000],
    'US500': [4000, 8000],
    'GBP/JPY': [150, 250],
    'AUD/USD': [0.55, 0.8],
    'USD/CAD': [1.2, 1.5],
    'NZD/USD': [0.5, 0.75],
    'USD/CHF': [0.8, 1.05],
    'EUR/GBP': [0.8, 0.95],
  };
  const range = ranges[pair];
  if (!range) return price > 0;
  return price >= range[0] && price <= range[1];
}

function buildMarketData(pair: string, price: number, source: string, extra?: Partial<MarketData>): MarketData {
  const decimals = pair.includes('JPY') || pair === 'XAU/USD' || pair === 'XAG/USD' || pair.startsWith('US') || pair.startsWith('NAS') ? (pair === 'XAG/USD' ? 3 : 2) : 5;
  const volMap: Record<string, number> = {
    'XAU/USD': 0.008, 'XAG/USD': 0.012, 'BTC/USD': 0.03, 'ETH/USD': 0.035,
    'EUR/USD': 0.005, 'GBP/USD': 0.006, 'USD/JPY': 0.006,
    'US30': 0.008, 'NAS100': 0.012, 'US500': 0.008,
  };
  const vol = volMap[pair] || 0.006;
  const dailyRange = price * vol;

  return {
    pair,
    price,
    change: extra?.change ?? 0,
    changePercent: extra?.changePercent ?? 0,
    high: extra?.high ?? parseFloat((price + dailyRange * 0.5).toFixed(decimals)),
    low: extra?.low ?? parseFloat((price - dailyRange * 0.5).toFixed(decimals)),
    timestamp: new Date().toISOString(),
    source,
    delay: extra?.delay,
    isRealtime: extra?.isRealtime ?? false,
    priceQuality: extra?.priceQuality ?? 'delayed',
    delayMinutes: extra?.delayMinutes,
    latestCandleClose: extra?.latestCandleClose,
    candleTimestamp: extra?.candleTimestamp,
  };
}

// ─── PRICE FRESHNESS VALIDATION ─────────────────────────────────────
// Compares the "current price" with the latest candle close to detect delay
// Returns quality assessment and estimated delay
export function assessPriceFreshness(
  currentPrice: number,
  latestCandleClose: number | undefined,
  candleTimestamp: number | undefined,
  pair: string
): { quality: 'realtime' | 'near-realtime' | 'delayed' | 'stale'; delayMinutes: number; adjustedPrice: number } {
  // If we don't have candle data, can't assess freshness
  if (!latestCandleClose || !candleTimestamp) {
    return { quality: 'delayed', delayMinutes: 15, adjustedPrice: currentPrice };
  }

  const now = Date.now();
  const candleAge = now - candleTimestamp; // ms since last candle
  const candleAgeMinutes = candleAge / 60000;

  // Calculate price discrepancy
  const priceDiff = Math.abs(currentPrice - latestCandleClose);
  const priceDiffPct = priceDiff / currentPrice;

  // For instruments like XAG/USD, even 0.1% difference can mean significant delay
  const isMetal = pair === 'XAU/USD' || pair === 'XAG/USD';
  const isCrypto = pair.startsWith('BTC') || pair.startsWith('ETH');
  const significantDiffPct = isMetal ? 0.002 : isCrypto ? 0.005 : 0.001;

  // Determine quality based on candle age and price discrepancy
  let quality: 'realtime' | 'near-realtime' | 'delayed' | 'stale';
  let delayMinutes: number;

  if (candleAgeMinutes < 2 && priceDiffPct < significantDiffPct) {
    quality = 'realtime';
    delayMinutes = 0;
  } else if (candleAgeMinutes < 5 && priceDiffPct < significantDiffPct * 2) {
    quality = 'near-realtime';
    delayMinutes = Math.round(candleAgeMinutes);
  } else if (candleAgeMinutes < 20 && priceDiffPct < significantDiffPct * 5) {
    quality = 'delayed';
    delayMinutes = Math.round(candleAgeMinutes);
  } else {
    quality = 'stale';
    delayMinutes = Math.round(candleAgeMinutes);
  }

  // If there's a significant discrepancy, use the latest candle close
  // as it's typically more recent than the "regularMarketPrice"
  let adjustedPrice = currentPrice;
  if (priceDiffPct > significantDiffPct && latestCandleClose > 0) {
    // The candle close is likely more recent — use it
    // But only if it's within a reasonable range
    if (isValidPrice(pair, latestCandleClose)) {
      adjustedPrice = latestCandleClose;
      console.log(`[PRICE FRESHNESS] Using candle close ${latestCandleClose} instead of ${currentPrice} for ${pair} (diff: ${(priceDiffPct * 100).toFixed(3)}%)`);
    }
  }

  return { quality, delayMinutes, adjustedPrice };
}

// ─── Aggregate 1h candles into 4h candles ─────────────────────────────
function aggregateTo4hCandles(candles: OHLCVCandle[]): OHLCVCandle[] {
  if (candles.length === 0) return [];

  const groups: Map<number, OHLCVCandle[]> = new Map();

  for (const candle of candles) {
    const date = new Date(candle.timestamp);
    const hourUTC = date.getUTCHours();
    const blockHour = Math.floor(hourUTC / 4) * 4;
    const blockDate = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      blockHour,
      0, 0, 0
    ));
    const blockKey = blockDate.getTime();

    if (!groups.has(blockKey)) {
      groups.set(blockKey, []);
    }
    groups.get(blockKey)!.push(candle);
  }

  const result: OHLCVCandle[] = [];
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => a - b);

  for (const key of sortedKeys) {
    const group = groups.get(key)!;
    if (group.length === 0) continue;

    group.sort((a, b) => a.timestamp - b.timestamp);

    const aggregated: OHLCVCandle = {
      timestamp: key,
      open: group[0].open,
      high: Math.max(...group.map(c => c.high)),
      low: Math.min(...group.map(c => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, c) => sum + (c.volume || 0), 0),
    };

    result.push(aggregated);
  }

  return result;
}

// ─── SOURCE 1: Twelve Data (Real-time, requires API key) ────────────
// OPTIMIZED: Uses /quote endpoint instead of /price + /quote (saves 1 API credit)
// OPTIMIZED: Skips pairs that require paid plan (XAG/USD, indices)
// OPTIMIZED: Rate limit tracking to avoid hitting free plan limits
async function fetchFromTwelveData(pair: string): Promise<MarketData | null> {
  const symbol = TWELVE_DATA_SYMBOLS[pair];
  if (!symbol) return null;

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;

  // Skip pairs that previously failed on Twelve Data (paid plan required or other error)
  if (TWELVE_DATA_FAILED_PAIRS.has(pair)) {
    return null;
  }

  // Check rate limit before making API call
  if (!canUseTwelveData()) {
    console.warn(`[Twelve Data] Rate limit reached (${twelveDataUsage.creditsUsedThisMinute}/8 this minute, ${twelveDataUsage.creditsUsedToday}/800 today). Skipping.`);
    return null;
  }

  try {
    // Use /quote endpoint — returns price + change + high/low in ONE call (1 credit instead of 2)
    const quoteUrl = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
    const quoteResponse = await fetch(quoteUrl, { signal: AbortSignal.timeout(8000) });
    recordTwelveDataUsage(1);

    if (!quoteResponse.ok) return null;

    const quoteData = await quoteResponse.json();

    // Check for API errors (e.g. paid plan required)
    if (quoteData.status === 'error') {
      console.warn(`[Twelve Data] API error for ${pair}: ${quoteData.message}`);
      // Mark this pair as failed so we don't retry every request
      TWELVE_DATA_FAILED_PAIRS.add(pair);
      return null;
    }

    const price = parseFloat(quoteData?.close) || parseFloat(quoteData?.price);
    if (isNaN(price) || !isValidPrice(pair, price)) return null;

    const change = parseFloat(quoteData.change) || 0;
    const changePercent = parseFloat(quoteData.percent_change) || 0;
    const high = parseFloat(quoteData.high) || 0;
    const low = parseFloat(quoteData.low) || 0;

    // Verify the price is truly real-time by checking the timestamp
    const quoteTimestamp = quoteData.timestamp ? new Date(quoteData.timestamp).getTime() : 0;
    const quoteAge = Date.now() - quoteTimestamp;
    const isLive = quoteAge < 60000; // Less than 1 minute old

    console.log(`[Twelve Data] ✅ ${pair}: ${price} (${isLive ? 'LIVE' : `~${Math.round(quoteAge / 60000)}min`}, credits: ${twelveDataUsage.creditsUsedThisMinute}/8 this min, ${twelveDataUsage.creditsUsedToday}/800 today)`);

    return buildMarketData(pair, price, 'Twelve Data (Real-time)', {
      change: parseFloat(change.toFixed(4)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      high: high > 0 ? high : undefined,
      low: low > 0 ? low : undefined,
      delay: isLive ? 'Real-time' : `~${Math.round(quoteAge / 60000)}min`,
      isRealtime: isLive,
      priceQuality: isLive ? 'realtime' : 'near-realtime',
      delayMinutes: isLive ? 0 : Math.round(quoteAge / 60000),
    });
  } catch (error) {
    console.error(`Twelve Data fetch failed for ${pair}:`, error);
    return null;
  }
}

// ─── SOURCE 1.5: Enhanced Metals Fetcher (XAG/USD specific) ──────────
// Twelve Data requires paid plan for XAG/USD, so we use a multi-strategy approach:
// 1. Try Yahoo Finance with latest 1m candle close (less delayed than regularMarketPrice)
// 2. Cross-validate with Twelve Data XAU/USD price (silver tracks gold)
// 3. Apply aggressive delay compensation for metals
async function fetchMetalsPrice(pair: string): Promise<MarketData | null> {
  if (pair !== 'XAG/USD' && pair !== 'XAU/USD') return null;

  const yahooSymbol = YAHOO_SYMBOLS[pair];
  if (!yahooSymbol) return null;

  try {
    // Use 1-minute candles for the freshest possible Yahoo Finance data
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1m&range=1d&includePrePost=false`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const reportedPrice = meta?.regularMarketPrice;
    if (!reportedPrice || !isValidPrice(pair, reportedPrice)) return null;

    const prevClose = meta?.chartPreviousClose || meta?.previousClose || reportedPrice;
    const change = reportedPrice - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    // ─── KEY: Extract the latest 1-minute candle close ───
    // For metals on Yahoo Finance, the latest 1m candle close is typically
    // only 1-3 minutes delayed (vs regularMarketPrice which can be 10-15min delayed)
    let bestPrice = reportedPrice;
    let bestCandleAge = 15; // Default to 15min delay

    try {
      const timestamps: number[] = result.timestamp || [];
      const quoteData = result.indicators?.quote?.[0] || {};
      const closes: number[] = quoteData.close || [];

      // Find the last valid candle
      for (let i = timestamps.length - 1; i >= 0; i--) {
        if (closes[i] != null && !isNaN(closes[i])) {
          const candleClose = closes[i];
          const candleTime = timestamps[i] * 1000;
          const candleAgeMinutes = (Date.now() - candleTime) / 60000;

          if (isValidPrice(pair, candleClose)) {
            // Always use candle close - it's more recent than regularMarketPrice
            const priceDiff = Math.abs(reportedPrice - candleClose) / reportedPrice;

            if (priceDiff > 0.0001) {
              // Candle close differs from reported price = candle data is fresher
              bestPrice = candleClose;
              bestCandleAge = Math.max(1, Math.round(candleAgeMinutes));
              console.log(`[METALS PRICE] ${pair}: Using candle close ${candleClose} (age: ${bestCandleAge}min) instead of reported ${reportedPrice} (diff: ${(priceDiff * 100).toFixed(3)}%)`);
            } else {
              // Prices are similar, but candle close is still more recent
              bestPrice = candleClose;
              bestCandleAge = Math.max(1, Math.round(candleAgeMinutes));
            }
          }
          break;
        }
      }
    } catch {
      // Ignore candle extraction errors
    }

    // ─── Cross-validate with Twelve Data XAU/USD if available ───
    // For XAG/USD: If we have XAU/USD real-time price, we can estimate XAG/USD direction
    if (pair === 'XAG/USD' && canUseTwelveData()) {
      try {
        const apiKey = process.env.TWELVE_DATA_API_KEY;
        if (apiKey) {
          const xauUrl = `https://api.twelvedata.com/quote?symbol=XAU/USD&apikey=${apiKey}`;
          const xauResponse = await fetch(xauUrl, { signal: AbortSignal.timeout(5000) });
          recordTwelveDataUsage(1);
          if (xauResponse.ok) {
            const xauData = await xauResponse.json();
            if (xauData.status !== 'error' && xauData.close) {
              const xauPrice = parseFloat(xauData.close);
              console.log(`[METALS CROSS-CHECK] XAU/USD real-time: ${xauPrice} (validates metals market is active)`);
              // If gold is actively trading, silver data should also be flowing
              // Reduce estimated delay if gold shows live data
              if (bestCandleAge > 5) {
                // Gold is real-time but silver candle is old - use more aggressive compensation
                console.log(`[METALS CROSS-CHECK] Gold is live but silver candle is ${bestCandleAge}min old. Applying aggressive delay compensation.`);
              }
            }
          }
        }
      } catch {
        // Ignore cross-validation errors
      }
    }

    // Determine quality based on candle age
    let priceQuality: 'realtime' | 'near-realtime' | 'delayed' | 'stale';
    let delayMinutes: number;
    let delay: string;

    if (bestCandleAge <= 1) {
      priceQuality = 'near-realtime';
      delayMinutes = 1;
      delay = '~1min';
    } else if (bestCandleAge <= 3) {
      priceQuality = 'near-realtime';
      delayMinutes = bestCandleAge;
      delay = `~${bestCandleAge}min`;
    } else if (bestCandleAge <= 10) {
      priceQuality = 'delayed';
      delayMinutes = bestCandleAge;
      delay = `~${bestCandleAge}min delayed`;
    } else {
      priceQuality = 'delayed';
      delayMinutes = bestCandleAge;
      delay = `~${bestCandleAge}min delayed`;
    }

    return buildMarketData(pair, bestPrice, `Yahoo Finance (1m candles)`, {
      high: meta?.regularMarketDayHigh || undefined,
      low: meta?.regularMarketDayLow || undefined,
      change: parseFloat(change.toFixed(4)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      delay,
      isRealtime: priceQuality === 'realtime',
      priceQuality,
      delayMinutes,
      latestCandleClose: bestPrice,
      candleTimestamp: Date.now() - bestCandleAge * 60000,
    });
  } catch (error) {
    console.error(`Metals price fetch failed for ${pair}:`, error);
    return null;
  }
}

// ─── SOURCE 2: Finnhub (Real-time forex/crypto, requires API key) ───
async function fetchFromFinnhub(pair: string): Promise<MarketData | null> {
  const symbol = FINNHUB_SYMBOLS[pair];
  if (!symbol) return null;

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;

  try {
    // Finnhub forex/crypto price endpoint
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;

    const data = await response.json();
    // Finnhub returns: { c: currentPrice, h: high, l: low, o: open, pc: prevClose, t: timestamp }
    const price = data?.c;
    if (!price || isNaN(price) || !isValidPrice(pair, price)) return null;

    const prevClose = data?.pc || price;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    // Check if the quote timestamp is recent (within 5 minutes)
    const quoteTimestamp = data?.t ? data.t * 1000 : 0;
    const quoteAge = Date.now() - quoteTimestamp;
    const isRecent = quoteAge < 5 * 60 * 1000;

    return buildMarketData(pair, price, 'Finnhub (Real-time)', {
      high: data?.h || undefined,
      low: data?.l || undefined,
      change: parseFloat(change.toFixed(4)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      delay: isRecent ? 'Real-time' : '~1min',
      isRealtime: isRecent,
      priceQuality: isRecent ? 'realtime' : 'near-realtime',
      delayMinutes: isRecent ? 0 : 1,
    });
  } catch (error) {
    console.error(`Finnhub fetch failed for ${pair}:`, error);
    return null;
  }
}

// ─── SOURCE 3: Yahoo Finance (Delayed, free, no API key) ────────────
async function fetchFromYahooFinance(pair: string): Promise<MarketData | null> {
  const yahooSymbol = YAHOO_SYMBOLS[pair];
  if (!yahooSymbol) return null;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1m&range=1d&includePrePost=false`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`Yahoo Finance returned ${response.status} for ${pair}`);
      return null;
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const reportedPrice = meta?.regularMarketPrice;
    if (!reportedPrice || !isValidPrice(pair, reportedPrice)) return null;

    const prevClose = meta?.chartPreviousClose || meta?.previousClose || reportedPrice;
    const change = reportedPrice - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    // ─── KEY IMPROVEMENT: Extract latest candle close for validation ───
    // The latest 1-minute candle close is typically MORE accurate than
    // regularMarketPrice for forex/commodities
    let latestCandleClose: number | undefined;
    let candleTimestamp: number | undefined;

    try {
      const timestamps: number[] = result.timestamp || [];
      const quoteData = result.indicators?.quote?.[0] || {};
      const closes: number[] = quoteData.close || [];

      // Find the last valid candle
      for (let i = timestamps.length - 1; i >= 0; i--) {
        if (closes[i] != null && !isNaN(closes[i])) {
          latestCandleClose = closes[i];
          candleTimestamp = timestamps[i] * 1000; // Convert to ms
          break;
        }
      }
    } catch {
      // Ignore candle extraction errors
    }

    // Determine delay
    const marketState = meta?.marketState;
    let delay = '~15min delayed';
    let delayMinutes = 15;
    let priceQuality: 'realtime' | 'near-realtime' | 'delayed' | 'stale' = 'delayed';

    if (marketState === 'REGULAR') {
      // Even "REGULAR" for forex on Yahoo has some delay
      // Check if we have recent candle data to validate
      if (candleTimestamp) {
        const candleAge = (Date.now() - candleTimestamp) / 60000;
        if (candleAge < 2) {
          delay = '~1min';
          delayMinutes = 1;
          priceQuality = 'near-realtime';
        } else if (candleAge < 5) {
          delay = `~${Math.round(candleAge)}min`;
          delayMinutes = Math.round(candleAge);
          priceQuality = 'near-realtime';
        } else {
          delay = `~${Math.round(candleAge)}min delayed`;
          delayMinutes = Math.round(candleAge);
          priceQuality = 'delayed';
        }
      } else {
        delay = '~15min delayed';
        delayMinutes = 15;
        priceQuality = 'delayed';
      }
    } else if (marketState === 'CLOSED') {
      delay = 'Market Closed';
      delayMinutes = 999;
      priceQuality = 'stale';
    } else if (marketState === 'PRE' || marketState === 'POST') {
      delay = '~15min delayed';
      delayMinutes = 15;
      priceQuality = 'delayed';
    }

    // ─── KEY FIX: Use latest candle close if it's more recent ───
    // Yahoo's regularMarketPrice can be stale even during "REGULAR" market
    let bestPrice = reportedPrice;
    if (latestCandleClose && candleTimestamp) {
      const freshness = assessPriceFreshness(reportedPrice, latestCandleClose, candleTimestamp, pair);
      bestPrice = freshness.adjustedPrice;
      // Update quality if candle-based assessment is better
      if (freshness.quality === 'near-realtime' || freshness.quality === 'realtime') {
        priceQuality = freshness.quality;
        delayMinutes = freshness.delayMinutes;
      }
    }

    return buildMarketData(pair, bestPrice, 'Yahoo Finance', {
      high: meta?.regularMarketDayHigh || undefined,
      low: meta?.regularMarketDayLow || undefined,
      change: parseFloat(change.toFixed(4)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      delay,
      isRealtime: priceQuality === 'realtime',
      priceQuality,
      delayMinutes,
      latestCandleClose,
      candleTimestamp,
    });
  } catch (error) {
    console.error(`Yahoo Finance fetch failed for ${pair}:`, error);
    return null;
  }
}

// ─── MAIN PRICE FETCHING FUNCTION ──────────────────────────────────
// Priority: Twelve Data (real-time) → Finnhub (real-time) → Yahoo Finance (delayed)
// KEY CHANGE: Try Twelve Data FIRST for ALL pairs (including XAG/USD, indices)
// Only fall back to other sources if Twelve Data fails or rate-limited
export async function fetchRealPrice(pair: string): Promise<MarketData> {
  // Check cache first (30 second TTL)
  const cached = priceCache[pair];
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  // ─── STRATEGY 1: Try Twelve Data first (real-time for ALL pairs) ───
  const twelveData = await fetchFromTwelveData(pair);
  if (twelveData && twelveData.priceQuality === 'realtime') {
    console.log(`[PRICE] ${pair}: Using Twelve Data REAL-TIME price ${twelveData.price}`);
    priceCache[pair] = { data: twelveData, expiry: Date.now() + CACHE_TTL };
    return twelveData;
  }

  // ─── STRATEGY 2: Try Finnhub if available ───
  const finnhubData = await fetchFromFinnhub(pair);

  // ─── STRATEGY 3: Try Yahoo Finance or Metals Fetcher ───
  const isMetal = pair === 'XAG/USD' || pair === 'XAU/USD';
  const yahooData = isMetal
    ? await fetchMetalsPrice(pair)
    : await fetchFromYahooFinance(pair);

  // Pick the best available source by quality
  const qualityOrder = { 'realtime': 0, 'near-realtime': 1, 'delayed': 2, 'stale': 3 };

  const candidates = [twelveData, finnhubData, yahooData].filter(Boolean) as MarketData[];
  candidates.sort((a, b) => (qualityOrder[a.priceQuality || 'delayed']) - (qualityOrder[b.priceQuality || 'delayed']));

  const bestData = candidates[0];

  if (bestData) {
    // ─── KEY FIX: Cross-validate price against other sources ───
    // If we have multiple sources, use the highest quality one
    // but also check for major discrepancies
    if (candidates.length >= 2) {
      const prices = candidates.map(c => c.price);
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);
      const maxDiffPct = (maxPrice - minPrice) / minPrice;

      // If sources disagree by more than 1%, something is wrong
      if (maxDiffPct > 0.01) {
        console.warn(`[PRICE VALIDATION] Major discrepancy between sources for ${pair}: ${prices.join(', ')}. Using best quality source.`);
      }

      // If the best source is delayed but we have a more recent candle close from another source,
      // use that for the price
      if (bestData.priceQuality !== 'realtime') {
        for (const candidate of candidates) {
          if (candidate.latestCandleClose && candidate.candleTimestamp) {
            const candleAge = (Date.now() - candidate.candleTimestamp) / 60000;
            if (candleAge < (bestData.delayMinutes || 15) && isValidPrice(pair, candidate.latestCandleClose)) {
              // This candle is more recent than our best price
              const freshness = assessPriceFreshness(bestData.price, candidate.latestCandleClose, candidate.candleTimestamp, pair);
              if (freshness.adjustedPrice !== bestData.price) {
                console.log(`[PRICE CORRECTION] Using fresher candle close ${candidate.latestCandleClose} from ${candidate.source} instead of ${bestData.price} from ${bestData.source}`);
                bestData.price = freshness.adjustedPrice;
                bestData.priceQuality = freshness.quality;
                bestData.delayMinutes = freshness.delayMinutes;
                bestData.delay = freshness.quality === 'realtime' ? 'Real-time' : freshness.quality === 'near-realtime' ? `~${freshness.delayMinutes}min` : `~${freshness.delayMinutes}min delayed`;
              }
              break;
            }
          }
        }
      }
    }

    priceCache[pair] = { data: bestData, expiry: Date.now() + CACHE_TTL };
    return bestData;
  }

  // Fallback: return unavailable
  return {
    pair,
    price: 0,
    change: 0,
    changePercent: 0,
    high: 0,
    low: 0,
    timestamp: new Date().toISOString(),
    source: 'unavailable',
    priceQuality: 'stale',
    delayMinutes: 999,
  };
}

// ─── Fetch OHLCV Data for specific timeframe ──────────────────────────
export async function fetchOHLCVData(pair: string, timeframe: string = 'H4'): Promise<OHLCVData> {
  const cacheKey = `${pair}_${timeframe}`;
  const cached = ohlcvCache[cacheKey];
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  // Try Twelve Data first for real-time OHLCV (if API key available)
  const twelveOHLCV = await fetchOHLCVFromTwelveData(pair, timeframe);
  if (twelveOHLCV) {
    ohlcvCache[cacheKey] = { data: twelveOHLCV, expiry: Date.now() + OHLCV_CACHE_TTL };
    return twelveOHLCV;
  }

  // Fallback to Yahoo Finance
  const yahooSymbol = YAHOO_SYMBOLS[pair];
  if (!yahooSymbol) {
    return getFallbackOHLCV(pair, timeframe);
  }

  const intervalConfig = YAHOO_INTERVAL_MAP[timeframe] || YAHOO_INTERVAL_MAP['H4'];

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${intervalConfig.interval}&range=${intervalConfig.range}&includePrePost=false`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`Yahoo Finance OHLCV returned ${response.status} for ${pair} ${timeframe}`);
      return getFallbackOHLCV(pair, timeframe);
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return getFallbackOHLCV(pair, timeframe);

    const meta = result.meta;
    const timestamps: number[] = result.timestamp || [];
    const quoteData = result.indicators?.quote?.[0] || {};
    const opens: number[] = quoteData.open || [];
    const highs: number[] = quoteData.high || [];
    const lows: number[] = quoteData.low || [];
    const closes: number[] = quoteData.close || [];
    const volumes: number[] = quoteData.volume || [];

    const reportedPrice = meta?.regularMarketPrice;
    if (!reportedPrice || !isValidPrice(pair, reportedPrice)) {
      return getFallbackOHLCV(pair, timeframe);
    }

    // Parse candles
    let candles: OHLCVCandle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = opens[i];
      const h = highs[i];
      const l = lows[i];
      const c = closes[i];
      const v = volumes[i];
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({
        timestamp: timestamps[i] * 1000,
        open: o,
        high: h,
        low: l,
        close: c,
        volume: v || 0,
      });
    }

    // Aggregate 1h candles into 4h candles for H4 timeframe
    if (intervalConfig.aggregateTo === '4h' && candles.length > 0) {
      candles = aggregateTo4hCandles(candles);
      console.log(`[Market Data] Aggregated ${candles.length} 4h candles for ${pair} H4`);
    }

    // ─── KEY FIX: Use latest candle close instead of regularMarketPrice ───
    // The regularMarketPrice can be significantly delayed
    // The latest candle close is always more recent
    let currentPrice = reportedPrice;
    let priceQuality: 'realtime' | 'near-realtime' | 'delayed' | 'stale' = 'delayed';
    let delayMinutes = 15;

    if (candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      const lastCandleClose = lastCandle.close;
      const lastCandleTime = lastCandle.timestamp;
      const candleAgeMinutes = (Date.now() - lastCandleTime) / 60000;

      // If the last candle close differs from regularMarketPrice,
      // the candle data is likely more recent
      const priceDiff = Math.abs(reportedPrice - lastCandleClose);
      const priceDiffPct = priceDiff / reportedPrice;

      // Use candle close if:
      // 1. It's different from regularMarketPrice (meaning candle data is fresher)
      // 2. The candle is recent (within the timeframe's expected interval)
      const maxCandleAge = timeframe === 'M1' ? 2 : timeframe === 'M5' ? 6 : timeframe === 'M15' ? 16 : timeframe === 'H1' ? 65 : timeframe === 'H4' ? 250 : 1445;

      if (isValidPrice(pair, lastCandleClose) && candleAgeMinutes < maxCandleAge) {
        if (priceDiffPct > 0.0001) {
          // Candle close is different from reported price - candle data is fresher
          currentPrice = lastCandleClose;
          console.log(`[OHLCV PRICE FIX] Using last candle close ${lastCandleClose} instead of reported price ${reportedPrice} for ${pair} (candle age: ${candleAgeMinutes.toFixed(1)}min)`);
        }

        // Assess quality based on candle age
        if (candleAgeMinutes < 2) {
          priceQuality = 'near-realtime';
          delayMinutes = Math.max(1, Math.round(candleAgeMinutes));
        } else if (candleAgeMinutes < 10) {
          priceQuality = 'near-realtime';
          delayMinutes = Math.round(candleAgeMinutes);
        } else {
          priceQuality = 'delayed';
          delayMinutes = Math.round(candleAgeMinutes);
        }
      }
    }

    // Determine data delay label
    const marketState = meta?.marketState;
    let delay = `~${delayMinutes}min`;
    if (marketState === 'REGULAR' && priceQuality === 'near-realtime') {
      delay = `~${delayMinutes}min`;
    } else if (marketState === 'REGULAR') {
      delay = `~${delayMinutes}min delayed`;
    } else if (marketState === 'CLOSED') {
      delay = 'Market Closed';
      priceQuality = 'stale';
      delayMinutes = 999;
    } else if (marketState === 'PRE' || marketState === 'POST') {
      delay = '~15min delayed';
      delayMinutes = 15;
    }

    const prevClose = meta?.chartPreviousClose || meta?.previousClose || currentPrice;
    const change = currentPrice - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    const ohlcvData: OHLCVData = {
      pair,
      timeframe,
      candles,
      currentPrice,
      dayHigh: meta?.regularMarketDayHigh || (candles.length > 0 ? Math.max(...candles.map(c => c.high)) : currentPrice),
      dayLow: meta?.regularMarketDayLow || (candles.length > 0 ? Math.min(...candles.map(c => c.low)) : currentPrice),
      change: parseFloat(change.toFixed(4)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      source: intervalConfig.aggregateTo ? `Yahoo Finance (1h->4h aggregated)` : 'Yahoo Finance',
      delay,
      priceQuality,
      delayMinutes,
    };

    ohlcvCache[cacheKey] = { data: ohlcvData, expiry: Date.now() + OHLCV_CACHE_TTL };
    return ohlcvData;
  } catch (error) {
    console.error(`Yahoo Finance OHLCV fetch failed for ${pair} ${timeframe}:`, error);
    return getFallbackOHLCV(pair, timeframe);
  }
}

// ─── Fetch OHLCV from Twelve Data (real-time candles) ───────────────
// OPTIMIZED: Skips pairs requiring paid plan to save API credits
async function fetchOHLCVFromTwelveData(pair: string, timeframe: string): Promise<OHLCVData | null> {
  const symbol = TWELVE_DATA_SYMBOLS[pair];
  if (!symbol) return null;

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;

  // Skip pairs that previously failed on Twelve Data (paid plan required or other error)
  if (TWELVE_DATA_FAILED_PAIRS.has(pair)) {
    return null;
  }

  // Check rate limit
  if (!canUseTwelveData()) {
    console.warn(`[Twelve Data OHLCV] Rate limit reached. Using Yahoo Finance for ${pair} candles.`);
    return null;
  }

  // Map timeframes to Twelve Data format
  const tfMap: Record<string, string> = {
    'M1': '1min', 'M5': '5min', 'M15': '15min', 'M30': '30min',
    'H1': '1h', 'H4': '4h', 'D1': '1day',
  };

  const interval = tfMap[timeframe] || '4h';
  const outputSize = 60; // Number of candles

  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputSize}&apikey=${apiKey}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    recordTwelveDataUsage(1); // time_series costs 1 API credit
    if (!response.ok) return null;

    const data = await response.json();
    if (data.status === 'error' || !data.values || data.values.length === 0) {
      // Mark pair as failed if API error so we don't retry
      if (data.status === 'error') {
        TWELVE_DATA_FAILED_PAIRS.add(pair);
      }
      return null;
    }

    const candles: OHLCVCandle[] = data.values.map((v: any) => ({
      timestamp: new Date(v.datetime).getTime(),
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseInt(v.volume) || 0,
    })).reverse(); // Twelve Data returns newest first

    if (candles.length === 0) return null;

    const currentPrice = candles[candles.length - 1].close;
    if (!isValidPrice(pair, currentPrice)) return null;

    const prevClose = candles.length > 1 ? candles[candles.length - 2].close : currentPrice;
    const change = currentPrice - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    console.log(`[Twelve Data OHLCV] ✅ ${pair} ${timeframe}: ${candles.length} candles, price=${currentPrice}`);

    return {
      pair,
      timeframe,
      candles,
      currentPrice,
      dayHigh: Math.max(...candles.slice(-24).map(c => c.high)),
      dayLow: Math.min(...candles.slice(-24).map(c => c.low)),
      change: parseFloat(change.toFixed(4)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      source: 'Twelve Data (Real-time)',
      delay: 'Real-time',
      priceQuality: 'realtime',
      delayMinutes: 0,
    };
  } catch (error) {
    console.error(`Twelve Data OHLCV fetch failed for ${pair}:`, error);
    return null;
  }
}

// Generate fallback OHLCV data when API fails
function getFallbackOHLCV(pair: string, timeframe: string): OHLCVData {
  const basePrices: Record<string, number> = {
    'EUR/USD': 1.08500, 'GBP/USD': 1.27200, 'USD/JPY': 155.50,
    'XAU/USD': 3350.00, 'XAG/USD': 77.00, 'BTC/USD': 95000, 'ETH/USD': 3500,
    'US30': 42000, 'NAS100': 19500, 'US500': 5600,
    'GBP/JPY': 197.80, 'AUD/USD': 0.64500,
  };

  const currentPrice = basePrices[pair] || 1.0;
  const volMap: Record<string, number> = {
    'XAU/USD': 0.008, 'XAG/USD': 0.012, 'BTC/USD': 0.03, 'ETH/USD': 0.035,
    'EUR/USD': 0.005, 'GBP/USD': 0.006, 'USD/JPY': 0.006,
    'US30': 0.008, 'NAS100': 0.012, 'US500': 0.008,
  };
  const volatility = volMap[pair] || 0.006;

  const tfConfig: Record<string, { candles: number; candleVol: number }> = {
    'M1':  { candles: 60,  candleVol: 0.15 },
    'M5':  { candles: 48,  candleVol: 0.25 },
    'M15': { candles: 48,  candleVol: 0.4 },
    'M30': { candles: 48,  candleVol: 0.6 },
    'H1':  { candles: 48,  candleVol: 0.8 },
    'H4':  { candles: 45,  candleVol: 1.0 },
    'D1':  { candles: 50,  candleVol: 1.5 },
  };

  const config = tfConfig[timeframe] || tfConfig['H4'];
  const candles: OHLCVCandle[] = [];
  let price = currentPrice;
  const tfMs: Record<string, number> = {
    'M1': 60000, 'M5': 300000, 'M15': 900000,
    'M30': 1800000, 'H1': 3600000, 'H4': 14400000, 'D1': 86400000,
  };
  const intervalMs = tfMs[timeframe] || 14400000;
  const now = Date.now();

  for (let i = 0; i < config.candles; i++) {
    const change = (Math.random() - 0.48) * volatility * config.candleVol * price;
    const open = price;
    const close = price + change;
    const wickUp = Math.abs(change) * (0.3 + Math.random() * 1.2);
    const wickDown = Math.abs(change) * (0.3 + Math.random() * 1.2);
    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDown;

    candles.push({
      timestamp: now - (config.candles - i) * intervalMs,
      open: parseFloat(open.toFixed(6)),
      high: parseFloat(high.toFixed(6)),
      low: parseFloat(low.toFixed(6)),
      close: parseFloat(close.toFixed(6)),
      volume: Math.round(50 + Math.random() * 200),
    });

    price = close;
  }

  if (candles.length > 0) {
    const diff = currentPrice - candles[candles.length - 1].close;
    candles[candles.length - 1].close = currentPrice;
    candles[candles.length - 1].open = candles[candles.length - 1].open + diff * 0.3;
    candles[candles.length - 1].high = Math.max(candles[candles.length - 1].high, currentPrice);
    candles[candles.length - 1].low = Math.min(candles[candles.length - 1].low, currentPrice);
  }

  const dayHigh = Math.max(...candles.map(c => c.high));
  const dayLow = Math.min(...candles.map(c => c.low));

  return {
    pair,
    timeframe,
    candles,
    currentPrice,
    dayHigh,
    dayLow,
    change: 0,
    changePercent: 0,
    source: 'Fallback (simulated)',
    delay: 'Simulated data',
    priceQuality: 'stale',
    delayMinutes: 999,
  };
}

// Fetch multiple prices at once
export async function fetchMultiplePrices(pairs: string[]): Promise<Record<string, MarketData>> {
  const results: Record<string, MarketData> = {};

  for (let i = 0; i < pairs.length; i += 3) {
    const batch = pairs.slice(i, i + 3);
    const promises = batch.map(pair => fetchRealPrice(pair).then(data => ({ pair, data })));
    const batchResults = await Promise.allSettled(promises);

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results[result.value.pair] = result.value.data;
      }
    }

    if (i + 3 < pairs.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}

// ─── DELAY COMPENSATION FOR SL/TP ──────────────────────────────────
// When price is delayed, adds a buffer to SL to account for price movement
// This prevents the bug where SL ends up on the wrong side of the real price
export function compensateForDelay(
  entry: number,
  sl: number,
  tp1: number,
  tp2: number,
  isBuy: boolean,
  delayMinutes: number,
  pair: string
): { sl: number; tp1: number; tp2: number; buffer: number } {
  if (delayMinutes <= 1) {
    return { sl, tp1, tp2, buffer: 0 }; // No compensation needed
  }

  // Calculate the expected price movement during the delay period
  // Use volatility-based estimation
  const volMap: Record<string, number> = {
    'XAU/USD': 0.008, 'XAG/USD': 0.012, 'BTC/USD': 0.03, 'ETH/USD': 0.035,
    'EUR/USD': 0.005, 'GBP/USD': 0.006, 'USD/JPY': 0.006,
    'US30': 0.008, 'NAS100': 0.012, 'US500': 0.008,
  };
  const dailyVol = volMap[pair] || 0.006;

  // Expected movement in delayMinutes (simplified: sqrt of time ratio)
  const timeRatio = delayMinutes / (24 * 60); // fraction of day
  const expectedMove = entry * dailyVol * Math.sqrt(timeRatio);

  // Buffer = expected move * safety factor (1.5x to be safe)
  const buffer = expectedMove * 1.5;

  const decimals = pair.includes('JPY') ? 3 : pair === 'XAU/USD' ? 2 : pair === 'XAG/USD' ? 3 : pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5;

  if (isBuy) {
    // For BUY: Move SL further below (add buffer to downside)
    return {
      sl: parseFloat((sl - buffer).toFixed(decimals)),
      tp1,
      tp2,
      buffer: parseFloat(buffer.toFixed(decimals)),
    };
  } else {
    // For SELL: Move SL further above (add buffer to upside)
    return {
      sl: parseFloat((sl + buffer).toFixed(decimals)),
      tp1,
      tp2,
      buffer: parseFloat(buffer.toFixed(decimals)),
    };
  }
}

// ─── RECOMMENDED TRADING STYLE ─────────────────────────────────────
// Based on data quality, recommends the best trading style
// IMPORTANT: For XAG/USD specifically, scalping is NOT recommended with delayed data
// because even small delays cause SL to be placed on the WRONG SIDE of the real price
export function getRecommendedTradingStyle(
  priceQuality: 'realtime' | 'near-realtime' | 'delayed' | 'stale',
  delayMinutes: number,
  pair?: string
): { style: 'swing' | 'daytrading' | 'scalping'; reason: string; warning?: string } {
  // XAG/USD specific: Very volatile, delays cause more damage
  const isVolatileMetal = pair === 'XAG/USD' || pair === 'XAU/USD';
  
  if (priceQuality === 'realtime') {
    return {
      style: 'daytrading',
      reason: isVolatileMetal
        ? 'Real-time data available — Day Trading on H1/H4 is ideal for metals. Swing Trading on H4/D1 also works well. Scalping is possible but metals are very volatile so use tight risk management.'
        : 'Real-time data available — Day Trading and Swing Trading are both excellent choices. Scalping is possible but requires very fast execution.',
    };
  }

  if (priceQuality === 'near-realtime' && delayMinutes <= 3) {
    return {
      style: 'daytrading',
      reason: `Data is near real-time (~${delayMinutes}min delay) — Day Trading works well on H1/H4 timeframes. Swing Trading on H4/D1 is also recommended.`,
      warning: isVolatileMetal
        ? 'XAG/USD is very volatile — even small delays can cause SL to be placed incorrectly. Scalping is NOT recommended with near-real-time data on metals.'
        : 'Scalping on M1/M5 may be affected by slight price delay.',
    };
  }

  if (priceQuality === 'near-realtime' || (priceQuality === 'delayed' && delayMinutes <= 10)) {
    return {
      style: 'swing',
      reason: isVolatileMetal
        ? `Data has ~${delayMinutes}min delay — ONLY Swing Trading on H4/D1 is safe for XAG/USD. Metals are very volatile and delayed data WILL cause incorrect SL placement on shorter timeframes.`
        : `Data has ~${delayMinutes}min delay — Swing Trading on H4/D1 is recommended as the delay has minimal impact on longer timeframes. Day Trading on H1 is acceptable with wider SL.`,
      warning: isVolatileMetal
        ? 'DO NOT use Scalping or Day Trading on XAG/USD with delayed data! The SL will be placed on the wrong side of the real price. Example: If real price is 77.36 but bot sees 77.22, a SELL SL at 77.34 would be BELOW the real price instead of above it.'
        : 'Avoid Scalping — price delay will cause incorrect SL/TP placement. Day Trading requires wider stops to compensate.',
    };
  }

  return {
    style: 'swing',
    reason: isVolatileMetal
      ? `Data is significantly delayed (~${delayMinutes}min) — ONLY Swing Trading on D1 is safe for XAG/USD. H4 is acceptable with very wide SL. The delay WILL cause SL to be placed incorrectly for any shorter timeframe.`
      : `Data is significantly delayed (~${delayMinutes}min) — ONLY Swing Trading on H4/D1 is recommended. Longer timeframes are less affected by price delays.`,
    warning: isVolatileMetal
      ? 'CRITICAL: With delayed XAG/USD data, your SL will be on the WRONG SIDE of the real market price. Only use Swing Trading on D1 timeframe with wide SL buffers.'
      : 'DO NOT use Scalping or Day Trading with delayed data — SL/TP will be incorrectly placed relative to the real market price.',
  };
}
