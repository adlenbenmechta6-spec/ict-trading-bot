import { NextRequest, NextResponse } from 'next/server';

// ─── HEALTH CHECK / DIAGNOSTIC ENDPOINT ──────────────────────────────
// Helps debug why signals fail on Vercel
export async function GET(req: NextRequest) {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {},
  };

  // 1. Check AI Provider availability
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasTwelveData = !!process.env.TWELVE_DATA_API_KEY;
  const hasFinnhub = !!process.env.FINNHUB_API_KEY;

  results.checks.ai_providers = {
    gemini: hasGemini ? 'CONFIGURED ✅' : 'NOT SET ❌ — Signal generation will use fallback only. Set GEMINI_API_KEY env var.',
    twelve_data: hasTwelveData ? 'CONFIGURED ✅' : 'NOT SET ⚠️ — Real-time price data unavailable. Set TWELVE_DATA_API_KEY for real-time prices.',
    finnhub: hasFinnhub ? 'CONFIGURED ✅' : 'NOT SET ⚠️ — Real-time forex data unavailable. Set FINNHUB_API_KEY for real-time prices.',
    z_ai_sdk: 'Internal only — NOT available on Vercel',
  };

  // 2. Test Gemini API connection
  if (hasGemini) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Reply with OK' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
        signal: AbortSignal.timeout(10000),
      });
      results.checks.gemini_test = response.ok ? 'WORKING ✅' : `FAILED ❌ — Status ${response.status}`;
    } catch (error: any) {
      results.checks.gemini_test = `FAILED ❌ — ${error?.message || 'Timeout'}`;
    }
  }

  // 3. Test Yahoo Finance connection
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1m&range=1d';
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
      results.checks.yahoo_finance = price ? `WORKING ✅ — EUR/USD: ${price}` : `PARTIAL ⚠️ — Response OK but no price data`;
    } else {
      results.checks.yahoo_finance = `BLOCKED ❌ — Status ${response.status}. Yahoo Finance may be blocked on this server. Set TWELVE_DATA_API_KEY or FINNHUB_API_KEY for alternative data sources.`;
    }
  } catch (error: any) {
    results.checks.yahoo_finance = `FAILED ❌ — ${error?.message || 'Connection error'}. Yahoo Finance is likely blocked on this server.`;
  }

  // 4. Test Twelve Data connection
  if (hasTwelveData) {
    try {
      const url = `https://api.twelvedata.com/price?symbol=EUR/USD&apikey=${process.env.TWELVE_DATA_API_KEY}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (response.ok) {
        const data = await response.json();
        results.checks.twelve_data_test = data.price ? `WORKING ✅ — EUR/USD: ${data.price}` : `FAILED ❌ — No price in response`;
      } else {
        results.checks.twelve_data_test = `FAILED ❌ — Status ${response.status}`;
      }
    } catch (error: any) {
      results.checks.twelve_data_test = `FAILED ❌ — ${error?.message || 'Timeout'}`;
    }
  }

  // 5. Overall status
  const canGetPrice = results.checks.yahoo_finance?.includes('WORKING') || results.checks.twelve_data_test?.includes('WORKING') || hasFinnhub;
  const canGenerateAI = hasGemini;
  const canWork = canGetPrice;

  results.overall = canWork
    ? 'OPERATIONAL ✅ — Bot can generate signals' + (canGenerateAI ? ' with AI analysis' : ' (fallback mode — set GEMINI_API_KEY for AI-powered signals)')
    : 'CRITICAL ❌ — No price data sources available. Set at least one: TWELVE_DATA_API_KEY, FINNHUB_API_KEY, or ensure Yahoo Finance is accessible.';

  results.required_env_vars = {
    GEMINI_API_KEY: 'Required for AI signal analysis on Vercel. Get free key at https://aistudio.google.com/apikey',
    TWELVE_DATA_API_KEY: 'Recommended for real-time price data. Free plan: 8 credits/min, 800/day. Get at https://twelvedata.com/',
    FINNHUB_API_KEY: 'Alternative for real-time forex data. Free plan available. Get at https://finnhub.io/',
  };

  return NextResponse.json(results, { status: canWork ? 200 : 503 });
}
