// ICT Pattern Detection Logic
// Based on "Practical ICT Strategies" by Ayub Rana (5th Edition)
// And teachings of Michael J. Huddleston

import { Candle } from './trading-patterns';

// ─── ICT Pattern Result ──────────────────────────────────────────────
export interface ICTPatternResult {
  name: string;
  nameAr: string;
  type: 'bullish' | 'bearish' | 'neutral';
  category: 'pd_array' | 'liquidity' | 'structure' | 'timing';
  reliability: number; // 1-5
  descriptionAr: string;
  level?: number; // Key price level
}

// ─── Helper Functions ────────────────────────────────────────────────
function isBullish(c: Candle): boolean { return c.close > c.open; }
function isBearish(c: Candle): boolean { return c.close < c.open; }
function bodySize(c: Candle): number { return Math.abs(c.close - c.open); }
function upperShadow(c: Candle): number { return c.high - Math.max(c.open, c.close); }
function lowerShadow(c: Candle): number { return Math.min(c.open, c.close) - c.low; }

// ─── Order Block Detection ───────────────────────────────────────────
export function detectBullishOrderBlock(prev: Candle, curr: Candle): ICTPatternResult | null {
  if (isBearish(prev) && isBullish(curr)) {
    // Second candle engulfs first (body to body, wick to wick)
    if (curr.low <= prev.low && curr.high >= prev.high && bodySize(curr) > bodySize(prev) * 1.5) {
      return {
        name: 'Bullish Order Block',
        nameAr: 'أوردر بلوك صعودي',
        type: 'bullish',
        category: 'pd_array',
        reliability: 5,
        descriptionAr: 'منطقة أوامر مؤسسية صعودية - آخر شمعة هبوطية قبل الحركة الصعودية القوية. انتظر عودة السعر للدخول.',
        level: prev.high,
      };
    }
  }
  return null;
}

export function detectBearishOrderBlock(prev: Candle, curr: Candle): ICTPatternResult | null {
  if (isBullish(prev) && isBearish(curr)) {
    if (curr.high >= prev.high && curr.low <= prev.low && bodySize(curr) > bodySize(prev) * 1.5) {
      return {
        name: 'Bearish Order Block',
        nameAr: 'أوردر بلوك هبوطي',
        type: 'bearish',
        category: 'pd_array',
        reliability: 5,
        descriptionAr: 'منطقة أوامر مؤسسية هبوطية - آخر شمعة صعودية قبل الحركة الهبوطية القوية. انتظر عودة السعر للدخول.',
        level: prev.low,
      };
    }
  }
  return null;
}

// ─── Fair Value Gap Detection ────────────────────────────────────────
export function detectBullishFVG(c1: Candle, c2: Candle, c3: Candle): ICTPatternResult | null {
  // Bullish FVG: gap between c1 high and c3 low
  if (c1.high < c3.low && isBullish(c2)) {
    const gap = c3.low - c1.high;
    const avgRange = (c1.high - c1.low + c3.high - c3.low) / 2;
    if (gap > avgRange * 0.1) {
      return {
        name: 'Bullish Fair Value Gap',
        nameAr: 'فجوة القيمة العادلة الصعودية',
        type: 'bullish',
        category: 'pd_array',
        reliability: 5,
        descriptionAr: 'فجوة صعودية بين أعلى الشمعة الأولى وأدنى الثالثة - منطقة عدم كفاءة يعود السعر لملئها كدعم.',
        level: (c1.high + c3.low) / 2,
      };
    }
  }
  return null;
}

export function detectBearishFVG(c1: Candle, c2: Candle, c3: Candle): ICTPatternResult | null {
  // Bearish FVG: gap between c1 low and c3 high
  if (c1.low > c3.high && isBearish(c2)) {
    const gap = c1.low - c3.high;
    const avgRange = (c1.high - c1.low + c3.high - c3.low) / 2;
    if (gap > avgRange * 0.1) {
      return {
        name: 'Bearish Fair Value Gap',
        nameAr: 'فجوة القيمة العادلة الهبوطية',
        type: 'bearish',
        category: 'pd_array',
        reliability: 5,
        descriptionAr: 'فجوة هبوطية بين أدنى الشمعة الأولى وأعلى الثالثة - منطقة عدم كفاءة يعود السعر لملئها كمقاومة.',
        level: (c1.low + c3.high) / 2,
      };
    }
  }
  return null;
}

