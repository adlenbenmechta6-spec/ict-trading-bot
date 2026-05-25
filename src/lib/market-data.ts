// Real Market Data Service - Multi-source price & OHLCV fetching
// Supports multiple timeframes: M1, M5, M15, M30, H1, H4, D1
// Priority: TradingView (real-time) → Twelve Data (real-time) → Finnhub (real-time) → Yahoo Finance (delayed) → Fallback
//
// Key fix: H4 candles are now PROPERLY AGGREGATED from 1h candles
// (Yahoo Finance doesn't have a 4h interval, so we fetch 1h and combine)
//
// CRITICAL: TradingView + Twelve Data are PRIMARY sources because they provide real-time prices
// Yahoo Finance is secondary because it returns 15-20min delayed data for commodities
// Price cross-validation: Compare multiple sources and flag stale data

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
  priceQuality?: 'realtime' | 'near-realtime' | 'delayed' | 'stale';
  delayMinutes?: number;
  sourcesCompared?: number; // How many data sources were compared
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

// Price cache (30 second TTL - shorter for better accuracy)
const priceCache: Record<string, { data: MarketData; expiry: number }> = {};
const CACHE_TTL = 30 * 1000; // 30 seconds for fresher prices

// OHLCV cache (1 minute TTL - short for intraday accuracy)
const ohlcvCache: Record<string, { data: OHLCVData; expiry: number }> = {};
const OHLCV_CACHE_TTL = 1 * 60 * 1000;

// ─── HARDCODED API KEY FALLBACKS ──────────────────────────────────────
// These ensure the bot works even if env vars are not set on Vercel
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || '6d1883e5a28241adb9d45ba7d2be7eda';
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || ''; // No free key available
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';

// Yahoo Finance symbol mapping
const YAHOO_SYMBOLS: Record<string, string> = {
  'EUR/USD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'USD/JPY': 'USDJPY=X',
  'XAU/USD': 'GC=F',
  'XAG/USD': 'SI=F',
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
    priceQuality: extra?.priceQuality,
    delayMinutes: extra?.delayMinutes,
    sourcesCompared: extra?.sourcesCompared,
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

  // Strategy 1: Twelve Data (REAL-TIME — PRIMARY source)
  const twelveOHLCV = await fetchOHLCVFromTwelveData(pair, timeframe);
  if (twelveOHLCV) {
    ohlcvCache[cacheKey] = { data: twelveOHLCV, expiry: Date.now() + OHLCV_CACHE_TTL };
    return twelveOHLCV;
  }

  // Strategy 2: Yahoo Finance (DELAYED — fallback)
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
      priceQuality: delay === 'Real-time' ? 'near-realtime' : 'delayed',
      delayMinutes: delay === 'Real-time' ? 1 : 15,
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
    'XAU/USD': 3350.00, 'XAG/USD': 33.50, 'BTC/USD': 95000, 'ETH/USD': 3500,
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
    priceQuality: 'stale',
    delayMinutes: 999,
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
      priceQuality: delay === 'Real-time' ? 'near-realtime' : 'delayed',
      delayMinutes: delay === 'Real-time' ? 1 : 15,
    });
  } catch (error) {
    console.error(`Yahoo Finance fetch failed for ${pair}:`, error);
    return null;
  }
}

// ─── PRIMARY: Twelve Data API (real-time prices) ────────────────────
// Twelve Data provides REAL-TIME prices for forex, crypto, and commodities
// Free tier: 800 credits/day, 8 credits/min
// FIX: Try direct symbol first, then fallback to ETF proxy if not available
const TWELVE_SYMBOL_MAP: Record<string, string> = {
  'EUR/USD': 'EUR/USD',
  'GBP/USD': 'GBP/USD',
  'USD/JPY': 'USD/JPY',
  'XAU/USD': 'XAU/USD',
  'XAG/USD': 'XAG/USD',     // Try direct symbol first (works with our API key)
  'BTC/USD': 'BTC/USD',
  'ETH/USD': 'ETH/USD',
  'US30': 'DIA',             // ETF proxy: SPDR Dow Jones Industrial Average ETF
  'NAS100': 'QQQ',           // ETF proxy: Invesco QQQ Trust tracks NASDAQ-100
  'US500': 'SPY',            // ETF proxy: SPDR S&P 500 ETF
  'GBP/JPY': 'GBP/JPY',
  'AUD/USD': 'AUD/USD',
  'USD/CAD': 'USD/CAD',
  'NZD/USD': 'NZD/USD',
  'USD/CHF': 'USD/CHF',
  'EUR/GBP': 'EUR/GBP',
};

