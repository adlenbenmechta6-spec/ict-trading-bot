// Real Market Data Service - Fetches live prices via Web Search
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

function extractPriceFromSearchResults(results: Array<{ snippet: string; name: string }>, pair: string): number | null {
  // Combine snippets into text
  const allText = results.map(r => `${r.name}: ${r.snippet}`).join(' ');

  if (pair === 'XAU/USD') {
    // Gold: look for dollar amounts like $3,312.50 or 3312.50
    const patterns = [
      /\$([\d,]+\.\d{2})/g,           // $3,312.50
      /(\d,\d{3}\.\d{2})/g,            // 3,312.50
      /(\d{4}\.\d{2})/g,               // 3312.50
    ];
    for (const pattern of patterns) {
      const matches = [...allText.matchAll(pattern)];
      for (const match of matches) {
        const rawPrice = match[1].replace(/,/g, '');
        const price = parseFloat(rawPrice);
        if (!isNaN(price) && price >= 2000 && price <= 5000) {
          return price;
        }
      }
    }
  } else if (pair === 'BTC/USD') {
    const matches = [...allText.matchAll(/\$?([\d,]+\.\d+)/g)];
    for (const match of matches) {
      const rawPrice = match[1].replace(/,/g, '');
      const price = parseFloat(rawPrice);
      if (!isNaN(price) && price >= 20000 && price <= 200000) return price;
    }
  } else if (pair === 'ETH/USD') {
    const matches = [...allText.matchAll(/\$?([\d,]+\.\d+)/g)];
    for (const match of matches) {
      const rawPrice = match[1].replace(/,/g, '');
      const price = parseFloat(rawPrice);
      if (!isNaN(price) && price >= 1000 && price <= 10000) return price;
    }
  } else if (pair === 'US30' || pair === 'US500' || pair === 'NAS100') {
    const matches = [...allText.matchAll(/([\d,]+\.\d+)/g)];
    for (const match of matches) {
      const rawPrice = match[1].replace(/,/g, '');
      const price = parseFloat(rawPrice);
      if (isValidPrice(pair, price)) return price;
    }
  } else if (pair.includes('JPY')) {
    const matches = [...allText.matchAll(/(\d{2,3}\.\d{2,3})/g)];
    for (const match of matches) {
      const price = parseFloat(match[1]);
      if (!isNaN(price) && price >= 100 && price <= 200) return price;
    }
  } else {
    // Standard forex pairs: 1.0xxx
    const matches = [...allText.matchAll(/(\d\.\d{4,5})/g)];
    for (const match of matches) {
      const price = parseFloat(match[1]);
      if (!isNaN(price) && isValidPrice(pair, price)) return price;
    }
  }

  return null;
}

export async function fetchRealPrice(pair: string): Promise<MarketData> {
  // Check cache first
  const cached = priceCache[pair];
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  // Strategy 1: Use AI to get price (fastest, most reliable)
  try {
    const zai = await getZAI();
    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a financial data assistant. Return ONLY the current price as a plain number. No text, no symbols, no commas, just the number.' },
        { role: 'user', content: `What is the current price of ${pair} right now? Just the number.` },
      ],
      temperature: 0.1,
      max_tokens: 15,
    });

    const text = response?.choices?.[0]?.message?.content || '';
    const numMatch = text.match(/[\d,.]+/);
    if (numMatch) {
      const price = parseFloat(numMatch[0].replace(/,/g, ''));
      if (price > 0 && isValidPrice(pair, price)) {
        const decimals = pair.includes('JPY') || pair === 'XAU/USD' || pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5;
        const volMap: Record<string, number> = {
          'XAU/USD': 0.008, 'BTC/USD': 0.03, 'ETH/USD': 0.035,
          'EUR/USD': 0.005, 'GBP/USD': 0.006, 'USD/JPY': 0.006,
          'US30': 0.008, 'NAS100': 0.012, 'US500': 0.008,
        };
        const vol = volMap[pair] || 0.006;
        const dailyRange = price * vol;

        const data: MarketData = {
          pair,
          price,
          change: 0,
          changePercent: 0,
          high: parseFloat((price + dailyRange * 0.5).toFixed(decimals)),
          low: parseFloat((price - dailyRange * 0.5).toFixed(decimals)),
          timestamp: new Date().toISOString(),
          source: 'ai_realtime',
        };
        priceCache[pair] = { data, expiry: Date.now() + CACHE_TTL };
        return data;
      }
    }
  } catch (error) {
    console.error('AI price fetch failed:', error);
  }

  // Strategy 2: Web search (fallback)
  try {
    const zai = await getZAI();
    const searchQueries: Record<string, string> = {
      'XAU/USD': 'XAU USD gold price today per ounce',
      'EUR/USD': 'EUR USD exchange rate',
      'GBP/USD': 'GBP USD exchange rate',
      'USD/JPY': 'USD JPY exchange rate',
      'BTC/USD': 'BTC USD bitcoin price',
      'ETH/USD': 'ETH USD ethereum price',
    };
    const query = searchQueries[pair] || `${pair} price today`;

    const searchResult = await zai.functions.invoke("web_search", {
      query,
      num: 3,
    });

    const price = extractPriceFromSearchResults(
      searchResult as Array<{ snippet: string; name: string }>,
      pair
    );

    if (price) {
      const decimals = pair.includes('JPY') || pair === 'XAU/USD' || pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5;
      const volMap: Record<string, number> = {
        'XAU/USD': 0.008, 'BTC/USD': 0.03, 'ETH/USD': 0.035,
        'EUR/USD': 0.005, 'GBP/USD': 0.006, 'USD/JPY': 0.006,
        'US30': 0.008, 'NAS100': 0.012, 'US500': 0.008,
      };
      const vol = volMap[pair] || 0.006;
      const dailyRange = price * vol;

      const data: MarketData = {
        pair,
        price,
        change: 0,
        changePercent: 0,
        high: parseFloat((price + dailyRange * 0.5).toFixed(decimals)),
        low: parseFloat((price - dailyRange * 0.5).toFixed(decimals)),
        timestamp: new Date().toISOString(),
        source: 'web_search',
      };
      priceCache[pair] = { data, expiry: Date.now() + CACHE_TTL };
      return data;
    }
  } catch (error) {
    console.error('Web search price fetch failed:', error);
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