// ─── Breaker Block Detection ─────────────────────────────────────────
export function detectBullishBreaker(candles: Candle[]): ICTPatternResult | null {
  if (candles.length < 5) return null;
  const recent = candles.slice(-5);

  // Look for: liquidity sweep below + close above previous high = bullish breaker
  const low1 = recent[0].low;
  const low2 = recent[1].low;
  const swept = recent[2].low < Math.min(low1, low2);
  const reversed = recent[4].close > Math.max(recent[0].high, recent[1].high);

  if (swept && reversed) {
    return {
      name: 'Bullish Breaker Block',
      nameAr: 'بريكر بلوك صعودي',
      type: 'bullish',
      category: 'pd_array',
      reliability: 4,
      descriptionAr: 'أوردر بلوك هبوطي فاشل تحول لدعم بعد كنس السيولة - منطقة دخول صعودي قوية.',
      level: Math.max(recent[0].open, recent[0].close),
    };
  }
  return null;
}

export function detectBearishBreaker(candles: Candle[]): ICTPatternResult | null {
  if (candles.length < 5) return null;
  const recent = candles.slice(-5);

  const high1 = recent[0].high;
  const high2 = recent[1].high;
  const swept = recent[2].high > Math.max(high1, high2);
  const reversed = recent[4].close < Math.min(recent[0].low, recent[1].low);

  if (swept && reversed) {
    return {
      name: 'Bearish Breaker Block',
      nameAr: 'بريكر بلوك هبوطي',
      type: 'bearish',
      category: 'pd_array',
      reliability: 4,
      descriptionAr: 'أوردر بلوك صعودي فاشل تحول لمقاومة بعد كنس السيولة - منطقة دخول هبوطي قوية.',
      level: Math.min(recent[0].open, recent[0].close),
    };
  }
  return null;
}

// ─── Liquidity Sweep Detection ───────────────────────────────────────
export function detectLiquiditySweep(candles: Candle[]): ICTPatternResult | null {
  if (candles.length < 10) return null;

  // Find recent equal highs or equal lows (liquidity pools)
  const recent = candles.slice(-10);
  const highs = recent.map(c => c.high);
  const lows = recent.map(c => c.low);

  // Check for buy-side liquidity sweep (equal highs broken then reversed)
  const maxHigh = Math.max(...highs.slice(0, -2));
  const lastCandle = recent[recent.length - 1];

  // Buy-side liquidity sweep
  if (lastCandle.high > maxHigh && lastCandle.close < maxHigh) {
    return {
      name: 'Buy Side Liquidity Sweep',
      nameAr: 'كنس سيولة جانب الشراء',
      type: 'bearish',
      category: 'liquidity',
      reliability: 5,
      descriptionAr: 'السعر كسر القمة القديمة (كنس Buy Stops) ثم أغلق تحتها - إشارة انعكاس هبوطي قوية. الأموال الذكية صادرت أوامر الشراء.',
      level: maxHigh,
    };
  }

  // Sell-side liquidity sweep
  const minLow = Math.min(...lows.slice(0, -2));
  if (lastCandle.low < minLow && lastCandle.close > minLow) {
    return {
      name: 'Sell Side Liquidity Sweep',
      nameAr: 'كنس سيولة جانب البيع',
      type: 'bullish',
      category: 'liquidity',
      reliability: 5,
      descriptionAr: 'السعر كسر القاع القديم (كنس Sell Stops) ثم أغلق فوقه - إشارة انعكاس صعودي قوية. الأموال الذكية صادرت أوامر البيع.',
      level: minLow,
    };
  }

  return null;
}

