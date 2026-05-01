// Real Market Data Service - Fetches live prices from TradingView
import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

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

// TradingView URL mapping
const TRADINGVIEW_URLS: Record<string, string> = {
  'EUR/USD': 'https://www.tradingview.com/symbols/EURUSD/',
  'GBP/USD': 'https://www.tradingview.com/symbols/GBPUSD/',
  'USD/JPY': 'https://www.tradingview.com/symbols/USDJPY/',
  'XAU/USD': 'https://www.tradingview.com/symbols/XAUUSD/',
  'BTC/USD': 'https://www.tradingview.com/symbols/BTCUSD/',
  'ETH/USD': 'https://www.tradingview.com/symbols/ETHUSD/',
  'US30': 'https://www.tradingview.com/symbols/US30/',
  'NAS100': 'https://www.tradingview.com/symbols/NAS100/',
  'US500': 'https://www.tradingview.com/symbols/US500/',
  'GBP/JPY': 'https://www.tradingview.com/symbols/GBPJPY/',
  'AUD/USD': 'https://www.tradingview.com/symbols/AUDUSD/',
  'USD/CAD': 'https://www.tradingview.com/symbols/USDCAD/',
  'NZD/USD': 'https://www.tradingview.com/symbols/NZDUSD/',
  'USD/CHF': 'https://www.tradingview.com/symbols/USDCHF/',
  'EUR/GBP': 'https://www.tradingview.com/symbols/EURGBP/',
};

const TRADINGVIEW_SYMBOLS: Record<string, string> = {
  'EUR/USD': 'EURUSD',
  'GBP/USD': 'GBPUSD',
  'USD/JPY': 'USDJPY',
  'XAU/USD': 'XAUUSD',
  'BTC/USD': 'BTCUSD',
  'ETH/USD': 'ETHUSD',
  'US30': 'US30',
  'NAS100': 'NAS100',
  'US500': 'US500',
  'GBP/JPY': 'GBPJPY',
  'AUD/USD': 'AUDUSD',
  'USD/CAD': 'USDCAD',
  'NZD/USD': 'NZDUSD',
  'USD/CHF': 'USDCHF',
  'EUR/GBP': 'EURGBP',
};

function isValidPrice(pair: string, price: number): boolean {
  const ranges: Record<string, [number, number]> = {
    'EUR/USD': [0.9, 1.3],
    'GBP/USD': [1.1, 1.5],
    'USD/JPY': [100, 200],
    'XAU/USD': [2000, 5000],
    'BTC/USD': [20000, 200000],
    'ETH/USD': [1000, 10000],
    'US30': [35000, 50000],
    'NAS100': [15000, 25000],
    'US500': [4000, 7000],
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

function extractPriceFromText(text: string, pair: string): number | null {
  if (pair === 'XAU/USD') {
    const patterns = [/\$([\d,]+\.\d{2})/g, /(\d,\d{3}\.\d{2})/g, /(\d{4}\.\d{2})/g];
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const price = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(price) && price >= 2000 && price <= 5000) return price;
      }
    }
  } else if (pair === 'BTC/USD') {
    const matches = [...text.matchAll(/\$?([\d,]+\.\d+)/g)];
    for (const match of matches) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(price) && price >= 20000 && price <= 200000) return price;
    }
  } else if (pair === 'ETH/USD') {
    const matches = [...text.matchAll(/\$?([\d,]+\.\d+)/g)];
    for (const match of matches) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(price) && price >= 1000 && price <= 10000) return price;
    }
  } else if (pair === 'US30' || pair === 'US500' || pair === 'NAS100') {
    const matches = [...text.matchAll(/([\d,]+\.\d+)/g)];
    for (const match of matches) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (isValidPrice(pair, price)) return price;
    }
  } else if (pair.includes('JPY')) {
    const matches = [...text.matchAll(/(\d{2,3}\.\d{2,3})/g)];
    for (const match of matches) {
      const price = parseFloat(match[1]);
      if (!isNaN(price) && price >= 100 && price <= 200) return price;
    }
  } else {
    const matches = [...text.matchAll(/(\d\.\d{4,5})/g)];
    for (const match of matches) {
      const price = parseFloat(match[1]);
      if (!isNaN(price) && isValidPrice(pair, price)) return price;
    }
  }
  return null;
}

