# 🤖 ICT Trading Prediction Bot

Professional AI-powered trading prediction bot with a Telegram-style interface, combining **ICT Smart Money Concepts** with **Japanese Candlestick Pattern Analysis**.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)

---

## ✨ Features

### 📊 ICT Smart Money Concepts (SMC)
- **Order Block Detection** - Institutional order flow zones identification
- **Fair Value Gaps (FVG)** - Imbalance detection for high-probability entries
- **Liquidity Sweeps** - Stop hunt identification and liquidity pool mapping
- **Market Structure Shifts (MSS)** - Break of structure and change of character analysis
- **Optimal Trade Entry (OTE)** - Fibonacci-based optimal entry zones (0.62-0.79 retracement)
- **Killzone Timing** - London, New York, and Asian session killzone analysis
- **Institutional Order Flow** - Smart money footprint tracking

### 🕯️ Japanese Candlestick Patterns
- 15+ pattern recognition (Engulfing, Hammer, Morning/Evening Star, Doji, etc.)
- Multi-timeframe pattern confluence analysis
- Pattern reliability scoring and historical accuracy

### 🤖 AI-Powered Analysis
- AI chat with deep ICT and candlestick knowledge
- Real-time market analysis using advanced AI models
- Daily trade signal generation with confidence scoring

### 📱 Telegram-Style Interface
- Dark theme UI inspired by Telegram groups
- RTL Arabic language support
- Chat-style signal delivery
- Quick action buttons for fast analysis
- Embedded TradingView charts

---

## 🏗️ Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── trading/
│   │   │   ├── signal/route.ts    # Trade signal generation
│   │   │   ├── analyze/route.ts   # Market analysis endpoint
│   │   │   ├── chat/route.ts      # AI chat endpoint
│   │   │   └── scan/route.ts      # Market scanner
│   ├── globals.css                # Telegram dark theme styles
│   ├── layout.tsx                 # App layout with RTL support
│   └── page.tsx                   # Main Telegram-style UI
├── components/ui/                 # shadcn/ui components
├── hooks/                         # React hooks
├── lib/
│   ├── ai.ts                     # AI integration (z-ai-web-dev-sdk)
│   ├── ict-knowledge.ts          # ICT course knowledge base
│   ├── ict-patterns.ts           # ICT pattern detection engine
│   ├── trading-knowledge.ts      # Candlestick book knowledge base
│   ├── trading-patterns.ts       # Candlestick pattern engine
│   └── utils.ts                  # Utility functions
└── ...
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/adlenbenmechta6-spec/ict-trading-bot.git

# Navigate to project directory
cd ict-trading-bot

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/trading/signal` | GET | Generate trade signals with ICT & candlestick analysis |
| `/api/trading/analyze` | GET | Comprehensive market analysis |
| `/api/trading/chat` | POST | AI chat with trading knowledge |
| `/api/trading/scan` | GET | Market scanner for opportunities |

---

## 🧠 ICT Methodology Coverage

The bot is trained on comprehensive ICT (Inner Circle Trader) concepts:

1. **Smart Money Concepts (SMC)** - Understanding institutional order flow
2. **Order Blocks** - Identifying where institutions placed large orders
3. **Fair Value Gaps** - Price imbalances that tend to get filled
4. **Liquidity Sweeps** - Stop hunts before major moves
5. **Market Structure** - Higher highs/lows, breaks of structure
6. **Optimal Trade Entry** - Fibonacci retracement zones (0.62-0.79)
7. **Killzones** - High-probability trading sessions (London/NY open)
8. **Institutional Order Flow** - Tracking smart money movements
9. **Displacement** - Strong momentum candles indicating institutional activity
10. **Inducement** - False breakouts designed to trap retail traders

---

## 🕯️ Candlestick Patterns

The bot recognizes 15+ Japanese candlestick patterns:

| Pattern | Type | Signal |
|---------|------|--------|
| Bullish/Bearish Engulfing | Reversal | Strong |
| Hammer / Inverted Hammer | Reversal | Moderate |
| Morning/Evening Star | Reversal | Strong |
| Doji (All Types) | Indecision | Neutral |
| Shooting Star | Reversal | Moderate |
| Three White Soldiers | Continuation | Strong |
| Three Black Crows | Continuation | Strong |
| Spinning Top | Indecision | Weak |
| Marubozu | Continuation | Strong |

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS 4
- **UI Components**: shadcn/ui
- **AI Engine**: z-ai-web-dev-sdk
- **Charts**: TradingView Widget
- **Styling**: Custom Telegram dark theme with RTL support

---

## ⚠️ Disclaimer

This bot is for **educational and informational purposes only**. Trading involves significant risk of loss. Past performance is not indicative of future results. Always do your own research and never trade with money you cannot afford to lose.

---

## 📄 License

MIT License