// ─── Market Structure Shift (MSS) Detection ─────────────────────────
export function detectMSS(candles: Candle[]): ICTPatternResult | null {
  if (candles.length < 8) return null;

  const recent = candles.slice(-8);

  // Find swing highs and lows
  let swingHigh = { price: 0, index: -1 };
  let swingLow = { price: Infinity, index: -1 };

  for (let i = 1; i < recent.length - 3; i++) {
    if (recent[i].high > swingHigh.price) {
      swingHigh = { price: recent[i].high, index: i };
    }
    if (recent[i].low < swingLow.price) {
      swingLow = { price: recent[i].low, index: i };
    }
  }

  const lastCandle = recent[recent.length - 1];
  const prevCandle = recent[recent.length - 2];

  // Bullish MSS: price breaks above swing high with displacement
  if (lastCandle.close > swingHigh.price && bodySize(lastCandle) > bodySize(prevCandle) * 1.5) {
    return {
      name: 'Bullish Market Structure Shift',
      nameAr: 'تحول بنية صعودي (MSS)',
      type: 'bullish',
      category: 'structure',
      reliability: 5,
      descriptionAr: 'كسر قمة متأرجحة مع إزاحة صعودية قوية - إشارة تغيير بنية السوق من هبوطي لصعودي.',
      level: swingHigh.price,
    };
  }

  // Bearish MSS: price breaks below swing low with displacement
  if (lastCandle.close < swingLow.price && bodySize(lastCandle) > bodySize(prevCandle) * 1.5) {
    return {
      name: 'Bearish Market Structure Shift',
      nameAr: 'تحول بنية هبوطي (MSS)',
      type: 'bearish',
      category: 'structure',
      reliability: 5,
      descriptionAr: 'كسر قاع متأرجح مع إزاحة هبوطية قوية - إشارة تغيير بنية السوق من صعودي لهبوطي.',
      level: swingLow.price,
    };
  }

  return null;
}

// ─── AMD Pattern Detection ──────────────────────────────────────────
export function detectAMD(candles: Candle[]): ICTPatternResult | null {
  if (candles.length < 10) return null;

  const recent = candles.slice(-10);
  const first3 = recent.slice(0, 3);
  const middle4 = recent.slice(3, 7);
  const last3 = recent.slice(7);

  // Accumulation: tight range
  const firstRange = Math.max(...first3.map(c => c.high)) - Math.min(...first3.map(c => c.low));
  const avgBody = first3.reduce((a, c) => a + bodySize(c), 0) / 3;

  if (firstRange < avgBody * 5) { // Tight range = accumulation
    // Manipulation: false breakout
    const accumHigh = Math.max(...first3.map(c => c.high));
    const accumLow = Math.min(...first3.map(c => c.low));
    const midHigh = Math.max(...middle4.map(c => c.high));
    const midLow = Math.min(...middle4.map(c => c.low));

    const brokeUp = midHigh > accumHigh;
    const brokeDown = midLow < accumLow;

    if (brokeUp || brokeDown) {
      // Distribution: real move in opposite direction
      const lastClose = last3[last3.length - 1].close;
      const accumMid = (accumHigh + accumLow) / 2;

      if (brokeUp && lastClose < accumMid) {
        return {
          name: 'AMD Pattern (Bearish)',
          nameAr: 'نمط AMD هبوطي',
          type: 'bearish',
          category: 'structure',
          reliability: 5,
          descriptionAr: 'تراكم (نطاق ضيق) → تلاعب (كسر صعودي زائف) → توزيع (هبوط). الأموال الذكية خدعت المشترين ثم باعت.',
        };
      }

      if (brokeDown && lastClose > accumMid) {
        return {
          name: 'AMD Pattern (Bullish)',
          nameAr: 'نمط AMD صعودي',
          type: 'bullish',
          category: 'structure',
          reliability: 5,
          descriptionAr: 'تراكم (نطاق ضيق) → تلاعب (كسر هبوطي زائف) → توزيع (صعود). الأموال الذكية خدعت البائعين ثم اشترت.',
        };
      }
    }
  }

  return null;
}

// ─── CISD Detection ─────────────────────────────────────────────────
export function detectCISD(candles: Candle[]): ICTPatternResult | null {
  if (candles.length < 4) return null;

  const prev = candles[candles.length - 2];
  const curr = candles[candles.length - 1];

  // Bullish CISD: bearish delivery followed by close above bearish open
  if (isBearish(prev) && curr.close > prev.open) {
    return {
      name: 'Bullish CISD',
      nameAr: 'تغيير حالة التسليم الصعودي',
      type: 'bullish',
      category: 'structure',
      reliability: 4,
      descriptionAr: 'إغلاق فوق افتتاح الشمعة الهبوطية السابقة - تحول في اتجاه تسليم السعر للجانب الصعودي.',
    };
  }

  // Bearish CISD: bullish delivery followed by close below bullish open
  if (isBullish(prev) && curr.close < prev.open) {
    return {
      name: 'Bearish CISD',
      nameAr: 'تغيير حالة التسليم الهبوطي',
      type: 'bearish',
      category: 'structure',
      reliability: 4,
      descriptionAr: 'إغلاق تحت افتتاح الشمعة الصعودية السابقة - تحول في اتجاه تسليم السعر للجانب الهبوطي.',
    };
  }

  return null;
}

