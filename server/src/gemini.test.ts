import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiProvider } from './services/ai/gemini';
import { AiProviderError } from './services/ai/types';
import type { AiConfig } from './config';

const CONFIG: AiConfig = {
  provider: 'gemini',
  apiKey: 'server-only-key',
  model: 'gemini-test',
  timeoutMs: 1000,
  maxDocumentChars: 1000,
  maxTotalChars: 4000,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Gemini provider transport', () => {
  it('parses a fenced JSON response and sends the key in a server header', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: '```json\n{"concepts":[],"connections":[]}\n```' }],
                },
              },
            ],
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const provider = new GeminiProvider(CONFIG);

    await expect(provider.analyze('prompt')).resolves.toEqual({
      concepts: [],
      connections: [],
    });

    const init = fetchMock.mock.calls[0]?.[1];
    if (!init) throw new Error('Expected a fetch request init.');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('gemini-test:generateContent');
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('server-only-key');
    expect(new Headers(init.headers).get('x-goog-api-key')).toBe('server-only-key');
  });

  it('maps rate limits and malformed responses to safe errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 429 })),
    );
    const provider = new GeminiProvider(CONFIG);
    await expect(provider.analyze('prompt')).rejects.toMatchObject({
      code: 'rate_limit',
      status: 429,
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'not json' }] } }],
          }),
          { status: 200 },
        ),
      ),
    );
    const malformed = new GeminiProvider(CONFIG);
    await expect(malformed.analyze('prompt')).rejects.toMatchObject({
      code: 'invalid_response',
    });
  });

  it('aborts a provider request after the configured timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: string | URL | Request, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const error = new Error('aborted');
              error.name = 'AbortError';
              reject(error);
            });
          }),
      ),
    );
    const provider = new GeminiProvider({ ...CONFIG, timeoutMs: 10 });

    await expect(provider.analyze('prompt')).rejects.toBeInstanceOf(AiProviderError);
    await expect(provider.analyze('prompt')).rejects.toMatchObject({
      code: 'timeout',
      status: 504,
    });
  });
});
