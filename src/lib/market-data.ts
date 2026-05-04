// Real Market Data Service - Fetches live prices and OHLCV from Yahoo Finance API
// Supports multiple timeframes: M1, M5, M15, M30, H1, H4, D1
// Works on Vercel and any public hosting (no internal SDK required)
//
// Key fix: H4 candles are now PROPERLY AGGREGATED from 1h candles
// (Yahoo Finance doesn't have a 4h interval, so we fetch 1h and combine)

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
}

// Yahoo Finance interval mapping for different timeframes
// H4 uses 1h data that gets aggregated into 4h candles
const YAHOO_INTERVAL_MAP: Record<string, { interval: string; range: string; aggregateTo?: string }> = {
  'M1':  { interval: '1m',  range: '1d' },
  'M5':  { interval: '5m',  range: '5d' },
  'M15': { interval: '15m', range: '10d' },
  'M30': { interval: '30m', range: '10d' },
  'H1':  { interval: '1h',  range: '30d' },
  'H4':  { interval: '1h',  range: '60d', aggregateTo: '4h' },  // Fetch 1h, aggregate to 4h
  'D1':  { interval: '1d',  range: '6mo' },
};

// Price cache (1 minute TTL - reduced for better accuracy)
const priceCache: Record<string, { data: MarketData; expiry: number }> = {};
const CACHE_TTL = 1 * 60 * 1000;

// OHLCV cache (1 minute TTL - short for intraday accuracy)
const ohlcvCache: Record<string, { data: OHLCVData; expiry: number }> = {};
const OHLCV_CACHE_TTL = 1 * 60 * 1000;

// Yahoo Finance symbol mapping
const YAHOO_SYMBOLS: Record<string, string> = {
  'EUR/USD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'USD/JPY': 'USDJPY=X',
  'XAU/USD': 'GC=F',
  'BTC/USD': 'BTC-USD',
  'ETH/USD': 'ETH-USD',
  'US30': 'YM=F',
  'NAS100': 'NQ=F',
  'US500': 'ES=F',
  'GBP/JPY': 'GBPJPY=X',
  'AUD/USD': 'AUDUSD=X',
  'USD/CAD': 'USDCAD=X',
  'NZD/USD': 'NZDUSD=X',
  'USD/CHF': 'USDCHF=X',
  'EUR/GBP': 'EURGBP=X',
};