// ─── Rejection Block Detection ──────────────────────────────────────
export function detectRejectionBlock(candle: Candle): ICTPatternResult | null {
  const body = bodySize(candle);
  const lShadow = lowerShadow(candle);
  const uShadow = upperShadow(candle);
  const range = candle.high - candle.low;

  if (range === 0 || body === 0) return null;

  // Bullish rejection block: long lower wick (swept lows + rejected)
  if (lShadow >= 3 * body && uShadow <= body * 0.5 && body / range < 0.25) {
    return {
      name: 'Bullish Rejection Block',
      nameAr: 'بلوك الرفض الصعودي',
      type: 'bullish',
      category: 'pd_array',
      reliability: 4,
      descriptionAr: 'ظل سفلي طويل بعد كنس سيولة القيعان - رفض قوي للأسعار المنخفضة. انتظر عودة السعر للدخول.',
      level: Math.min(candle.open, candle.close),
    };
  }

  // Bearish rejection block: long upper wick (swept highs + rejected)
  if (uShadow >= 3 * body && lShadow <= body * 0.5 && body / range < 0.25) {
    return {
      name: 'Bearish Rejection Block',
      nameAr: 'بلوك الرفض الهبوطي',
      type: 'bearish',
      category: 'pd_array',
      reliability: 4,
      descriptionAr: 'ظل علوي طويل بعد كنس سيولة القمم - رفض قوي للأسعار المرتفعة. انتظر عودة السعر للدخول.',
      level: Math.max(candle.open, candle.close),
    };
  }

  return null;
}

// ─── Turtle Soup Detection ──────────────────────────────────────────
export function detectTurtleSoup(candles: Candle[]): ICTPatternResult | null {
  if (candles.length < 6) return null;

  const recent = candles.slice(-6);
  const range = recent.slice(0, -2);
  const rangeHigh = Math.max(...range.map(c => c.high));
  const rangeLow = Math.min(...range.map(c => c.low));
  const last = recent[recent.length - 1];
  const prev = recent[recent.length - 2];

  // Bullish turtle soup: price breaks below range then reverses
  if (prev.low < rangeLow && last.close > rangeLow) {
    return {
      name: 'Bullish Turtle Soup',
      nameAr: 'تيرتل سوب صعودي',
      type: 'bullish',
      category: 'liquidity',
      reliability: 4,
      descriptionAr: 'كسر زائف تحت نطاق الدعم ثم انعكاس صعودي - صيد أوامر البيع المعلقة. إشارة شراء قوية.',
    };
  }

  // Bearish turtle soup: price breaks above range then reverses
  if (prev.high > rangeHigh && last.close < rangeHigh) {
    return {
      name: 'Bearish Turtle Soup',
      nameAr: 'تيرتل سوب هبوطي',
      type: 'bearish',
      category: 'liquidity',
      reliability: 4,
      descriptionAr: 'كسر زائف فوق نطاق المقاومة ثم انعكاس هبوطي - صيد أوامر الشراء المعلقة. إشارة بيع قوية.',
    };
  }

  return null;
}

