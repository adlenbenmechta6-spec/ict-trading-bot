// Candlestick Pattern Definitions and Detection Logic
// Based on "The Power of Japanese Candlestick Charts" by Fred K.H. Tam

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  timestamp?: number;
}

export interface PatternResult {
  name: string;
  nameAr: string;
  type: 'bullish_reversal' | 'bearish_reversal' | 'bullish_continuation' | 'bearish_continuation' | 'neutral';
  reliability: number; // 1-5 stars
  description: string;
  descriptionAr: string;
}

// Helper functions
function isBullish(candle: Candle): boolean {
  return candle.close > candle.open;
}

function isBearish(candle: Candle): boolean {
  return candle.close < candle.open;
}

function bodySize(candle: Candle): number {
  return Math.abs(candle.close - candle.open);
}

function upperShadow(candle: Candle): number {
  return candle.high - Math.max(candle.open, candle.close);
}

function lowerShadow(candle: Candle): number {
  return Math.min(candle.open, candle.close) - candle.low;
}

function isDoji(candle: Candle): boolean {
  const body = bodySize(candle);
  const range = candle.high - candle.low;
  if (range === 0) return true;
  return body / range < 0.05;
}

// Pattern Detection Functions
export function detectBullishEngulfing(prev: Candle, curr: Candle): PatternResult | null {
  if (isBearish(prev) && isBullish(curr)) {
    if (curr.open <= prev.close && curr.close >= prev.open) {
      if (bodySize(curr) > bodySize(prev)) {
        return {
          name: 'Bullish Engulfing',
          nameAr: 'الابتلاع الصعودي',
          type: 'bullish_reversal',
          reliability: 4,
          description: 'A white candle completely engulfs the previous black candle, signaling bullish reversal.',
          descriptionAr: 'شمعة بيضاء تبتلع بالكامل الشمعة السوداء السابقة، إشارة انعكاس صعودي.',
        };
      }
    }
  }
  return null;
}

export function detectBearishEngulfing(prev: Candle, curr: Candle): PatternResult | null {
  if (isBullish(prev) && isBearish(curr)) {
    if (curr.open >= prev.close && curr.close <= prev.open) {
      if (bodySize(curr) > bodySize(prev)) {
        return {
          name: 'Bearish Engulfing',
          nameAr: 'الابتلاع الهبوطي',
          type: 'bearish_reversal',
          reliability: 4,
          description: 'A black candle completely engulfs the previous white candle, signaling bearish reversal.',
          descriptionAr: 'شمعة سوداء تبتلع بالكامل الشمعة البيضاء السابقة، إشارة انعكاس هبوطي.',
        };
      }
    }
  }
  return null;
}

export function detectHammer(candle: Candle): PatternResult | null {
  const body = bodySize(candle);
  const lShadow = lowerShadow(candle);
  const uShadow = upperShadow(candle);
  const range = candle.high - candle.low;

  if (range === 0) return null;
  if (lShadow >= 2 * body && uShadow <= body * 0.3 && body / range < 0.35) {
    return {
      name: 'Hammer',
      nameAr: 'المطرقة',
      type: 'bullish_reversal',
      reliability: 4,
      description: 'Small body at top with long lower shadow (2x body), appears after downtrend.',
      descriptionAr: 'جسم صغير في الأعلى وظل سفلي طويل (ضعف الجسم)، يظهر بعد اتجاه هابط.',
    };
  }
  return null;
}

export function detectHangingMan(candle: Candle): PatternResult | null {
  const body = bodySize(candle);
  const lShadow = lowerShadow(candle);
  const uShadow = upperShadow(candle);
  const range = candle.high - candle.low;

  if (range === 0) return null;
  if (lShadow >= 2 * body && uShadow <= body * 0.3 && body / range < 0.35) {
    return {
      name: 'Hanging Man',
      nameAr: 'الرجل المعلق',
      type: 'bearish_reversal',
      reliability: 3,
      description: 'Same shape as hammer but appears at top of uptrend, signaling potential reversal.',
      descriptionAr: 'نفس شكل المطرقة لكن يظهر في قمة الاتجاه الصاعد، إشارة انعكاس محتمل.',
    };
  }
  return null;
}

export function detectMorningStar(c1: Candle, c2: Candle, c3: Candle): PatternResult | null {
  if (isBearish(c1) && bodySize(c2) < bodySize(c1) * 0.3 && isBullish(c3)) {
    if (c3.close > (c1.open + c1.close) / 2) {
      return {
        name: 'Morning Star',
        nameAr: 'نجمة الصباح',
        type: 'bullish_reversal',
        reliability: 5,
        description: 'Black candle, small body gap down, white candle closing above midpoint of first candle.',
        descriptionAr: 'شمعة سوداء، فجوة هبوطية بجسم صغير، شمعة بيضاء تغلق فوق منتصف الشمعة الأولى.',
      };
    }
  }
  return null;
}