function isValidPrice(pair: string, price: number): boolean {
  const ranges: Record<string, [number, number]> = {
    'EUR/USD': [0.9, 1.3],
    'GBP/USD': [1.1, 1.5],
    'USD/JPY': [100, 200],
    'XAU/USD': [2000, 6000],
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
  const decimals = pair.includes('JPY') || pair === 'XAU/USD' || pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5;
  const volMap: Record<string, number> = {
    'XAU/USD': 0.008, 'BTC/USD': 0.03, 'ETH/USD': 0.035,
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
  };
}

// ─── Aggregate 1h candles into 4h candles ─────────────────────────────
// Forex 4h candles align to: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC
function aggregateTo4hCandles(candles: OHLCVCandle[]): OHLCVCandle[] {
  if (candles.length === 0) return [];

  // Group candles by their 4-hour block
  const groups: Map<number, OHLCVCandle[]> = new Map();

  for (const candle of candles) {
    const date = new Date(candle.timestamp);
    const hourUTC = date.getUTCHours();
    // Determine which 4-hour block this candle belongs to
    const blockHour = Math.floor(hourUTC / 4) * 4; // 0, 4, 8, 12, 16, 20
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

  // Aggregate each group into a single 4h candle
  const result: OHLCVCandle[] = [];
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => a - b);

  for (const key of sortedKeys) {
    const group = groups.get(key)!;
    if (group.length === 0) continue;

    // Sort group by timestamp
    group.sort((a, b) => a.timestamp - b.timestamp);

    const aggregated: OHLCVCandle = {
      timestamp: key, // Start of the 4h block
      open: group[0].open,              // First candle's open
      high: Math.max(...group.map(c => c.high)),   // Highest high
      low: Math.min(...group.map(c => c.low)),     // Lowest low
      close: group[group.length - 1].close,         // Last candle's close
      volume: group.reduce((sum, c) => sum + (c.volume || 0), 0), // Sum of volumes
    };

    result.push(aggregated);
  }

  return result;
}

// ─── Fetch OHLCV Data for specific timeframe ──────────────────────────
export async function fetchOHLCVData(pair: string, timeframe: string = 'H4'): Promise<OHLCVData> {
  const cacheKey = `${pair}_${timeframe}`;
  const cached = ohlcvCache[cacheKey];
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  const yahooSymbol = YAHOO_SYMBOLS[pair];
  if (!yahooSymbol) {
    return getFallbackOHLCV(pair, timeframe);
  }

  const intervalConfig = YAHOO_INTERVAL_MAP[timeframe] || YAHOO_INTERVAL_MAP['H4'];

  try {
    // Use v8 chart API with includePrePost=false for cleaner data
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
    // Timestamps are in result.timestamp, NOT in indicators.quote[0].timestamp
    const timestamps: number[] = result.timestamp || [];
    const quoteData = result.indicators?.quote?.[0] || {};
    const opens: number[] = quoteData.open || [];
    const highs: number[] = quoteData.high || [];
    const lows: number[] = quoteData.low || [];
    const closes: number[] = quoteData.close || [];
    const volumes: number[] = quoteData.volume || [];

    const currentPrice = meta?.regularMarketPrice;
    if (!currentPrice || !isValidPrice(pair, currentPrice)) {
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
      // Skip null/undefined values
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({
        timestamp: timestamps[i] * 1000, // Convert to milliseconds
        open: o,
        high: h,
        low: l,
        close: c,
        volume: v || 0,
      });
    }

    // ─── KEY FIX: Aggregate 1h candles into 4h candles for H4 timeframe ───
    if (intervalConfig.aggregateTo === '4h' && candles.length > 0) {
      candles = aggregateTo4hCandles(candles);
      console.log(`[Market Data] Aggregated ${candles.length} 4h candles for ${pair} H4`);
    }

    // Determine data delay
    const marketState = meta?.marketState; // "REGULAR", "CLOSED", "PRE", "POST"
    let delay = '~15min';
    if (marketState === 'REGULAR') {
      delay = 'Real-time';
    } else if (marketState === 'CLOSED') {
      delay = 'Market Closed';
    } else if (marketState === 'PRE' || marketState === 'POST') {
      delay = '~15min delayed';
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
      source: intervalConfig.aggregateTo ? `Yahoo Finance (1h→4h aggregated)` : 'Yahoo Finance',
      delay,
    };

    ohlcvCache[cacheKey] = { data: ohlcvData, expiry: Date.now() + OHLCV_CACHE_TTL };
    return ohlcvData;
  } catch (error) {
    console.error(`Yahoo Finance OHLCV fetch failed for ${pair} ${timeframe}:`, error);
    return getFallbackOHLCV(pair, timeframe);
  }
}

// Generate fallback OHLCV data when API fails
function getFallbackOHLCV(pair: string, timeframe: string): OHLCVData {
  // Use realistic base prices
  const basePrices: Record<string, number> = {
    'EUR/USD': 1.08500, 'GBP/USD': 1.27200, 'USD/JPY': 155.50,
    'XAU/USD': 3350.00, 'BTC/USD': 95000, 'ETH/USD': 3500,
    'US30': 42000, 'NAS100': 19500, 'US500': 5600,
    'GBP/JPY': 197.80, 'AUD/USD': 0.64500,
  };

  const currentPrice = basePrices[pair] || 1.0;
  const volMap: Record<string, number> = {
    'XAU/USD': 0.008, 'BTC/USD': 0.03, 'ETH/USD': 0.035,
    'EUR/USD': 0.005, 'GBP/USD': 0.006, 'USD/JPY': 0.006,
    'US30': 0.008, 'NAS100': 0.012, 'US500': 0.008,
  };
  const volatility = volMap[pair] || 0.006;

  // Adjust candle count and range based on timeframe
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

  // Ensure last candle close matches current price
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
  };
}

