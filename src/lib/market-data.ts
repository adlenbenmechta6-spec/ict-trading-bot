// Real Market Data Service - Fetches live prices via Web Search
import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// Pair to search query mapping
const PAIR_SEARCH_QUERIES: Record<string, string> = {
  'EUR/USD': 'EUR/USD current price today forex',
  'GBP/USD': 'GBP/USD current price today forex',
  'USD/JPY': 'USD/JPY current price today forex',
  'XAU/USD': 'Gold XAU/USD current price today',
  'BTC/USD': 'Bitcoin BTC/USD current price today',
  'ETH/USD': 'Ethereum ETH/USD current price today',
  'US30': 'US30 Dow Jones current price today',
  'NAS100': 'NASDAQ 100 current price today',
  'GBP/JPY': 'GBP/JPY current price today forex',
  'AUD/USD': 'AUD/USD current price today forex',
  'USD/CAD': 'USD/CAD current price today forex',
  'NZD/USD': 'NZD/USD current price today forex',
  'USD/CHF': 'USD/CHF current price today forex',
  'EUR/GBP': 'EUR/GBP current price today forex',
  'US500': 'S&P 500 US500 current price today',
};

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

// Price cache (5 minute TTL)
const priceCache: Record<string, { data: MarketData; expiry: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function extractPriceFromText(text: string, pair: string): number | null {
  // Different patterns for different pairs
  const patterns: RegExp[] = [];

  if (pair === 'XAU/USD') {
    // Gold prices are typically 2000-3500
    patterns.push(/(\d{4,5}\.\d{1,2})/g);
  } else if (pair === 'BTC/USD') {
    // Bitcoin prices
    patterns.push(/(\d{5,6}\.?\d*)/g);
  } else if (pair === 'ETH/USD') {
    // Ethereum prices
    patterns.push(/(\d{3,5}\.?\d*)/g);
  } else if (pair === 'US30' || pair === 'US500' || pair === 'NAS100') {
    // Index prices
    patterns.push(/(\d{4,5}\.?\d*)/g);
  } else if (pair.includes('JPY')) {
    // JPY pairs: 140-160 range
    patterns.push(/(\d{2,3}\.\d{2,3})/g);
  } else {
    // Standard forex pairs like EUR/USD: 1.0xxx
    patterns.push(/(\d\.\d{4,5})/g);
  }

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const price = parseFloat(match[1]);
      if (!isNaN(price) && price > 0) {
        // Validate price range
        if (isValidPrice(pair, price)) {
          return price;
        }
      }
    }
  }

  return null;
}

function isValidPrice(pair: string, price: number): boolean {
  const ranges: Record<string, [number, number]> = {
    'EUR/USD': [0.9, 1.3],
    'GBP/USD': [1.1, 1.5],
    'USD/JPY': [100, 200],
    'XAU/USD': [1800, 5000],
    'BTC/USD': [20000, 200000],
    'ETH/USD': [1000, 10000],
    'US30': [30000, 50000],
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

export async function fetchRealPrice(pair: string): Promise<MarketData> {
  // Check cache first
  const cached = priceCache[pair];
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  try {
    const zai = await getZAI();
    const query = PAIR_SEARCH_QUERIES[pair] || `${pair} current price today trading`;

    const searchResult = await zai.functions.invoke("web_search", {
      query,
      num: 5,
    });

    // Combine all snippets into text
    const allText = (searchResult as Array<{ snippet: string; name: string }>)
      .map(r => `${r.name}: ${r.snippet}`)
      .join(' ');

    const price = extractPriceFromText(allText, pair);

    if (price) {
      // Estimate high/low based on pair volatility
      const volatilityMap: Record<string, number> = {
        'XAU/USD': 0.008,
        'BTC/USD': 0.03,
        'ETH/USD': 0.035,
        'EUR/USD': 0.005,
        'GBP/USD': 0.006,
        'USD/JPY': 0.006,
        'US30': 0.008,
        'NAS100': 0.012,
        'US500': 0.008,
      };
      const vol = volatilityMap[pair] || 0.006;
      const dailyRange = price * vol;

      const data: MarketData = {
        pair,
        price,
        change: 0,
        changePercent: 0,
        high: parseFloat((price + dailyRange * 0.5).toFixed(pair.includes('JPY') || pair === 'XAU/USD' || pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5)),
        low: parseFloat((price - dailyRange * 0.5).toFixed(pair.includes('JPY') || pair === 'XAU/USD' || pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5)),
        timestamp: new Date().toISOString(),
        source: 'web_search',
      };

      // Cache it
      priceCache[pair] = { data, expiry: Date.now() + CACHE_TTL };

      return data;
    }
  } catch (error) {
    console.error('Web search price fetch failed:', error);
  }

  // Fallback: try a more specific search
  try {
    const zai = await getZAI();
    const searchResult = await zai.functions.invoke("web_search", {
      query: `${pair} live price now`,
      num: 3,
    });

    const allText = (searchResult as Array<{ snippet: string; name: string }>)
      .map(r => `${r.name}: ${r.snippet}`)
      .join(' ');

    const price = extractPriceFromText(allText, pair);
    if (price) {
      const data: MarketData = {
        pair,
        price,
        change: 0,
        changePercent: 0,
        high: price * 1.003,
        low: price * 0.997,
        timestamp: new Date().toISOString(),
        source: 'web_search_fallback',
      };
      priceCache[pair] = { data, expiry: Date.now() + CACHE_TTL };
      return data;
    }
  } catch (error) {
    console.error('Fallback price fetch also failed:', error);
  }

  // Last resort: use AI to estimate
  try {
    const zai = await getZAI();
    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a financial data assistant. Return ONLY the current approximate price as a number. No explanation, no text, just the number.' },
        { role: 'user', content: `What is the current price of ${pair}? Return only the number.` },
      ],
      temperature: 0.1,
      max_tokens: 20,
    });

    const text = response?.choices?.[0]?.message?.content || '';
    const numMatch = text.match(/[\d.]+/);
    if (numMatch) {
      const price = parseFloat(numMatch[0]);
      if (price > 0 && isValidPrice(pair, price)) {
        const data: MarketData = {
          pair,
          price,
          change: 0,
          changePercent: 0,
          high: price * 1.003,
          low: price * 0.997,
          timestamp: new Date().toISOString(),
          source: 'ai_estimate',
        };
        priceCache[pair] = { data, expiry: Date.now() + CACHE_TTL };
        return data;
      }
    }
  } catch (error) {
    console.error('AI price estimate failed:', error);
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

  // Fetch in batches of 3 to avoid rate limiting
  for (let i = 0; i < pairs.length; i += 3) {
    const batch = pairs.slice(i, i + 3);
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
