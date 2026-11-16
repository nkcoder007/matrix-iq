import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { MemorySessionStore } from './services/sessionStore';
import type { UploadConfig } from './config';
import type { Workspace } from './types';

const SID_A = 'session-a';
const SID_B = 'session-b';
const PROJECT_A = 'project-a';
const PROJECT_B = 'project-b';

function workspace(id: string, sessionId: string, name: string): Workspace {
  return {
    id,
    sessionId,
    name,
    description: `${name} description`,
    color: '#2563eb',
    createdAt: '2026-11-16',
    documentIds: [],
  };
}

function setup(uploadConfig: UploadConfig = { maxBytes: 1024 * 1024, maxPdfPages: 20 }) {
  const store = new MemorySessionStore({ ttlMs: 60_000, sweepMs: 1000, autoSweep: false });
  const { app } = createApp({ store, corsOrigins: [], uploadConfig });
  store.create(SID_A);
  store.create(SID_B);
  store.get(SID_A)!.workspaces.push(workspace(PROJECT_A, SID_A, 'Project A'));
  store.get(SID_A)!.workspaces.push(workspace(PROJECT_B, SID_A, 'Project B'));
  store.get(SID_B)!.workspaces.push(workspace('project-b-session-b', SID_B, 'Session B Project'));
  return { app, store };
}

async function readJson(response: Response): Promise<{ status: number; json: unknown }> {
  const text = await response.text();
  return {
    status: response.status,
    json: text ? JSON.parse(text) : undefined,
  };
}

async function upload(
  app: ReturnType<typeof createApp>['app'],
  sessionId: string,
  projectId: string,
  form: FormData,
) {
  const response = await app.fetch(
    new Request(`http://localhost/projects/${projectId}/sources`, {
      method: 'POST',
      headers: { 'X-Session-ID': sessionId },
      body: form,
    }),
  );
  return readJson(response);
}

async function request(
  app: ReturnType<typeof createApp>['app'],
  method: string,
  path: string,
  sessionId: string,
) {
  const response = await app.fetch(
    new Request(`http://localhost${path}`, {
      method,
      headers: { 'X-Session-ID': sessionId },
    }),
  );
  return readJson(response);
}

function pdfEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function makePdf(lines: string[]): Buffer {
  let stream = 'BT /F1 14 Tf 72 720 Td ';
  lines.forEach((line, index) => {
    if (index > 0) stream += '0 -24 Td ';
    stream += `(${pdfEscape(line)}) Tj `;
  });
  stream += 'ET';

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

function fileForm(buffer: Buffer, name: string, type: string, title?: string): FormData {
  const form = new FormData();
  form.append('file', new File([buffer], name, { type }));
  if (title) form.append('title', title);
  return form;
}

describe('Phase 2 — document upload and extraction', () => {
  it('uploads and extracts a TXT document while preserving paragraphs and headings', async () => {
    const { app, store } = setup();
    const form = fileForm(
      Buffer.from('# Field notes\r\n\r\nFirst paragraph.\r\n\r\n\r\nSecond paragraph.\r\n'),
      'field-notes.txt',
      'text/plain',
    );

    const { status, json } = await upload(app, SID_A, PROJECT_A, form);

    expect(status).toBe(201);
    expect(json).toMatchObject({
      title: 'field-notes',
      kind: 'notes',
      status: 'extracted',
      fileName: 'field-notes.txt',
    });
    expect((json as { content?: string }).content).toBe(
      '# Field notes\n\nFirst paragraph.\n\nSecond paragraph.',
    );
    expect(json).not.toHaveProperty('sessionId');
    expect(json).not.toHaveProperty('workspaceId');

    const documentId = (json as { id: string }).id;
    const session = store.get(SID_A)!;
    expect(session.documents[0]?.id).toBe(documentId);
    expect(session.workspaces.find((item) => item.id === PROJECT_A)?.documentIds).toContain(documentId);
    expect(session.fileBuffers.get(documentId)?.fileName).toBe('field-notes.txt');
    expect(session.fileBuffers.get(documentId)?.buffer.length).toBeGreaterThan(0);
  });

  it('extracts readable text and page count from a PDF', async () => {
    const { app } = setup();
    const form = fileForm(
      makePdf(['First PDF line', 'Second PDF line']),
      'report.pdf',
      'application/pdf',
    );

    const { status, json } = await upload(app, SID_A, PROJECT_A, form);

    expect(status).toBe(201);
    expect((json as { kind?: string }).kind).toBe('pdf');
    expect((json as { pages?: number }).pages).toBe(1);
    expect((json as { content?: string }).content).toContain('First PDF line');
    expect((json as { content?: string }).content).toContain('Second PDF line');
  });

  it('accepts pasted text without a file', async () => {
    const { app } = setup();
    const form = new FormData();
    form.append('title', 'Pasted note');
    form.append('content', 'A paragraph from the clipboard.\n\nA second paragraph.');

    const { status, json } = await upload(app, SID_A, PROJECT_A, form);

    expect(status).toBe(201);
    expect(json).toMatchObject({
      title: 'Pasted note',
      kind: 'notes',
      status: 'extracted',
    });
    expect(json).not.toHaveProperty('fileName');
    expect((json as { content?: string }).content).toContain('second paragraph');
  });

  it('rejects unsupported extensions and MIME types', async () => {
    const { app } = setup();

    const extension = await upload(
      app,
      SID_A,
      PROJECT_A,
      fileForm(Buffer.from('hello'), 'notes.csv', 'text/plain'),
    );
    expect(extension.status).toBe(415);

    const mime = await upload(
      app,
      SID_A,
      PROJECT_A,
      fileForm(Buffer.from('hello'), 'notes.txt', 'application/pdf'),
    );
    expect(mime.status).toBe(415);
  });

  it('rejects oversized, empty, and empty pasted documents', async () => {
    const { app } = setup({ maxBytes: 32, maxPdfPages: 20 });

    const oversized = await upload(
      app,
      SID_A,
      PROJECT_A,
      fileForm(Buffer.alloc(64, 'a'), 'large.txt', 'text/plain'),
    );
    expect(oversized.status).toBe(413);

    const emptyFile = await upload(
      app,
      SID_A,
      PROJECT_A,
      fileForm(Buffer.alloc(0), 'empty.txt', 'text/plain'),
    );
    expect(emptyFile.status).toBe(400);

    const emptyPaste = new FormData();
    emptyPaste.append('content', '  \n\n  ');
    const emptyPasteResult = await upload(app, SID_A, PROJECT_A, emptyPaste);
    expect(emptyPasteResult.status).toBe(400);

    const oversizedPaste = new FormData();
    oversizedPaste.append('content', 'a'.repeat(40));
    const oversizedPasteResult = await upload(app, SID_A, PROJECT_A, oversizedPaste);
    expect(oversizedPasteResult.status).toBe(413);
  });

  it('rejects corrupted and unreadable PDFs without exposing internal errors', async () => {
    const { app } = setup();
    const corrupted = await upload(
      app,
      SID_A,
      PROJECT_A,
      fileForm(Buffer.from('%PDF-1.4\nnot a real pdf'), 'broken.pdf', 'application/pdf'),
    );
    expect(corrupted.status).toBe(422);
    expect((corrupted.json as { message?: string }).message).toContain('PDF');
    expect(JSON.stringify(corrupted.json)).not.toContain('stack');
  });

  it('rejects PDFs with no extractable text', async () => {
    const { app } = setup();
    const blank = await upload(
      app,
      SID_A,
      PROJECT_A,
      fileForm(makePdf([]), 'blank.pdf', 'application/pdf'),
    );
    expect(blank.status).toBe(422);
  });

  it('lists metadata without content and returns extracted text on detail', async () => {
    const { app } = setup();
    const created = await upload(
      app,
      SID_A,
      PROJECT_A,
      fileForm(Buffer.from('Detail text for retrieval.'), 'detail.txt', 'text/plain'),
    );
    const id = (created.json as { id: string }).id;

    const list = await request(app, 'GET', `/projects/${PROJECT_A}/sources`, SID_A);
    expect(list.status).toBe(200);
    const items = list.json as Array<Record<string, unknown>>;
    expect(items).toHaveLength(1);
    expect(items[0]).not.toHaveProperty('content');

    const detail = await request(app, 'GET', `/projects/${PROJECT_A}/sources/${id}`, SID_A);
    expect(detail.status).toBe(200);
    expect((detail.json as { content?: string }).content).toContain('Detail text');
  });

  it('deletes a source and cleans its buffer and analysis state', async () => {
    const { app, store } = setup();
    const created = await upload(
      app,
      SID_A,
      PROJECT_A,
      fileForm(Buffer.from('Delete me.'), 'delete.txt', 'text/plain'),
    );
    const id = (created.json as { id: string }).id;
    expect(store.get(SID_A)!.fileBuffers.has(id)).toBe(true);

    const deleted = await request(app, 'DELETE', `/projects/${PROJECT_A}/sources/${id}`, SID_A);
    expect(deleted.status).toBe(204);

    const missing = await request(app, 'GET', `/projects/${PROJECT_A}/sources/${id}`, SID_A);
    expect(missing.status).toBe(404);
    const session = store.get(SID_A)!;
    expect(session.documents.some((document) => document.id === id)).toBe(false);
    expect(session.fileBuffers.has(id)).toBe(false);
    expect(session.analysisStatus.has(id)).toBe(false);
  });

  it('isolates sources by session and project', async () => {
    const { app } = setup();
    const created = await upload(
      app,
      SID_A,
      PROJECT_A,
      fileForm(Buffer.from('Private source.'), 'private.txt', 'text/plain'),
    );
    const id = (created.json as { id: string }).id;

    expect(
      (await request(app, 'GET', `/projects/${PROJECT_A}/sources/${id}`, SID_B)).status,
    ).toBe(404);
    expect(
      (await request(app, 'GET', `/projects/project-b-session-b/sources/${id}`, SID_B)).status,
    ).toBe(404);
    expect(
      (await request(app, 'GET', `/projects/${PROJECT_B}/sources/${id}`, SID_A)).status,
    ).toBe(404);
  });

  it('cleans uploaded buffers when a project is deleted', async () => {
    const { app, store } = setup();
    const created = await upload(
      app,
      SID_A,
      PROJECT_A,
      fileForm(Buffer.from('Project cleanup.'), 'cleanup.txt', 'text/plain'),
    );
    const id = (created.json as { id: string }).id;
    expect(store.get(SID_A)!.fileBuffers.has(id)).toBe(true);

    const deleted = await request(app, 'DELETE', `/projects/${PROJECT_A}`, SID_A);
    expect(deleted.status).toBe(204);
    const session = store.get(SID_A)!;
    expect(session.documents.some((document) => document.id === id)).toBe(false);
    expect(session.fileBuffers.size).toBe(0);
    expect(session.analysisStatus.size).toBe(0);
  });

  it('cleans the whole session when it expires', async () => {
    const store = new MemorySessionStore({ ttlMs: 100, sweepMs: 1000, autoSweep: false });
    const { app } = createApp({
      store,
      corsOrigins: [],
      uploadConfig: { maxBytes: 1024 * 1024, maxPdfPages: 20 },
    });
    const session = store.create(SID_A);
    session.workspaces.push(workspace(PROJECT_A, SID_A, 'Project A'));

    await upload(
      app,
      SID_A,
      PROJECT_A,
      fileForm(Buffer.from('Expire me.'), 'expire.txt', 'text/plain'),
    );
    expect(store.get(SID_A)!.fileBuffers.size).toBe(1);

    store.get(SID_A)!.lastAccessed = Date.now() - 101;
    expect(store.get(SID_A)).toBeUndefined();
    expect(store.size()).toBe(0);
  });

  it('handles malformed uploads safely', async () => {
    const { app } = setup();
    const response = await app.fetch(
      new Request(`http://localhost/projects/${PROJECT_A}/sources`, {
        method: 'POST',
        headers: {
          'X-Session-ID': SID_A,
          'Content-Type': 'multipart/form-data; boundary=broken',
        },
        body: 'not a multipart body',
      }),
    );
    expect([400, 422]).toContain(response.status);
  });
});