export function detectEveningStar(c1: Candle, c2: Candle, c3: Candle): PatternResult | null {
  if (isBullish(c1) && bodySize(c2) < bodySize(c1) * 0.3 && isBearish(c3)) {
    if (c3.close < (c1.open + c1.close) / 2) {
      return {
        name: 'Evening Star',
        nameAr: 'نجمة المساء',
        type: 'bearish_reversal',
        reliability: 5,
        description: 'White candle, small body gap up, black candle closing below midpoint of first candle.',
        descriptionAr: 'شمعة بيضاء، فجوة صعودية بجسم صغير، شمعة سوداء تغلق تحت منتصف الشمعة الأولى.',
      };
    }
  }
  return null;
}

export function detectDoji(candle: Candle): PatternResult | null {
  if (isDoji(candle)) {
    return {
      name: 'Doji',
      nameAr: 'الدوجي',
      type: 'neutral',
      reliability: 3,
      description: 'Open equals close, indicating market indecision. Needs confirmation.',
      descriptionAr: 'الافتتاح يساوي الإغلاق، يشير لتردد السوق. يحتاج تأكيد.',
    };
  }
  return null;
}

export function detectPiercingLine(prev: Candle, curr: Candle): PatternResult | null {
  if (isBearish(prev) && isBullish(curr)) {
    const midpoint = (prev.open + prev.close) / 2;
    if (curr.open < prev.low && curr.close > midpoint) {
      return {
        name: 'Piercing Line',
        nameAr: 'خط الاختراق',
        type: 'bullish_reversal',
        reliability: 4,
        description: 'Black candle then white candle opening below low but closing above midpoint.',
        descriptionAr: 'شمعة سوداء ثم بيضاء تفتح تحت الأدنى وتغلق فوق المنتصف.',
      };
    }
  }
  return null;
}

export function detectDarkCloudCover(prev: Candle, curr: Candle): PatternResult | null {
  if (isBullish(prev) && isBearish(curr)) {
    const midpoint = (prev.open + prev.close) / 2;
    if (curr.open > prev.high && curr.close < midpoint) {
      return {
        name: 'Dark Cloud Cover',
        nameAr: 'غطاء السحابة المظلمة',
        type: 'bearish_reversal',
        reliability: 4,
        description: 'White candle then black candle opening above high but closing below midpoint.',
        descriptionAr: 'شمعة بيضاء ثم سوداء تفتح فوق الأعلى وتغلق تحت المنتصف.',
      };
    }
  }
  return null;
}

export function detectThreeWhiteSoldiers(c1: Candle, c2: Candle, c3: Candle): PatternResult | null {
  if (isBullish(c1) && isBullish(c2) && isBullish(c3)) {
    if (c2.close > c1.close && c3.close > c2.close) {
      if (c2.open > c1.open && c2.open < c1.close && c3.open > c2.open && c3.open < c2.close) {
        return {
          name: 'Three White Soldiers',
          nameAr: 'الجنود البيض الثلاثة',
          type: 'bullish_reversal',
          reliability: 5,
          description: 'Three consecutive white candles with higher closes, strong bullish signal.',
          descriptionAr: 'ثلاث شمعات بيضاء متتالية بإغلاقات أعلى، إشارة صعودية قوية جداً.',
        };
      }
    }
  }
  return null;
}

export function detectThreeBlackCrows(c1: Candle, c2: Candle, c3: Candle): PatternResult | null {
  if (isBearish(c1) && isBearish(c2) && isBearish(c3)) {
    if (c2.close < c1.close && c3.close < c2.close) {
      if (c2.open < c1.open && c2.open > c1.close && c3.open < c2.open && c3.open > c2.close) {
        return {
          name: 'Three Black Crows',
          nameAr: 'الغربان السوداء الثلاثة',
          type: 'bearish_reversal',
          reliability: 5,
          description: 'Three consecutive black candles with lower closes, strong bearish signal.',
          descriptionAr: 'ثلاث شمعات سوداء متتالية بإغلاقات أدنى، إشارة هبوطية قوية جداً.',
        };
      }
    }
  }
  return null;
}

export function detectBullishHarami(prev: Candle, curr: Candle): PatternResult | null {
  if (isBearish(prev) && isBullish(curr)) {
    if (curr.open > prev.close && curr.close < prev.open) {
      return {
        name: 'Bullish Harami',
        nameAr: 'هارامي الصعودي',
        type: 'bullish_reversal',
        reliability: 3,
        description: 'Large black candle followed by small white candle inside its body.',
        descriptionAr: 'شمعة سوداء كبيرة تليها شمعة بيضاء صغيرة ضمن جسمها.',
      };
    }
  }
  return null;
}

