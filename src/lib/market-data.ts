// Real Market Data Service - Fetches live prices from Yahoo Finance API
// Works on Vercel and any public hosting (no internal SDK required)

export interface MarketData {
  pair: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  timestamp: string;
  source: string;
}

// Price cache (3 minute TTL)
const priceCache: Record<string, { data: MarketData; expiry: number }> = {};
const CACHE_TTL = 3 * 60 * 1000;

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
  };
}

async function fetchFromYahooFinance(pair: string): Promise<MarketData | null> {
  const yahooSymbol = YAHOO_SYMBOLS[pair];
  if (!yahooSymbol) return null;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

    return buildMarketData(pair, price, 'Yahoo Finance', {
      high: meta?.regularMarketDayHigh || undefined,
      low: meta?.regularMarketDayLow || undefined,
      change: parseFloat(change.toFixed(4)),
      changePercent: parseFloat(changePercent.toFixed(2)),
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

    return buildMarketData(pair, price, 'Twelve Data');
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