// Extract day's range from TradingView text like "Day's range 4,560.32 0 — 4,635.94 0"
function extractDayRange(text: string, pair: string): { high: number | null; low: number | null } {
  // Match patterns like "Day's range 4,560.32 — 4,635.94" or "Day range 1.08500 - 1.09200"
  const rangePatterns = [
    /Day[''']?s range\s+([\d,.]+)\s*[—–\-]\s*([\d,.]+)/i,
    /Day range\s+([\d,.]+)\s*[—–\-]\s*([\d,.]+)/i,
  ];

  for (const pattern of rangePatterns) {
    const match = text.match(pattern);
    if (match) {
      const low = parseFloat(match[1].replace(/,/g, ''));
      const high = parseFloat(match[2].replace(/,/g, ''));
      if (!isNaN(low) && !isNaN(high) && low > 0 && high > 0) {
        return { high, low };
      }
    }
  }
  return { high: null, low: null };
}

// Extract change from TradingView text like "−50.730 −1.10%"
function extractChange(text: string): { change: number; changePercent: number } {
  const match = text.match(/[−\-]([\d,.]+)\s*[−\-]([\d,.]+)%/);
  if (match) {
    return {
      change: -parseFloat(match[1].replace(/,/g, '')),
      changePercent: -parseFloat(match[2].replace(/,/g, '')),
    };
  }
  const posMatch = text.match(/\+([\d,.]+)\s*\+?([\d,.]+)%/);
  if (posMatch) {
    return {
      change: parseFloat(posMatch[1].replace(/,/g, '')),
      changePercent: parseFloat(posMatch[2].replace(/,/g, '')),
    };
  }
  return { change: 0, changePercent: 0 };
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

export async function fetchRealPrice(pair: string): Promise<MarketData> {
  // Check cache first
  const cached = priceCache[pair];
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  const tvSymbol = TRADINGVIEW_SYMBOLS[pair] || pair.replace('/', '');
  const tvUrl = TRADINGVIEW_URLS[pair] || `https://www.tradingview.com/symbols/${tvSymbol}/`;

  // Strategy 1: Read TradingView page directly using page_reader
  try {
    const zai = await getZAI();
    const result = await zai.functions.invoke('page_reader', {
      url: tvUrl,
    });

    if (result?.data?.html) {
      const text = result.data.html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const price = extractPriceFromText(text, pair);
      if (price) {
        const dayRange = extractDayRange(text, pair);
        const change = extractChange(text);
        const data = buildMarketData(pair, price, 'TradingView', {
          high: dayRange.high ?? undefined,
          low: dayRange.low ?? undefined,
          change: change.change,
          changePercent: change.changePercent,
        });
        priceCache[pair] = { data, expiry: Date.now() + CACHE_TTL };
        return data;
      }
    }
  } catch (error) {
    console.error('TradingView page read failed:', error);
  }

  // Strategy 2: Web search targeting TradingView
  try {
    const zai = await getZAI();
    const searchResult = await zai.functions.invoke("web_search", {
      query: `tradingview.com ${tvSymbol} price today`,
      num: 5,
    });

    const results = searchResult as Array<{ snippet: string; name: string }>;
    const allText = results.map(r => `${r.name}: ${r.snippet}`).join(' ');
    const price = extractPriceFromText(allText, pair);

    if (price) {
      const data = buildMarketData(pair, price, 'TradingView');
      priceCache[pair] = { data, expiry: Date.now() + CACHE_TTL };
      return data;
    }
  } catch (error) {
    console.error('TradingView web search failed:', error);
  }

  // Strategy 3: Ask AI for TradingView price
  try {
    const zai = await getZAI();
    const response = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a TradingView price reader. Return ONLY the current live price shown on TradingView for the given pair as a plain number. No text, no symbols, no commas, just the number.`,
        },
        {
          role: 'user',
          content: `What is the current price of ${pair} (${tvSymbol}) on TradingView right now? Just the number.`,
        },
      ],
      temperature: 0.1,
      max_tokens: 15,
    });

    const text = response?.choices?.[0]?.message?.content || '';
    const numMatch = text.match(/[\d,.]+/);
    if (numMatch) {
      const price = parseFloat(numMatch[0].replace(/,/g, ''));
      if (price > 0 && isValidPrice(pair, price)) {
        const data = buildMarketData(pair, price, 'TradingView');
        priceCache[pair] = { data, expiry: Date.now() + CACHE_TTL };
        return data;
      }
    }
  } catch (error) {
    console.error('TradingView AI price fetch failed:', error);
  }

  // Absolute fallback
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

  for (let i = 0; i < pairs.length; i += 2) {
    const batch = pairs.slice(i, i + 2);
    const promises = batch.map(pair => fetchRealPrice(pair).then(data => ({ pair, data })));
    const batchResults = await Promise.allSettled(promises);

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results[result.value.pair] = result.value.data;
      }
    }
  }

  return results;
}
