---
Task ID: 1
Agent: Main Agent
Task: Fix price delay and improve bot professionalism

Work Log:
- Analyzed the complete codebase (market-data.ts, signal/route.ts, analyze/route.ts, trend-analysis.ts, professional-trading-rules.ts, page.tsx)
- Identified root cause: Yahoo Finance regularMarketPrice is 15+ minutes delayed for XAU/USD and XAG/USD
- This caused SL to be placed on the wrong side of the real market price in SELL signals
- Implemented multi-source real-time price fetching system
- Added price freshness validation by comparing with latest candle close
- Added delay compensation for SL/TP calculations
- Added trading style recommendation based on data quality
- Fixed TypeScript errors in ConfluenceScore (grade→tier, score→total, parameter names)
- Updated UI to show delay warning and recommended trading style
- Successfully deployed to Vercel

Stage Summary:
- market-data.ts: Added Twelve Data (real-time), Finnhub (real-time), price freshness validation, delay compensation, trading style recommendation
- signal/route.ts: Added price quality assessment, delay compensation on SL, scalping warning, confidence cap for delayed data
- analyze/route.ts: Added price quality assessment and scalping warning
- page.tsx: Added delay warning component, real-time data indicator, recommended style display
- Build: Successful, deployed to https://ict-trading-bot-delta.vercel.app