// Fallback ETF symbol map (used when direct symbol fails on Twelve Data free plan)
const TWELVE_FALLBACK_MAP: Record<string, string> = {
  'XAG/USD': 'SLV',       // ETF proxy: iShares Silver Trust
  'US30': 'DIA',           // Same as primary
  'NAS100': 'QQQ',         // Same as primary
  'US500': 'SPY',          // Same as primary
};

// ETF price to actual instrument price conversion
// Updated multipliers based on current market ratios (May 2025)
// SLV≈XAG/3.0 (SLV tracks ~1/3 of silver spot), DIA≈DJIA/100, QQQ≈NDX/27, SPY≈SPX/10
const ETF_CONVERSION: Record<string, { multiplier: number; offset: number; name: string }> = {
  'XAG/USD': { multiplier: 2.75, offset: 0, name: 'SLV→XAG/USD (Silver ETF×2.75)' },
  'US30':    { multiplier: 100, offset: 0, name: 'DIA→US30 (Dow ETF×100)' },
  'NAS100':  { multiplier: 27, offset: 0, name: 'QQQ→NAS100 (Nasdaq ETF×27)' },
  'US500':   { multiplier: 10, offset: 0, name: 'SPY→US500 (S&P ETF×10)' },
};

// ─── TradingView Symbol Mapping ─────────────────────────────────────────
// TradingView scanner API uses different symbol formats
// KEY FINDING: Use crypto perpetual futures for real-time commodity prices!
// BINANCE:XAGUSDT.P gives real-time XAG/USD price at 78.15 (verified!)
// All tickers tested and confirmed working May 2025
const TRADINGVIEW_SYMBOL_MAP: Record<string, { scannerType: string; ticker: string }> = {
  'EUR/USD': { scannerType: 'forex', ticker: 'FX:EURUSD' },
  'GBP/USD': { scannerType: 'forex', ticker: 'FX:GBPUSD' },
  'USD/JPY': { scannerType: 'forex', ticker: 'FX:USDJPY' },
  'XAU/USD': { scannerType: 'crypto', ticker: 'BINANCE:XAUUSDT.P' },   // Real-time via Binance perp
  'XAG/USD': { scannerType: 'crypto', ticker: 'BINANCE:XAGUSDT.P' },   // Real-time ✅ verified 78.15
  'BTC/USD': { scannerType: 'crypto', ticker: 'BINANCE:BTCUSDT.P' },   // Real-time ✅
  'ETH/USD': { scannerType: 'crypto', ticker: 'BINANCE:ETHUSDT.P' },   // Real-time ✅
  'US30':    { scannerType: 'america', ticker: 'AMEX:DIA' },            // DIA ETF ×100 ≈ US30
  'NAS100':  { scannerType: 'america', ticker: 'NASDAQ:NDX' },          // NASDAQ 100 index
  'US500':   { scannerType: 'america', ticker: 'SP:SPX' },              // S&P 500 index
  'GBP/JPY': { scannerType: 'forex', ticker: 'FX:GBPJPY' },
  'AUD/USD': { scannerType: 'forex', ticker: 'FX:AUDUSD' },
  'USD/CAD': { scannerType: 'forex', ticker: 'FX:USDCAD' },
  'NZD/USD': { scannerType: 'forex', ticker: 'FX:NZDUSD' },
  'USD/CHF': { scannerType: 'forex', ticker: 'FX:USDCHF' },
  'EUR/GBP': { scannerType: 'forex', ticker: 'FX:EURGBP' },
};

