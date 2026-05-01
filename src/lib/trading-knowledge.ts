// Trading Knowledge Base - Based on "The Power of Japanese Candlestick Charts" by Fred K.H. Tam

export const CANDLESTICK_KNOWLEDGE = `
# Japanese Candlestick Patterns Reference
# Based on "The Power of Japanese Candlestick Charts" by Fred K.H. Tam

## Bullish Reversal Patterns:

### 1. Bullish Engulfing
- Consists of two candles: first black, second white
- The white candle's body completely engulfs the previous black candle's body
- Appears after a downtrend
- The larger the white candle's body, the stronger the signal
- Requires confirmation with higher volume

### 2. Hammer
- Appears after a downtrend
- Small body at the top with a long lower shadow (at least twice the body)
- Short or no upper shadow
- Color is not important but a white candle is stronger
- Indicates rejection of lower prices by sellers

### 3. Morning Star
- Three-candle pattern:
  - Long black candle
  - Small candle with a downside gap (body does not overlap with first candle)
  - White candle closing above the midpoint of the first candle
- One of the strongest bullish reversal signals

### 4. Doji at Bottom
- Appears after a downtrend
- Opening price nearly equals closing price
- Indicates market indecision and uncertainty
- Needs confirmation with a white candle in the next session

### 5. Piercing Line
- Two candles: black then white
- White candle opens below the black candle's low
- And closes above the midpoint of the black candle's body
- Strong bullish signal after a decline

### 6. Three White Soldiers
- Three consecutive white candles
- Each candle closes higher than the previous
- Each candle's open is within the previous candle's body
- Very strong bullish signal

### 7. Bullish Harami
- Large black candle followed by a small white candle
- Small candle's body is within the large candle's body
- Indicates weakening of sellers

### 8. Tweezers Bottom
- Two candles with the same low level
- Indicates a strong support level

## Bearish Reversal Patterns:

### 1. Bearish Engulfing
- White candle followed by a black candle that engulfs it
- Appears after an uptrend
- Strong bearish reversal signal

### 2. Hanging Man
- Same shape as a hammer but appears after an uptrend
- Small body at the top with a long lower shadow
- Indicates weakening of buyers

### 3. Evening Star
- Reverse of Morning Star:
  - Long white candle
  - Small candle with an upside gap
  - Black candle closing below the midpoint of the first candle

### 4. Doji at Top
- Appears after an uptrend
- Needs confirmation with a black candle

### 5. Dark Cloud Cover
- Reverse of Piercing Line
- White candle then black candle opening above the high
- And closing below the midpoint of the white candle's body

### 6. Three Black Crows
- Three consecutive black candles with lower closes
- Very strong bearish signal

### 7. Bearish Harami
- Large white candle followed by a small black candle
- Indicates weakening of buyers

### 8. Tweezers Top
- Two candles with the same high level
- Indicates a strong resistance level

## Continuation Patterns:

### 1. Rising Three Methods
- Long white candle
- Three small black candles correcting within the first candle's range
- White candle closing above the first candle's close
- Bullish continuation signal

### 2. Falling Three Methods
- Reverse of Rising Three Methods
- Bearish continuation signal

### 3. Windows/Gaps
- Upside gap: Bullish window (support)
- Downside gap: Bearish window (resistance)
- Windows act as support or resistance

### 4. Tasuki Gaps
- Upside gap with a correction partially filling the gap
- Continuation signal

## Western Indicators for Filtering:

### Moving Averages
- Golden Cross: MA5 crosses above MA20 (bullish)
- Death Cross: MA5 crosses below MA20 (bearish)

### MACD (12, 26, 9)
- Bullish crossover: MACD line crosses above signal line
- Bearish crossover: MACD line crosses below signal line
- Divergence is a strong signal

### RSI
- Above 70: Overbought
- Below 30: Oversold
- RSI divergence with price is a reversal signal

### Stochastic (%K, %D)
- %K crossing above %D in oversold zone: Bullish signal
- %K crossing below %D in overbought zone: Bearish signal

### Bollinger Bands
- Price touching upper band: Overbought
- Price touching lower band: Oversold
- Band narrowing indicates an upcoming breakout

### Volume
- High volume confirms the signal
- Low volume weakens the signal

## P.I. System for Systematic Trading:
- Buy signal: Bullish candlestick pattern + bullish MA crossover + RSI in oversold turning up
- Sell signal: Bearish candlestick pattern + bearish MA crossover + RSI in overbought turning down

## Sakata's Five Methods:
1. San-Zan (Three Mountains) - Triple top/bottom
2. San-Sen (Three Rivers) - Morning/Evening Star patterns
3. San-Ku (Three Gaps) - Three gap patterns
4. San-Pei (Three Parallel Lines) - Three Soldiers/Crows
5. San-Po (Three Methods) - Rising/Falling Three Methods
`;

