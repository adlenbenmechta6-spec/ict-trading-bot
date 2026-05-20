// AI utility - Supports both z-ai-web-dev-sdk (internal) and Google Gemini API (Vercel/public)
// Priority: GEMINI_API_KEY env var → z-ai-web-dev-sdk config file → fallback

// ─── Google Gemini API ──────────────────────────────────────────────
async function geminiChatCompletion(options: {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string | null> {
  // API key with fallback for Vercel deployment (env vars must be set in Vercel dashboard)
  const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyCYb7IpKVy-9Vry6ct3B1nUgHjUCko1C5k';
  if (!apiKey) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: options.systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: options.userMessage }],
          },
        ],
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 1000,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      console.error('Gemini returned empty response');
      return null;
    }

    return content;
  } catch (error: any) {
    console.error('Gemini chat completion failed:', error?.message || error);
    return null;
  }
}

// ─── z-ai-web-dev-sdk (Internal) ────────────────────────────────────
let zaiInstance: Awaited<ReturnType<typeof import('z-ai-web-dev-sdk').default['create']>> | null = null;
let initPromise: Promise<any> | null = null;
let zaiAvailable = true;

async function getZAI() {
  if (!zaiAvailable) return null;

  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;

    if (zaiInstance) return zaiInstance;
    if (!initPromise) {
      initPromise = ZAI.create();
    }
    zaiInstance = await initPromise;
    return zaiInstance;
  } catch (error) {
    console.error('z-ai-web-dev-sdk not available:', error);
    zaiAvailable = false;
    initPromise = null;
    return null;
  }
}

async function zaiChatCompletion(options: {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string | null> {
  try {
    const zai = await getZAI();
    if (!zai) return null;

    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userMessage },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1000,
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content) {
      console.error('ZAI returned empty response');
      return null;
    }

    return content;
  } catch (error: any) {
    console.error('ZAI chat completion failed:', error?.message || error);
    return null;
  }
}

// ─── Unified Chat Completion ────────────────────────────────────────
export async function chatCompletion(options: {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string | null> {
  // Strategy 1: Try Google Gemini (always try — key has hardcoded fallback for Vercel)
  // CRITICAL FIX: Previously only tried Gemini if env var was set, but the key
  // is hardcoded as fallback inside geminiChatCompletion(). This caused "Failed to
  // generate signal" on Vercel when env vars weren't configured yet.
  const geminiResult = await geminiChatCompletion(options);
  if (geminiResult) return geminiResult;

  // Strategy 2: Try z-ai-web-dev-sdk (works in internal environment only)
  const zaiResult = await zaiChatCompletion(options);
  if (zaiResult) return zaiResult;

  // Both failed
  console.error('All AI providers failed');
  return null;
}
