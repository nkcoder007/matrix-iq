import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CORS_ORIGINS,
  DEFAULT_PDF_MAX_PAGES,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_AI_TIMEOUT_MS,
  DEFAULT_SESSION_SWEEP_MS,
  DEFAULT_SESSION_TTL_MS,
  DEFAULT_UPLOAD_MAX_BYTES,
  readCorsOrigins,
  readAiConfig,
  readSessionStoreConfig,
  readUploadConfig,
} from './config';

describe('backend configuration', () => {
  it('uses a 30 minute default TTL and a 5 minute sweep', () => {
    const config = readSessionStoreConfig({});
    expect(config.ttlMs).toBe(DEFAULT_SESSION_TTL_MS);
    expect(config.sweepMs).toBe(DEFAULT_SESSION_SWEEP_MS);
    expect(config.ttlMs).toBe(30 * 60 * 1000);
  });

  it('reads positive session timing overrides from the environment', () => {
    const config = readSessionStoreConfig({
      SESSION_TTL_MS: '120000',
      SESSION_SWEEP_MS: '15000',
    });
    expect(config).toEqual({ ttlMs: 120000, sweepMs: 15000 });
  });

  it('falls back when a session timing value is invalid', () => {
    const config = readSessionStoreConfig({
      SESSION_TTL_MS: 'not-a-number',
      SESSION_SWEEP_MS: '0',
    });
    expect(config).toEqual({
      ttlMs: DEFAULT_SESSION_TTL_MS,
      sweepMs: DEFAULT_SESSION_SWEEP_MS,
    });
  });

  it('uses localhost defaults or a comma-separated CORS allowlist', () => {
    expect(readCorsOrigins({})).toEqual(DEFAULT_CORS_ORIGINS);
    expect(
      readCorsOrigins({
        CORS_ORIGINS: 'https://app.example.com, https://admin.example.com',
      }),
    ).toEqual(['https://app.example.com', 'https://admin.example.com']);
  });

  it('does not inherit localhost CORS origins in production', () => {
    expect(readCorsOrigins({ NODE_ENV: 'production' })).toEqual([]);
    expect(
      readCorsOrigins({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://matrixiq.vercel.app/, https://matrixiq.vercel.app',
      }),
    ).toEqual(['https://matrixiq.vercel.app']);
  });

  it('reads upload limits with safe defaults', () => {
    expect(readUploadConfig({})).toEqual({
      maxBytes: DEFAULT_UPLOAD_MAX_BYTES,
      maxPdfPages: DEFAULT_PDF_MAX_PAGES,
    });
    expect(readUploadConfig({ UPLOAD_MAX_BYTES: '2048', PDF_MAX_PAGES: '8' })).toEqual({
      maxBytes: 2048,
      maxPdfPages: 8,
    });
    expect(readUploadConfig({ UPLOAD_MAX_BYTES: '0', PDF_MAX_PAGES: 'nope' })).toEqual({
      maxBytes: DEFAULT_UPLOAD_MAX_BYTES,
      maxPdfPages: DEFAULT_PDF_MAX_PAGES,
    });
  });

  it('reads AI provider configuration without exposing the key to browser config', () => {
    expect(readAiConfig({})).toEqual({
      provider: 'gemini',
      apiKey: '',
      model: DEFAULT_GEMINI_MODEL,
      timeoutMs: DEFAULT_AI_TIMEOUT_MS,
      maxDocumentChars: 12_000,
      maxTotalChars: 60_000,
    });

    expect(
      readAiConfig({
        GEMINI_API_KEY: 'server-secret',
        GEMINI_MODEL: 'gemini-test',
        AI_TIMEOUT_MS: '9000',
        AI_MAX_DOCUMENT_CHARS: '5000',
        AI_MAX_TOTAL_CHARS: '20000',
      }),
    ).toEqual({
      provider: 'gemini',
      apiKey: 'server-secret',
      model: 'gemini-test',
      timeoutMs: 9000,
      maxDocumentChars: 5000,
      maxTotalChars: 20_000,
    });
  });
});