export function detectBearishHarami(prev: Candle, curr: Candle): PatternResult | null {
  if (isBullish(prev) && isBearish(curr)) {
    if (curr.open < prev.close && curr.close > prev.open) {
      return {
        name: 'Bearish Harami',
        nameAr: 'هارامي الهبوطي',
        type: 'bearish_reversal',
        reliability: 3,
        description: 'Large white candle followed by small black candle inside its body.',
        descriptionAr: 'شمعة بيضاء كبيرة تليها شمعة سوداء صغيرة ضمن جسمها.',
      };
    }
  }
  return null;
}

export function detectTweezersBottom(c1: Candle, c2: Candle): PatternResult | null {
  if (Math.abs(c1.low - c2.low) < (c1.high - c1.low) * 0.02) {
    return {
      name: 'Tweezers Bottom',
      nameAr: 'ملقط القاع',
      type: 'bullish_reversal',
      reliability: 3,
      description: 'Two candles with same lows, indicating strong support level.',
      descriptionAr: 'شمعتان لهما نفس أدنى مستوى، يشير لمستوى دعم قوي.',
    };
  }
  return null;
}

export function detectTweezersTop(c1: Candle, c2: Candle): PatternResult | null {
  if (Math.abs(c1.high - c2.high) < (c1.high - c1.low) * 0.02) {
    return {
      name: 'Tweezers Top',
      nameAr: 'ملقط القمة',
      type: 'bearish_reversal',
      reliability: 3,
      description: 'Two candles with same highs, indicating strong resistance level.',
      descriptionAr: 'شمعتان لهما نفس أعلى مستوى، يشير لمستوى مقاومة قوي.',
    };
  }
  return null;
}

export function detectRisingThreeMethods(candles: Candle[]): PatternResult | null {
  if (candles.length < 5) return null;
  const [c1, c2, c3, c4, c5] = candles.slice(-5);

  if (isBullish(c1) && bodySize(c1) > 0 &&
      isBearish(c2) && isBearish(c3) && isBearish(c4) &&
      c2.close > c1.low && c3.close > c1.low && c4.close > c1.low &&
      isBullish(c5) && c5.close > c1.close) {
    return {
      name: 'Rising Three Methods',
      nameAr: 'طريقة الصعود الثلاثية',
      type: 'bullish_continuation',
      reliability: 4,
      description: 'Long white candle, three small black candles within its range, then another white candle.',
      descriptionAr: 'شمعة بيضاء طويلة، ثلاث شمعات سوداء صغيرة ضمن نطاقها، ثم شمعة بيضاء أخرى.',
    };
  }
  return null;
}

export function detectFallingThreeMethods(candles: Candle[]): PatternResult | null {
  if (candles.length < 5) return null;
  const [c1, c2, c3, c4, c5] = candles.slice(-5);

  if (isBearish(c1) && bodySize(c1) > 0 &&
      isBullish(c2) && isBullish(c3) && isBullish(c4) &&
      c2.close < c1.high && c3.close < c1.high && c4.close < c1.high &&
      isBearish(c5) && c5.close < c1.close) {
    return {
      name: 'Falling Three Methods',
      nameAr: 'طريقة الهبوط الثلاثية',
      type: 'bearish_continuation',
      reliability: 4,
      description: 'Long black candle, three small white candles within its range, then another black candle.',
      descriptionAr: 'شمعة سوداء طويلة، ثلاث شمعات بيضاء صغيرة ضمن نطاقها، ثم شمعة سوداء أخرى.',
    };
  }
  return null;
}

