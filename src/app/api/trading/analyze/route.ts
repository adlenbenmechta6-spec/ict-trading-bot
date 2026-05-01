import { NextRequest, NextResponse } from 'next/server';
import { ICT_ANALYSIS_SYSTEM_PROMPT, ICT_KNOWLEDGE } from '@/lib/ict-knowledge';
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

    const aiAnalysis = await chatCompletion({
      systemPrompt: ICT_ANALYSIS_SYSTEM_PROMPT + '\n\n' + CANDLESTICK_KNOWLEDGE + '\n\n' + ICT_KNOWLEDGE + `

أنت محلل أسواق محترف يجمع بين الشموع اليابانية (كتاب فريد تام) و ICT Smart Money (كتاب أيوب رانا).
السعر الحالي لـ ${pair} هو ${currentPrice} (سعر حقيقي من السوق الآن).
أنت تستخدم TradingView لتحليل الرسم البياني.

قدم تحليلاً شاملاً واقعياً يتضمن:
1. الاتجاه الحالي (صاعد/هابط/عرضي) مع السبب
2. أنماط الشموع المحتملة على الشارت
3. عناصر ICT (أوردر بلوك، FVG، سيولة، تحول بنية)
4. المؤشرات التقنية (RSI، MACD، المتوسطات)
5. مستويات الدعم والمقاومة الحقيقية
6. التوصية النهائية

كن واقعياً ومحترفاً. الأسعار التي تذكرها يجب أن تكون قريبة من السعر الحالي ${currentPrice}.
تحدث باللغة العربية. كن مفصلاً ولكن منظماً.`,
      userMessage: `قم بتحليل شامل لزوج ${pair} على الإطار الزمني ${timeframe}.

السعر الحالي الحقيقي: ${currentPrice}
أعلى سعر اليوم: ${marketData.high}
أدنى سعر اليوم: ${marketData.low}

كأنك تنظر إلى شارت TradingView الآن - ماذا ترى؟ ما هي فرص التداول؟`,
      temperature: 0.7,
      maxTokens: 1500,
    });

    // Determine trend from analysis text
    let trend = 'عرضي';
    if (aiAnalysis) {
      const lowerText = aiAnalysis.toLowerCase();
      if (lowerText.includes('صاعد') && !lowerText.includes('غير صاعد') && !lowerText.includes('ليس صاعد')) {
        trend = 'صاعد';
      } else if (lowerText.includes('هبوط') && !lowerText.includes('غير هبوطي') && !lowerText.includes('ليس هبوطي')) {
        trend = 'هبوطي';
      }
    }

    return NextResponse.json({
      success: true,
      pair,
      timeframe,
      currentPrice,
      trend,
      high: marketData.high,
      low: marketData.low,
      aiAnalysis: aiAnalysis || generateLocalAnalysis(pair, currentPrice, marketData, trend),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ success: false, error: 'فشل في التحليل' }, { status: 500 });
  }
}

function generateLocalAnalysis(
  pair: string, currentPrice: number,
  marketData: { high: number; low: number }, trend: string
): string {
  const range = marketData.high - marketData.low;
  const position = range > 0 ? ((currentPrice - marketData.low) / range * 100).toFixed(0) : '50';

  return `📊 تحليل شامل لزوج ${pair}

🔷 السعر الحالي: ${currentPrice}
🔷 الاتجاه: ${trend}
🔷 نطاق اليوم: ${marketData.low} - ${marketData.high}
🔷 موقع السعر: ${position}% من النطاق اليومي

🕯️ تحليل الشموع:
السعر يتداول ${parseFloat(position) < 40 ? 'في المنطقة السفلية مما يشير لاحتمال ارتداد صعودي' : parseFloat(position) > 60 ? 'في المنطقة العلوية مما يشير لاحتمال تصحيح هبوطي' : 'في المنتصف مما يشير لتردد'}

🏦 تحليل ICT:
${parseFloat(position) < 40 ? '✅ السعر في منطقة خصم (Discount) - بيئة مناسبة للشراء' : '⚠️ السعر في منطقة علاوة (Premium) - انتظر تصحيح'}
💧 السيولة: ${parseFloat(position) < 40 ? 'Sell Side Liquidity محتملة تحت القيعان' : 'Buy Side Liquidity محتملة فوق القمم'}

💡 التوصية: ${trend === 'صاعد' ? 'ابحث عن فرص شراء عند الدعم' : trend === 'هبوطي' ? 'ابحث عن فرص بيع عند المقاومة' : 'انتظر تأكيد اتجاه واضح'}`;
}
