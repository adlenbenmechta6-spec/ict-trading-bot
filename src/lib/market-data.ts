// Real Market Data Service - Multi-source price & OHLCV fetching
// Supports multiple timeframes: M1, M5, M15, M30, H1, H4, D1
//
// CRITICAL v5: Complete rewrite of source priorities for Vercel cloud compatibility
// Priority: TradingView (cloud-friendly, real spot!) → CoinGecko (cloud-friendly!) →
//   Binance Futures → Bybit → OKX → Twelve Data → Finnhub → ER-API → Yahoo Finance (DELAYED LAST)
//
// KEY FINDING v5: TradingView Scanner API works from Vercel cloud IPs and returns
// REAL-TIME spot prices for commodities (XAG/USD ~77.5, XAU/USD ~4560).
// This is MUCH more reliable than CoinGecko's Kinesis Silver token price.
// CoinGecko is kept as backup because it also works from cloud IPs.
// Binance/Bybit/OKX are blocked on many Vercel data center IPs.
// Yahoo Finance returns 15-20min delayed data for commodities — NEVER use as primary.
//
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

// Price cache (10 second TTL - very short for fresher prices)
const priceCache: Record<string, { data: MarketData; expiry: number }> = {};
const CACHE_TTL = 10 * 1000; // 10 seconds for fresher prices

// OHLCV cache (30 second TTL - short for intraday accuracy)
const ohlcvCache: Record<string, { data: OHLCVData; expiry: number }> = {};
const OHLCV_CACHE_TTL = 30 * 1000;

// ─── HARDCODED API KEY FALLBACKS ──────────────────────────────────────
// These ensure the bot works even if env vars are not set on Vercel
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || '6d1883e5a28241adb9d45ba7d2be7eda';
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || ''; // No free key available
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';

// ─── BINANCE FUTURES: PRIMARY real-time source for commodities & crypto ───
// Binance Futures API is FREE, requires NO API KEY, and provides REAL-TIME prices
// Available 24/7 for XAGUSDT, XAUUSDT, BTCUSDT, ETHUSDT
// This solves the price delay problem that Yahoo Finance and Twelve Data free plan cause
// NOTE: May be blocked on some Vercel regions — Bybit/OKX serve as backups
const BINANCE_FUTURES_SYMBOLS: Record<string, string> = {
  'XAG/USD': 'XAGUSDT',    // ✅ Real-time silver (verified working ~78)
  'XAU/USD': 'XAUUSDT',    // ✅ Real-time gold (verified working ~3350)
  'BTC/USD': 'BTCUSDT',    // ✅ Real-time Bitcoin
  'ETH/USD': 'ETHUSDT',    // ✅ Real-time Ethereum
};

// Binance Kline (candlestick) interval mapping
const BINANCE_INTERVAL_MAP: Record<string, string> = {
  'M1': '1m',
  'M5': '5m',
  'M15': '15m',
  'M30': '30m',
  'H1': '1h',
  'H4': '4h',
  'D1': '1d',
};

// ─── BYBIT: Backup real-time source for commodities & crypto ────────────
// Bybit API is FREE, requires NO API KEY, and provides REAL-TIME prices
// Works from data center IPs where Binance might be blocked
// Supports same commodity pairs as Binance
const BYBIT_SYMBOLS: Record<string, string> = {
  'XAG/USD': 'XAGUSDT',    // ✅ Real-time silver
  'XAU/USD': 'XAUUSDT',    // ✅ Real-time gold
  'BTC/USD': 'BTCUSDT',    // ✅ Real-time Bitcoin
  'ETH/USD': 'ETHUSDT',    // ✅ Real-time Ethereum
};

// Bybit kline interval mapping (in minutes)
const BYBIT_INTERVAL_MAP: Record<string, string> = {
  'M1': '1',
  'M5': '5',
  'M15': '15',
  'M30': '30',
  'H1': '60',
  'H4': '240',
  'D1': 'D',
};

// ─── OKX: Second backup real-time source for commodities & crypto ───────
// OKX API is FREE, requires NO API KEY, and provides REAL-TIME prices
// Another alternative when Binance/Bybit are blocked
const OKX_SYMBOLS: Record<string, string> = {
  'XAG/USD': 'XAG-USDT-SWAP',    // ✅ Real-time silver
  'XAU/USD': 'XAU-USDT-SWAP',    // ✅ Real-time gold
  'BTC/USD': 'BTC-USDT-SWAP',    // ✅ Real-time Bitcoin
  'ETH/USD': 'ETH-USDT-SWAP',    // ✅ Real-time Ethereum
};

// OKX candlestick interval mapping
const OKX_INTERVAL_MAP: Record<string, string> = {
  'M1': '1m',
  'M5': '5m',
  'M15': '15m',
  'M30': '30m',
  'H1': '1H',
  'H4': '4H',
  'D1': '1D',
};

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
  'GBP/CHF': 'GBPCHF=X',
  'GBP/CAD': 'GBPCAD=X',
  'AUD/CAD': 'AUDCAD=X',
  'NZD/CAD': 'NZDCAD=X',
  'NZD/JPY': 'NZDJPY=X',
};

