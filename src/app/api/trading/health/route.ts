import { NextRequest, NextResponse } from 'next/server';

// ─── HEALTH CHECK / DIAGNOSTIC ENDPOINT ──────────────────────────────
// Helps debug why signals fail on Vercel and which price sources work
export async function GET(req: NextRequest) {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {},
  };

  // 1. Check API key configuration
  const hasGemini = !!(process.env.GEMINI_API_KEY || 'AIzaSyCYb7IpKVy-9Vry6ct3B1nUgHjUCko1C5k');
  const hasTwelveData = !!(process.env.TWELVE_DATA_API_KEY || '6d1883e5a28241adb9d45ba7d2be7eda');
  const hasFinnhub = !!process.env.FINNHUB_API_KEY;

  results.checks.api_keys = {
    gemini: hasGemini ? 'CONFIGURED ✅' : 'NOT SET ❌',
    twelve_data: hasTwelveData ? 'CONFIGURED ✅' : 'NOT SET ⚠️',
    finnhub: hasFinnhub ? 'CONFIGURED ✅' : 'NOT SET ⚠️',
  };

  // 2. Test CoinGecko (PRIMARY — works from cloud IPs)
  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=kinesis-silver,tether-gold,bitcoin,ethereum&vs_currencies=usd';
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      const data = await response.json();
      const xagPrice = data?.['kinesis-silver']?.usd;
      const xauPrice = data?.['tether-gold']?.usd;
      const btcPrice = data?.bitcoin?.usd;
      results.checks.coingecko = xagPrice
        ? `WORKING ✅ — XAG/USD: ${xagPrice}, XAU/USD: ${xauPrice}, BTC/USD: ${btcPrice}`
        : `PARTIAL ⚠️ — Response OK but no price data`;
    } else {
      results.checks.coingecko = `BLOCKED ❌ — Status ${response.status}`;
    }
  } catch (error: any) {
    results.checks.coingecko = `FAILED ❌ — ${error?.message || 'Timeout'}`;
  }

  // 3. Test Binance Futures (may be blocked on Vercel)
  try {
    const url = 'https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=XAGUSDT';
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const data = await response.json();
      const price = data?.lastPrice;
      results.checks.binance = price
        ? `WORKING ✅ — XAG/USD: ${price}`
        : `PARTIAL ⚠️ — No price in response`;
    } else {
      results.checks.binance = `BLOCKED ❌ — Status ${response.status} (common on Vercel — CoinGecko is the backup)`;
    }
  } catch (error: any) {
    results.checks.binance = `BLOCKED ❌ — ${error?.message || 'Timeout'} (common on Vercel — CoinGecko is the backup)`;
  }

  // 4. Test Bybit (may be blocked on Vercel)
  try {
    const url = 'https://api.bybit.com/v5/market/tickers?category=linear&symbol=XAGUSDT';
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const data = await response.json();
      const price = data?.result?.list?.[0]?.lastPrice;
      results.checks.bybit = price
        ? `WORKING ✅ — XAG/USD: ${price}`
        : `PARTIAL ⚠️ — No price in response`;
    } else {
      results.checks.bybit = `BLOCKED ❌ — Status ${response.status}`;
    }
  } catch (error: any) {
    results.checks.bybit = `BLOCKED ❌ — ${error?.message || 'Timeout'}`;
  }

  // 5. Test OKX (may be blocked on Vercel)
  try {
    const url = 'https://www.okx.com/api/v5/market/ticker?instId=XAG-USDT-SWAP';
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const data = await response.json();
      const price = data?.data?.[0]?.last;
      results.checks.okx = price
        ? `WORKING ✅ — XAG/USD: ${price}`
        : `PARTIAL ⚠️ — No price in response`;
    } else {
      results.checks.okx = `BLOCKED ❌ — Status ${response.status}`;
    }
  } catch (error: any) {
    results.checks.okx = `BLOCKED ❌ — ${error?.message || 'Timeout'}`;
  }

  // 6. Test Gemini API
  if (hasGemini) {
    try {
      const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyCYb7IpKVy-9Vry6ct3B1nUgHjUCko1C5k';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Reply with OK' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
        signal: AbortSignal.timeout(10000),
      });
      results.checks.gemini = response.ok ? 'WORKING ✅' : `FAILED ❌ — Status ${response.status}`;
    } catch (error: any) {
      results.checks.gemini = `FAILED ❌ — ${error?.message || 'Timeout'}`;
    }
  }

  // 7. Test Twelve Data
  if (hasTwelveData) {
    try {
      const apiKey = process.env.TWELVE_DATA_API_KEY || '6d1883e5a28241adb9d45ba7d2be7eda';
      const url = `https://api.twelvedata.com/price?symbol=EUR/USD&apikey=${apiKey}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (response.ok) {
        const data = await response.json();
        results.checks.twelve_data = data.price ? `WORKING ✅ — EUR/USD: ${data.price}` : `FAILED ❌ — No price`;
      } else {
        results.checks.twelve_data = `FAILED ❌ — Status ${response.status}`;
      }
    } catch (error: any) {
      results.checks.twelve_data = `FAILED ❌ — ${error?.message || 'Timeout'}`;
    }
  }

  // 8. Test Yahoo Finance (DELAYED)
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/SI=F?interval=1m&range=1d';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      const data = await response.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      results.checks.yahoo_finance = price
        ? `WORKING ⚠️ (15-20min delayed) — XAG/USD: ${price}`
        : `PARTIAL ⚠️ — Response OK but no price data`;
    } else {
      results.checks.yahoo_finance = `BLOCKED ❌ — Status ${response.status}`;
    }
  } catch (error: any) {
    results.checks.yahoo_finance = `FAILED ❌ — ${error?.message || 'Timeout'}`;
  }

  // Overall status
  const hasRealtimePrice = results.checks.coingecko?.includes('WORKING')
    || results.checks.binance?.includes('WORKING')
    || results.checks.bybit?.includes('WORKING')
    || results.checks.okx?.includes('WORKING');
  const canWork = hasRealtimePrice || results.checks.yahoo_finance?.includes('WORKING');

  results.overall = hasRealtimePrice
    ? 'OPERATIONAL ✅ — Real-time prices available, bot will generate accurate signals'
    : canWork
      ? 'DEGRADED ⚠️ — Only delayed prices available (Yahoo Finance). Signals may have incorrect entry/SL/TP. CoinGecko should fix this on Vercel.'
      : 'CRITICAL ❌ — No price data sources available.';

  return NextResponse.json(results, { status: canWork ? 200 : 503 });
}