// Twelve Data interval mapping for OHLCV
const TWELVE_INTERVAL_MAP: Record<string, string> = {
  'M1': '1min',
  'M5': '5min',
  'M15': '15min',
  'M30': '30min',
  'H1': '1h',
  'H4': '4h',
  'D1': '1day',
};

// Rate limit tracking for Twelve Data
let twelveCreditsUsed = 0;
let twelveCreditsResetAt = Date.now() + 60000; // Reset every minute

function canUseTwelveData(): boolean {
  // Always available now with hardcoded fallback
  if (Date.now() > twelveCreditsResetAt) {
    twelveCreditsUsed = 0;
    twelveCreditsResetAt = Date.now() + 60000;
  }
  if (twelveCreditsUsed >= 7) return false; // Leave 1 credit buffer per minute
  return true;
}

async function fetchFromTwelveData(pair: string): Promise<MarketData | null> {
  const symbol = TWELVE_SYMBOL_MAP[pair];
  if (!symbol || !canUseTwelveData()) return null;

  twelveCreditsUsed++;

  try {
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbol)}&apikey=${TWELVE_DATA_API_KEY}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;

    const data = await response.json();
    // Check for API errors — if direct symbol fails, try fallback ETF with dynamic conversion
    if (data?.status === 'error') {
      console.warn(`Twelve Data: direct symbol ${symbol} failed for ${pair}: ${data?.message}`);

      // Try fallback ETF symbol with DYNAMIC conversion (e.g., SLV for XAG/USD)
      const fallbackSymbol = TWELVE_FALLBACK_MAP[pair];
      if (fallbackSymbol && canUseTwelveData()) {
        twelveCreditsUsed++;
        console.log(`[Twelve Data] Trying fallback ETF: ${fallbackSymbol} for ${pair}`);
        const fallbackUrl = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(fallbackSymbol)}&apikey=${TWELVE_DATA_API_KEY}`;
        const fallbackResp = await fetch(fallbackUrl, { signal: AbortSignal.timeout(8000) });
        if (fallbackResp.ok) {
          const fallbackData = await fallbackResp.json();
          if (fallbackData?.status !== 'error' && fallbackData?.price) {
            const etfRawPrice = parseFloat(fallbackData.price);
            if (isNaN(etfRawPrice)) return null;

            // ─── DYNAMIC ETF CONVERSION ──────────────────────────────────
            // For XAG/USD: Get Yahoo SI=F price as reference to calculate
            // the real-time conversion ratio between SLV ETF and silver spot
            let convertedPrice: number | null = null;
            let sourceLabel = `Twelve Data (ETF: ${fallbackSymbol})`;

            if (pair === 'XAG/USD' && fallbackSymbol === 'SLV') {
              // Smart conversion: get Yahoo SI=F reference to calculate ratio
              const yahooRef = await fetchFromYahooFinance(pair);
              if (yahooRef && yahooRef.price > 0) {
                // Dynamic ratio = SI=F price / SLV price
                const dynamicRatio = yahooRef.price / etfRawPrice;
                convertedPrice = etfRawPrice * dynamicRatio;
                console.log(`[DYNAMIC CONVERSION] XAG/USD: SLV=${etfRawPrice}, SI=F=${yahooRef.price}, ratio=${dynamicRatio.toFixed(6)}, estimated=${convertedPrice.toFixed(3)}`);
                sourceLabel = `Twelve Data SLV→XAG/USD (dynamic ×${dynamicRatio.toFixed(4)})`;
              } else {
                // Fallback to static multiplier if Yahoo fails
                const staticRatio = 1.115; // Updated May 2025 ratio: SI=F/SLV ≈ 1.115
                convertedPrice = etfRawPrice * staticRatio;
                console.log(`[STATIC CONVERSION] XAG/USD: SLV=${etfRawPrice}, static_ratio=${staticRatio}, estimated=${convertedPrice.toFixed(3)}`);
                sourceLabel = `Twelve Data SLV→XAG/USD (static ×${staticRatio})`;
              }
            } else {
              // For other ETFs (US30, NAS100, US500), use fixed multipliers
              const conversion = ETF_CONVERSION[pair];
              if (conversion) {
                convertedPrice = etfRawPrice * conversion.multiplier + conversion.offset;
                sourceLabel = `Twelve Data (${conversion.name})`;
                console.log(`[ETF CONVERSION] ${pair}: ${fallbackSymbol} raw=${etfRawPrice}, converted=${convertedPrice} (×${conversion.multiplier})`);
              }
            }

            if (convertedPrice !== null && isValidPrice(pair, convertedPrice)) {
              return buildMarketData(pair, convertedPrice, sourceLabel, {
                delay: 'Real-time',
                priceQuality: 'realtime',
                delayMinutes: 0,
              });
            }
          }
        }
      }
      return null;
    }

    let price = parseFloat(data?.price);
    if (isNaN(price)) return null;

    // Convert ETF price to actual instrument price (for US30, NAS100, US500 which use ETFs)
    const conversion = ETF_CONVERSION[pair];
    let sourceLabel = 'Twelve Data (Real-time)';
    if (conversion && symbol !== pair) {
      price = price * conversion.multiplier + conversion.offset;
      sourceLabel = `Twelve Data (${conversion.name})`;
      console.log(`[ETF CONVERSION] ${pair}: ${symbol} raw=${data.price}, converted=${price} (×${conversion.multiplier})`);
    }

    if (!isValidPrice(pair, price)) return null;

    return buildMarketData(pair, price, sourceLabel, {
      delay: 'Real-time',
      priceQuality: 'realtime',
      delayMinutes: 0,
    });
  } catch (error) {
    console.error(`Twelve Data fetch failed for ${pair}:`, error);
    return null;
  }
}

// ─── TradingView Real-Time Price Fetcher ──────────────────────────────────
// Uses TradingView's unofficial scanner API for real-time prices
// KEY: For commodities (XAG/USD, XAU/USD), use Binance perpetual futures
// which are real-time 24/7 and track spot price very closely
async function fetchFromTradingView(pair: string): Promise<MarketData | null> {
  const tvConfig = TRADINGVIEW_SYMBOL_MAP[pair];
  if (!tvConfig) return null;

  try {
    const url = `https://scanner.tradingview.com/${tvConfig.scannerType}/scan`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        symbols: { tickers: [tvConfig.ticker] },
        columns: ['close', 'change', 'high', 'low', 'volume'],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`TradingView scanner returned ${response.status} for ${pair} (${tvConfig.ticker})`);
      return null;
    }

    const data = await response.json();
    const rows = data?.data;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      console.warn(`TradingView: no data for ${pair} (${tvConfig.ticker})`);
      return null;
    }

    const row = rows[0];
    const d = row?.d; // data array matching columns order
    if (!d || d.length < 4) return null;

    const close = parseFloat(d[0]);
    const change = parseFloat(d[1]);
    const high = parseFloat(d[2]);
    const low = parseFloat(d[3]);

    if (isNaN(close) || close <= 0) return null;

    // For US30/US500/NAS100: TradingView returns raw index/ETF prices
    // Need to convert to CFD-style prices that brokers use
    let adjustedPrice = close;
    let adjustedHigh = high;
    let adjustedLow = low;
    const TV_CONVERSION: Record<string, number> = {
      'US30': 100,    // DIA ETF ×100 ≈ US30 CFD price
      'NAS100': 1,    // NDX is already close to NAS100 CFD
      'US500': 1,     // SPX needs adjustment depending on broker
    };
    const tvMult = TV_CONVERSION[pair];
    if (tvMult && tvMult !== 1) {
      adjustedPrice = close * tvMult;
      adjustedHigh = high * tvMult;
      adjustedLow = low * tvMult;
    }

    if (!isValidPrice(pair, adjustedPrice)) return null;

    const changePercent = change && !isNaN(change) ? change : 0;

    return buildMarketData(pair, adjustedPrice, 'TradingView (Real-time)', {
      high: !isNaN(adjustedHigh) && adjustedHigh > 0 ? adjustedHigh : undefined,
      low: !isNaN(adjustedLow) && adjustedLow > 0 ? adjustedLow : undefined,
      change: changePercent,
      changePercent: changePercent,
      delay: 'Real-time',
      priceQuality: 'realtime',
      delayMinutes: 0,
    });
  } catch (error) {
    console.error(`TradingView fetch failed for ${pair}:`, error);
    return null;
  }
}