export const SIGNAL_SYSTEM_PROMPT = `You are a professional trading bot specializing in Japanese Candlestick analysis and ICT Smart Money. Your name is "ICT Pro Bot".

You are an expert in financial market analysis using Japanese candlestick patterns, Western technical indicators, and ICT Smart Money concepts.

You use TradingView as your primary analysis tool - you read TradingView charts and analyze the technical indicators available on the platform (RSI, MACD, Moving Averages, Bollinger Bands, Stochastic, Volume Profile, Fibonacci Retracement, Order Block indicators, FVG indicators) to extract high-precision trading signals.

Your knowledge is based on "The Power of Japanese Candlestick Charts" by Fred K.H. Tam and "Practical ICT Strategies" by Ayub Rana.

Your trading rules:
1. Never give a signal unless there is a clear candlestick pattern + at least one technical indicator confirmation + ICT confirmation when possible
2. Always specify entry point, take profit, and stop loss
3. Risk/Reward ratio must be at least 1:2 (1:3 per ICT methodology)
4. Set confidence level based on the number of confirming indicators and ICT confluences
5. Use the P.I. system for systematic trading
6. Use Sakata's Five Methods as a framework
7. Integrate TradingView analysis with candlestick patterns and ICT for comprehensive analysis

When giving a trading signal, it must include:
- Signal type (BUY/SELL)
- Trading pair
- Entry point
- First and second take profit targets
- Stop loss
- Detected candlestick pattern
- Technical indicator values
- Confidence level (percentage)
- Risk/Reward ratio
- Logical reasoning for the signal

Always respond in English. Be professional and objective. Do not promise guaranteed results - trading involves risk.`;

export const ANALYSIS_SYSTEM_PROMPT = `You are an expert financial market analyst. You perform comprehensive analysis of the specified trading pair using:

1. Japanese Candlestick pattern analysis (reversal and continuation)
2. Western Technical Indicators (MA, MACD, RSI, Stochastic, Bollinger Bands)
3. Sakata's Five Methods framework
4. P.I. System for systematic trading

Provide detailed analysis including:
- Current trend (bullish/bearish/sideways)
- Detected candlestick patterns
- Technical indicator status
- Support and resistance levels
- Final recommendation

Respond in English. Be precise and professional.`;

export const SCAN_SYSTEM_PROMPT = `You are an expert market scanner. You scan multiple pairs looking for potential trading opportunities.

For each pair, determine:
- Is there a clear candlestick pattern?
- Do technical indicators support the direction?
- Opportunity level (high/medium/low)
- Initial recommendation

Rank opportunities by priority. Respond in English.`;

export const PAIRS = [
  { symbol: 'EUR/USD', name: 'Euro/Dollar', category: 'Forex' },
  { symbol: 'GBP/USD', name: 'Pound/Dollar', category: 'Forex' },
  { symbol: 'USD/JPY', name: 'Dollar/Yen', category: 'Forex' },
  { symbol: 'XAU/USD', name: 'Gold/Dollar', category: 'Metals' },
  { symbol: 'BTC/USD', name: 'Bitcoin/Dollar', category: 'Crypto' },
  { symbol: 'ETH/USD', name: 'Ethereum/Dollar', category: 'Crypto' },
  { symbol: 'US30', name: 'Dow Jones', category: 'Indices' },
  { symbol: 'NAS100', name: 'NASDAQ', category: 'Indices' },
  { symbol: 'GBP/JPY', name: 'Pound/Yen', category: 'Forex' },
  { symbol: 'AUD/USD', name: 'Aussie/Dollar', category: 'Forex' },
  { symbol: 'USD/CAD', name: 'Dollar/Cad', category: 'Forex' },
  { symbol: 'NZD/USD', name: 'Kiwi/Dollar', category: 'Forex' },
];

export const TIMEFRAMES = [
  { value: 'M15', label: '15 Min' },
  { value: 'H1', label: '1 Hour' },
  { value: 'H4', label: '4 Hours' },
  { value: 'D1', label: 'Daily' },
  { value: 'W1', label: 'Weekly' },
];
