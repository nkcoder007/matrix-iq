import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CORS_ORIGINS,
  DEFAULT_PDF_MAX_PAGES,
  DEFAULT_SESSION_SWEEP_MS,
  DEFAULT_SESSION_TTL_MS,
  DEFAULT_UPLOAD_MAX_BYTES,
  readCorsOrigins,
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
});