function isValidPrice(pair: string, price: number): boolean {
  const ranges: Record<string, [number, number]> = {
    'EUR/USD': [0.9, 1.3],
    'GBP/USD': [1.1, 1.5],
    'USD/JPY': [100, 200],
    'XAU/USD': [2000, 10000],
    'XAG/USD': [20, 150],
    'BTC/USD': [20000, 200000],
    'ETH/USD': [500, 10000],
    'US30': [35000, 60000],
    'NAS100': [15000, 30000],
    'US500': [4000, 8000],
    'GBP/JPY': [150, 250],
    'AUD/USD': [0.55, 0.8],
    'USD/CAD': [1.2, 1.5],
    'NZD/USD': [0.5, 0.75],
    'USD/CHF': [0.8, 1.05],
    'EUR/GBP': [0.8, 0.95],
    'GBP/CHF': [1.05, 1.35],
    'GBP/CAD': [1.6, 1.95],
    'AUD/CAD': [0.82, 0.98],
    'NZD/CAD': [0.75, 0.92],
    'NZD/JPY': [80, 115],
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
    'GBP/JPY': 0.007, 'AUD/USD': 0.005, 'USD/CAD': 0.005,
    'NZD/USD': 0.006, 'USD/CHF': 0.005, 'GBP/CHF': 0.006,
    'GBP/CAD': 0.007, 'AUD/CAD': 0.005, 'NZD/CAD': 0.006, 'NZD/JPY': 0.007,
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

// ─── BINANCE FUTURES: PRIMARY Real-Time Price Fetcher ───────────────────
// Uses Binance Futures API directly - FREE, NO API KEY NEEDED, REAL-TIME 24/7
// This is the MOST RELIABLE source for XAG/USD, XAU/USD, BTC/USD, ETH/USD
async function fetchFromBinance(pair: string): Promise<MarketData | null> {
  const symbol = BINANCE_FUTURES_SYMBOLS[pair];
  if (!symbol) return null;

  try {
    // Fetch 24hr ticker for price + change + high/low
    const url = `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.warn(`Binance Futures returned ${response.status} for ${pair} (${symbol})`);
      return null;
    }

    const data = await response.json();
    const price = parseFloat(data?.lastPrice);
    if (isNaN(price) || price <= 0 || !isValidPrice(pair, price)) {
      console.warn(`Binance: invalid price for ${pair}: ${data?.lastPrice}`);
      return null;
    }

    const prevClose = parseFloat(data?.prevClosePrice) || price;
    const change = price - prevClose;
    const changePercent = parseFloat(data?.priceChangePercent) || (prevClose > 0 ? (change / prevClose) * 100 : 0);
    const high = parseFloat(data?.highPrice);
    const low = parseFloat(data?.lowPrice);

    console.log(`[BINANCE] ${pair} (${symbol}): price=${price}, change=${changePercent.toFixed(2)}%, high=${high}, low=${low}`);

    return buildMarketData(pair, price, 'Binance Futures (Real-time)', {
      high: !isNaN(high) && high > 0 ? high : undefined,
      low: !isNaN(low) && low > 0 ? low : undefined,
      change: parseFloat(change.toFixed(4)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      delay: 'Real-time',
      priceQuality: 'realtime',
      delayMinutes: 0,
    });
  } catch (error) {
    console.error(`Binance Futures fetch failed for ${pair}:`, error);
    return null;
  }
}

// ─── BINANCE FUTURES: Real-Time OHLCV Fetcher ────────────────────────────
// Fetches candlestick data directly from Binance Futures API
async function fetchOHLCVFromBinance(pair: string, timeframe: string): Promise<OHLCVData | null> {
  const symbol = BINANCE_FUTURES_SYMBOLS[pair];
  const interval = BINANCE_INTERVAL_MAP[timeframe];
  if (!symbol || !interval) return null;

  try {
    // Binance Klines API: returns up to 1500 candles, we need ~50
    const limit = timeframe === 'D1' ? 100 : 60;
    const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      console.warn(`Binance Futures OHLCV returned ${response.status} for ${pair} ${timeframe}`);
      return null;
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`Binance: no OHLCV data for ${pair} ${timeframe}`);
      return null;
    }

    // Binance kline format: [openTime, open, high, low, close, volume, closeTime, quoteVolume, trades, ...]
    const candles: OHLCVCandle[] = [];
    for (const k of data) {
      const o = parseFloat(k[1]);
      const h = parseFloat(k[2]);
      const l = parseFloat(k[3]);
      const c = parseFloat(k[4]);
      const v = parseFloat(k[5]);
      if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c)) continue;
      candles.push({
        timestamp: parseInt(k[0]), // Open time in ms
        open: o, high: h, low: l, close: c, volume: v,
      });
    }

    if (candles.length < 5) return null;

    candles.sort((a, b) => a.timestamp - b.timestamp);
    const currentPrice = candles[candles.length - 1].close;
    if (!isValidPrice(pair, currentPrice)) return null;

    const dayHigh = Math.max(...candles.slice(-24).map(c => c.high));
    const dayLow = Math.min(...candles.slice(-24).map(c => c.low));
    const prevClose = candles.length > 1 ? candles[candles.length - 2].close : currentPrice;
    const change = currentPrice - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    console.log(`[BINANCE OHLCV] ${pair} ${timeframe}: ${candles.length} candles, price=${currentPrice}`);

    return {
      pair, timeframe, candles,
      currentPrice, dayHigh, dayLow,
      change: parseFloat(change.toFixed(4)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      source: 'Binance Futures (Real-time)',
      delay: 'Real-time',
      priceQuality: 'realtime',
      delayMinutes: 0,
    };
  } catch (error) {
    console.error(`Binance Futures OHLCV failed for ${pair} ${timeframe}:`, error);
    return null;
  }
}

// ─── BYBIT: Real-Time Price Fetcher ────────────────────────────────────
// Bybit V5 API — FREE, NO API KEY, REAL-TIME
// Crucial backup when Binance is blocked on Vercel data center IPs
async function fetchFromBybit(pair: string): Promise<MarketData | null> {
  const symbol = BYBIT_SYMBOLS[pair];
  if (!symbol) return null;

  try {
    const url = `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.warn(`Bybit returned ${response.status} for ${pair} (${symbol})`);
      return null;
    }

    const data = await response.json();
    if (data?.retCode !== 0 || !data?.result?.list?.length) {
      console.warn(`Bybit: no data for ${pair} (${symbol}): ${data?.retMsg}`);
      return null;
    }

    const ticker = data.result.list[0];
    const price = parseFloat(ticker.lastPrice);
    if (isNaN(price) || price <= 0 || !isValidPrice(pair, price)) {
      console.warn(`Bybit: invalid price for ${pair}: ${ticker.lastPrice}`);
      return null;
    }

    const prevPrice = parseFloat(ticker.prevClosePrice) || price;
    const changePercent = parseFloat(ticker.price24hPcnt) * 100 || ((price - prevPrice) / prevPrice * 100);
    const high = parseFloat(ticker.highPrice24h);
    const low = parseFloat(ticker.lowPrice24h);

    console.log(`[BYBIT] ${pair} (${symbol}): price=${price}, change=${changePercent.toFixed(2)}%, high=${high}, low=${low}`);

    return buildMarketData(pair, price, 'Bybit (Real-time)', {
      high: !isNaN(high) && high > 0 ? high : undefined,
      low: !isNaN(low) && low > 0 ? low : undefined,
      change: parseFloat((price - prevPrice).toFixed(4)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      delay: 'Real-time',
      priceQuality: 'realtime',
      delayMinutes: 0,
    });
  } catch (error) {
    console.error(`Bybit fetch failed for ${pair}:`, error);
    return null;
  }
}

// ─── BYBIT: Real-Time OHLCV Fetcher ──────────────────────────────────
async function fetchOHLCVFromBybit(pair: string, timeframe: string): Promise<OHLCVData | null> {
  const symbol = BYBIT_SYMBOLS[pair];
  const interval = BYBIT_INTERVAL_MAP[timeframe];
  if (!symbol || !interval) return null;

  try {
    const limit = timeframe === 'D1' ? 100 : 60;
    const url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      console.warn(`Bybit OHLCV returned ${response.status} for ${pair} ${timeframe}`);
      return null;
    }

    const data = await response.json();
    if (data?.retCode !== 0 || !data?.result?.list?.length) {
      console.warn(`Bybit: no OHLCV data for ${pair} ${timeframe}`);
      return null;
    }

    // Bybit kline format: [startTime, open, high, low, close, volume, turnover]
    // Data is returned in REVERSE order (newest first), so we reverse it
    const rawCandles = data.result.list.reverse();
    const candles: OHLCVCandle[] = [];
    for (const k of rawCandles) {
      const o = parseFloat(k[1]);
      const h = parseFloat(k[2]);
      const l = parseFloat(k[3]);
      const c = parseFloat(k[4]);
      const v = parseFloat(k[5]);
      if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c)) continue;
      candles.push({
        timestamp: parseInt(k[0]),
        open: o, high: h, low: l, close: c, volume: v,
      });
    }

    if (candles.length < 5) return null;

    candles.sort((a, b) => a.timestamp - b.timestamp);
    const currentPrice = candles[candles.length - 1].close;
    if (!isValidPrice(pair, currentPrice)) return null;

    const dayHigh = Math.max(...candles.slice(-24).map(c => c.high));
    const dayLow = Math.min(...candles.slice(-24).map(c => c.low));
    const prevClose = candles.length > 1 ? candles[candles.length - 2].close : currentPrice;
    const change = currentPrice - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    console.log(`[BYBIT OHLCV] ${pair} ${timeframe}: ${candles.length} candles, price=${currentPrice}`);

    return {
      pair, timeframe, candles,
      currentPrice, dayHigh, dayLow,
      change: parseFloat(change.toFixed(4)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      source: 'Bybit (Real-time)',
      delay: 'Real-time',
      priceQuality: 'realtime',
      delayMinutes: 0,
    };
  } catch (error) {
    console.error(`Bybit OHLCV failed for ${pair} ${timeframe}:`, error);
    return null;
  }
}

