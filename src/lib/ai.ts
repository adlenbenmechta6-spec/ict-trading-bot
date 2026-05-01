// AI utility using z-ai-web-dev-sdk
import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

export async function getAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
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

    return response?.choices?.[0]?.message?.content ?? null;
  } catch (error) {
    console.error('AI chat completion failed:', error);
    return null;
  }
}
