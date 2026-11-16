import { PDFParse } from 'pdf-parse';
import type { DocumentKind } from '../types';

export class DocumentExtractionError extends Error {
  readonly status: 400 | 413 | 422;

  constructor(message: string, status: 400 | 413 | 422 = 422) {
    super(message);
    this.name = 'DocumentExtractionError';
    this.status = status;
  }
}

export interface ExtractedText {
  text: string;
  words: number;
  pages?: number;
}

export function normalizeExtractedText(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\f/g, '\n\n')
    .replace(/\u0000/g, '')
    .replace(/[^\S\n]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '')
    .replace(/\s+$/, '');
}

export function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
}

function usableText(value: string): boolean {
  return value.replace(/\s+/gu, '').length > 0;
}

function decodeText(buffer: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new DocumentExtractionError('The text file is not valid UTF-8 text.', 422);
  }
}

export async function extractTextFromFile(
  buffer: Buffer,
  kind: Extract<DocumentKind, 'pdf' | 'markdown' | 'notes'>,
  maxPdfPages: number,
): Promise<ExtractedText> {
  if (kind !== 'pdf') {
    const text = normalizeExtractedText(decodeText(buffer));
    if (!usableText(text)) {
      throw new DocumentExtractionError('No readable text was found in this document.', 422);
    }
    return { text, words: countWords(text) };
  }

  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText({ pageJoiner: '', first: maxPdfPages });
    if (result.total > maxPdfPages) {
      throw new DocumentExtractionError(
        `The PDF has ${result.total} pages; the limit is ${maxPdfPages}.`,
        422,
      );
    }

    const joined = result.pages.map((page) => page.text).join('\n\n');
    const text = normalizeExtractedText(joined);
    if (!usableText(text)) {
      throw new DocumentExtractionError('No readable text was found in this document.', 422);
    }

    return { text, words: countWords(text), pages: result.total };
  } catch (error) {
    if (error instanceof DocumentExtractionError) throw error;
    throw new DocumentExtractionError(
      'The PDF could not be read. It may be corrupted or password-protected.',
      422,
    );
  } finally {
    if (parser) {
      await parser.destroy().catch(() => undefined);
    }
  }
}
