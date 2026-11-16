import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../app';
import type { UploadConfig } from '../config';
import {
  countWords,
  DocumentExtractionError,
  extractTextFromFile,
  normalizeExtractedText,
} from '../services/textExtraction';
import type {
  Concept,
  Connection,
  DocumentKind,
  Insight,
  KnowledgeDocument,
  SessionData,
  Workspace,
} from '../types';

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface SourceText {
  text: string;
  words: number;
  pages?: number;
}

interface SourceMetadata {
  kind: Extract<DocumentKind, 'pdf' | 'markdown' | 'notes'>;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  title: string;
  buffer?: Buffer;
}

type SourceResponse = Omit<
  KnowledgeDocument,
  'sessionId' | 'workspaceId' | 'originKey' | 'fileKey'
>;

function nowIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function uploadLimitLabel(maxBytes: number): string {
  return maxBytes >= 1024 * 1024
    ? `${Math.round(maxBytes / 1024 / 1024)} MB`
    : `${Math.ceil(maxBytes / 1024)} KB`;
}

function isUploadedFile(value: unknown): value is UploadedFile {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<UploadedFile>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.size === 'number' &&
    typeof candidate.arrayBuffer === 'function'
  );
}

function safeFileName(value: string): string {
  const safe = value
    .replace(/[\\/]/g, '_')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 240);
  return safe || 'document';
}

function fileKind(fileName: string, mimeType: string): SourceMetadata['kind'] {
  const lowerName = fileName.toLowerCase();
  const extension = lowerName.split('.').pop() ?? '';
  const normalizedMime = mimeType.toLowerCase().split(';')[0]?.trim() ?? '';

  if (extension === 'pdf') {
    if (normalizedMime && normalizedMime !== 'application/pdf' && normalizedMime !== 'application/x-pdf') {
      throw new HTTPException(415, { message: 'The PDF MIME type is not supported.' });
    }
    return 'pdf';
  }

  if (extension === 'txt') {
    if (normalizedMime && normalizedMime !== 'text/plain') {
      throw new HTTPException(415, { message: 'The text file MIME type is not supported.' });
    }
    return 'notes';
  }

  if (extension === 'md' || extension === 'markdown') {
    if (
      normalizedMime &&
      normalizedMime !== 'text/plain' &&
      normalizedMime !== 'text/markdown'
    ) {
      throw new HTTPException(415, {
        message: 'The Markdown file MIME type is not supported.',
      });
    }
    return 'markdown';
  }

  throw new HTTPException(415, {
    message: 'Unsupported file type. Upload a PDF, TXT or Markdown file.',
  });
}

function readTitle(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new HTTPException(400, { message: 'The source title must be text.' });
  }
  const title = value.trim();
  if (title.length > 200) {
    throw new HTTPException(400, { message: 'The source title is too long.' });
  }
  return title || undefined;
}

function readContent(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new HTTPException(400, { message: 'Pasted content must be text.' });
  }
  return value;
}

function sourceTitle(fileName?: string, title?: string): string {
  if (title) return title;
  if (!fileName) return 'Pasted note';
  return fileName.replace(/\.[^.]+$/, '').trim() || 'Untitled document';
}

function excerptOf(text: string): string {
  const flat = text.replace(/\s+/gu, ' ').trim();
  return flat.length > 280 ? `${flat.slice(0, 279).trimEnd()}…` : flat;
}

function subtypeLabel(kind: DocumentKind, fileName?: string, pages?: number): string {
  if (kind === 'pdf') {
    return `${fileName ?? 'PDF'} · ${pages ?? 1} ${pages === 1 ? 'page' : 'pages'}`;
  }
  if (fileName) return fileName;
  return 'Pasted text';
}

function toSourceResponse(document: KnowledgeDocument, includeContent: boolean): SourceResponse {
  const response: SourceResponse = {
    id: document.id,
    title: document.title,
    subtitle: document.subtitle,
    kind: document.kind,
    source: document.source,
    addedAt: document.addedAt,
    words: document.words,
    pages: document.pages,
    entries: document.entries,
    excerpt: document.excerpt,
    summary: document.summary,
    conceptIds: document.conceptIds,
    fileName: document.fileName,
    mimeType: document.mimeType,
    fileSize: document.fileSize,
    status: document.status,
  };
  if (includeContent) response.content = document.content;
  return response;
}

