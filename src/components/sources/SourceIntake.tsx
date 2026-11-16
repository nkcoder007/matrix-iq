import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { useKnowledge } from '../../store/KnowledgeContext';
import { Icon } from '../icons';
import { Badge } from '../ui/Badge';
import type { DocumentKind } from '../../types';
import { ApiError, backendConfig } from '../../services/api';

interface QueuedSource {
  id: string;
  title: string;
  meta: string;
  words: number;
  kind: DocumentKind;
  content?: string;
  file?: File;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}

function inferKind(filename: string): DocumentKind {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'markdown';
  if (lower.endsWith('.txt')) return 'notes';
  return 'pdf';
}

function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

/**
 * Upload lives in the Sources tab itself. Files and pasted text are staged,
 * then written to the active project only.
 */
export function SourceIntake() {
  const { workspace, addQueuedSources, hasDemoSources, importDemoSources } = useKnowledge();
  const [queue, setQueue] = useState<QueuedSource[]>([]);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [justAdded, setJustAdded] = useState(0);
  const [staging, setStaging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragDepth = useRef(0);

  const stageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setStaging(true);
    const stamp = Date.now();
    const staged = await Promise.all(
      Array.from(files).map(async (file, index): Promise<QueuedSource> => {
        const kind = inferKind(file.name);
        let content: string | undefined;
        if (kind !== 'pdf') {
          try {
            content = await file.text();
          } catch {
            content = undefined;
          }
        }
        const words = content ? countWords(content) : Math.max(120, Math.round(file.size / 6));
        return {
          id: `upload-${stamp}-${index}`,
          title: file.name.replace(/\.[^.]+$/, ''),
          meta: `Uploaded · ${Math.max(1, Math.round(file.size / 1024))} KB`,
          words,
          kind,
          content,
          file,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        };
      }),
    );
    setQueue((current) => [...current, ...staged]);
    setJustAdded(0);
    setStaging(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const stagePaste = () => {
    if (!text.trim()) return;
    setError(null);
    const words = countWords(text);
    setQueue((current) => [
      ...current,
      {
        id: `paste-${Date.now()}`,
        title: title.trim() || 'Pasted note',
        meta: `Pasted text · ${words} words`,
        words,
        kind: 'notes',
        content: text,
      },
    ]);
    setTitle('');
    setText('');
    setJustAdded(0);
  };

  const commit = async () => {
    if (queue.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      await addQueuedSources(
        queue.map((source) => ({
          title: source.title,
          meta: source.meta,
          words: source.words,
          kind: source.kind,
          content: source.content,
          file: source.file,
          fileName: source.fileName,
          mimeType: source.mimeType,
          fileSize: source.fileSize,
        })),
      );
      setJustAdded(queue.length);
      setQueue([]);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'The sources could not be added. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnter = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    void stageFiles(event.dataTransfer.files);
  };

  return (
    <section className="intake card" aria-labelledby="intake-title">
      <div className="intake__head">
        <div>
          <h2 className="intake__title" id="intake-title">
            Add sources
          </h2>
          <p className="intake__sub">
            Files and notes are added to <strong>{workspace.name}</strong> only.
          </p>
        </div>
        {hasDemoSources ? (
          <Badge tone="mint" dot>
            Sample set loaded
          </Badge>
        ) : (
          <button
            type="button"
            className="btn btn--sm btn--secondary"
            onClick={() => {
              if (importDemoSources()) setJustAdded(3);
            }}
          >
            <span className="btn__icon">
              <Icon name="sparkles" size={14} />
            </span>
            Add the sample set
          </button>
        )}
      </div>

      <div className="intake__grid">
        <label
          className={`dropzone dropzone--row${dragging ? ' is-dragging' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.md,.txt,.markdown"
            className="sr-only"
            onChange={(event) => void stageFiles(event.target.files)}
          />
          <span className="dropzone__icon">
            <Icon name="upload" size={17} />
          </span>
          <span className="dropzone__text">
            <span className="dropzone__title">
              {staging ? 'Reading documents…' : dragging ? 'Drop to add these files' : 'Choose documents'}
            </span>
            <span className="dropzone__hint">PDF, Markdown or text — or drop them here</span>
          </span>
        </label>

        <details className="intake__paste">
          <summary className="intake__paste-summary">
            <Icon name="plus" size={14} />
            Paste text instead
          </summary>
          <div className="intake__paste-body">
            <input
              className="input"
              placeholder="Source title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              aria-label="Source title"
            />
            <textarea
              className="textarea"
              placeholder="Paste notes, an article or meeting minutes…"
              value={text}
              onChange={(event) => setText(event.target.value)}
              aria-label="Source text"
            />
            <button
              type="button"
              className="btn btn--sm btn--secondary"
              onClick={stagePaste}
              disabled={!text.trim()}
            >
              Add to upload list
            </button>
          </div>
        </details>
      </div>

      {queue.length > 0 ? (
        <div className="intake__queue">
          <ul className="intake__items">
            {queue.map((source) => (
              <li key={source.id} className="intake__item">
                <Icon name="file" size={14} />
                <span className="intake__item-text">
                  <span className="intake__item-name">{source.title}</span>
                  <span className="intake__item-meta">{source.meta}</span>
                </span>
                <button
                  type="button"
                  className="source-item__remove"
                  onClick={() => setQueue((current) => current.filter((item) => item.id !== source.id))}
                  aria-label={`Remove ${source.title}`}
                >
                  <Icon name="close" size={13} />
                </button>
              </li>
            ))}
          </ul>
          <div className="intake__actions">
            <span className="intake__count">
              {queue.length} {queue.length === 1 ? 'source' : 'sources'} ready
            </span>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => void commit()}
              disabled={saving}
            >
              {saving
                ? backendConfig.configured
                  ? 'Uploading and extracting…'
                  : 'Saving…'
                : `Add to ${workspace.name}`}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="intake__error" role="alert">
          <Icon name="alert" size={13} />
          {error}
        </p>
      ) : null}

      {justAdded > 0 ? (
        <p className="intake__added">
          <Icon name="check" size={13} />
          {justAdded} {justAdded === 1 ? 'source' : 'sources'} added to this project.
        </p>
      ) : null}

      <p className="intake__note">
        {backendConfig.configured
          ? 'Files and pasted text are sent to the backend, which extracts readable text and keeps the originals in memory for this browser session. Automatic analysis is not connected yet.'
          : 'Original text and files are stored in this browser. Automatic analysis needs the future backend, so new sources stay marked “waiting for analysis” until then.'}
      </p>
    </section>
  );
}