async function fetchFromYahooFinance(pair: string): Promise<MarketData | null> {
  const yahooSymbol = YAHOO_SYMBOLS[pair];
  if (!yahooSymbol) return null;

  try {
    // Use shorter interval for more accurate current price
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
    const price = meta?.regularMarketPrice;
    if (!price || !isValidPrice(pair, price)) return null;

    const prevClose = meta?.chartPreviousClose || meta?.previousClose || price;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    // Determine delay
    const marketState = meta?.marketState;
    let delay = '~15min';
    if (marketState === 'REGULAR') {
      delay = 'Real-time';
    } else if (marketState === 'CLOSED') {
      delay = 'Market Closed';
    } else if (marketState === 'PRE' || marketState === 'POST') {
      delay = '~15min delayed';
    }

    return buildMarketData(pair, price, 'Yahoo Finance', {
      high: meta?.regularMarketDayHigh || undefined,
      low: meta?.regularMarketDayLow || undefined,
      change: parseFloat(change.toFixed(4)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      delay,
    });
  } catch (error) {
    console.error(`Yahoo Finance fetch failed for ${pair}:`, error);
    return null;
  }
}

// Fallback: Try Twelve Data API (free tier - 800 req/day)
async function fetchFromTwelveData(pair: string): Promise<MarketData | null> {
  const twelveSymbolMap: Record<string, string> = {
    'EUR/USD': 'EUR/USD',
    'GBP/USD': 'GBP/USD',
    'USD/JPY': 'USD/JPY',
    'XAU/USD': 'XAU/USD',
    'BTC/USD': 'BTC/USD',
    'ETH/USD': 'ETH/USD',
    'US30': 'US30',
    'NAS100': 'NAS100',
    'US500': 'US500',
    'GBP/JPY': 'GBP/JPY',
    'AUD/USD': 'AUD/USD',
    'USD/CAD': 'USD/CAD',
    'NZD/USD': 'NZD/USD',
    'USD/CHF': 'USD/CHF',
    'EUR/GBP': 'EUR/GBP',
  };

  const symbol = twelveSymbolMap[pair];
  if (!symbol) return null;

  // Only use if user has a Twelve Data API key
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;

    const data = await response.json();
    const price = parseFloat(data?.price);
    if (isNaN(price) || !isValidPrice(pair, price)) return null;

    return buildMarketData(pair, price, 'Twelve Data', { delay: 'Real-time' });
  } catch (error) {
    console.error(`Twelve Data fetch failed for ${pair}:`, error);
    return null;
  }
}

export async function fetchRealPrice(pair: string): Promise<MarketData> {
  // Check cache first
  const cached = priceCache[pair];
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  // Strategy 1: Yahoo Finance (free, no API key needed)
  const yahooData = await fetchFromYahooFinance(pair);
  if (yahooData) {
    priceCache[pair] = { data: yahooData, expiry: Date.now() + CACHE_TTL };
    return yahooData;
  }

  // Strategy 2: Twelve Data (requires API key)
  const twelveData = await fetchFromTwelveData(pair);
  if (twelveData) {
    priceCache[pair] = { data: twelveData, expiry: Date.now() + CACHE_TTL };
    return twelveData;
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
  };
}

// Fetch multiple prices at once
export async function fetchMultiplePrices(pairs: string[]): Promise<Record<string, MarketData>> {
  const results: Record<string, MarketData> = {};

  // Process in batches of 3 to avoid rate limiting
  for (let i = 0; i < pairs.length; i += 3) {
    const batch = pairs.slice(i, i + 3);
    const promises = batch.map(pair => fetchRealPrice(pair).then(data => ({ pair, data })));
    const batchResults = await Promise.allSettled(promises);

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results[result.value.pair] = result.value.data;
      }
    }

    // Small delay between batches to avoid rate limiting
    if (i + 3 < pairs.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}