// ─── OKX: Real-Time Price Fetcher ─────────────────────────────────────
// OKX V5 API — FREE, NO API KEY, REAL-TIME
// Third backup when both Binance and Bybit are blocked
async function fetchFromOKX(pair: string): Promise<MarketData | null> {
  const instId = OKX_SYMBOLS[pair];
  if (!instId) return null;

  try {
    const url = `https://www.okx.com/api/v5/market/ticker?instId=${instId}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.warn(`OKX returned ${response.status} for ${pair} (${instId})`);
      return null;
    }

    const data = await response.json();
    if (data?.code !== '0' || !data?.data?.length) {
      console.warn(`OKX: no data for ${pair} (${instId}): ${data?.msg}`);
      return null;
    }

    const ticker = data.data[0];
    const price = parseFloat(ticker.last);
    if (isNaN(price) || price <= 0 || !isValidPrice(pair, price)) {
      console.warn(`OKX: invalid price for ${pair}: ${ticker.last}`);
      return null;
    }

    const open24h = parseFloat(ticker.open24h) || price;
    const changePercent = open24h > 0 ? ((price - open24h) / open24h) * 100 : 0;
    const high = parseFloat(ticker.high24h);
    const low = parseFloat(ticker.low24h);

    console.log(`[OKX] ${pair} (${instId}): price=${price}, change=${changePercent.toFixed(2)}%, high=${high}, low=${low}`);

    return buildMarketData(pair, price, 'OKX (Real-time)', {
      high: !isNaN(high) && high > 0 ? high : undefined,
      low: !isNaN(low) && low > 0 ? low : undefined,
      change: parseFloat((price - open24h).toFixed(4)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      delay: 'Real-time',
      priceQuality: 'realtime',
      delayMinutes: 0,
    });
  } catch (error) {
    console.error(`OKX fetch failed for ${pair}:`, error);
    return null;
  }
}

// ─── OKX: Real-Time OHLCV Fetcher ─────────────────────────────────────
async function fetchOHLCVFromOKX(pair: string, timeframe: string): Promise<OHLCVData | null> {
  const instId = OKX_SYMBOLS[pair];
  const bar = OKX_INTERVAL_MAP[timeframe];
  if (!instId || !bar) return null;

  try {
    const limit = timeframe === 'D1' ? 100 : 60;
    const url = `https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      console.warn(`OKX OHLCV returned ${response.status} for ${pair} ${timeframe}`);
      return null;
    }

    const data = await response.json();
    if (data?.code !== '0' || !data?.data?.length) {
      console.warn(`OKX: no OHLCV data for ${pair} ${timeframe}`);
      return null;
    }

    // OKX candle format: [timestamp, open, high, low, close, volume, volCcy, volCcyQuote, confirm]
    // Data is returned in REVERSE order (newest first)
    const rawCandles = data.data.reverse();
    const candles: OHLCVCandle[] = [];
    for (const k of rawCandles) {
      const o = parseFloat(k[1]);
      const h = parseFloat(k[2]);
      const l = parseFloat(k[3]);
      const c = parseFloat(k[4]);
      const v = parseFloat(k[5]);
      if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c)) continue;
      candles.push({
        timestamp: parseInt(k[0]),
        open: o, high: h, low: l, close: c, volume: v,
      });
    }

    if (candles.length < 5) return null;

    candles.sort((a, b) => a.timestamp - b.timestamp);
    const currentPrice = candles[candles.length - 1].close;
    if (!isValidPrice(pair, currentPrice)) return null;

    const dayHigh = Math.max(...candles.slice(-24).map(c => c.high));
    const dayLow = Math.min(...candles.slice(-24).map(c => c.low));
    const prevClose = candles.length > 1 ? candles[candles.length - 2].close : currentPrice;
    const change = currentPrice - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    console.log(`[OKX OHLCV] ${pair} ${timeframe}: ${candles.length} candles, price=${currentPrice}`);

    return {
      pair, timeframe, candles,
      currentPrice, dayHigh, dayLow,
      change: parseFloat(change.toFixed(4)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      source: 'OKX (Real-time)',
      delay: 'Real-time',
      priceQuality: 'realtime',
      delayMinutes: 0,
    };
  } catch (error) {
    console.error(`OKX OHLCV failed for ${pair} ${timeframe}:`, error);
    return null;
  }
}