// ─── Main Detection Function ────────────────────────────────────────
export function detectAllICTPatterns(candles: Candle[]): ICTPatternResult[] {
  const patterns: ICTPatternResult[] = [];
  const len = candles.length;

  if (len < 2) return patterns;

  const prev = candles[len - 2];
  const curr = candles[len - 1];

  // PD-Arrays (2-candle)
  const twoCandle = [
    detectBullishOrderBlock(prev, curr),
    detectBearishOrderBlock(prev, curr),
  ];
  for (const p of twoCandle) if (p) patterns.push(p);

  // FVG (3-candle)
  if (len >= 3) {
    const c1 = candles[len - 3];
    const c2 = candles[len - 2];
    const c3 = candles[len - 1];
    const fvgChecks = [
      detectBullishFVG(c1, c2, c3),
      detectBearishFVG(c1, c2, c3),
    ];
    for (const p of fvgChecks) if (p) patterns.push(p);
  }

  // Breaker Blocks (5+ candle)
  if (len >= 5) {
    const breakerChecks = [
      detectBullishBreaker(candles),
      detectBearishBreaker(candles),
    ];
    for (const p of breakerChecks) if (p) patterns.push(p);
  }

  // Rejection Block (single candle)
  const rb = detectRejectionBlock(curr);
  if (rb) patterns.push(rb);

  // Liquidity
  const sweep = detectLiquiditySweep(candles);
  if (sweep) patterns.push(sweep);

  const turtleSoup = detectTurtleSoup(candles);
  if (turtleSoup) patterns.push(turtleSoup);

  // Structure
  const mss = detectMSS(candles);
  if (mss) patterns.push(mss);

  const cisd = detectCISD(candles);
  if (cisd) patterns.push(cisd);

  // AMD
  const amd = detectAMD(candles);
  if (amd) patterns.push(amd);

  return patterns;
}

// ─── ICT Premium/Discount Zone Calculator ───────────────────────────
export function calculatePDZones(candles: Candle[]): {
  equilibrium: number;
  premiumZone: { start: number; end: number };
  discountZone: { start: number; end: number };
  oteZone: { start: number; end: number }; // 61.8% - 79% retracement
} {
  if (candles.length < 20) {
    const price = candles[candles.length - 1]?.close || 1.0;
    return {
      equilibrium: price,
      premiumZone: { start: price, end: price * 1.01 },
      discountZone: { start: price * 0.99, end: price },
      oteZone: { start: price * 0.992, end: price * 0.996 },
    };
  }

  const recent = candles.slice(-20);
  const high = Math.max(...recent.map(c => c.high));
  const low = Math.min(...recent.map(c => c.low));
  const equilibrium = (high + low) / 2;

  // OTE = 61.8% to 79% retracement
  const range = high - low;
  const oteStart = high - range * 0.79; // 79% retracement from high
  const oteEnd = high - range * 0.618; // 61.8% retracement from high

  return {
    equilibrium,
    premiumZone: { start: equilibrium, end: high },
    discountZone: { start: low, end: equilibrium },
    oteZone: { start: oteStart, end: oteEnd },
  };
}

// ─── Kill Zone Time Calculator ──────────────────────────────────────
export function getCurrentKillZone(): {
  name: string;
  nameAr: string;
  active: boolean;
  nextKillZone: string;
  nextKillZoneAr: string;
} {
  const now = new Date();
  const estOffset = -5; // EST UTC offset
  const utcHour = now.getUTCHours();
  const estHour = (utcHour + estOffset + 24) % 24;

  // Kill zones in EST
  const killZones = [
    { start: 19, end: 22, name: 'Asian Kill Zone', nameAr: 'كيل زون آسيا' },
    { start: 2, end: 5, name: 'London Kill Zone', nameAr: 'كيل زون لندن' },
    { start: 7, end: 10, name: 'New York Kill Zone', nameAr: 'كيل زون نيويورك' },
    { start: 10, end: 12, name: 'London Close Kill Zone', nameAr: 'كيل زون إغلاق لندن' },
  ];

  for (const kz of killZones) {
    if (estHour >= kz.start && estHour < kz.end) {
      const nextIdx = (killZones.indexOf(kz) + 1) % killZones.length;
      return {
        name: kz.name,
        nameAr: kz.nameAr,
        active: true,
        nextKillZone: killZones[nextIdx].name,
        nextKillZoneAr: killZones[nextIdx].nameAr,
      };
    }
  }

  // Find next kill zone
  const sortedKZ = [...killZones].sort((a, b) => {
    const diffA = (a.start - estHour + 24) % 24;
    const diffB = (b.start - estHour + 24) % 24;
    return diffA - diffB;
  });

  return {
    name: 'No Active Kill Zone',
    nameAr: 'لا يوجد كيل زون نشط',
    active: false,
    nextKillZone: sortedKZ[0].name,
    nextKillZoneAr: sortedKZ[0].nameAr,
  };
}