function findWorkspace(
  sessionId: string,
  sessionWorkspaces: Workspace[],
  id: string,
): Workspace {
  const workspace = sessionWorkspaces.find((item) => item.id === id);
  if (!workspace || workspace.sessionId !== sessionId) {
    throw new HTTPException(404, { message: 'Project not found.' });
  }
  return workspace;
}

function findDocument(
  session: SessionData,
  workspace: Workspace,
  sourceId: string,
): KnowledgeDocument {
  if (!workspace.documentIds.includes(sourceId)) {
    throw new HTTPException(404, { message: 'Source not found.' });
  }
  const document = session.documents.find(
    (item) => item.id === sourceId && item.workspaceId === workspace.id,
  );
  if (!document) {
    throw new HTTPException(404, { message: 'Source not found.' });
  }
  return document;
}

function removeSource(
  session: SessionData,
  workspace: Workspace,
  document: KnowledgeDocument,
): void {
  session.documents = session.documents.filter((item) => item.id !== document.id);
  workspace.documentIds = workspace.documentIds.filter((id) => id !== document.id);

  const removedConceptIds = new Set<string>();
  session.concepts = session.concepts.filter((concept: Concept) => {
    const hasOtherDocument = concept.documentIds.some((id) => id !== document.id);
    if (!hasOtherDocument) {
      removedConceptIds.add(concept.id);
      return false;
    }
    concept.documentIds = concept.documentIds.filter((id) => id !== document.id);
    return true;
  });

  session.connections = session.connections.filter(
    (connection: Connection) =>
      !removedConceptIds.has(connection.from) && !removedConceptIds.has(connection.to),
  );
  session.insights = session.insights.filter(
    (insight: Insight) => !insight.conceptIds.some((id) => removedConceptIds.has(id)),
  );
  session.dismissedIds = session.dismissedIds.filter((id) =>
    session.insights.some((insight) => insight.id === id),
  );
  session.savedConnectionIds = session.savedConnectionIds.filter((id) =>
    session.connections.some((connection) => connection.id === id),
  );

  session.fileBuffers.delete(document.id);
  session.analysisStatus.delete(document.id);
}

async function parseUploadMetadata(
  body: Record<string, unknown>,
  config: UploadConfig,
): Promise<{ metadata: SourceMetadata; extracted: SourceText }> {
  const rawFile = Array.isArray(body.file) ? body.file[0] : body.file;
  const content = readContent(body.content);
  const title = readTitle(body.title);

  if (rawFile !== undefined && content !== undefined) {
    throw new HTTPException(400, {
      message: 'Provide either a file or pasted text, not both.',
    });
  }

  if (rawFile === undefined && content === undefined) {
    throw new HTTPException(400, {
      message: 'Provide a PDF, TXT/Markdown file, or pasted text.',
    });
  }

  if (rawFile !== undefined) {
    if (!isUploadedFile(rawFile)) {
      throw new HTTPException(400, { message: 'The uploaded file is malformed.' });
    }
    if (rawFile.size > config.maxBytes) {
      throw new HTTPException(413, {
        message: `The file exceeds the ${uploadLimitLabel(config.maxBytes)} upload limit.`,
      });
    }
    const fileName = safeFileName(rawFile.name);
    const kind = fileKind(fileName, rawFile.type);
    let buffer: Buffer;
    try {
      buffer = Buffer.from(await rawFile.arrayBuffer());
    } catch {
      throw new HTTPException(400, { message: 'The uploaded file could not be read.' });
    }
    if (buffer.length === 0) {
      throw new HTTPException(400, { message: 'The uploaded file is empty.' });
    }
    if (buffer.length > config.maxBytes) {
      throw new HTTPException(413, {
        message: `The file exceeds the ${uploadLimitLabel(config.maxBytes)} upload limit.`,
      });
    }

    let extracted: SourceText;
    try {
      extracted = await extractTextFromFile(buffer, kind, config.maxPdfPages);
    } catch (error) {
      if (error instanceof DocumentExtractionError) {
        throw new HTTPException(error.status, { message: error.message });
      }
      throw new HTTPException(422, { message: 'The document could not be read.' });
    }

    return {
      metadata: {
        kind,
        fileName,
        mimeType: rawFile.type || undefined,
        fileSize: buffer.length,
        title: sourceTitle(fileName, title),
        buffer,
      },
      extracted,
    };
  }

  const text = normalizeExtractedText(content ?? '');
  if (!text) {
    throw new HTTPException(400, { message: 'Pasted text is empty.' });
  }
  const contentBytes = Buffer.byteLength(content ?? '', 'utf8');
  if (contentBytes > config.maxBytes) {
    throw new HTTPException(413, {
      message: `The pasted text exceeds the ${uploadLimitLabel(config.maxBytes)} upload limit.`,
    });
  }

  return {
    metadata: {
      kind: 'notes',
      title: sourceTitle(undefined, title),
      fileSize: contentBytes,
    },
    extracted: {
      text,
      words: countWords(text),
    },
  };
}

