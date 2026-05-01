import { NextRequest, NextResponse } from 'next/server';
import { ICT_SIGNAL_SYSTEM_PROMPT, ICT_KNOWLEDGE } from '@/lib/ict-knowledge';
import { CANDLESTICK_KNOWLEDGE } from '@/lib/trading-knowledge';
import { chatCompletion } from '@/lib/ai';
import { fetchRealPrice } from '@/lib/market-data';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ success: false, error: 'الرسالة مطلوبة' }, { status: 400 });
    }

    // Check if user is asking about a specific pair's price
    const pairMatch = message.match(/(?:سعر|price|تحليل|analysis)\s*(?:لـ|ل|of|for)?\s*(EUR\/USD|GBP\/USD|USD\/JPY|XAU\/USD|BTC\/USD|ETH\/USD|US30|NAS100|US500|GBP\/JPY|AUD\/USD|USD\/CAD|NZD\/USD)/i);

    let priceContext = '';
    if (pairMatch) {
      const pair = pairMatch[1].toUpperCase();
      const marketData = await fetchRealPrice(pair);
      if (marketData.price > 0) {
        priceContext = `\n\nمعلومة: السعر الحالي لـ ${pair} هو ${marketData.price} (سعر حقيقي). نطاق اليوم: ${marketData.low} - ${marketData.high}.`;
      }
    }

    const aiResponse = await chatCompletion({
      systemPrompt: ICT_SIGNAL_SYSTEM_PROMPT + '\n\n' + CANDLESTICK_KNOWLEDGE + '\n\n' + ICT_KNOWLEDGE + `

أنت الآن في وضع الدردشة. أنت متداول محترف يجمع بين:
🕯️ الشموع اليابانية (كتاب فريد تام)
🏦 ICT / Smart Money (كتاب أيوب رانا)
📊 تحليل TradingView

المستخدم قد يسألك عن:
1. أنماط الشموع اليابانية وكيفية التعرف عليها
2. مفاهيم ICT: أوردر بلوك، بريكر بلوك، FVG، IFVG، BPR
3. السيولة المؤسسية: BSL، SSL، كنس السيولة
4. تحول بنية السوق: MSS، CISD، BOS
5. نمط AMD (تراكم-تلاعب-توزيع)
6. نظرية الوقت والسعر: كيل زون، سيلفر بوليت
7. استراتيجيات التداول وادارة المخاطر
8. أسعار الأزواج وتحليلاتها

أجب باللغة العربية. كن مفيداً وتعليمياً وواقعياً. استخدم الإيموجي بشكل مناسب.
إذا سُئلت عن سعر أو تحليل زوج معين، استخدم السعر الحقيقي المتاح لك.`,

      userMessage: message + priceContext,
      temperature: 0.8,
      maxTokens: 1000,
    });

    if (aiResponse) {
      return NextResponse.json({
        success: true,
        response: aiResponse,
        timestamp: new Date().toISOString(),
      });
    }

    // Fallback
    return NextResponse.json({
      success: true,
      response: '🤖 مرحباً! أنا بوت التداول الذكي. اسألني عن الشموع اليابانية، ICT، أو أي زوج تريد تحليله!',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ success: false, error: 'فشل في معالجة الرسالة' }, { status: 500 });
  }
}