// Main detection function - scan all patterns
export function detectAllPatterns(candles: Candle[]): PatternResult[] {
  const patterns: PatternResult[] = [];
  const len = candles.length;

  if (len < 2) return patterns;

  // Two-candle patterns
  const prev = candles[len - 2];
  const curr = candles[len - 1];

  const twoCandleChecks = [
    detectBullishEngulfing(prev, curr),
    detectBearishEngulfing(prev, curr),
    detectPiercingLine(prev, curr),
    detectDarkCloudCover(prev, curr),
    detectBullishHarami(prev, curr),
    detectBearishHarami(prev, curr),
    detectTweezersBottom(prev, curr),
    detectTweezersTop(prev, curr),
  ];

  for (const p of twoCandleChecks) {
    if (p) patterns.push(p);
  }

  // Single candle patterns
  const singleChecks = [
    detectHammer(curr),
    detectHangingMan(curr),
    detectDoji(curr),
  ];

  for (const p of singleChecks) {
    if (p) patterns.push(p);
  }

  // Three-candle patterns
  if (len >= 3) {
    const c1 = candles[len - 3];
    const c2 = candles[len - 2];
    const c3 = candles[len - 1];

    const threeCandleChecks = [
      detectMorningStar(c1, c2, c3),
      detectEveningStar(c1, c2, c3),
      detectThreeWhiteSoldiers(c1, c2, c3),
      detectThreeBlackCrows(c1, c2, c3),
    ];

    for (const p of threeCandleChecks) {
      if (p) patterns.push(p);
    }
  }

  // Five-candle patterns
  if (len >= 5) {
    const fiveCandleChecks = [
      detectRisingThreeMethods(candles),
      detectFallingThreeMethods(candles),
    ];

    for (const p of fiveCandleChecks) {
      if (p) patterns.push(p);
    }
  }

  return patterns;
}

// Generate simulated market data for demo purposes
export function generateSimulatedCandles(count: number, basePrice: number, trend: 'up' | 'down' | 'sideways' = 'sideways'): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;

  for (let i = 0; i < count; i++) {
    const trendBias = trend === 'up' ? 0.002 : trend === 'down' ? -0.002 : 0;
    const change = (Math.random() - 0.5 + trendBias) * basePrice * 0.02;
    const open = price;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * basePrice * 0.005;
    const low = Math.min(open, close) - Math.random() * basePrice * 0.005;
    const volume = Math.floor(Math.random() * 10000) + 1000;

    candles.push({
      open: parseFloat(open.toFixed(5)),
      high: parseFloat(high.toFixed(5)),
      low: parseFloat(low.toFixed(5)),
      close: parseFloat(close.toFixed(5)),
      volume,
      timestamp: Date.now() - (count - i) * 3600000,
    });

    price = close;
  }

  return candles;
}

// Calculate technical indicators
export function calculateRSI(candles: Candle[], period: number = 14): number {
  if (candles.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = candles.length - period; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return parseFloat((100 - (100 / (1 + rs))).toFixed(1));
}

export function calculateMACD(candles: Candle[]): { macd: number; signal: number; histogram: number } {
  if (candles.length < 26) return { macd: 0, signal: 0, histogram: 0 };

  const ema = (data: number[], period: number): number => {
    const k = 2 / (period + 1);
    let emaValue = data[0];
    for (let i = 1; i < data.length; i++) {
      emaValue = data[i] * k + emaValue * (1 - k);
    }
    return emaValue;
  };

  const closes = candles.map(c => c.close);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12 - ema26;

  // Simplified signal line
  const macdValues = [];
  for (let i = 26; i <= closes.length; i++) {
    const slice = closes.slice(0, i);
    const e12 = ema(slice, 12);
    const e26 = ema(slice, 26);
    macdValues.push(e12 - e26);
  }

  const signalLine = macdValues.length >= 9 ? ema(macdValues, 9) : 0;
  const histogram = macdLine - signalLine;

  return {
    macd: parseFloat(macdLine.toFixed(5)),
    signal: parseFloat(signalLine.toFixed(5)),
    histogram: parseFloat(histogram.toFixed(5)),
  };
}

export function calculateMovingAverage(candles: Candle[], period: number): number {
  if (candles.length < period) return 0;
  const slice = candles.slice(-period);
  const sum = slice.reduce((acc, c) => acc + c.close, 0);
  return parseFloat((sum / period).toFixed(5));
}

export function calculateBollingerBands(candles: Candle[], period: number = 20): { upper: number; middle: number; lower: number } {
  if (candles.length < period) return { upper: 0, middle: 0, lower: 0 };

  const slice = candles.slice(-period);
  const middle = slice.reduce((acc, c) => acc + c.close, 0) / period;
  const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: parseFloat((middle + 2 * stdDev).toFixed(5)),
    middle: parseFloat(middle.toFixed(5)),
    lower: parseFloat((middle - 2 * stdDev).toFixed(5)),
  };
}

export function calculateStochastic(candles: Candle[], period: number = 14): { k: number; d: number } {
  if (candles.length < period) return { k: 50, d: 50 };

  const slice = candles.slice(-period);
  const high = Math.max(...slice.map(c => c.high));
  const low = Math.min(...slice.map(c => c.low));
  const close = slice[slice.length - 1].close;

  const k = high !== low ? ((close - low) / (high - low)) * 100 : 50;

  // Simplified %D
  const d = k * 0.8 + 50 * 0.2;

  return {
    k: parseFloat(k.toFixed(1)),
    d: parseFloat(d.toFixed(1)),
  };
}
