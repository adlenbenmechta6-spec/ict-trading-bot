// AI utility using z-ai-web-dev-sdk
import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
let initPromise: Promise<Awaited<ReturnType<typeof ZAI.create>>> | null = null;

export async function getAI() {
  if (zaiInstance) return zaiInstance;

  // Prevent multiple simultaneous initializations
  if (!initPromise) {
    initPromise = ZAI.create();
  }

  try {
    zaiInstance = await initPromise;
    return zaiInstance;
  } catch (error) {
    console.error('Failed to initialize AI SDK:', error);
    initPromise = null; // Allow retry
    throw error;
  }
}

export async function chatCompletion(options: {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string | null> {
  try {
    const zai = await getAI();
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
      console.error('AI returned empty response');
      return null;
    }

    return content;
  } catch (error: any) {
    console.error('AI chat completion failed:', error?.message || error);
    return null;
  }
}