export function createSourcesRoute(config: UploadConfig) {
  const sources = new Hono<Env>();

  sources.post('/:projectId/sources', async (c) => {
    const contentLength = Number(c.req.header('content-length') ?? '');
    if (Number.isFinite(contentLength) && contentLength > config.maxBytes + 256 * 1024) {
      throw new HTTPException(413, { message: 'The upload request is too large.' });
    }

    const session = c.get('session');
    const sessionId = c.get('sessionId');
    const workspace = findWorkspace(sessionId, session.workspaces, c.req.param('projectId'));

    let body: Record<string, unknown>;
    try {
      body = (await c.req.parseBody()) as Record<string, unknown>;
    } catch {
      throw new HTTPException(400, { message: 'The upload request could not be read.' });
    }

    const parsed = await parseUploadMetadata(body, config);
    const id = crypto.randomUUID();
    const extracted = parsed.extracted;
    const metadata = parsed.metadata;
    const now = nowIso();

    const document: KnowledgeDocument = {
      id,
      sessionId,
      workspaceId: workspace.id,
      title: metadata.title,
      subtitle: subtypeLabel(metadata.kind, metadata.fileName, extracted.pages),
      kind: metadata.kind,
      source:
        metadata.kind === 'pdf'
          ? 'Uploaded PDF'
          : metadata.kind === 'markdown'
            ? 'Uploaded Markdown'
            : metadata.buffer
              ? 'Uploaded text'
              : 'Pasted text',
      addedAt: now,
      words: extracted.words,
      pages: extracted.pages,
      excerpt: excerptOf(extracted.text),
      summary: 'Text extracted successfully. No analysis or insights have been generated yet.',
      conceptIds: [],
      content: extracted.text,
      fileName: metadata.fileName,
      mimeType: metadata.mimeType,
      fileSize: metadata.fileSize,
      status: 'extracted',
    };

    session.documents.push(document);
    workspace.documentIds.unshift(id);
    if (metadata.buffer) {
      session.fileBuffers.set(id, {
        buffer: metadata.buffer,
        fileName: metadata.fileName ?? 'document',
        mimeType: metadata.mimeType ?? 'application/octet-stream',
      });
    }
    session.analysisStatus.set(id, {
      status: 'queued',
      updatedAt: new Date().toISOString(),
    });

    return c.json(toSourceResponse(document, true), 201);
  });

  sources.get('/:projectId/sources', (c) => {
    const session = c.get('session');
    const sessionId = c.get('sessionId');
    const workspace = findWorkspace(sessionId, session.workspaces, c.req.param('projectId'));
    const documents = workspace.documentIds
      .map((id) => session.documents.find((document) => document.id === id))
      .filter((document): document is KnowledgeDocument => Boolean(document))
      .map((document) => toSourceResponse(document, false));
    return c.json(documents);
  });

  sources.get('/:projectId/sources/:sourceId', (c) => {
    const session = c.get('session');
    const sessionId = c.get('sessionId');
    const workspace = findWorkspace(sessionId, session.workspaces, c.req.param('projectId'));
    const document = findDocument(session, workspace, c.req.param('sourceId'));
    return c.json(toSourceResponse(document, true));
  });

  sources.delete('/:projectId/sources/:sourceId', (c) => {
    const session = c.get('session');
    const sessionId = c.get('sessionId');
    const workspace = findWorkspace(sessionId, session.workspaces, c.req.param('projectId'));
    const document = findDocument(session, workspace, c.req.param('sourceId'));
    removeSource(session, workspace, document);
    return c.body(null, 204);
  });

  return sources;
}
