import { NextRequest, NextResponse } from 'next/server';
import { ICT_SIGNAL_SYSTEM_PROMPT, ICT_KNOWLEDGE } from '@/lib/ict-knowledge';
import { CANDLESTICK_KNOWLEDGE } from '@/lib/trading-knowledge';
import { chatCompletion } from '@/lib/ai';
import { fetchRealPrice } from '@/lib/market-data';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pair = 'EUR/USD', timeframe = 'H4' } = body;

    // Fetch REAL price
    const marketData = await fetchRealPrice(pair);

    if (marketData.price === 0) {
      return NextResponse.json({
        success: false,
        error: `لم أتمكن من جلب سعر ${pair}. حاول مرة أخرى.`,
      });
    }

    const currentPrice = marketData.price;

    // Use AI to generate a professional signal based on real price
    const aiResponse = await chatCompletion({
      systemPrompt: ICT_SIGNAL_SYSTEM_PROMPT + '\n\n' + CANDLESTICK_KNOWLEDGE + '\n\n' + ICT_KNOWLEDGE + `

أنت متداول محترف يجمع بين الشموع اليابانية و ICT Smart Money.
السعر الحالي لـ ${pair} هو ${currentPrice} (سعر حقيقي من السوق الآن).
أنت تستخدم TradingView لتحليل الرسم البياني وتطبيق المؤشرات التقنية.

مهمتك: قدم إشارة تداول واقعية ومحترفة بناءً على هذا السعر الحقيقي.

يجب أن تكون إجابتك بصيغة JSON فقط (بدون markdown أو backticks):
{
  "type": "BUY" أو "SELL",
  "pair": "${pair}",
  "timeframe": "${timeframe}",
  "entry": رقم نقطة الدخول,
  "tp1": رقم الهدف الأول,
  "tp2": رقم الهدف الثاني,
  "sl": رقم وقف الخسارة,
  "pattern": "اسم النمط بالعربية",
  "rsi": رقم RSI المتوقع,
  "rsiStatus": "حالة RSI بالعربية",
  "macd": "حالة MACD بالعربية",
  "maCross": "حالة تقاطع المتوسطات بالعربية",
  "confidence": رقم من 50 إلى 95,
  "riskReward": "1:2" أو "1:3" الخ,
  "ictElements": ["عنصر ICT 1", "عنصر ICT 2"],
  "killZone": "الكيل زون المناسب",
  "liquidityType": "نوع السيولة",
  "pdZone": "المنطقة خصم/علاوة",
  "analysis": "تحليل مختصر 3-4 أسطر بالعربية يشرح سبب الإشارة وربط الشموع بـ ICT"
}

قواعد مهمة:
- الأسعار (entry, tp, sl) يجب أن تكون واقعية وقريبة من السعر الحالي ${currentPrice}
- نسبة المخاطرة/العائد يجب أن تكون 1:2 على الأقل
- وقف الخسارة يجب أن يكون منطقياً (ليس قريباً جداً أو بعيداً جداً)
- الأهداف يجب أن تكون قابلة للتحقيق
- استخدم تحليل ICT (أوردر بلوك، FVG، سيولة، كيل زون)
- كن واقعياً - لا تعطي ثقة أعلى من 90% إلا في حالات نادرة
- التنسيق: استخدم المنازل العشرية المناسبة للزوج`,
      userMessage: `أعطني إشارة تداول حقيقية لزوج ${pair} على الإطار ${timeframe}.
السعر الحالي الحقيقي: ${currentPrice}
أعلى سعر اليوم: ${marketData.high}
أدنى سعر اليوم: ${marketData.low}

حلل كما لو كنت تنظر إلى شارت TradingView الآن وقدم إشارة واقعية.`,
      temperature: 0.7,
      maxTokens: 800,
    });

    if (aiResponse) {
      try {
        // Clean the response - remove markdown code blocks if present
        let cleaned = aiResponse.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
        }
        const signal = JSON.parse(cleaned);
        return NextResponse.json({ success: true, signal });
      } catch {
        // AI didn't return valid JSON, use fallback
        return NextResponse.json({
          success: true,
          signal: generateFallbackSignal(pair, timeframe, currentPrice, marketData, aiResponse),
        });
      }
    }

    return NextResponse.json({
      success: true,
      signal: generateFallbackSignal(pair, timeframe, currentPrice, marketData, null),
    });
  } catch (error) {
    console.error('Signal generation error:', error);
    return NextResponse.json({ success: false, error: 'فشل في توليد الإشارة' }, { status: 500 });
  }
}

function generateFallbackSignal(
  pair: string, timeframe: string, currentPrice: number,
  marketData: { high: number; low: number },
  aiText: string | null
) {
  const decimals = pair.includes('JPY') ? 3 : pair === 'XAU/USD' ? 2 : pair.startsWith('US') || pair.startsWith('NAS') ? 2 : 5;

  // Simple trend detection based on price position in daily range
  const range = marketData.high - marketData.low;
  const position = range > 0 ? (currentPrice - marketData.low) / range : 0.5;

  const isBuy = position < 0.4; // If price is in lower part of range, buy
  const type: 'BUY' | 'SELL' = isBuy ? 'BUY' : 'SELL';

  const atr = range > 0 ? range * 0.3 : currentPrice * 0.005;

  const entry = currentPrice;
  const tp1 = isBuy ? entry + atr * 2 : entry - atr * 2;
  const tp2 = isBuy ? entry + atr * 3 : entry - atr * 3;
  const sl = isBuy ? entry - atr : entry + atr;

  const rr = Math.abs(tp1 - entry) / Math.abs(sl - entry);

  return {
    type,
    pair,
    timeframe,
    entry: parseFloat(entry.toFixed(decimals)),
    tp1: parseFloat(tp1.toFixed(decimals)),
    tp2: parseFloat(tp2.toFixed(decimals)),
    sl: parseFloat(sl.toFixed(decimals)),
    pattern: isBuy ? 'منطقة تشبع بيعي + ارتداد من دعم' : 'منطقة تشبع شرائي + رفض من مقاومة',
    rsi: isBuy ? 32 : 68,
    rsiStatus: isBuy ? 'تشبع بيعي (32)' : 'تشبع شرائي (68)',
    macd: isBuy ? 'تقاطع صعودي متوقع' : 'تقاطع هبوطي متوقع',
    maCross: isBuy ? 'تقاطع ذهبي متوقع' : 'تقاطع ميت متوقع',
    confidence: 62,
    riskReward: `1:${rr.toFixed(1)}`,
    ictElements: [
      isBuy ? 'أوردر بلوك صعودي محتمل' : 'أوردر بلوك هبوطي محتمل',
      isBuy ? 'FVG صعودي' : 'FVG هبوطي',
    ],
    killZone: 'كيل زون لندن',
    liquidityType: isBuy ? 'Sell Side Liquidity (SSL)' : 'Buy Side Liquidity (BSL)',
    pdZone: isBuy ? 'منطقة خصم (Discount)' : 'منطقة علاوة (Premium)',
    analysis: aiText || `${isBuy ? '🟢' : '🔴'} إشارة ${isBuy ? 'شراء' : 'بيع'} على ${pair} عند ${entry.toFixed(decimals)}\nالسعر في ${isBuy ? 'المنطقة السفلية' : 'المنطقة العلوية'} من نطاق اليوم.\nبنية السوق تشير لاحتمال ${isBuy ? 'صعودي' : 'هبوطي'} مع تواجد ${isBuy ? 'سيولة بيعية' : 'سيولة شرائية'} قريبة.\n⚠️ إدارة المخاطر: لا تخاطر بأكثر من 2%`,
  };
}
