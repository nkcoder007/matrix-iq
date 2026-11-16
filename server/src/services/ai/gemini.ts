import type { AiConfig } from '../../config';
import { AiProviderError } from './types';
import type { AiProvider } from './types';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_OUTPUT_TOKENS = 16_384;

interface GeminiPart {
  text?: string;
  /** Gemini thinking models can return internal reasoning parts. */
  thought?: boolean;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
}

function responseText(payload: GeminiResponse): string {
  return (payload.candidates ?? [])
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => (!part.thought && typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim();
}

function stripJsonFence(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(stripJsonFence(value));
  } catch {
    throw new AiProviderError(
      'invalid_response',
      502,
      'The AI returned a response that was not valid JSON.',
    );
  }
}

export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  readonly model: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(config: AiConfig) {
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs;
  }

  async analyze(prompt: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      let response: Response;
      try {
        response = await fetch(
          `${GEMINI_ENDPOINT}/${encodeURIComponent(this.model)}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': this.apiKey,
            },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
                topP: 0.9,
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                responseMimeType: 'application/json',
              },
            }),
            signal: controller.signal,
          },
        );
      } catch (error) {
        if (controller.signal.aborted) {
          throw new AiProviderError(
            'timeout',
            504,
            'The AI analysis timed out. Try again with fewer or shorter sources.',
          );
        }
        if (error instanceof AiProviderError) throw error;
        throw new AiProviderError(
          'network',
          502,
          'The AI provider could not be reached. Check the server connection and try again.',
        );
      }

      if (!response.ok) {
        if (response.status === 429) {
          throw new AiProviderError(
            'rate_limit',
            429,
            'The AI provider is rate limiting requests. Try again shortly.',
          );
        }
        if (response.status === 401 || response.status === 403) {
          throw new AiProviderError(
            'provider',
            503,
            'The AI provider rejected the server credentials. Check the server configuration.',
          );
        }
        throw new AiProviderError(
          'provider',
          502,
          response.status >= 500
            ? 'The AI provider is temporarily unavailable. Try again shortly.'
            : 'The AI provider rejected the analysis request.',
        );
      }

      let payload: GeminiResponse;
      try {
        payload = (await response.json()) as GeminiResponse;
      } catch {
        if (controller.signal.aborted) {
          throw new AiProviderError(
            'timeout',
            504,
            'The AI analysis timed out. Try again with fewer or shorter sources.',
          );
        }
        throw new AiProviderError(
          'invalid_response',
          502,
          'The AI provider returned an unreadable response.',
        );
      }

      const text = responseText(payload);
      if (!text) {
        throw new AiProviderError(
          'invalid_response',
          502,
          'The AI provider returned no analysis text.',
        );
      }

      return parseJson(text);
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Returns null when no key is configured, allowing the rest of the app to run. */
export function createAiProvider(config: AiConfig): AiProvider | null {
  if (!config.apiKey) return null;
  return new GeminiProvider(config);
}