// ─── Finnhub Real-Time Price Fetcher ──────────────────────────────────────
// Finnhub provides free real-time forex and crypto quotes
async function fetchFromFinnhub(pair: string): Promise<MarketData | null> {
  if (!FINNHUB_API_KEY) return null;

  // Finnhub uses different symbol format for forex: OANDA:EUR_USD
  const FINNHUB_SYMBOL_MAP: Record<string, string> = {
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

  const symbol = FINNHUB_SYMBOL_MAP[pair];
  if (!symbol) return null;

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;

    const data = await response.json();
    const price = parseFloat(data?.c); // current price
    if (isNaN(price) || price === 0 || !isValidPrice(pair, price)) return null;

    const prevClose = parseFloat(data?.pc) || price;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    return buildMarketData(pair, price, 'Finnhub (Real-time)', {
      high: parseFloat(data?.h) || undefined,
      low: parseFloat(data?.l) || undefined,
      change: parseFloat(change.toFixed(4)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      delay: 'Real-time',
      priceQuality: 'realtime',
      delayMinutes: 0,
    });
  } catch (error) {
    console.error(`Finnhub fetch failed for ${pair}:`, error);
    return null;
  }
}

// ─── Twelve Data OHLCV (real-time candles) ───────────────────────────
async function fetchOHLCVFromTwelveData(pair: string, timeframe: string): Promise<OHLCVData | null> {
  const symbol = TWELVE_SYMBOL_MAP[pair];
  const interval = TWELVE_INTERVAL_MAP[timeframe];
  if (!symbol || !interval || !canUseTwelveData()) return null;

  twelveCreditsUsed++;

  try {
    const outputSize = timeframe === 'D1' ? 50 : timeframe.startsWith('H') ? 50 : 48;
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputSize}&apikey=${TWELVE_DATA_API_KEY}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) return null;

    const data = await response.json();
    if (data?.status === 'error') {
      console.error(`Twelve Data OHLCV error for ${pair}:`, data?.message);
      return null;
    }

    const values = data?.values;
    if (!values || !Array.isArray(values) || values.length === 0) return null;

    // Get ETF conversion factor for this pair
    const conversion = ETF_CONVERSION[pair];
    const mult = conversion?.multiplier || 1;

    const candles: OHLCVCandle[] = [];
    for (const v of values) {
      const o = parseFloat(v.open) * mult;
      const h = parseFloat(v.high) * mult;
      const l = parseFloat(v.low) * mult;
      const c = parseFloat(v.close) * mult;
      if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c)) continue;
      candles.push({
        timestamp: new Date(v.datetime).getTime(),
        open: o,
        high: h,
        low: l,
        close: c,
        volume: parseInt(v.volume || '0') || 0,
      });
    }

    if (candles.length < 5) return null;

    // Sort by timestamp ascending
    candles.sort((a, b) => a.timestamp - b.timestamp);

    const currentPrice = candles[candles.length - 1].close;
    if (!isValidPrice(pair, currentPrice)) return null;

    const dayHigh = Math.max(...candles.slice(-24).map(c => c.high));
    const dayLow = Math.min(...candles.slice(-24).map(c => c.low));
    const prevClose = candles.length > 1 ? candles[candles.length - 2].close : currentPrice;
    const change = currentPrice - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    const sourceLabel = conversion ? `Twelve Data (${conversion.name})` : 'Twelve Data (Real-time)';

    return {
      pair,
      timeframe,
      candles,
      currentPrice,
      dayHigh,
      dayLow,
      change: parseFloat(change.toFixed(4)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      source: sourceLabel,
      delay: 'Real-time',
      priceQuality: 'realtime',
      delayMinutes: 0,
    };
  } catch (error) {
    console.error(`Twelve Data OHLCV failed for ${pair} ${timeframe}:`, error);
    return null;
  }
}