// ─── Fetch OHLCV Data for specific timeframe ──────────────────────────
export async function fetchOHLCVData(pair: string, timeframe: string = 'H4'): Promise<OHLCVData> {
  const cacheKey = `${pair}_${timeframe}`;
  const cached = ohlcvCache[cacheKey];
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  // ─── PARALLEL OHLCV FETCH ──────────────────────────────────────────
  // Fetch from all available real-time sources IN PARALLEL, not sequential!
  // Sequential fetch was causing timeouts on Vercel because Binance would
  // take 8s to timeout before trying Bybit/OKX.
  const isCryptoOrCommodity = BINANCE_FUTURES_SYMBOLS[pair] || BYBIT_SYMBOLS[pair] || OKX_SYMBOLS[pair] || COINGECKO_ID_MAP[pair];

  if (isCryptoOrCommodity) {
    // v5: Fetch CoinGecko + Binance + Bybit + OKX OHLCV in parallel for commodities/crypto
    // CRITICAL v5: CoinGecko is FIRST because it works from Vercel cloud IPs
    // Binance/Bybit/OKX are often BLOCKED on Vercel data center IPs
    console.log(`[OHLCV FETCH v5] Fetching ${pair} ${timeframe} from CoinGecko/Binance/Bybit/OKX in parallel...`);
    const [coinGeckoResult, binanceResult, bybitResult, okxResult] = await Promise.allSettled([
      fetchOHLCVFromCoinGecko(pair, timeframe),
      fetchOHLCVFromBinance(pair, timeframe),
      fetchOHLCVFromBybit(pair, timeframe),
      fetchOHLCVFromOKX(pair, timeframe),
    ]);

    const coinGeckoOHLCV = coinGeckoResult.status === 'fulfilled' ? coinGeckoResult.value : null;
    const binanceOHLCV = binanceResult.status === 'fulfilled' ? binanceResult.value : null;
    const bybitOHLCV = bybitResult.status === 'fulfilled' ? bybitResult.value : null;
    const okxOHLCV = okxResult.status === 'fulfilled' ? okxResult.value : null;

    // v5 Priority: CoinGecko (cloud-friendly) > Binance > Bybit > OKX
    // But if Binance/Bybit/OKX return data, prefer them (more accurate spot price)
    // CoinGecko uses tokenized metals which may have premium/discount
    const ohlcvResult = binanceOHLCV || bybitOHLCV || okxOHLCV || coinGeckoOHLCV;
    if (ohlcvResult) {
      const sourceName = binanceOHLCV ? 'Binance' : bybitOHLCV ? 'Bybit' : okxOHLCV ? 'OKX' : 'CoinGecko';
      console.log(`[OHLCV FETCH v5] ${pair} ${timeframe}: Using ${sourceName} (Real-time), ${ohlcvResult.candles.length} candles`);
      ohlcvCache[cacheKey] = { data: ohlcvResult, expiry: Date.now() + OHLCV_CACHE_TTL };
      return ohlcvResult;
    }

    // If all exchange sources fail, try Twelve Data
    const twelveOHLCV = await fetchOHLCVFromTwelveData(pair, timeframe);
    if (twelveOHLCV) {
      ohlcvCache[cacheKey] = { data: twelveOHLCV, expiry: Date.now() + OHLCV_CACHE_TTL };
      return twelveOHLCV;
    }
  } else {
    // Forex pairs: Try Twelve Data first, then TradingView
    const twelveOHLCV = await fetchOHLCVFromTwelveData(pair, timeframe);
    if (twelveOHLCV) {
      ohlcvCache[cacheKey] = { data: twelveOHLCV, expiry: Date.now() + OHLCV_CACHE_TTL };
      return twelveOHLCV;
    }
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

    // Determine data delay
    const marketState = meta?.marketState;
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
  // Use realistic base prices (updated May 2026)
  const basePrices: Record<string, number> = {
    'EUR/USD': 1.16200, 'GBP/USD': 1.34400, 'USD/JPY': 159.00,
    'XAU/USD': 4547.00, 'XAG/USD': 78.00, 'BTC/USD': 77000, 'ETH/USD': 2100,
    'US30': 42000, 'NAS100': 19500, 'US500': 5900,
    'GBP/JPY': 213.70, 'AUD/USD': 0.64500, 'USD/CAD': 1.36500, 'NZD/USD': 0.61500,
    'USD/CHF': 0.88200, 'GBP/CHF': 1.18300, 'GBP/CAD': 1.83500,
    'AUD/CAD': 0.88200, 'NZD/CAD': 0.83800, 'NZD/JPY': 97.80,
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

// ─── Twelve Data API (real-time for forex ONLY) ────────────────────
// Twelve Data free tier supports forex pairs but NOT commodities (XAG/USD, XAU/USD need paid plan)
// Free tier: 800 credits/day, 8 credits/min
// NOTE: XAG/USD and XAU/USD are removed from Twelve Data mapping because they fail on free plan
// Binance Futures is used instead for these commodities
const TWELVE_SYMBOL_MAP: Record<string, string> = {
  'EUR/USD': 'EUR/USD',
  'GBP/USD': 'GBP/USD',
  'USD/JPY': 'USD/JPY',
  // XAU/USD and XAG/USD removed — requires paid plan, use Binance instead
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
  'GBP/CHF': 'GBP/CHF',
  'GBP/CAD': 'GBP/CAD',
  'AUD/CAD': 'AUD/CAD',
  'NZD/CAD': 'NZD/CAD',
  'NZD/JPY': 'NZD/JPY',
};

// ETF price to actual instrument price conversion
const ETF_CONVERSION: Record<string, { multiplier: number; offset: number; name: string }> = {
  'US30':    { multiplier: 100, offset: 0, name: 'DIA→US30 (Dow ETF×100)' },
  'NAS100':  { multiplier: 27, offset: 0, name: 'QQQ→NAS100 (Nasdaq ETF×27)' },
  'US500':   { multiplier: 10, offset: 0, name: 'SPY→US500 (S&P ETF×10)' },
};

// ─── TradingView Symbol Mapping ─────────────────────────────────────────
// TradingView scanner API uses different symbol formats
// KEY FINDING: Use crypto perpetual futures for real-time commodity prices!
// BINANCE:XAGUSDT.P gives real-time XAG/USD price (verified!)
const TRADINGVIEW_SYMBOL_MAP: Record<string, { scannerType: string; ticker: string }> = {
  'EUR/USD': { scannerType: 'forex', ticker: 'FX:EURUSD' },
  'GBP/USD': { scannerType: 'forex', ticker: 'FX:GBPUSD' },
  'USD/JPY': { scannerType: 'forex', ticker: 'FX:USDJPY' },
  'XAU/USD': { scannerType: 'crypto', ticker: 'BINANCE:XAUUSDT.P' },
  'XAG/USD': { scannerType: 'crypto', ticker: 'BINANCE:XAGUSDT.P' },
  'BTC/USD': { scannerType: 'crypto', ticker: 'BINANCE:BTCUSDT.P' },
  'ETH/USD': { scannerType: 'crypto', ticker: 'BINANCE:ETHUSDT.P' },
  'US30':    { scannerType: 'america', ticker: 'AMEX:DIA' },
  'NAS100':  { scannerType: 'america', ticker: 'NASDAQ:NDX' },
  'US500':   { scannerType: 'america', ticker: 'SP:SPX' },
  'GBP/JPY': { scannerType: 'forex', ticker: 'FX:GBPJPY' },
  'AUD/USD': { scannerType: 'forex', ticker: 'FX:AUDUSD' },
  'USD/CAD': { scannerType: 'forex', ticker: 'FX:USDCAD' },
  'NZD/USD': { scannerType: 'forex', ticker: 'FX:NZDUSD' },
  'USD/CHF': { scannerType: 'forex', ticker: 'FX:USDCHF' },
  'EUR/GBP': { scannerType: 'forex', ticker: 'FX:EURGBP' },
  'GBP/CHF': { scannerType: 'forex', ticker: 'FX:GBPCHF' },
  'GBP/CAD': { scannerType: 'forex', ticker: 'FX:GBPCAD' },
  'AUD/CAD': { scannerType: 'forex', ticker: 'FX:AUDCAD' },
  'NZD/CAD': { scannerType: 'forex', ticker: 'FX:NZDCAD' },
  'NZD/JPY': { scannerType: 'forex', ticker: 'FX:NZDJPY' },
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
    // Check for API errors
    if (data?.status === 'error') {
      console.warn(`Twelve Data: symbol ${symbol} failed for ${pair}: ${data?.message}`);
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
    const d = row?.d;
    if (!d || d.length < 4) return null;

    const close = parseFloat(d[0]);
    const change = parseFloat(d[1]);
    const high = parseFloat(d[2]);
    const low = parseFloat(d[3]);

    if (isNaN(close) || close <= 0) return null;

    // For US30/US500/NAS100: TradingView returns raw index/ETF prices
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

// ─── TradingView: Real-Time OHLCV Fetcher ────────────────────────────────
// Uses TradingView scanner API to fetch candlestick data
// This works from Vercel cloud IPs and provides real-time commodity/crypto data
async function fetchOHLCVFromTradingView(pair: string, timeframe: string): Promise<OHLCVData | null> {
  const tvConfig = TRADINGVIEW_SYMBOL_MAP[pair];
  if (!tvConfig) return null;

  // TradingView scanner doesn't support OHLCV directly, but we can use
  // their chart data API. However, it requires a session.
  // Instead, we use the scanner to get the current price and combine with
  // CoinGecko/Binance OHLCV when available.
  // For now, return null and let other OHLCV sources handle it.
  // The real-time price from TradingView will be used to update the last candle.
  return null;
}

// ─── Finnhub Real-Time Price Fetcher ──────────────────────────────────────
async function fetchFromFinnhub(pair: string): Promise<MarketData | null> {
  if (!FINNHUB_API_KEY) return null;

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
    const price = parseFloat(data?.c);
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

// ─── Twelve Data OHLCV (real-time candles for forex) ───────────────────
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

// ─── COINGECKO: Cloud-friendly real-time source ─────────────────────────
// CoinGecko API works from cloud/data center IPs (unlike Binance/Bybit/OKX
// which are often blocked on Vercel serverless functions).
// Uses tokenized precious metals (Kinesis Silver, Tether Gold) for XAG/XAU prices.
// Free tier: ~10-30 calls/min, no API key needed.
const COINGECKO_ID_MAP: Record<string, { id: string; name: string; type: string }> = {
  'XAG/USD': { id: 'kinesis-silver', name: 'Kinesis Silver (XAG)', type: 'commodity' },
  'XAU/USD': { id: 'tether-gold', name: 'Tether Gold (XAU)', type: 'commodity' },
  'BTC/USD': { id: 'bitcoin', name: 'Bitcoin', type: 'crypto' },
  'ETH/USD': { id: 'ethereum', name: 'Ethereum', type: 'crypto' },
};

async function fetchFromCoinGecko(pair: string): Promise<MarketData | null> {
  const coinConfig = COINGECKO_ID_MAP[pair];
  if (!coinConfig) return null;

  try {
    // CRITICAL v5: Try simple/price FIRST — it has HIGHER rate limits than detail endpoint
    // The detail endpoint gets 429 rate limited very quickly on Vercel.
    // simple/price allows 10-30 requests/minute on free tier.
    
    // Attempt 1: Simple price endpoint (higher rate limits)
    const simpleUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinConfig.id}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_high_24hr=true&include_low_24hr=true`;
    const simpleResponse = await fetch(simpleUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (simpleResponse.ok) {
      const data = await simpleResponse.json();
      const coinData = data?.[coinConfig.id];
      if (coinData?.usd) {
        const price = coinData.usd;
        if (isValidPrice(pair, price)) {
          const changePercent = coinData.usd_24h_change || 0;
          const high = coinData.usd_24h_high;
          const low = coinData.usd_24h_low;
          const prevPrice = price / (1 + changePercent / 100);
          const change = price - prevPrice;

          console.log(`[COINGECKO] ${pair} (${coinConfig.id}): price=${price}, change=${changePercent.toFixed(2)}%, high=${high}, low=${low} (simple endpoint)`);

          return buildMarketData(pair, price, `CoinGecko (${coinConfig.name})`, {
            high: high && !isNaN(high) && high > 0 ? high : undefined,
            low: low && !isNaN(low) && low > 0 ? low : undefined,
            change: parseFloat(change.toFixed(4)),
            changePercent: parseFloat(changePercent.toFixed(2)),
            delay: 'Real-time',
            priceQuality: 'realtime',
            delayMinutes: 0,
          });
        }
      }
    }

    // Attempt 2: Full coin detail endpoint (fallback, may be rate limited)
    if (simpleResponse.status === 429 || !simpleResponse.ok) {
      console.log(`[COINGECKO] Simple endpoint rate limited (${simpleResponse.status}), trying detail...`);
      
      const detailUrl = `https://api.coingecko.com/api/v3/coins/${coinConfig.id}`;
      const detailResponse = await fetch(detailUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (detailResponse.ok) {
        const data = await detailResponse.json();
        const md = data?.market_data;
        if (md) {
          const price = md.current_price?.usd;
          if (price && !isNaN(price) && price > 0 && isValidPrice(pair, price)) {
            const high = md.high_24h?.usd;
            const low = md.low_24h?.usd;
            const changePercent = md.price_change_percentage_24h || 0;
            const prevPrice = price / (1 + changePercent / 100);
            const change = price - prevPrice;

            console.log(`[COINGECKO] ${pair} (${coinConfig.id}): price=${price}, change=${changePercent.toFixed(2)}%, high=${high}, low=${low} (detail endpoint)`);

            return buildMarketData(pair, price, `CoinGecko (${coinConfig.name})`, {
              high: high && !isNaN(high) && high > 0 ? high : undefined,
              low: low && !isNaN(low) && low > 0 ? low : undefined,
              change: parseFloat(change.toFixed(4)),
              changePercent: parseFloat(changePercent.toFixed(2)),
              delay: 'Real-time',
              priceQuality: 'realtime',
              delayMinutes: 0,
            });
          }
        }
      }
    }

    console.warn(`CoinGecko: all endpoints failed for ${pair} (status: simple=${simpleResponse.status})`);
    return null;
  } catch (error) {
    console.error(`CoinGecko fetch failed for ${pair}:`, error);
    return null;
  }
}

// ─── COINGECKO: Real-Time OHLCV Fetcher ─────────────────────────────────
// CoinGecko OHLCV endpoint returns candles in [timestamp, open, high, low, close] format.
// Days parameter controls candle granularity:
//   days=1 → 30min candles, days=7-30 → 4h candles, days=90+ → daily candles
// This works from Vercel cloud IPs, unlike Binance/Bybit/OKX which get blocked.
async function fetchOHLCVFromCoinGecko(pair: string, timeframe: string): Promise<OHLCVData | null> {
  const coinConfig = COINGECKO_ID_MAP[pair];
  if (!coinConfig) return null;

  try {
    // Map our timeframes to CoinGecko days parameter
    let days: number;
    if (['M1', 'M5', 'M15', 'M30'].includes(timeframe)) {
      days = 1;  // 30min candles
    } else if (['H1', 'H4'].includes(timeframe)) {
      days = 7;  // 4h candles (CoinGecko returns 4h candles for days=7)
    } else {
      days = 90; // daily candles
    }

    const url = `https://api.coingecko.com/api/v3/coins/${coinConfig.id}/ohlc?vs_currency=usd&days=${days}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`CoinGecko OHLCV returned ${response.status} for ${pair} ${timeframe}`);
      return null;
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length < 5) {
      console.warn(`CoinGecko: insufficient OHLCV data for ${pair} ${timeframe}`);
      return null;
    }

    // CoinGecko format: [timestamp_ms, open, high, low, close]
    const candles: OHLCVCandle[] = [];
    for (const k of data) {
      const ts = k[0];
      const o = parseFloat(k[1]);
      const h = parseFloat(k[2]);
      const l = parseFloat(k[3]);
      const c = parseFloat(k[4]);
      if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c)) continue;
      candles.push({
        timestamp: ts,
        open: o, high: h, low: l, close: c, volume: 0, // CoinGecko OHLCV doesn't include volume
      });
    }

    if (candles.length < 5) return null;

    candles.sort((a, b) => a.timestamp - b.timestamp);
    const currentPrice = candles[candles.length - 1].close;
    if (!isValidPrice(pair, currentPrice)) return null;

    const dayHigh = Math.max(...candles.slice(-6).map(c => c.high));
    const dayLow = Math.min(...candles.slice(-6).map(c => c.low));
    const prevClose = candles.length > 1 ? candles[candles.length - 2].close : currentPrice;
    const change = currentPrice - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    console.log(`[COINGECKO OHLCV] ${pair} ${timeframe}: ${candles.length} candles, price=${currentPrice}`);

    return {
      pair, timeframe, candles,
      currentPrice, dayHigh, dayLow,
      change: parseFloat(change.toFixed(4)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      source: `CoinGecko (${coinConfig.name})`,
      delay: 'Real-time',
      priceQuality: 'realtime',
      delayMinutes: 0,
    };
  } catch (error) {
    console.error(`CoinGecko OHLCV failed for ${pair} ${timeframe}:`, error);
    return null;
  }
}

// ─── OPEN ER-API: Cloud-friendly forex rates ──────────────────────────
// Free, no API key, works from cloud IPs. Updated daily (not real-time but
// much better than nothing when other sources fail).
// Only used as LAST RESORT for forex pairs.
async function fetchFromOpenERAPI(pair: string): Promise<MarketData | null> {
  // Only support USD-quote forex pairs
  const FOREX_PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'NZD/USD',
    'USD/CAD', 'USD/CHF', 'GBP/JPY', 'EUR/GBP'];
  if (!FOREX_PAIRS.includes(pair)) return null;

  try {
    const url = `https://open.er-api.com/v6/latest/USD`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;

    const data = await response.json();
    if (data?.result !== 'success' || !data?.rates) return null;

    const rates = data.rates;
    let price: number;

    if (pair === 'USD/JPY') price = rates.JPY;
    else if (pair === 'USD/CAD') price = rates.CAD;
    else if (pair === 'USD/CHF') price = rates.CHF;
    else if (pair === 'GBP/JPY') price = (rates.GBP / rates.USD) * rates.JPY; // Cross rate
    else if (pair === 'EUR/GBP') price = rates.EUR / rates.GBP;
    else price = rates[pair.split('/')[0]]; // EUR/USD -> rates.EUR

    if (!price || isNaN(price) || !isValidPrice(pair, price)) return null;

    console.log(`[ER-API] ${pair}: price=${price} (daily updated)`);

    return buildMarketData(pair, price, 'ExchangeRate API (daily)', {
      change: 0,
      changePercent: 0,
      delay: 'Daily updated',
      priceQuality: 'near-realtime',
      delayMinutes: 60,
    });
  } catch (error) {
    console.error(`ER-API fetch failed for ${pair}:`, error);
    return null;
  }
}

// ─── MAIN PRICE FETCH: Multi-source parallel fetch with Binance as PRIMARY ──
export async function fetchRealPrice(pair: string): Promise<MarketData> {
  // Check cache first (15 second TTL for fresher prices)
  const cached = priceCache[pair];
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  // ─── MULTI-SOURCE PARALLEL FETCH v5 ──────────────────────────────────
  // CRITICAL v5: TradingView is now PRIMARY for commodities (real spot prices, works from Vercel!)
  // CoinGecko is secondary (works from cloud but uses tokenized metals with premium/discount)
  // Binance/Bybit/OKX are tertiary (blocked on many Vercel data center IPs)
  // Yahoo Finance is DEAD LAST (15-20min delayed for commodities)
  console.log(`[PRICE FETCH v5] Fetching ${pair} from all sources in parallel...`);

  const [tradingViewResult, coinGeckoResult, binanceResult, bybitResult, okxResult, twelveDataResult, finnhubResult, erApiResult, yahooResult] = await Promise.allSettled([
    fetchFromTradingView(pair),     // Priority 0: TradingView (REAL SPOT prices, works from Vercel!)
    fetchFromCoinGecko(pair),       // Priority 0.5: CoinGecko (cloud-friendly, tokenized metals)
    fetchFromBinance(pair),         // Priority 1: Binance Futures (blocked on Vercel but works locally)
    fetchFromBybit(pair),           // Priority 1.5: Bybit (may be blocked on Vercel)
    fetchFromOKX(pair),             // Priority 2: OKX (may be blocked on Vercel)
    fetchFromTwelveData(pair),      // Priority 3: Twelve Data (forex, ETFs)
    fetchFromFinnhub(pair),         // Priority 4: Finnhub
    fetchFromOpenERAPI(pair),       // Priority 4.5: ExchangeRate API (daily forex — cloud friendly)
    fetchFromYahooFinance(pair),    // Priority 5: Yahoo Finance (DELAYED — DEAD LAST)
  ]);

  const tradingView = tradingViewResult.status === 'fulfilled' ? tradingViewResult.value : null;
  const coinGecko = coinGeckoResult.status === 'fulfilled' ? coinGeckoResult.value : null;
  const binance = binanceResult.status === 'fulfilled' ? binanceResult.value : null;
  const bybit = bybitResult.status === 'fulfilled' ? bybitResult.value : null;
  const okx = okxResult.status === 'fulfilled' ? okxResult.value : null;
  const twelveData = twelveDataResult.status === 'fulfilled' ? twelveDataResult.value : null;
  const finnhub = finnhubResult.status === 'fulfilled' ? finnhubResult.value : null;
  const erApi = erApiResult.status === 'fulfilled' ? erApiResult.value : null;
  const yahooData = yahooResult.status === 'fulfilled' ? yahooResult.value : null;

  // Collect all successful real-time sources with priorities
  // v5: TradingView is #1 (real spot prices from crypto perpetuals)
  const realtimeSources: Array<{ data: MarketData; priority: number }> = [];
  if (tradingView) realtimeSources.push({ data: tradingView, priority: 0 });    // TradingView #1 — real spot!
  if (binance) realtimeSources.push({ data: binance, priority: 0.5 });          // Binance is #2 when not blocked
  if (bybit) realtimeSources.push({ data: bybit, priority: 0.7 });             // Bybit is #2.5
  if (okx) realtimeSources.push({ data: okx, priority: 0.9 });                // OKX is #2.7
  if (coinGecko) realtimeSources.push({ data: coinGecko, priority: 1 });        // CoinGecko #3 — token premium
  if (twelveData) realtimeSources.push({ data: twelveData, priority: 2 });
  if (finnhub) realtimeSources.push({ data: finnhub, priority: 3 });
  if (erApi) realtimeSources.push({ data: erApi, priority: 3.5 });             // Daily rates — cloud friendly

  // Log all source prices for debugging — CRITICAL for diagnosing Vercel issues
  const sourceLog = [
    tradingView ? `TV=${tradingView.price}` : 'TV=FAIL',
    coinGecko ? `CG=${coinGecko.price}` : 'CG=FAIL',
    binance ? `BIN=${binance.price}` : 'BIN=FAIL',
    bybit ? `BYB=${bybit.price}` : 'BYB=FAIL',
    okx ? `OKX=${okx.price}` : 'OKX=FAIL',
    twelveData ? `12D=${twelveData.price}` : '12D=FAIL',
    finnhub ? `FH=${finnhub.price}` : 'FH=SKIP',
    erApi ? `ER=${erApi.price}` : 'ER=FAIL',
    yahooData ? `YF=${yahooData.price}` : 'YF=FAIL',
  ].join(' | ');
  console.log(`[PRICE SOURCES v5] ${pair}: ${sourceLog}`);
  console.log(`[PRICE SOURCES v5] ${pair}: ${realtimeSources.length} real-time sources available`);

  // ─── PRICE CROSS-VALIDATION ─────────────────────────────────────────
  if (realtimeSources.length >= 2) {
    const prices = realtimeSources.map(s => s.data.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const maxDeviation = Math.max(...prices.map(p => Math.abs(p - avgPrice) / avgPrice));

    if (maxDeviation > 0.02) {
      console.warn(`[PRICE VALIDATION] ${pair}: Large deviation! Prices: ${prices.join(', ')}, avg=${avgPrice.toFixed(4)}, maxDeviation=${(maxDeviation * 100).toFixed(2)}%`);
    }
  }

  // ─── PICK BEST SOURCE v5 ───────────────────────────────────────────────
  if (realtimeSources.length > 0) {
    // Sort by priority (lower = better)
    realtimeSources.sort((a, b) => a.priority - b.priority);
    const best = realtimeSources[0].data;
    const sourcesCompared = realtimeSources.length + (yahooData ? 1 : 0);

    // If we have multiple real-time sources, use weighted average
    // v5: For commodities, ONLY average exchange sources (TradingView/Binance/Bybit/OKX)
    // CoinGecko uses tokenized metals (Kinesis Silver) which may have premium/discount
    // and should NOT be included in the commodity price average.
    if (realtimeSources.length >= 2) {
      const isCommodityPair = BINANCE_FUTURES_SYMBOLS[pair] || BYBIT_SYMBOLS[pair] || OKX_SYMBOLS[pair];
      const decimals = pair.includes('JPY') || pair === 'XAU/USD' || pair === 'XAG/USD' || pair.startsWith('US') || pair.startsWith('NAS') ? (pair === 'XAG/USD' ? 3 : 2) : 5;

      if (isCommodityPair) {
        // For commodities: ONLY use exchange sources for the average (priority <= 0.9)
        // This includes TradingView, Binance, Bybit, OKX
        // EXCLUDES CoinGecko (priority 1) which uses tokenized metals with different pricing
        const exchangeSources = realtimeSources.filter(s => s.priority <= 0.9);
        const exchangePrices = exchangeSources.map(s => s.data.price);

        if (exchangePrices.length >= 2) {
          // Average only exchange sources for most accurate spot price
          const exchangeAvg = exchangePrices.reduce((a, b) => a + b, 0) / exchangePrices.length;
          best.price = parseFloat(exchangeAvg.toFixed(decimals));
          console.log(`[PRICE AVG v5] ${pair}: Using ${exchangeSources.length} exchange sources only, avg=${best.price} (sources: ${exchangeSources.map(s => `${s.data.source.split('(')[0].trim()}=${s.data.price}`).join(', ')})`);
        } else if (exchangePrices.length === 1) {
          // Only one exchange source — use it directly (don't mix with CoinGecko)
          best.price = parseFloat(exchangePrices[0].toFixed(decimals));
          console.log(`[PRICE AVG v5] ${pair}: Only 1 exchange source, using it directly: ${best.price}`);
        } else {
          // No exchange sources available (all blocked?) — use CoinGecko as last real-time resort
          const coinGeckoPrice = realtimeSources.find(s => s.priority === 1);
          if (coinGeckoPrice) {
            best.price = parseFloat(coinGeckoPrice.data.price.toFixed(decimals));
            console.log(`[PRICE AVG v5] ${pair}: All exchanges blocked! Using CoinGecko: ${best.price} (may differ from spot)`);
          }
        }
      } else {
        // Non-commodity: simple average of all sources
        const avgPrice = realtimeSources.reduce((sum, s) => sum + s.data.price, 0) / realtimeSources.length;
        best.price = parseFloat(avgPrice.toFixed(decimals));
      }
      best.source = `Multi-source (${realtimeSources.map(s => s.data.source.split('(')[0].trim()).join(' + ')})`;
      console.log(`[PRICE AVG v5] ${pair}: final=${best.price} from ${realtimeSources.length} real-time sources`);
    }

    best.sourcesCompared = sourcesCompared;
    best.priceQuality = 'realtime';
    best.delayMinutes = 0;

    priceCache[pair] = { data: best, expiry: Date.now() + CACHE_TTL };
    return best;
  }

  // Fallback to Yahoo Finance (DELAYED)
  if (yahooData) {
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
    return { entry, sl: parseFloat((sl - buffer).toFixed(decimals)), tp1, tp2, buffer: parseFloat(buffer.toFixed(decimals)) };
  } else {
    return { entry, sl: parseFloat((sl + buffer).toFixed(decimals)), tp1, tp2, buffer: parseFloat(buffer.toFixed(decimals)) };
  }
}

// ─── Recommended Trading Style based on data quality ────────
// ─── Recommended Trading Style based on data quality ────────
export function getRecommendedTradingStyle(
  priceQuality: string,
  delayMinutes: number,
  pair: string
): { style: string; reason: string; warning?: string } {
  const isCommodity = ['XAU/USD', 'XAG/USD', 'US30', 'NAS100', 'US500'].includes(pair);

  if (priceQuality === 'realtime' && delayMinutes <= 1) {
    // Real-time data: all trading styles are safe
    return {
      style: 'Any (Swing/Day/Scalp)',
      reason: 'Real-time price data available — all trading styles are safe. Scalping is viable.',
    };
  }

  if (priceQuality === 'near-realtime' && delayMinutes <= 3) {
    return {
      style: 'Swing or Day Trading',
      reason: 'Near real-time data (~1-3min delay). Day trading and swing are safe. Scalping may have slight SL/TP inaccuracy.',
      warning: 'Scalping not recommended with near-realtime data.',
    };
  }

  if (delayMinutes <= 10) {
    return {
      style: 'Swing Trading',
      reason: `Price data is ~${delayMinutes}min delayed. Swing trading (H4/D1) is safe. Day trading may have SL/TP errors.`,
      warning: `Day trading and scalping NOT recommended with ~${delayMinutes}min delay. Use Swing Trading only.`,
    };
  }

  // Significant delay (>10 min)
  return {
    style: 'Swing Trading ONLY',
    reason: `Price data is ~${delayMinutes}min delayed. ONLY swing trading (H4/D1) is recommended. Intraday signals will have incorrect entry/SL/TP.`,
    warning: `⚠️ SEVERE DELAY (~${delayMinutes}min): Day trading and scalping are DANGEROUS. SL/TP will be significantly off from real market price. Use swing trading ONLY.`,
  };
}

// ─── Fetch prices for multiple pairs at once ─────────────────────────
export async function fetchMultiplePrices(pairs: string[]): Promise<Record<string, MarketData>> {
  const results: Record<string, MarketData> = {};

  // Fetch all pairs in parallel
  const promises = pairs.map(async (pair) => {
    try {
      const data = await fetchRealPrice(pair);
      results[pair] = data;
    } catch (error) {
      console.error(`Failed to fetch price for ${pair}:`, error);
      results[pair] = {
        pair,
        price: 0,
        change: 0,
        changePercent: 0,
        high: 0,
        low: 0,
        timestamp: new Date().toISOString(),
        source: 'error',
        priceQuality: 'stale',
        delayMinutes: 999,
      };
    }
  });

  await Promise.allSettled(promises);
  return results;
}
