import { NextRequest, NextResponse } from 'next/server';
import { SIGNAL_SYSTEM_PROMPT, CANDLESTICK_KNOWLEDGE } from '@/lib/trading-knowledge';
import { ICT_KNOWLEDGE, ICT_SIGNAL_SYSTEM_PROMPT } from '@/lib/ict-knowledge';
import { chatCompletion } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ success: false, error: 'الرسالة مطلوبة' }, { status: 400 });
    }

    const aiResponse = await chatCompletion({
      systemPrompt: ICT_SIGNAL_SYSTEM_PROMPT + '\n\n' + CANDLESTICK_KNOWLEDGE + '\n\n' + ICT_KNOWLEDGE + `

أنت الآن في وضع الدردشة. المستخدم قد يسألك عن:
1. أنماط الشموع اليابانية وكيفية التعرف عليها
2. مفاهيم ICT: أوردر بلوك، بريكر بلوك، FVG، IFVG، BPR
3. السيولة المؤسسية: BSL، SSL، كنس السيولة، تيرتل سوب
4. تحول بنية السوق: MSS، CISD، BOS، CHOCH
5. نمط AMD (تراكم-تلاعب-توزيع)
6. نظرية الوقت والسعر: كيل زون، سيلفر بوليت، ماكرو ICT
7. نماذج صانع السوق: MMBM، MMSM
8. استراتيجيات التداول وادارة المخاطر

أجب باللغة العربية. كن مفيداً وتعليمياً. استخدم الإيموجي بشكل مناسب. كن مختصراً ومفيداً.`,
      userMessage: message,
      temperature: 0.8,
      maxTokens: 800,
    });

    if (aiResponse) {
      return NextResponse.json({
        success: true,
        response: aiResponse,
        timestamp: new Date().toISOString(),
      });
    }

    // Fallback
    const lowerMsg = message.toLowerCase();
    let response = '';

    if (lowerMsg.includes('أوردر بلوك') || lowerMsg.includes('order block')) {
      response = `🏦 أوردر بلوك (Order Block):

🟢 أوردر بلوك صعودي:
- آخر شمعة هبوطية قبل الحركة الصعودية القوية
- الشمعة الصعودية تبتلع الهبوطية (جسم + ظل)
- يتطلب: اختلال + تحول بنية في الإطار الأدنى

🔴 أوردر بلوك هبوطي:
- آخر شمعة صعودية قبل الحركة الهبوطية القوية
- نفس الشروط بالعكس

💡 طريقة التداول: انتظر عودة السعر للأوردر بلوك ثم ادخل في اتجاه الحركة القوية`;
    } else if (lowerMsg.includes('fvg') || lowerMsg.includes('فير فاليو') || lowerMsg.includes('فجوة القيمة')) {
      response = `💧 فجوة القيمة العادلة (FVG):

بنية من 3 شمعات - فجوة بين الشمعة 1 و 3:
🟢 FVG صعودي: فجوة بين أعلى شمعة 1 وأدنى شمعة 3
🔴 FVG هبوطي: فجوة بين أدنى شمعة 1 وأعلى شمعة 3

💡 السعر يعود لملء الفجوة:
- FVG صعودي = دعم قوي
- FVG هبوطي = مقاومة قوية

📌 SIBI = FVG هبوطي | BISI = FVG صعودي`;
    } else if (lowerMsg.includes('كيل زون') || lowerMsg.includes('kill zone')) {
      response = `⏰ كيل زون ICT:

فترات ذات حجم تداول عالي:
🌏 آسيا: 7-10 PM (نيويورك)
🇬🇧 لندن: 2-5 AM (نيويورك) ← الأفضل
🇺🇸 نيويورك: 7-10 AM (نيويورك)
🔒 إغلاق لندن: 10 AM-12 PM (نيويورك)

💡 لندن كيل زون = أعلى احتمال لحركة اتجاهية (30+ نقطة)`;
    } else if (lowerMsg.includes('سيلفر بوليت') || lowerMsg.includes('silver bullet')) {
      response = `🎯 سيلفر بوليت ICT:

استراتيجية تحدث 3 مرات يومياً:
🇬🇧 لندن: 10-11 AM GMT
🇺🇸 نيويورك صباح: 2-3 PM GMT
🇺🇸 نيويورك مساء: 6-7 PM GMT

خطوات:
1️⃣ حدد BSL و SSL على 15 دقيقة
2️⃣ انتظر كنس السيولة
3️⃣ بعد MSS في اتجاه السيولة التالية
4️⃣ ادخل عند FVG`;
    } else if (lowerMsg.includes('سيولة') || lowerMsg.includes('liquidity')) {
      response = `💧 السيولة المؤسسية:

🟢 BSL (Buy Side Liquidity):
- أوامر شراء معلقة فوق القمم القديمة
- صانعو السوق يستهدفونها ثم يعكسون السعر

🔴 SSL (Sell Side Liquidity):
- أوامر بيع معلقة تحت القيعان القديمة
- صانعو السوق يستهدفونها ثم يعكسون السعر

💡 القاعدة: بعد كنس السيولة = انعكاس محتمل`;
    } else if (lowerMsg.includes('mss') || lowerMsg.includes('تحول بنية')) {
      response = `🔄 تحول بنية السوق (MSS):

إشارة أولية لعكس الاتجاه:
- كسر قمة/قاع متأرجح مع إزاحة قوية
- يجب أن يكون معه حركة إزاحة (Displacement)

🟢 MSS صعودي: كسر قمة سابقة بإزاحة صعودية
🔴 MSS هبوطي: كسر قاع سابق بإزاحة هبوطية

💡 MSS هو أول تأكيد للدخول بعد كنس السيولة`;
    } else if (lowerMsg.includes('amd') || lowerMsg.includes('تراكم')) {
      response = `🔄 نمط AMD:

1️⃣ تراكم (Accumulation):
- نطاق ضيق عند الافتتاح
- الأموال الذكية تجمع مراكزها

2️⃣ تلاعب (Manipulation):
- حركة خاطئة (كسر زائف)
- خداع المتداولين الأفراد

3️⃣ توزيع (Distribution):
- الحركة الحقيقية في الاتجاه المقصود
- الأموال الذكية توزع أرباحها

💡 هذا النمط يتكرر في كل الإطارات الزمنية!`;
    } else if (lowerMsg.includes('ابتلاع') || lowerMsg.includes('engulfing')) {
      response = `🕯️ نمط الابتلاع (Engulfing):

🟢 الابتلاع الصعودي: شمعة بيضاء تبتلع السوداء ← انعكاس صعودي
🔴 الابتلاع الهبوطي: شمعة سوداء تبتلع البيضاء ← انعكاس هبوطي

🏦 ربط مع ICT: الابتلاع الصعودي غالباً = أوردر بلوك صعودي!
💡 كلما كان الفرق أكبر = الإشارة أقوى`;
    } else {
      response = `🤖 مرحباً! أنا بدل توقعات الذكي

أجمع بين مدرستين:
🕯️ الشموع اليابانية (فريد تام)
🏦 ICT / Smart Money (أيوب رانا)

أسئلة شائعة:
🏦 "اشرح لي الأوردر بلوك" 
💧 "ما هو FVG؟"
⏰ "ما هي الكيل زون؟"
🎯 "اشرح سيلفر بوليت"
🔄 "ما هو نمط AMD؟"
💧 "ما هي السيولة المؤسسية؟"

أو استخدم الأزرار في الأسفل!`;
    }

    return NextResponse.json({
      success: true, response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ success: false, error: 'فشل في معالجة الرسالة' }, { status: 500 });
  }
}
