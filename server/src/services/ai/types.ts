export type AiErrorCode =
  | 'not_configured'
  | 'timeout'
  | 'rate_limit'
  | 'network'
  | 'provider'
  | 'invalid_response';

/** An error safe to show to an API caller. Never includes the API key. */
export class AiProviderError extends Error {
  readonly code: AiErrorCode;
  readonly status: number;

  constructor(code: AiErrorCode, status: number, message: string) {
    super(message);
    this.name = 'AiProviderError';
    this.code = code;
    this.status = status;
  }
}

export interface AiDocument {
  id: string;
  title: string;
  text: string;
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  /**
   * Sends a prompt and returns parsed JSON. Providers own transport and JSON
   * decoding; the analysis service owns schema validation.
   */
  analyze(prompt: string): Promise<unknown>;
}