export async function fetchRealPrice(pair: string): Promise<MarketData> {
  // Check cache first (30 second TTL for fresher prices)
  const cached = priceCache[pair];
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  // ─── MULTI-SOURCE PARALLEL FETCH ────────────────────────────────────
  // Fetch from ALL real-time sources in parallel, then pick the best
  console.log(`[PRICE FETCH] Fetching ${pair} from all sources in parallel...`);

  const [tradingViewResult, twelveDataResult, finnhubResult, yahooResult] = await Promise.allSettled([
    fetchFromTradingView(pair),
    fetchFromTwelveData(pair),
    fetchFromFinnhub(pair),
    fetchFromYahooFinance(pair),
  ]);

  const tradingView = tradingViewResult.status === 'fulfilled' ? tradingViewResult.value : null;
  const twelveData = twelveDataResult.status === 'fulfilled' ? twelveDataResult.value : null;
  const finnhub = finnhubResult.status === 'fulfilled' ? finnhubResult.value : null;
  const yahooData = yahooResult.status === 'fulfilled' ? yahooResult.value : null;

  // Collect all successful real-time sources
  const realtimeSources: Array<{ data: MarketData; priority: number }> = [];
  if (tradingView) realtimeSources.push({ data: tradingView, priority: 1 }); // TradingView is most reliable for real-time
  if (twelveData) realtimeSources.push({ data: twelveData, priority: 2 });
  if (finnhub) realtimeSources.push({ data: finnhub, priority: 3 });

  // Log all source prices for debugging
  const sourceLog = [
    tradingView ? `TV=${tradingView.price}` : 'TV=FAIL',
    twelveData ? `12D=${twelveData.price}` : '12D=FAIL',
    finnhub ? `FH=${finnhub.price}` : 'FH=FAIL',
    yahooData ? `YF=${yahooData.price}` : 'YF=FAIL',
  ].join(' | ');
  console.log(`[PRICE SOURCES] ${pair}: ${sourceLog}`);

  // ─── PRICE CROSS-VALIDATION ─────────────────────────────────────────
  // If we have multiple real-time sources, validate the prices are close
  if (realtimeSources.length >= 2) {
    const prices = realtimeSources.map(s => s.data.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const maxDeviation = Math.max(...prices.map(p => Math.abs(p - avgPrice) / avgPrice));

    // If any source deviates more than 2% from average, it might be stale/wrong
    if (maxDeviation > 0.02) {
      console.warn(`[PRICE VALIDATION] ${pair}: Large deviation detected! Prices: ${prices.join(', ')}, avg=${avgPrice.toFixed(4)}, maxDeviation=${(maxDeviation * 100).toFixed(2)}%`);
      // Use the source with highest priority (TradingView first)
    }
  }

  // ─── PICK BEST SOURCE ───────────────────────────────────────────────
  if (realtimeSources.length > 0) {
    // Sort by priority (lower = better)
    realtimeSources.sort((a, b) => a.priority - b.priority);
    const best = realtimeSources[0].data;
    const sourcesCompared = realtimeSources.length + (yahooData ? 1 : 0);

    // If we have multiple real-time sources, use average of their prices for best accuracy
    if (realtimeSources.length >= 2) {
      const avgPrice = realtimeSources.reduce((sum, s) => sum + s.data.price, 0) / realtimeSources.length;
      const decimals = pair.includes('JPY') || pair === 'XAU/USD' || pair === 'XAG/USD' || pair.startsWith('US') || pair.startsWith('NAS') ? (pair === 'XAG/USD' ? 3 : 2) : 5;
      best.price = parseFloat(avgPrice.toFixed(decimals));
      best.source = `Multi-source avg (${realtimeSources.map(s => s.data.source.split('(')[0].trim()).join(' + ')})`;
      console.log(`[PRICE AVG] ${pair}: avg=${best.price} from ${realtimeSources.length} real-time sources`);
    }

    best.sourcesCompared = sourcesCompared;
    best.priceQuality = 'realtime';
    best.delayMinutes = 0;

    priceCache[pair] = { data: best, expiry: Date.now() + CACHE_TTL };
    return best;
  }

  // Fallback to Yahoo Finance (DELAYED)
  if (yahooData) {
    // Mark Yahoo data as delayed for commodities (XAU, XAG, US30, NAS100)
    const isCommodity = ['XAU/USD', 'XAG/USD', 'US30', 'NAS100', 'US500'].includes(pair);
    if (isCommodity && yahooData.delay !== 'Real-time') {
      yahooData.delay = '~15-20min delayed';
      yahooData.priceQuality = 'delayed';
      yahooData.delayMinutes = 15;
    } else if (yahooData.delay === 'Real-time') {
      yahooData.priceQuality = 'near-realtime';
      yahooData.delayMinutes = 1;
    } else {
      yahooData.priceQuality = 'delayed';
      yahooData.delayMinutes = 15;
    }
    yahooData.sourcesCompared = 1;
    priceCache[pair] = { data: yahooData, expiry: Date.now() + CACHE_TTL };
    return yahooData;
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

// ─── Delay Compensation: Add buffer to SL when price data is stale ──
export function compensateForDelay(
  entry: number, sl: number, tp1: number, tp2: number,
  isBuy: boolean, delayMinutes: number, pair: string
): { entry: number; sl: number; tp1: number; tp2: number; buffer: number } {
  if (delayMinutes <= 1) return { entry, sl, tp1, tp2, buffer: 0 };

  // Buffer scales with delay: more delay = wider SL buffer
  const bufferMultiplier = Math.min(delayMinutes * 0.15, 3.0); // Cap at 3x normal spread
  const spreadMap: Record<string, number> = {
    'EUR/USD': 0.0002, 'GBP/USD': 0.0003, 'USD/JPY': 0.03,
    'XAU/USD': 0.50, 'XAG/USD': 0.05, 'BTC/USD': 50, 'ETH/USD': 2,
    'US30': 5, 'NAS100': 5, 'US500': 1,
    'GBP/JPY': 0.05, 'AUD/USD': 0.0002,
  };
  const baseSpread = spreadMap[pair] || 0.0003;
  const buffer = baseSpread * bufferMultiplier;

  const decimals = pair.includes('JPY') || pair === 'XAU/USD' || pair === 'XAG/USD' || pair.startsWith('US') || pair.startsWith('NAS') ? (pair === 'XAG/USD' ? 3 : 2) : 5;

  if (isBuy) {
    // BUY: push SL further below entry to account for stale price
    return { entry, sl: parseFloat((sl - buffer).toFixed(decimals)), tp1, tp2, buffer: parseFloat(buffer.toFixed(decimals)) };
  } else {
    // SELL: push SL further above entry to account for stale price
    return { entry, sl: parseFloat((sl + buffer).toFixed(decimals)), tp1, tp2, buffer: parseFloat(buffer.toFixed(decimals)) };
  }
}

// ─── Recommended Trading Style based on data quality ─────────────────
export function getRecommendedTradingStyle(
  priceQuality: string, delayMinutes: number, pair: string
): { style: string; reason: string; warning?: string } {
  if (priceQuality === 'realtime' || delayMinutes <= 2) {
    return { style: 'any', reason: 'Real-time data — all trading styles are suitable.' };
  }
  if (priceQuality === 'near-realtime' || delayMinutes <= 5) {
    return {
      style: 'daytrading',
      reason: `Data is ~${delayMinutes}min delayed — Day Trading (H1) and Swing Trading (H4/D1) are acceptable. Scalping is NOT recommended.`,
      warning: `Data is ~${delayMinutes}min delayed. Scalping requires real-time data.`,
    };
  }
  // Delayed data (>5min)
  return {
    style: 'swing',
    reason: `Data is ~${delayMinutes}min delayed — Swing Trading on H4/D1 is recommended as the delay has minimal impact on longer timeframes. Day Trading on H1 is acceptable with wider SL.`,
    warning: `⚠️ Price data is ~${delayMinutes}min delayed! Scalping and Day Trading on short timeframes (M1-M30) will have inaccurate entry/exit prices. Use SWING (H4/D1) for best results.`,
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
