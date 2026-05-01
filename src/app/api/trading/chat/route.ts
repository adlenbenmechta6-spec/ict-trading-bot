import { NextRequest, NextResponse } from 'next/server';
import { SIGNAL_SYSTEM_PROMPT, CANDLESTICK_KNOWLEDGE } from '@/lib/trading-knowledge';
import { chatCompletion } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ success: false, error: 'الرسالة مطلوبة' }, { status: 400 });
    }

    const aiResponse = await chatCompletion({
      systemPrompt: SIGNAL_SYSTEM_PROMPT + '\n\n' + CANDLESTICK_KNOWLEDGE + `

أنت الآن في وضع الدردشة. المستخدم قد يسألك عن:
1. أنماط الشموع اليابانية وكيفية التعرف عليها
2. استراتيجيات التداول
3. المؤشرات التقنية
4. تفسير إشارات السوق
5. طرق ساكاتا الخمس
6. نظام P.I. للتداول المنهجي
7. أو أي سؤال متعلق بالتداول

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

    // Fallback: local pattern matching
    const lowerMsg = message.toLowerCase();
    let response = '';

    if (lowerMsg.includes('ابتلاع') || lowerMsg.includes('engulfing')) {
      response = `🕯️ نمط الابتلاع (Engulfing):

🟢 الابتلاع الصعودي:
• شمعة بيضاء تبتلع جسم الشمعة السوداء السابقة
• يظهر بعد اتجاه هابط
• إشارة انعكاس صعودي قوية
• يحتاج تأكيد بحجم تداول أعلى

🔴 الابتلاع الهبوطي:
• شمعة سوداء تبتلع جسم الشمعة البيضاء السابقة
• يظهر بعد اتجاه صاعد
• إشارة انعكاس هبوطي قوية

💡 كلما كان فرق حجم الجسمين أكبر، كانت الإشارة أقوى!`;
    } else if (lowerMsg.includes('مطرقة') || lowerMsg.includes('hammer')) {
      response = `🕯️ نمط المطرقة (Hammer):

📌 الشكل: جسم صغير في الأعلى + ظل سفلي طويل (ضعف الجسم)
📍 يظهر: بعد اتجاه هابط
🔄 الإشارة: انعكاس صعودي
⭐ الموثوقية: 4/5

💡 المطرقة المقلوبة (Inverted Hammer) لها ظل علوي طويل بدلاً من سفلي`;
    } else if (lowerMsg.includes('نجمة') || lowerMsg.includes('morning') || lowerMsg.includes('evening') || lowerMsg.includes('star')) {
      response = `🕯️ أنماط النجمة:

🟢 نجمة الصباح (Morning Star) - 3 شمعات:
1️⃣ شمعة سوداء طويلة
2️⃣ شمعة صغيرة بفجوة سفلية
3️⃣ شمعة بيضاء تغلق فوق منتصف الشمعة الأولى
⭐ الموثوقية: 5/5

🔴 نجمة المساء (Evening Star) - عكس نجمة الصباح
⭐ الموثوقية: 5/5

💡 من أقوى أنماط الانعكاس في الشموع اليابانية!`;
    } else if (lowerMsg.includes('ساكاتا') || lowerMsg.includes('sakata')) {
      response = `🏯 طرق ساكاتا الخمس:

1️⃣ سان-زان (ثلاث جبال) 🏔️ → قمة/قاع ثلاثي
2️⃣ سان-سن (ثلاث أنهار) 🌊 → نجمة الصباح/المساء
3️⃣ سان-كو (ثلاث فجوات) 📊 → أنماط الفجوات الثلاث
4️⃣ سان-بي (ثلاث خطوط متوازية) 📏 → الجنود/الغربان الثلاثة
5️⃣ سان-بو (ثلاث طرق) 🛤️ → طريقة الصعود/الهبوط الثلاثية

💡 هذه الطرق هي أساس تحليل الشموع اليابانية`;
    } else if (lowerMsg.includes('إشارة') || lowerMsg.includes('signal') || lowerMsg.includes('توصية')) {
      response = `📊 للحصول على إشارة تداول:

اضغط على زر "إشارة تداول" في الأسفل

أو اكتب أحد الأوامر:
• /signal EUR/USD - إشارة على اليورو/دولار
• /analyze XAU/USD - تحليل شامل للذهب
• /scan - مسح السوق للفرص`;
    } else {
      response = `🤖 مرحباً! أنا بدل توقعات الذكي

أستطيع مساعدتك في:
🕯️ أنماط الشموع اليابانية
📊 المؤشرات التقنية (RSI, MACD, MA, Bollinger)
📈 تحليل الأسواق المالية
🏯 طرق ساكاتا الخمس

استخدم الأزرار في الأسفل أو اكتب سؤالك!

⚠️ التحليلات للتوعية فقط وليست نصيحة مالية`;
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
